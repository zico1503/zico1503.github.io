const systemPicker = document.querySelector('#emulator-system');
const romPicker = document.querySelector('#rom-file');
const romDrop = document.querySelector('#rom-drop');
const romFilename = document.querySelector('#rom-filename');
const runEmulator = document.querySelector('#run-emulator');
const emulatorStatus = document.querySelector('#emulator-status');
const emulatorFrame = document.querySelector('#emulator-frame');
const screenPlaceholder = document.querySelector('#screen-placeholder');
const emulatorScreen = document.querySelector('#emulator-screen');
const stopEmulator = document.querySelector('#stop-emulator');
const personalGames = document.querySelector('#personal-games');
let selectedRom = null;
let romObjectUrl = null;
let startupTimer = null;
let pendingRom = null;
let selectedProfileId = null;
let selectedGameId = null;

function supportsSecureRuntime() {
  return location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
}

function setRom(file) {
  if (!file) return;
  selectedRom = file;
  selectedGameId = null;
  romFilename.textContent = file.name;
  romFilename.title = file.name;
  const profile = window.atlasAccounts?.current();
  if (!profile) {
    pendingRom = file;
    runEmulator.disabled = true;
    emulatorStatus.textContent = 'Enter a username to save this game file in a local profile.';
    window.atlasAccounts?.open();
    return;
  }
  pendingRom = null;
  runEmulator.disabled = true;
  runEmulator.innerHTML = 'Play selected file <span>↗</span>';
  emulatorStatus.textContent = `Saving ${file.name} to @${profile.username} on this browser…`;
  window.atlasAccounts.saveGame(file, systemPicker.value).then(async (record) => {
    if (window.atlasAccounts.current()?.id !== profile.id || selectedRom !== file) return;
    selectedGameId = record.id;
    runEmulator.disabled = false;
    emulatorStatus.textContent = `Saved to @${profile.username} on this browser. It stays on this device and is not uploaded to the site.`;
    await renderPersonalGames();
  }).catch((error) => {
    if (selectedRom !== file) return;
    runEmulator.disabled = false;
    emulatorStatus.textContent = `This file can play now, but the browser could not save a profile copy: ${error.message || 'storage unavailable'}`;
  });
}

function fileSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function renderPersonalGames() {
  if (!personalGames) return;
  personalGames.replaceChildren();
  const profile = window.atlasAccounts?.current();
  if (!profile) {
    personalGames.textContent = 'Sign in with a username to save game files in this browser.';
    personalGames.classList.remove('personal-games-error');
    personalGames.classList.add('personal-games-message');
    return;
  }
  try {
    const games = await window.atlasAccounts.listGames();
    if (window.atlasAccounts.current()?.id !== profile.id) return;
    personalGames.classList.remove('personal-games-message', 'personal-games-error');
    if (!games.length) {
      personalGames.textContent = `No personal game files saved for @${profile.username} yet.`;
      personalGames.classList.add('personal-games-message');
      return;
    }
    const heading = document.createElement('div');
    heading.className = 'personal-games-heading';
    heading.textContent = `SAVED FOR @${profile.username.toUpperCase()} · ${games.length} ${games.length === 1 ? 'FILE' : 'FILES'}`;
    personalGames.append(heading);
    for (const game of games.sort((a, b) => b.addedAt - a.addedAt)) {
      const row = document.createElement('div');
      row.className = 'personal-game-row';
      const name = document.createElement('span');
      name.className = 'personal-game-name';
      name.textContent = game.fileName;
      name.title = game.fileName;
      const size = document.createElement('span');
      size.className = 'personal-game-size';
      size.textContent = fileSize(game.size);
      const play = document.createElement('button');
      play.type = 'button'; play.textContent = 'Play';
      play.addEventListener('click', () => playSavedGame(game.id));
      const remove = document.createElement('button');
      remove.type = 'button'; remove.className = 'remove-personal-game'; remove.textContent = '×';
      remove.setAttribute('aria-label', `Remove ${game.fileName} from this profile`);
      remove.addEventListener('click', async () => {
        if (!window.confirm(`Remove ${game.fileName} from this browser profile?`)) return;
        await window.atlasAccounts.removeGame(game.id);
        if (selectedProfileId === profile.id) await renderPersonalGames();
      });
      row.append(name, size, play, remove);
      personalGames.append(row);
    }
  } catch {
    personalGames.textContent = 'The browser could not open this profile’s saved game files.';
    personalGames.classList.add('personal-games-error');
  }
}

async function playSavedGame(id) {
  const game = await window.atlasAccounts?.getGame(id);
  if (!game) return;
  const romUrl = URL.createObjectURL(game.blob);
  selectedRom = game.blob;
  selectedGameId = game.id;
  romFilename.textContent = game.fileName;
  romFilename.title = game.fileName;
  runEmulator.disabled = true;
  startEmulation({ system: game.system, romUrl, gameName: `${game.fileName} ${game.id.slice(-8)}`, isLocalFile: true });
}

romPicker.addEventListener('change', () => setRom(romPicker.files?.[0]));
romDrop.addEventListener('dragover', (event) => { event.preventDefault(); romDrop.classList.add('dragging'); });
romDrop.addEventListener('dragleave', () => romDrop.classList.remove('dragging'));
romDrop.addEventListener('drop', (event) => {
  event.preventDefault();
  romDrop.classList.remove('dragging');
  setRom(event.dataTransfer?.files?.[0]);
});

function releaseLocalFile() {
  if (romObjectUrl) URL.revokeObjectURL(romObjectUrl);
  romObjectUrl = null;
}

function stopSession() {
  clearTimeout(startupTimer);
  startupTimer = null;
  emulatorFrame.removeAttribute('srcdoc');
  emulatorFrame.src = 'about:blank';
  emulatorFrame.hidden = true;
  screenPlaceholder.hidden = false;
  emulatorScreen.setAttribute('aria-busy', 'false');
  stopEmulator.disabled = true;
  releaseLocalFile();
  emulatorStatus.textContent = selectedRom
    ? 'Session ended. Your selected game file is still on this device.'
    : 'Choose a built-in title to start. The emulator and systems are included with the site.';
}

function startEmulation({ system, romUrl, gameName, isLocalFile = false }) {
  if (!supportsSecureRuntime()) {
    emulatorStatus.textContent = 'This browser needs the site served over HTTPS or localhost for WebAssembly emulation. The built-in game is included with the site.';
    return;
  }

  stopSession();
  if (isLocalFile) romObjectUrl = romUrl;
  const playerUrl = new URL('emulator-player.html', window.location.href);
  playerUrl.searchParams.set('player_version', '3');
  playerUrl.searchParams.set('system', system);
  playerUrl.searchParams.set('game', romUrl);
  playerUrl.searchParams.set('name', gameName);
  playerUrl.searchParams.set('profile', window.atlasAccounts?.current()?.username || 'Guest');

  screenPlaceholder.hidden = true;
  emulatorFrame.hidden = false;
  emulatorFrame.src = playerUrl.href;
  emulatorScreen.setAttribute('aria-busy', 'true');
  stopEmulator.disabled = false;
  emulatorStatus.textContent = `Loading ${gameName} and its emulator core…`;
  startupTimer = setTimeout(() => {
    emulatorScreen.setAttribute('aria-busy', 'false');
    emulatorStatus.textContent = 'The game is taking too long to start. Check that this site is open over HTTPS and that the school network allows its game files.';
  }, 45000);
}

window.addEventListener('message', (event) => {
  if (event.source !== emulatorFrame.contentWindow || event.data?.source !== 'arcade-atlas-player') return;
  if (event.data.type === 'ready') {
    clearTimeout(startupTimer);
    startupTimer = null;
    emulatorScreen.setAttribute('aria-busy', 'false');
    emulatorStatus.textContent = 'Game ready. Use the arrow keys and Z / X to play; Enter and Shift are Start and Select.';
  } else if (event.data.type === 'error') {
    clearTimeout(startupTimer);
    startupTimer = null;
    emulatorScreen.setAttribute('aria-busy', 'false');
    const detail = typeof event.data.detail === 'string' ? event.data.detail.slice(0, 180) : '';
    emulatorStatus.textContent = detail
      ? `Player error: ${detail}`
      : 'The emulator hit a loading error. Check HTTPS access and whether the school network blocks emulator files.';
  }
});

document.querySelector('#play-ucity').addEventListener('click', () => {
  const romUrl = new URL('assets/games/ucity.gbc', window.location.href).href;
  startEmulation({ system: 'gb', romUrl, gameName: 'µCity' });
});

runEmulator.addEventListener('click', () => {
  if (!selectedRom) return;
  if (!window.atlasAccounts?.current()) {
    pendingRom = selectedRom;
    window.atlasAccounts?.open();
    return;
  }
  const romUrl = URL.createObjectURL(selectedRom);
  const suffix = selectedGameId ? ` ${selectedGameId.slice(-8)}` : '';
  startEmulation({ system: systemPicker.value, romUrl, gameName: `${selectedRom.name}${suffix}`, isLocalFile: true });
});

window.addEventListener('arcade-profile-change', async (event) => {
  const profile = event.detail?.profile || null;
  const nextProfileId = profile?.id || null;
  if (selectedProfileId !== nextProfileId) {
    if (!emulatorFrame.hidden) stopSession();
    selectedRom = null;
    selectedGameId = null;
    romFilename.textContent = 'Choose a game file';
    runEmulator.disabled = true;
  }
  selectedProfileId = nextProfileId;
  if (profile && pendingRom) setRom(pendingRom);
  await renderPersonalGames();
});

stopEmulator.addEventListener('click', stopSession);
window.addEventListener('beforeunload', releaseLocalFile);
window.playBuiltinGame = () => {
  document.querySelector('#play').scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.querySelector('#play-ucity').click();
};
