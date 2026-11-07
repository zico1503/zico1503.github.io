const gameCards = [...document.querySelectorAll('.game-card')];
const searchInput = document.querySelector('#game-search');
const platformFilter = document.querySelector('#platform-filter');
const methodFilter = document.querySelector('#method-filter');
const categoryButtons = [...document.querySelectorAll('.category-chip')];
const resultsCount = document.querySelector('#results-count');
const shownNumber = document.querySelector('#shown-number');
const emptyState = document.querySelector('#empty-state');
let activeCategory = 'all';

function applyFilters() {
  const query = searchInput.value.trim().toLowerCase();
  const platform = platformFilter.value;
  const method = methodFilter.value;
  let visible = 0;
  for (const card of gameCards) {
    const matches = (!query || card.dataset.title.includes(query) || card.innerText.toLowerCase().includes(query))
      && (activeCategory === 'all' || card.dataset.category === activeCategory)
      && (platform === 'all' || card.dataset.platform === platform)
      && (method === 'all' || card.dataset.method === method);
    card.hidden = !matches;
    if (matches) visible += 1;
  }
  resultsCount.textContent = `${visible} ${visible === 1 ? 'pick' : 'picks'}`;
  shownNumber.textContent = String(visible).padStart(2, '0');
  emptyState.hidden = visible !== 0;
}
searchInput.addEventListener('input', applyFilters);
platformFilter.addEventListener('change', applyFilters);
methodFilter.addEventListener('change', applyFilters);
categoryButtons.forEach((button) => button.addEventListener('click', () => {
  activeCategory = button.dataset.category;
  categoryButtons.forEach((item) => {
    const selected = item === button;
    item.classList.toggle('selected', selected);
    item.setAttribute('aria-pressed', String(selected));
  });
  applyFilters();
}));
document.querySelector('.reset-filters').addEventListener('click', () => {
  searchInput.value = '';
  platformFilter.value = 'all';
  methodFilter.value = 'all';
  activeCategory = 'all';
  categoryButtons.forEach((item) => {
    const selected = item.dataset.category === 'all';
    item.classList.toggle('selected', selected);
    item.setAttribute('aria-pressed', String(selected));
  });
  applyFilters();
});
document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    searchInput.focus();
    document.querySelector('#discover').scrollIntoView({ behavior: 'smooth' });
  }
});

const topbar = document.querySelector('.topbar');
const mobileMenu = document.querySelector('.mobile-menu');
mobileMenu.addEventListener('click', () => {
  const open = topbar.classList.toggle('menu-open');
  mobileMenu.setAttribute('aria-expanded', String(open));
});
document.querySelectorAll('.main-nav a').forEach((link) => link.addEventListener('click', () => {
  topbar.classList.remove('menu-open');
  mobileMenu.setAttribute('aria-expanded', 'false');
}));

const guideCopy = {
  starboard: {
    kicker: 'ARCADE ATLAS ORIGINAL · INSTANT PLAY', title: 'Ready for a quick run?',
    body: '<p><b>Starboard Sprint</b> is a tiny original arcade game made for this site. It runs locally in your browser; there are no downloads, sign-ins, or external game services.</p><ul><li>Move with the arrow keys or A / D.</li><li>Dodge the asteroids and collect glowing stars.</li><li>Your best score stays in this browser on this device.</li></ul>',
    actions: '<button class="button button-primary start-from-info" type="button">Launch the game <span>↗</span></button>'
  },
  garden: {
    kicker: 'BROWSER GAMES · FIND A GAME', title: 'A calm little corner.',
    body: '<p>Pixel Garden is a directory guide, not a hosted game. Browse cozy games on their official pages and check each creator’s terms, age rating, and any optional purchases before playing.</p><p>For this demo, no third-party game is embedded or presented as a working integration.</p>',
    actions: '<a href="#discover" class="close-and-browse">Back to the directory <span>↗</span></a>'
  },
  classics: {
    kicker: 'PERSONAL EMULATION · SETUP GUIDE', title: 'Your library, your way.',
    body: '<p>The built-in player uses <a class="inline-link" href="https://emulatorjs.org/docs/getting-started/" target="_blank" rel="noopener noreferrer">EmulatorJS ↗</a>, bundled with this site, to run NES and Game Boy / Color games in your browser. µCity is included as a freely redistributable homebrew game; select it from the game shelf to start.</p><ul><li>No browser extension or app installation is needed.</li><li>You can optionally load a compatible game file you own or are authorized to use.</li><li>Game and BIOS files are not collected or sent to Arcade Atlas.</li></ul><p>The bundled emulator runtime and cores run locally after the site has loaded. Use HTTPS or localhost so the browser allows WebAssembly.</p>',
    actions: '<a href="#your-setup" class="close-and-browse">Back to setup options <span>↗</span></a>'
  },
  eaglercraft: {
    kicker: 'BROWSER WORLDS · COMMUNITY HOSTED', title: 'Find a world you can join.',
    body: '<p>Eaglercraft is community hosted. Arcade Atlas does not host or distribute its client, game files, or servers. Use only an authorized source and an instance whose host allows you to join.</p><p>If you already have an authorized instance address, you can open it directly in a new tab. Check the address and the host’s terms first.</p><label class="instance-label" for="instance-url">Authorized instance address</label><div class="instance-row"><input id="instance-url" type="url" placeholder="https://your-community-instance.example" autocomplete="url" /><button class="button button-primary open-instance" type="button">Open <span>↗</span></button></div><p class="instance-error" role="alert" hidden>Enter a valid HTTPS address to continue.</p><p class="instance-note">The address opens outside Arcade Atlas. This site does not relay, proxy, or embed it.</p>',
    actions: '<a href="#discover" class="close-and-browse">Back to the directory <span>↗</span></a>'
  },
  moonlight: {
    kicker: 'HOME STREAMING · SETUP GUIDE', title: 'Take your home setup along.',
    body: '<p>Home streaming sends a game from a computer you control to another device. Moonlight is an open-source streaming client; Sunshine is its recommended open-source host. You provide the computer, client device, network, and game.</p><ul><li>Install Sunshine on your gaming PC and Moonlight on the device you want to play from.</li><li>Start both while on the same home network, pair the devices, then try a game.</li><li>Keep the host powered on and connected. Performance depends on your devices and network.</li></ul><p>Arcade Atlas does not provide remote computers, relay servers, or streaming bandwidth. Internet play may require extra network setup.</p><p><a class="inline-link" href="https://github.com/moonlight-stream/moonlight-docs/wiki/Setup-Guide" target="_blank" rel="noopener noreferrer">Read Moonlight’s official setup guide ↗</a></p>',
    actions: '<a href="#your-setup" class="close-and-browse">Back to setup options <span>↗</span></a>'
  },
  start: {
    kicker: 'A FRIENDLY PRIMER · START HERE', title: 'Pick a path, then press play.',
    body: '<p><b>Want to start now?</b> Try Starboard Sprint above. It runs right in this page.</p><p><b>Want browser games?</b> Choose a game on its official website and review the site’s terms.</p><p><b>Want classic games?</b> Choose an emulator that fits your device and supply game files you are authorized to use.</p><p><b>Want to play away from your PC?</b> Set up streaming from a computer you own. You will need your own devices and network.</p>',
    actions: '<button class="button button-primary start-from-info" type="button">Play a quick round <span>↗</span></button>'
  }
};
const infoDialog = document.querySelector('#info-dialog');
const dialogKicker = document.querySelector('#dialog-kicker');
const dialogTitle = document.querySelector('#dialog-title');
const dialogContent = document.querySelector('#dialog-content');
const dialogActions = document.querySelector('#dialog-actions');
function openGuide(id) {
  const guide = guideCopy[id];
  if (!guide) return;
  dialogKicker.textContent = guide.kicker;
  dialogTitle.textContent = guide.title;
  dialogContent.innerHTML = guide.body;
  dialogActions.innerHTML = guide.actions;
  infoDialog.showModal();
  dialogActions.querySelector('.start-from-info')?.addEventListener('click', () => {
    infoDialog.close();
    openGame();
  });
  dialogActions.querySelector('.close-and-browse')?.addEventListener('click', (event) => {
    event.preventDefault();
    infoDialog.close();
    const href = event.currentTarget.getAttribute('href');
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
  });
  dialogContent.querySelector('.open-instance')?.addEventListener('click', () => {
    const input = dialogContent.querySelector('#instance-url');
    const error = dialogContent.querySelector('.instance-error');
    try {
      const url = new URL(input.value.trim());
      if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Invalid address');
      error.hidden = true;
      window.open(url.href, '_blank', 'noopener,noreferrer');
    } catch {
      error.hidden = false;
      input.focus();
    }
  });
}
gameCards.forEach((card) => {
  const id = card.dataset.id;
  const activateCard = () => {
    if (id === 'starboard') openGame();
    else if (id === 'skyline') window.location.href = 'skyline-sprint.html';
    else if (id === 'ucity') window.playBuiltinGame();
    else openGuide(id);
  };
  card.querySelector('.card-art').addEventListener('click', activateCard);
  card.querySelector('.launch-card, .guide-card').addEventListener('click', activateCard);
});
document.querySelectorAll('.open-guide').forEach((button) => button.addEventListener('click', () => openGuide(button.dataset.guide)));
document.querySelector('.dialog-close').addEventListener('click', () => infoDialog.close());
infoDialog.addEventListener('click', (event) => { if (event.target === infoDialog) infoDialog.close(); });

const gameDialog = document.querySelector('#game-dialog');
const canvas = document.querySelector('#game-canvas');
const ctx = canvas.getContext('2d');
const overlay = document.querySelector('#game-overlay');
const scoreLabel = document.querySelector('#current-score');
const modalBestLabel = document.querySelector('#modal-best');
let bestScore = 0;
try { bestScore = Number(localStorage.getItem('arcade-atlas-best') || 0); } catch { /* Private browsing can disable storage. */ }
function updateBest() {
  const formatted = String(bestScore).padStart(4, '0');
  modalBestLabel.textContent = formatted;
}
updateBest();
let running = false;
let animationFrame = 0;
let previousFrame = 0;
let score = 0;
let shipX = 450;
let objects = [];
let spawnClock = 0;
const heldKeys = new Set();
const gameStars = Array.from({ length: 75 }, () => ({ x: Math.random() * 900, y: Math.random() * 500, r: Math.random() * 1.8 + .4, s: Math.random() * 15 + 8 }));

function paintBackdrop(time = 0) {
  ctx.fillStyle = '#0d1719';
  ctx.fillRect(0, 0, 900, 500);
  const glow = ctx.createRadialGradient(450, 390, 20, 450, 390, 370);
  glow.addColorStop(0, '#244b3a'); glow.addColorStop(.58, '#172e30'); glow.addColorStop(1, '#111b27');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, 900, 500);
  ctx.strokeStyle = '#b5dcad0c'; ctx.lineWidth = 1;
  for (let x = 0; x < 900; x += 45) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 500); ctx.stroke(); }
  for (let y = 0; y < 500; y += 45) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(900, y); ctx.stroke(); }
  for (const star of gameStars) {
    ctx.globalAlpha = .45 + Math.sin(time / 650 + star.x) * .24;
    ctx.fillStyle = '#e8f0cb'; ctx.beginPath(); ctx.arc(star.x, (star.y + time * star.s / 950) % 500, star.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#66846b'; ctx.fillRect(0, 486, 900, 14);
  ctx.fillStyle = '#bbd184'; ctx.fillRect(0, 484, 900, 2);
}
function drawShip(x, y = 450) {
  ctx.save(); ctx.translate(x, y);
  ctx.shadowColor = '#c8f36a'; ctx.shadowBlur = 18;
  ctx.fillStyle = '#c8f36a'; ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(13, 14); ctx.lineTo(0, 8); ctx.lineTo(-13, 14); ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0; ctx.fillStyle = '#f2f0d4'; ctx.beginPath(); ctx.arc(0, 1, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ff9c70'; ctx.globalAlpha = .7 + Math.random() * .3; ctx.beginPath(); ctx.moveTo(-4, 13); ctx.lineTo(0, 24 + Math.random() * 7); ctx.lineTo(4, 13); ctx.fill();
  ctx.restore();
}
function drawObject(object) {
  ctx.save(); ctx.translate(object.x, object.y); ctx.rotate(object.spin);
  if (object.type === 'star') {
    ctx.shadowColor = '#ffe89b'; ctx.shadowBlur = 16; ctx.fillStyle = '#ffe89b';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const angle = -Math.PI / 2 + i * Math.PI / 5; const radius = i % 2 === 0 ? 11 : 4.5; ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius); }
    ctx.closePath(); ctx.fill();
  } else {
    ctx.shadowColor = '#f19d77'; ctx.shadowBlur = 8; ctx.fillStyle = '#d78969'; ctx.strokeStyle = '#ffc28c'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) { const angle = i * Math.PI / 4; const radius = object.r * (i % 2 ? .78 : 1); ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0; ctx.fillStyle = '#8e5d62'; ctx.fillRect(-4, -2, 3, 3); ctx.fillRect(4, 4, 3, 2);
  }
  ctx.restore();
}
function showGameOver() {
  running = false;
  bestScore = Math.max(bestScore, score);
  try { localStorage.setItem('arcade-atlas-best', String(bestScore)); } catch { /* Private browsing can disable storage. */ }
  updateBest();
  overlay.classList.remove('hidden');
  overlay.querySelector('.overlay-mark').textContent = '✦';
  overlay.querySelector('h3').textContent = 'NICE RUN, PILOT.';
  overlay.querySelector('p').textContent = `You scored ${String(score).padStart(4, '0')}. Want another go?`;
  overlay.querySelector('#start-game').innerHTML = 'Run it back <span>↗</span>';
}
function tick(time) {
  if (!running) return;
  const delta = Math.min((time - previousFrame) / 16.67, 2.5);
  previousFrame = time;
  score += Math.max(1, Math.floor(delta));
  if (heldKeys.has('ArrowLeft') || heldKeys.has('a')) shipX -= 6.2 * delta;
  if (heldKeys.has('ArrowRight') || heldKeys.has('d')) shipX += 6.2 * delta;
  shipX = Math.max(20, Math.min(880, shipX));
  spawnClock += delta;
  if (spawnClock > Math.max(15, 42 - score / 125)) {
    spawnClock = 0;
    const type = Math.random() < .24 ? 'star' : 'rock';
    objects.push({ type, x: 22 + Math.random() * 856, y: -20, r: 12 + Math.random() * 11, speed: 2.1 + Math.random() * 1.3 + score / 500, spin: Math.random() * 6, drift: (Math.random() - .5) * 1.2 });
  }
  paintBackdrop(time);
  for (const object of objects) {
    object.y += object.speed * delta; object.x += object.drift * delta; object.spin += .022 * delta;
    const close = Math.hypot(object.x - shipX, object.y - 450);
    if (object.type === 'rock' && close < object.r + 8) { showGameOver(); break; }
    if (object.type === 'star' && close < object.r + 10) { object.collected = true; score += 100; }
    drawObject(object);
  }
  objects = objects.filter((object) => !object.collected && object.y < 520);
  drawShip(shipX);
  scoreLabel.textContent = String(score).padStart(4, '0');
  if (running) animationFrame = requestAnimationFrame(tick);
}
function startRun() {
  cancelAnimationFrame(animationFrame);
  score = 0; shipX = 450; objects = []; spawnClock = 0; previousFrame = performance.now();
  scoreLabel.textContent = '0000';
  overlay.classList.add('hidden');
  running = true;
  animationFrame = requestAnimationFrame(tick);
}
function openGame() {
  infoDialog.close();
  paintBackdrop(performance.now()); drawShip(450);
  overlay.classList.remove('hidden');
  overlay.querySelector('.overlay-mark').textContent = '▲';
  overlay.querySelector('h3').textContent = 'READY, PILOT?';
  overlay.querySelector('p').textContent = 'Dodge the asteroids. Collect the stars.';
  overlay.querySelector('#start-game').innerHTML = 'Start your run <span>↗</span>';
  gameDialog.showModal();
}
document.querySelector('.game-close').addEventListener('click', () => gameDialog.close());
document.querySelector('#start-game').addEventListener('click', startRun);
gameDialog.addEventListener('close', () => { running = false; cancelAnimationFrame(animationFrame); heldKeys.clear(); });
gameDialog.addEventListener('click', (event) => { if (event.target === gameDialog) gameDialog.close(); });
window.addEventListener('keydown', (event) => {
  if (!gameDialog.open) return;
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (['ArrowLeft', 'ArrowRight', ' '].includes(key)) event.preventDefault();
  heldKeys.add(key);
});
window.addEventListener('keyup', (event) => heldKeys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key));
document.querySelectorAll('[data-control]').forEach((button) => {
  const key = button.dataset.control === 'left' ? 'ArrowLeft' : 'ArrowRight';
  button.addEventListener('pointerdown', (event) => { event.preventDefault(); heldKeys.add(key); });
  for (const name of ['pointerup', 'pointercancel', 'pointerleave']) button.addEventListener(name, () => heldKeys.delete(key));
});
