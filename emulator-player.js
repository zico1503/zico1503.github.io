(() => {
  const params = new URLSearchParams(window.location.search);
  const allowedSystems = new Set(['gb', 'nes']);
  const system = params.get('system');
  const game = params.get('game');
  const gameName = params.get('name') || 'Browser game';
  const profileName = (params.get('profile') || 'Guest').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 20) || 'Guest';
  const errorBox = document.querySelector('#player-error');

  function profileGameId(value) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
    return (hash >>> 0) % 2147483646 + 1;
  }

  function report(type, detail = '') {
    window.parent.postMessage({ source: 'arcade-atlas-player', type, detail }, window.location.origin);
  }

  function showError(error) {
    if (error?.type === 'error' && error.target !== window) return;
    const detail = error?.reason?.message || error?.message || 'Runtime script failed before the game could start.';
    console.error('Arcade Atlas emulator error:', error);
    document.querySelector('#game').hidden = true;
    errorBox.textContent = `Player error: ${detail}. Please return to Arcade Atlas and try again.`;
    errorBox.style.display = 'block';
    report('error', detail);
  }

  window.addEventListener('error', showError);
  window.addEventListener('unhandledrejection', showError);

  if (!allowedSystems.has(system) || !game) {
    showError();
    return;
  }

  (async () => {
    const romUrl = new URL(game, window.location.href);
    romUrl.searchParams.set('atlas_cache', '2');
    const response = await fetch(romUrl.href, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Could not load game file (HTTP ${response.status}).`);
    const romFile = await response.blob();

    window.EJS_player = '#game';
    window.EJS_core = system;
    window.EJS_gameUrl = romFile;
    window.EJS_gameName = `${gameName} [${profileName}]`;
    window.EJS_gameID = profileGameId(`${profileName}|${system}|${gameName}`);
    window.EJS_biosUrl = '';
    window.EJS_pathtodata = new URL('emulator/data/', window.location.href).href;
    window.EJS_threads = false;
    window.EJS_startOnLoaded = true;
    window.EJS_ready = () => report('ready');

    const loader = document.createElement('script');
    loader.src = new URL('emulator/data/loader.js', window.location.href).href;
    loader.onerror = () => showError(new Error('The bundled EmulatorJS loader is missing or blocked.'));
    document.body.appendChild(loader);
  })().catch(showError);
})();
