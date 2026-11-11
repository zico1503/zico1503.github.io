(() => {
  const canvas = document.querySelector('#world');
  const ctx = canvas.getContext('2d', { alpha: false });
  const overlay = document.querySelector('#overlay');
  const startButton = document.querySelector('#start-button');
  const pauseButton = document.querySelector('#pause-button');
  const playerX = 260;
  const groundY = 438;
  const width = 960;
  const height = 540;
  const bananaLabel = document.querySelector('#banana-count');
  const distanceLabel = document.querySelector('#distance');
  const heartsLabel = document.querySelector('#hearts');
  const chaseMeter = document.querySelector('#chase-meter');
  const bestLabel = document.querySelector('#best-score');
  const comboPop = document.querySelector('#combo-pop');
  const overlayIcon = document.querySelector('#overlay-icon');
  const overlayKicker = document.querySelector('#overlay-kicker');
  const overlayTitle = document.querySelector('#overlay-title');
  const overlayCopy = document.querySelector('#overlay-copy');
  let best = 0;
  try { best = Number(localStorage.getItem('arcade-atlas-banana-best') || 0); } catch { /* Storage can be unavailable in private browsing. */ }
  bestLabel.textContent = `${best} bananas`;

  if (!ctx) {
    document.querySelector('#canvas-error').hidden = false;
    overlay.classList.add('hidden');
    return;
  }

  const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const roundRect = (x, y, w, h, r, fill) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, r);
    else {
      ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    }
    ctx.fill();
  };
  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.max(1, Math.floor(canvas.clientWidth * ratio));
    const h = Math.max(1, Math.floor(canvas.clientHeight * ratio));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    ctx.setTransform(w / width, 0, 0, h / height, 0, 0);
  }
  window.addEventListener('resize', resize);

  let state = 'ready';
  let worldX = 0;
  let bananas = 0;
  let hearts = 3;
  let chaseGap = 188;
  let jumpY = 0;
  let jumpV = 0;
  let slideTimer = 0;
  let invulnerable = 0;
  let speed = 310;
  let elapsed = 0;
  let combo = 0;
  let comboTime = 0;
  let lastTime = 0;
  let lastHit = '';
  let comboTimeout = 0;
  let hazards = [];
  let fruit = [];
  let nextHazard = 610;
  let nextFruit = 220;

  function reset() {
    worldX = 0; bananas = 0; hearts = 3; chaseGap = 188; jumpY = 0; jumpV = 0; slideTimer = 0; invulnerable = 0;
    speed = 310; elapsed = 0; combo = 0; comboTime = 0; lastHit = ''; hazards = []; fruit = []; nextHazard = 610; nextFruit = 220;
    updateHud();
  }
  function updateHud() {
    bananaLabel.textContent = String(bananas);
    distanceLabel.innerHTML = `${Math.floor(worldX / 100)}<span>m</span>`;
    heartsLabel.textContent = `${'♥ '.repeat(hearts).trim()}${hearts < 3 ? ' ·'.repeat(3 - hearts) : ''}`;
    chaseMeter.style.width = `${clamp((220 - chaseGap) / 220 * 100, 0, 100)}%`;
  }
  function setOverlay(mode) {
    state = mode;
    overlay.classList.remove('hidden');
    pauseButton.disabled = true;
    if (mode === 'ready') {
      overlayIcon.textContent = '🍌'; overlayKicker.textContent = 'THE JUNGLE IS YOURS'; overlayTitle.textContent = 'Ready, monkey?';
      overlayCopy.textContent = 'Snag bananas, hop over logs, slide under vines, and stay ahead of the Monkey Prisoners.';
      startButton.innerHTML = 'Start the escape <span>↗</span>';
    } else if (mode === 'paused') {
      overlayIcon.textContent = 'Ⅱ'; overlayKicker.textContent = 'THE CHASE IS ON HOLD'; overlayTitle.textContent = 'Catch your breath.';
      overlayCopy.textContent = `You have ${bananas} bananas and ${hearts} hearts left. Resume when you’re ready.`;
      startButton.innerHTML = 'Keep running <span>↗</span>';
    } else {
      overlayIcon.textContent = '🐒'; overlayKicker.textContent = `${Math.floor(worldX / 100)} METRES FROM THE CELL`; overlayTitle.textContent = 'They caught up!';
      overlayCopy.textContent = `You grabbed ${bananas} ${bananas === 1 ? 'banana' : 'bananas'}. Want another escape attempt?`;
      startButton.innerHTML = 'Try again <span>↗</span>';
    }
    bestLabel.textContent = `${best} bananas`;
  }
  function startGame() {
    if (state === 'paused') {
      state = 'running'; overlay.classList.add('hidden'); pauseButton.disabled = false; lastTime = performance.now(); return;
    }
    reset(); state = 'running'; overlay.classList.add('hidden'); pauseButton.disabled = false; lastTime = performance.now();
  }
  function pauseGame() {
    if (state === 'running') setOverlay('paused');
    else if (state === 'paused') startGame();
  }
  function finishGame() {
    if (state !== 'running') return;
    if (bananas > best) {
      best = bananas;
      try { localStorage.setItem('arcade-atlas-banana-best', String(best)); } catch { /* Keep the best for this session. */ }
    }
    setOverlay('ended');
  }
  function loseHeart(reason) {
    if (invulnerable > 0 || state !== 'running') return;
    hearts -= 1;
    chaseGap = Math.max(66, chaseGap - 57);
    invulnerable = 1.45;
    lastHit = reason;
    updateHud();
    if (hearts <= 0) finishGame();
  }
  function jump() {
    if (state === 'running' && jumpY <= 0) { jumpV = 610; slideTimer = 0; }
  }
  function slide() { if (state === 'running' && jumpY <= 4) slideTimer = 0.62; }
  startButton.addEventListener('click', startGame);
  pauseButton.addEventListener('click', pauseGame);
  window.addEventListener('keydown', (event) => {
    if (state === 'running' && ['ArrowUp', ' ', 'ArrowDown', 's', 'S'].includes(event.key)) event.preventDefault();
    if (event.repeat) return;
    if (event.key === 'ArrowUp' || event.key === ' ') jump();
    if (event.key === 'ArrowDown' || event.key.toLowerCase() === 's') slide();
    if (event.key.toLowerCase() === 'p' || event.key === 'Escape') pauseGame();
  });
  document.querySelectorAll('.touch-pad button').forEach((button) => button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    if (button.dataset.action === 'jump') jump(); else slide();
  }));
  document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'running') pauseGame(); });

  function spawnFruit() {
    const isGolden = Math.floor(nextFruit / 220) % 8 === 6;
    const heights = [67, 106, 72];
    for (let i = 0; i < 3; i += 1) fruit.push({ x: nextFruit + i * 42, height: heights[i], golden: isGolden && i === 1, taken: false, phase: i * 0.7 });
    nextFruit += 300 + Math.random() * 145;
  }
  function spawnHazard() {
    const index = hazards.length;
    const type = ['log', 'vine', 'crate', 'log', 'vine'][index % 5];
    hazards.push({ x: nextHazard, type, cleared: false, hit: false });
    nextHazard += Math.max(390, 650 - worldX * 0.006) + Math.random() * 100;
  }
  function update(dt) {
    elapsed += dt;
    speed = Math.min(455, 310 + worldX * 0.018);
    worldX += speed * dt;
    chaseGap = Math.max(0, chaseGap - dt * (2.5 + worldX * 0.0007));
    invulnerable = Math.max(0, invulnerable - dt);
    slideTimer = Math.max(0, slideTimer - dt);
    comboTime = Math.max(0, comboTime - dt);
    if (comboTime === 0) combo = 0;
    if (jumpY > 0 || jumpV > 0) {
      jumpY += jumpV * dt;
      jumpV -= 1580 * dt;
      if (jumpY <= 0) { jumpY = 0; jumpV = 0; }
    }
    while (nextFruit < worldX + width + 80) spawnFruit();
    while (nextHazard < worldX + width + 120) spawnHazard();

    const playerTop = groundY - jumpY - (slideTimer > 0 ? 48 : 103);
    const playerBottom = groundY - jumpY - 4;
    for (const item of fruit) {
      if (item.taken) continue;
      const sx = playerX + item.x - worldX;
      const sy = groundY - item.height + Math.sin(elapsed * 4 + item.phase) * 4;
      if (Math.abs(sx - playerX) < 37 && sy + 24 > playerTop && sy - 24 < playerBottom) {
        item.taken = true;
        bananas += item.golden ? 5 : 1;
        chaseGap = Math.min(220, chaseGap + (item.golden ? 68 : 19));
        combo += 1; comboTime = 3.2;
        const text = item.golden ? 'GOLDEN BANANA +5!' : combo > 1 ? `BANANA COMBO ×${combo}!` : '+1 BANANA';
        comboPop.textContent = text; comboPop.classList.add('visible');
        clearTimeout(comboTimeout); comboTimeout = setTimeout(() => comboPop.classList.remove('visible'), 750);
      }
    }
    for (const hazard of hazards) {
      if (hazard.cleared || hazard.hit) continue;
      const sx = playerX + hazard.x - worldX;
      if (Math.abs(sx - playerX) < 35) {
        const escaped = hazard.type === 'vine' ? slideTimer > 0 : jumpY > (hazard.type === 'crate' ? 76 : 46);
        if (escaped) hazard.cleared = true;
        else { hazard.hit = true; loseHeart('hazard'); }
      }
    }
    if (chaseGap < 39) {
      loseHeart('caught');
      if (state === 'running') chaseGap = 146;
    }
    fruit = fruit.filter((item) => !item.taken && item.x > worldX - 120);
    hazards = hazards.filter((item) => item.x > worldX - 150);
    updateHud();
  }

  function polygon(points, fill) {
    ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i][0], points[i][1]);
    ctx.closePath(); ctx.fill();
  }
  function drawLeaf(x, y, length, angle, color) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(length * 0.5, -length * 0.25, length, 0); ctx.quadraticCurveTo(length * 0.5, length * 0.25, 0, 0); ctx.fill();
    ctx.strokeStyle = '#d7f49b66'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(length * 0.88, 0); ctx.stroke(); ctx.restore();
  }
  function drawTree(x, y, scale, phase) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
    ctx.fillStyle = '#553d2c'; ctx.beginPath(); ctx.moveTo(-18, 0); ctx.quadraticCurveTo(-5, -65, -10, -155); ctx.lineTo(17, -155); ctx.quadraticCurveTo(5, -56, 21, 0); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 7; i += 1) drawLeaf(0, -145, 85 + Math.sin(phase + i) * 18, i * 0.9 + phase, ['#1e7349','#2c8a50','#62a64d','#3a9457'][i % 4]);
    ctx.restore();
  }
  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, groundY);
    sky.addColorStop(0, '#69bb8b'); sky.addColorStop(0.52, '#acd987'); sky.addColorStop(1, '#f4d57c');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
    const sun = ctx.createRadialGradient(760, 105, 8, 760, 105, 94);
    sun.addColorStop(0, '#fff2a8dd'); sun.addColorStop(1, '#fff2a800'); ctx.fillStyle = sun; ctx.fillRect(650, 0, 220, 220);
    ctx.fillStyle = '#ffe990'; ctx.beginPath(); ctx.arc(760, 103, 34, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 3; i += 1) {
      const offset = (worldX * (0.045 + i * 0.045)) % 420;
      ctx.globalAlpha = 0.17 + i * 0.08;
      for (let j = -1; j < 4; j += 1) {
        const x = j * 420 - offset;
        polygon([[x, 338],[x+134, 180-i*20],[x+270, 338]], ['#568f68','#417d5b','#316e52'][i]);
      }
    }
    ctx.globalAlpha = 1;
    for (let i = -1; i < 5; i += 1) {
      const x = i * 276 - ((worldX * 0.19) % 276);
      drawTree(x + 38, 403, 0.86, i * 0.4);
      drawTree(x + 188, 395, 0.64, i * 0.9 + 1);
    }
    for (let i = -1; i < 9; i += 1) {
      const x = i * 145 - ((worldX * 0.35) % 145);
      drawLeaf(x, 6 + (i % 2) * 18, 118, 0.72 + (i % 3) * 0.2, i % 2 ? '#23724b' : '#318955');
      drawLeaf(x + 33, 18, 102, 2.28, '#1e6846');
    }
    ctx.fillStyle = '#694833'; ctx.fillRect(0, groundY, width, height - groundY);
    ctx.fillStyle = '#5d9c46'; ctx.fillRect(0, groundY - 9, width, 18);
    ctx.fillStyle = '#a4d55b'; ctx.fillRect(0, groundY - 10, width, 5);
    ctx.fillStyle = '#415d32';
    for (let i = -1; i < 19; i += 1) {
      const x = i * 64 - (worldX % 64);
      ctx.beginPath(); ctx.ellipse(x + 11, groundY + 23 + (i % 3) * 13, 18, 4, -0.25, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = '#d2e57c'; ctx.lineWidth = 3;
    for (let i = -1; i < 14; i += 1) {
      const x = i * 112 - ((worldX * 0.72) % 112);
      ctx.beginPath(); ctx.moveTo(x, groundY - 8); ctx.lineTo(x - 5, groundY - 17); ctx.stroke();
    }
  }
  function drawBanana(x, y, scale = 1, golden = false, phase = 0) {
    ctx.save(); ctx.translate(x, y + Math.sin(elapsed * 4 + phase) * 3); ctx.rotate(-0.2); ctx.scale(scale, scale);
    const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, golden ? 39 : 29);
    glow.addColorStop(0, golden ? '#fff7b955' : '#ffe87533'); glow.addColorStop(1, '#ffe87500'); ctx.fillStyle = glow; ctx.fillRect(-40, -40, 80, 80);
    ctx.strokeStyle = golden ? '#ffb62d' : '#e5ae24'; ctx.lineWidth = 17; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-12, -13); ctx.quadraticCurveTo(16, 4, 17, -20); ctx.stroke();
    ctx.strokeStyle = golden ? '#fff074' : '#ffe35d'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(-12, -13); ctx.quadraticCurveTo(16, 4, 17, -20); ctx.stroke();
    ctx.strokeStyle = '#794d26'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-16, -15); ctx.lineTo(-10, -10); ctx.moveTo(14,-21); ctx.lineTo(20,-22); ctx.stroke();
    ctx.restore();
  }
  function drawMonkey(x, feetY, scale, frameNo, prisoner = false, flash = false, sliding = false) {
    ctx.save(); ctx.translate(x, feetY); ctx.scale(scale, scale);
    if (sliding) ctx.scale(1.22, 0.62);
    const fur = prisoner ? '#76503a' : '#895532';
    const suit = prisoner ? '#e27645' : '#b96f42';
    const limb = Math.sin(frameNo * 13) * (prisoner ? 8 : 12);
    if (flash) ctx.globalAlpha = 0.42 + Math.sin(frameNo * 35) * 0.35;
    ctx.strokeStyle = fur; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-1, -45); ctx.bezierCurveTo(-46, -48, -42, -7, -14, -16); ctx.stroke();
    ctx.fillStyle = '#543c2b'; ctx.beginPath(); ctx.ellipse(-38, -47, 8, 5, 0.3, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = fur; ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(-4,-26); ctx.lineTo(-10+limb*.3,-5); ctx.lineTo(-18+limb*.4,0); ctx.moveTo(4,-26); ctx.lineTo(11-limb*.3,-5); ctx.lineTo(20-limb*.4,0); ctx.stroke();
    ctx.strokeStyle = '#493222'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-16+limb*.4,0); ctx.lineTo(-7+limb*.4,0); ctx.moveTo(20-limb*.4,0); ctx.lineTo(29-limb*.4,0); ctx.stroke();
    if (prisoner) {
      ctx.fillStyle = suit; ctx.beginPath(); ctx.roundRect(-20,-61,41,37,9); ctx.fill();
      ctx.fillStyle = '#ffe1b1'; ctx.fillRect(-13,-57,5,30); ctx.fillRect(0,-57,5,30); ctx.fillRect(13,-57,4,30);
    } else {
      ctx.fillStyle = suit; ctx.beginPath(); ctx.ellipse(0,-42,21,24,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = '#e8ba87'; ctx.beginPath(); ctx.ellipse(5,-41,11,15,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = '#5cc6a0'; ctx.fillRect(-18,-61,37,7);
    }
    ctx.strokeStyle = fur; ctx.lineWidth = 13; ctx.beginPath(); ctx.moveTo(-12,-55); ctx.lineTo(-25+limb*.25,-38); ctx.lineTo(-27+limb*.25,-28); ctx.moveTo(12,-55); ctx.lineTo(25-limb*.25,-40); ctx.lineTo(29-limb*.25,-31); ctx.stroke();
    ctx.fillStyle = fur; ctx.beginPath(); ctx.ellipse(0,-78,28,27,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#d29a64'; ctx.beginPath(); ctx.ellipse(-22,-78,9,11,0,0,Math.PI*2); ctx.ellipse(22,-78,9,11,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ffdcb0'; ctx.beginPath(); ctx.ellipse(7,-70,20,14,-0.12,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#f4bd8e'; ctx.beginPath(); ctx.ellipse(14,-76,6,4,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#251d18'; ctx.beginPath(); ctx.arc(5,-84,2.7,0,Math.PI*2); ctx.arc(19,-84,2.7,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#3b281d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(1,-89); ctx.lineTo(8,-91); ctx.moveTo(16,-91); ctx.lineTo(23,-89); ctx.stroke();
    if (prisoner) {
      ctx.fillStyle = '#4d4e56'; ctx.fillRect(-14,-102,28,6); ctx.fillRect(-10,-96,6,4); ctx.fillRect(4,-96,6,4);
    } else {
      ctx.fillStyle = '#f04f43'; ctx.beginPath(); ctx.moveTo(-25,-96); ctx.lineTo(25,-96); ctx.lineTo(17,-88); ctx.lineTo(-17,-88); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffe16b'; ctx.beginPath(); ctx.arc(-6,-72,2,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }
  function drawHazard(item, x) {
    if (item.type === 'vine') {
      ctx.strokeStyle = '#326f3e'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x-48, 261); ctx.quadraticCurveTo(x, 299, x+48, 260); ctx.stroke();
      ctx.fillStyle = '#6a9e49'; ctx.beginPath(); ctx.ellipse(x-35,281,17,6,-.65,0,Math.PI*2); ctx.ellipse(x+34,282,17,6,.6,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = '#d1e48a'; ctx.beginPath(); ctx.arc(x,292,7,0,Math.PI*2); ctx.fill();
    } else if (item.type === 'crate') {
      roundRect(x-29, groundY-53, 58, 45, 7, '#bc6a3d');
      ctx.strokeStyle = '#6f402b'; ctx.lineWidth = 5; ctx.strokeRect(x-23,groundY-47,46,33); ctx.beginPath(); ctx.moveTo(x-20,groundY-44); ctx.lineTo(x+20,groundY-17); ctx.moveTo(x+20,groundY-44); ctx.lineTo(x-20,groundY-17); ctx.stroke();
      ctx.fillStyle = '#ffe16b'; ctx.beginPath(); ctx.arc(x,groundY-58,6,0,Math.PI*2); ctx.fill();
    } else {
      ctx.fillStyle = '#7a472e'; ctx.beginPath(); ctx.ellipse(x,groundY-14,39,18,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = '#a7693e'; ctx.beginPath(); ctx.ellipse(x-3,groundY-20,34,13,0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#dfaa65'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x-26,groundY-22); ctx.lineTo(x-27,groundY-8); ctx.moveTo(x+4,groundY-29); ctx.lineTo(x+5,groundY-11); ctx.stroke();
    }
  }
  function draw(now) {
    ctx.clearRect(0, 0, width, height);
    drawBackground();
    for (const item of fruit) {
      const x = playerX + item.x - worldX;
      if (x < -50 || x > width + 50) continue;
      drawBanana(x, groundY - item.height, item.golden ? 1.1 : 0.8, item.golden, item.phase);
    }
    for (const item of hazards) {
      const x = playerX + item.x - worldX;
      if (x < -100 || x > width + 100) continue;
      drawHazard(item, x);
    }
    const prisonerX = clamp(playerX - chaseGap, -35, playerX - 38);
    drawMonkey(prisonerX - 32, groundY, 0.78, elapsed + 0.22, true, false);
    drawMonkey(prisonerX, groundY, 0.92, elapsed, true, false);
    if (lastHit && invulnerable > 0.95) {
      ctx.fillStyle = '#fff0b3'; ctx.font = '700 13px "DM Sans", sans-serif'; ctx.textAlign = 'center'; ctx.fillText(lastHit === 'hazard' ? 'WATCH OUT!' : 'THEY’RE CATCHING UP!', playerX, groundY - 149);
    }
    const blink = invulnerable > 0 && Math.floor(now / 95) % 2 === 0;
    if (!blink) drawMonkey(playerX, groundY - jumpY, 1, elapsed, false, false, slideTimer > 0);
    if (slideTimer > 0) {
      ctx.fillStyle = '#d7ffae'; ctx.font = '700 10px "DM Mono", monospace'; ctx.textAlign = 'center'; ctx.fillText('SLIDE!', playerX, groundY - 77);
    }
  }
  function tick(now) {
    const dt = Math.min(0.04, Math.max(0, (now - (lastTime || now)) / 1000));
    lastTime = now;
    if (state === 'running') update(dt);
    draw(now);
    requestAnimationFrame(tick);
  }

  resize();
  draw(0);
  requestAnimationFrame(tick);
  window.addEventListener('pagehide', () => clearTimeout(comboTimeout), { once: true });
})();
