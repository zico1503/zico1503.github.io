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
let selectedRom = null;
let romObjectUrl = null;
let startupTimer = null;

function supportsSecureRuntime() {
  return location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
}

function setRom(file) {
  if (!file) return;
  selectedRom = file;
  romFilename.textContent = file.name;
  romFilename.title = file.name;
  runEmulator.disabled = false;
  runEmulator.innerHTML = 'Play selected file <span>↗</span>';
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
  playerUrl.searchParams.set('player_version', '2');
  playerUrl.searchParams.set('system', system);
  playerUrl.searchParams.set('game', romUrl);
  playerUrl.searchParams.set('name', gameName);

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
  const romUrl = URL.createObjectURL(selectedRom);
  startEmulation({ system: systemPicker.value, romUrl, gameName: selectedRom.name, isLocalFile: true });
});

stopEmulator.addEventListener('click', stopSession);
window.addEventListener('beforeunload', releaseLocalFile);
window.playBuiltinGame = () => {
  document.querySelector('#play').scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.querySelector('#play-ucity').click();
};
