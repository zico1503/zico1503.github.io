(() => {
  const DB_NAME = 'ArcadeAtlasProfiles';
  const DB_VERSION = 1;
  const ACTIVE_KEY = 'arcade-atlas-active-profile';
  const dialog = document.querySelector('#account-dialog');
  const form = document.querySelector('#account-form');
  const input = document.querySelector('#account-username');
  const error = document.querySelector('#account-error');
  const signedOut = document.querySelector('#account-signed-out');
  const signedIn = document.querySelector('#account-signed-in');
  const accountLabel = document.querySelector('#account-label');
  const profileName = document.querySelector('#profile-name');
  const profileGameCount = document.querySelector('#profile-game-count');
  let activeProfile = null;
  let databasePromise;

  function openDatabase() {
    if (databasePromise) return databasePromise;
    databasePromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) { reject(new Error('This browser does not allow local profile storage.')); return; }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('profiles')) db.createObjectStore('profiles', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('games')) {
          const games = db.createObjectStore('games', { keyPath: 'id' });
          games.createIndex('profileId', 'profileId', { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not open local profile storage.'));
      request.onblocked = () => reject(new Error('Close other Arcade Atlas tabs and try again.'));
    });
    return databasePromise;
  }
  function requestResult(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('The browser could not save this profile.'));
    });
  }
  async function getRecord(storeName, key) {
    const db = await openDatabase();
    return requestResult(db.transaction(storeName, 'readonly').objectStore(storeName).get(key));
  }
  async function putRecord(storeName, value) {
    const db = await openDatabase();
    return requestResult(db.transaction(storeName, 'readwrite').objectStore(storeName).put(value));
  }
  async function deleteRecord(storeName, key) {
    const db = await openDatabase();
    return requestResult(db.transaction(storeName, 'readwrite').objectStore(storeName).delete(key));
  }
  function emitProfileChange() {
    window.dispatchEvent(new CustomEvent('arcade-profile-change', { detail: { profile: activeProfile } }));
  }
  async function refresh() {
    const signedInNow = Boolean(activeProfile);
    accountLabel.textContent = signedInNow ? `@${activeProfile.username}` : 'Sign in';
    signedOut.hidden = signedInNow;
    signedIn.hidden = !signedInNow;
    if (signedInNow) {
      profileName.textContent = `@${activeProfile.username}`;
      try { profileGameCount.textContent = String((await listGames()).length); }
      catch { profileGameCount.textContent = 'Unavailable'; }
    }
  }
  async function selectUsername(value) {
    const username = value.trim();
    if (!/^[A-Za-z0-9_-]{3,20}$/.test(username)) throw new Error('Use 3–20 letters, numbers, underscores, or hyphens.');
    const id = username.toLowerCase();
    let profile = await getRecord('profiles', id);
    if (!profile) {
      profile = { id, username, createdAt: Date.now() };
      await putRecord('profiles', profile);
    }
    activeProfile = profile;
    try { localStorage.setItem(ACTIVE_KEY, id); } catch { /* The profile stays available for this tab. */ }
    await refresh();
    dialog.close();
    emitProfileChange();
  }
  async function listGames() {
    if (!activeProfile) return [];
    const db = await openDatabase();
    const index = db.transaction('games', 'readonly').objectStore('games').index('profileId');
    return requestResult(index.getAll(activeProfile.id));
  }
  async function saveGame(file, system) {
    if (!activeProfile) throw new Error('Sign in with a username before saving a game file.');
    const idPart = window.crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const record = {
      id: `${activeProfile.id}:${idPart}`,
      profileId: activeProfile.id,
      profileName: activeProfile.username,
      fileName: file.name,
      system,
      size: file.size,
      blob: file.slice(0, file.size, file.type || 'application/octet-stream'),
      addedAt: Date.now()
    };
    await putRecord('games', record);
    await refresh();
    return record;
  }
  async function getGame(id) {
    const profile = activeProfile;
    if (!profile) return null;
    const record = await getRecord('games', id);
    return record?.profileId === profile.id ? record : null;
  }
  async function removeGame(id) {
    if (!activeProfile) return;
    const record = await getGame(id);
    if (record) await deleteRecord('games', id);
    await refresh();
  }
  function signOut() {
    activeProfile = null;
    try { localStorage.removeItem(ACTIVE_KEY); } catch { /* The current tab is still signed out. */ }
    refresh();
    dialog.close();
    emitProfileChange();
  }
  function open() {
    if (!dialog.open) dialog.showModal();
    if (activeProfile) refresh();
    else setTimeout(() => input.focus(), 0);
  }

  document.querySelector('#account-button').addEventListener('click', open);
  document.querySelector('.account-close').addEventListener('click', () => dialog.close());
  document.querySelector('#switch-profile').addEventListener('click', () => { signOut(); open(); });
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  form.addEventListener('submit', async (event) => {
    event.preventDefault(); error.hidden = true;
    try { await selectUsername(input.value); input.value = ''; }
    catch (problem) { error.textContent = problem.message || 'Could not open this profile.'; error.hidden = false; input.focus(); }
  });
  window.atlasAccounts = { current: () => activeProfile, open, listGames, saveGame, getGame, removeGame, signOut };

  (async () => {
    try {
      const rememberedId = localStorage.getItem(ACTIVE_KEY);
      if (rememberedId) activeProfile = await getRecord('profiles', rememberedId);
      if (!activeProfile && rememberedId) localStorage.removeItem(ACTIVE_KEY);
    } catch { activeProfile = null; }
    await refresh();
    emitProfileChange();
  })();
})();
