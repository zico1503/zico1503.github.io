(() => {
  const canvas = document.querySelector('#world');
  const gl = canvas.getContext('webgl', { antialias: true, alpha: false, powerPreference: 'low-power' });
  const overlay = document.querySelector('#overlay');
  const startButton = document.querySelector('#start-button');
  const statusTitle = document.querySelector('#overlay-title');
  const statusCopy = document.querySelector('#overlay-copy');
  const statusKicker = document.querySelector('#overlay-kicker');
  const statusIcon = document.querySelector('#overlay-icon');
  const distanceLabel = document.querySelector('#distance');
  const orbLabel = document.querySelector('#orbs');
  const bestLabel = document.querySelector('#best-score');
  const pauseButton = document.querySelector('#pause-button');
  const frame = document.querySelector('.game-frame');
  let best = 0;
  try { best = Number(localStorage.getItem('arcade-atlas-skyline-best') || 0); } catch { /* Storage can be unavailable in private browsing. */ }
  bestLabel.textContent = `${best} m`;

  if (!gl) {
    document.querySelector('#webgl-error').hidden = false;
    overlay.classList.add('hidden');
    return;
  }

  const vertexSource = `
    attribute vec3 aPosition;
    attribute vec3 aColor;
    uniform mat4 uProjection;
    uniform mat4 uView;
    varying vec3 vColor;
    void main() { gl_Position = uProjection * uView * vec4(aPosition, 1.0); vColor = aColor; }
  `;
  const fragmentSource = `
    precision mediump float;
    varying vec3 vColor;
    void main() { gl_FragColor = vec4(vColor, 1.0); }
  `;
  function makeShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || '3D shader failed');
    return shader;
  }
  let program;
  try {
    program = gl.createProgram();
    gl.attachShader(program, makeShader(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, makeShader(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || '3D view failed');
  } catch {
    document.querySelector('#webgl-error').hidden = false;
    overlay.classList.add('hidden');
    return;
  }

  const positionLocation = gl.getAttribLocation(program, 'aPosition');
  const colorLocation = gl.getAttribLocation(program, 'aColor');
  const projectionLocation = gl.getUniformLocation(program, 'uProjection');
  const viewLocation = gl.getUniformLocation(program, 'uView');
  const positionBuffer = gl.createBuffer();
  const colorBuffer = gl.createBuffer();
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.useProgram(program);
  gl.enableVertexAttribArray(positionLocation);
  gl.enableVertexAttribArray(colorLocation);

  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const mix = (a, b, t) => a + (b - a) * t;
  const normalize = (v) => { const n = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / n, v[1] / n, v[2] / n]; };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  function perspective(fov, aspect, near, far) {
    const f = 1 / Math.tan(fov / 2), nf = 1 / (near - far);
    return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
  }
  function lookAt(eye, target, up) {
    const z = normalize([eye[0] - target[0], eye[1] - target[1], eye[2] - target[2]]);
    const x = normalize(cross(up, z));
    const y = cross(z, x);
    return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, eye), -dot(y, eye), -dot(z, eye), 1]);
  }
  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = Math.max(1, Math.floor(canvas.clientWidth * ratio));
    const height = Math.max(1, Math.floor(canvas.clientHeight * ratio));
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    gl.viewport(0, 0, width, height);
  }
  window.addEventListener('resize', resize);

  const colors = {
    roof: [0.11, 0.15, 0.25], roofEdge: [0.20, 0.25, 0.36], lane: [0.12, 0.55, 0.55], lime: [0.79, 0.95, 0.40],
    cyan: [0.22, 0.84, 0.82], pink: [0.98, 0.35, 0.52], orange: [1.00, 0.57, 0.33], white: [0.83, 0.91, 0.94],
    buildingA: [0.10, 0.15, 0.29], buildingB: [0.15, 0.17, 0.34], buildingC: [0.11, 0.24, 0.34], window: [0.34, 0.65, 0.73]
  };
  let positions = [];
  let colorsForFrame = [];
  function triangle(a, b, c, color, light = 1) {
    const shade = Math.max(0, Math.min(1.35, light));
    for (const v of [a, b, c]) {
      positions.push(v[0], v[1], v[2]);
      colorsForFrame.push(Math.min(1, color[0] * shade), Math.min(1, color[1] * shade), Math.min(1, color[2] * shade));
    }
  }
  function box(x, y, z, width, height, depth, color, light = 1) {
    const x0 = x - width / 2, x1 = x + width / 2, y0 = y - height / 2, y1 = y + height / 2, z0 = z - depth / 2, z1 = z + depth / 2;
    const faces = [
      { p: [[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]], l: 1.10 },
      { p: [[x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0]], l: 0.64 },
      { p: [[x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0]], l: 0.78 },
      { p: [[x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1]], l: 0.88 },
      { p: [[x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0]], l: 1.27 },
      { p: [[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1]], l: 0.53 }
    ];
    for (const f of faces) { const [a,b,c,d] = f.p; triangle(a,b,c,color,light*f.l); triangle(a,c,d,color,light*f.l); }
  }
  function octahedron(x, y, z, r, color, light = 1) {
    const top=[x,y+r,z], bottom=[x,y-r,z], left=[x-r,y,z], right=[x+r,y,z], front=[x,y,z+r], back=[x,y,z-r];
    for (const tri of [[top,front,right],[top,right,back],[top,back,left],[top,left,front],[bottom,right,front],[bottom,back,right],[bottom,left,back],[bottom,front,left]]) triangle(...tri,color,light);
  }
  function buildingRandom(seed) { const n = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); }

  const laneX = [-2.15, 0, 2.15];
  let state = 'ready';
  let distance = 0;
  let orbs = 0;
  let lane = 1;
  let playerX = 0;
  let jumpTime = 1;
  let elapsed = 0;
  let lastTime = 0;
  let animationFrame = 0;
  let obstacleList = [];
  let orbList = [];
  const segmentSize = 8;
  const jumpDuration = 0.96;

  function gapSegment(index) { return index >= 6 && index % 11 === 6; }
  function updateHUD() { distanceLabel.innerHTML = `${Math.floor(distance)}<span>m</span>`; orbLabel.textContent = String(orbs); }
  function showOverlay(kind) {
    state = kind;
    overlay.classList.remove('hidden');
    frame.classList.remove('running');
    pauseButton.disabled = kind !== 'running';
    if (kind === 'ready') {
      statusIcon.textContent = '◆'; statusKicker.textContent = 'ROOFTOPS ARE CALLING'; statusTitle.textContent = 'Ready to run?';
      statusCopy.textContent = 'Jump the gaps, weave around the sentry bots, and grab every glowing orb you can.';
      startButton.innerHTML = 'Start running <span>↗</span>';
    } else if (kind === 'paused') {
      statusIcon.textContent = 'Ⅱ'; statusKicker.textContent = 'TAKE YOUR TIME'; statusTitle.textContent = 'Run paused';
      statusCopy.textContent = `You made it ${Math.floor(distance)} metres. Pick up where you left off when you’re ready.`;
      startButton.innerHTML = 'Resume run <span>↗</span>';
    } else {
      statusIcon.textContent = '✦'; statusKicker.textContent = `${orbs} ORBS COLLECTED`; statusTitle.textContent = 'Nice run.';
      statusCopy.textContent = `You made it ${Math.floor(distance)} metres through the neon rooftops. Fancy another?`;
      startButton.innerHTML = 'Run it back <span>↗</span>';
    }
    bestLabel.textContent = `${best} m`;
  }
  function createCourse() {
    obstacleList = [];
    orbList = [];
    let seed = 0;
    for (let d = 22; d < 720; d += 11.5) {
      seed += 1;
      const targetLane = Math.floor(buildingRandom(seed + 11) * 3);
      obstacleList.push({ d, lane: targetLane, style: seed % 3 });
    }
    for (let d = 13, i = 0; d < 720; d += 5.2, i += 1) {
      const targetLane = i % 4 === 2 ? 1 : Math.floor(buildingRandom(i + 77) * 3);
      orbList.push({ d, lane: targetLane, taken: false });
    }
  }
  function startRun() {
    if (state === 'paused') {
      state = 'running'; overlay.classList.add('hidden'); frame.classList.add('running'); pauseButton.disabled = false; lastTime = performance.now(); return;
    }
    distance = 0; orbs = 0; lane = 1; playerX = 0; jumpTime = 1; elapsed = 0;
    createCourse(); updateHUD(); state = 'running'; overlay.classList.add('hidden'); frame.classList.add('running'); pauseButton.disabled = false;
    lastTime = performance.now();
  }
  function finishRun() {
    state = 'ended';
    const finalDistance = Math.floor(distance);
    if (finalDistance > best) { best = finalDistance; try { localStorage.setItem('arcade-atlas-skyline-best', String(best)); } catch { /* Keep the current-session score. */ } }
    bestLabel.textContent = `${best} m`;
    showOverlay('ended');
  }
  function moveLane(direction) {
    if (state !== 'running') return;
    lane = clamp(lane + direction, 0, 2);
  }
  function jump() { if (state === 'running' && jumpTime >= jumpDuration) jumpTime = 0; }
  function pauseToggle() {
    if (state === 'running') showOverlay('paused');
    else if (state === 'paused') startRun();
  }
  startButton.addEventListener('click', startRun);
  pauseButton.addEventListener('click', pauseToggle);
  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    if (state === 'running' && ['ArrowLeft','ArrowRight','ArrowUp',' ','a','A','d','D'].includes(event.key)) event.preventDefault();
    if (state === 'running' && (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a')) moveLane(-1);
    if (state === 'running' && (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd')) moveLane(1);
    if (state === 'running' && (event.key === 'ArrowUp' || event.key === ' ')) jump();
    if (event.key.toLowerCase() === 'p' || event.key === 'Escape') pauseToggle();
  });
  document.querySelectorAll('.touch-pad button').forEach((button) => {
    button.addEventListener('pointerdown', (event) => { event.preventDefault(); const action = button.dataset.action; if (action === 'left') moveLane(-1); else if (action === 'right') moveLane(1); else jump(); });
  });
  canvas.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse') return;
    canvas.dataset.touchX = String(event.clientX);
  });
  canvas.addEventListener('pointerup', (event) => {
    if (event.pointerType === 'mouse' || !canvas.dataset.touchX) return;
    const delta = event.clientX - Number(canvas.dataset.touchX);
    if (Math.abs(delta) > 32) moveLane(delta > 0 ? 1 : -1);
    else if (event.clientY < canvas.getBoundingClientRect().top + canvas.clientHeight * 0.75) jump();
    canvas.dataset.touchX = '';
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'running') pauseToggle(); });

  function update(dt) {
    const speed = Math.min(14.5, 8.5 + distance * 0.005);
    distance += speed * dt;
    elapsed += dt;
    playerX = mix(playerX, laneX[lane], Math.min(1, dt * 12));
    jumpTime = Math.min(jumpDuration, jumpTime + dt);
    const progress = jumpTime / jumpDuration;
    const jumpHeight = jumpTime < jumpDuration ? Math.sin(progress * Math.PI) * 1.75 : 0;
    const currentSegment = Math.floor(distance / segmentSize);
    const segmentOffset = distance - currentSegment * segmentSize;
    if (gapSegment(currentSegment) && segmentOffset >= 2 && segmentOffset <= 6 && jumpHeight < 0.30) { finishRun(); return; }
    for (const obstacle of obstacleList) {
      if (!obstacle.hit && Math.abs(obstacle.d - distance) < 0.48 && lane === obstacle.lane) {
        if (jumpHeight < 0.92) { finishRun(); return; }
        obstacle.hit = true;
      }
    }
    for (const orb of orbList) {
      if (!orb.taken && Math.abs(orb.d - distance) < 0.72 && lane === orb.lane) { orb.taken = true; orbs += 1; }
    }
    updateHUD();
  }

  function addBuilding(x, z, seed, palette) {
    const h = 2.2 + buildingRandom(seed) * 6.4;
    const w = 1.5 + buildingRandom(seed + 4) * 1.4;
    const d = 3.4 + buildingRandom(seed + 8) * 3.6;
    const shade = palette[Math.floor(buildingRandom(seed + 12) * palette.length)];
    box(x, h / 2 - 0.1, z, w, h, d, shade);
    box(x, h + 0.08, z, w * 0.68, 0.15, d * 0.72, colors.window, 0.65);
    for (let row = 0; row < Math.floor(h / 1.2); row += 1) {
      for (let col = 0; col < 2; col += 1) {
        const wx = x + (col ? 0.33 : -0.33) * w;
        const wy = 0.45 + row * 1.02;
        box(wx, wy, z + d / 2 + 0.018, 0.10, 0.19, 0.035, (row + col + seed) % 5 ? colors.window : colors.cyan, 0.7);
      }
    }
  }

  function drawScene(now) {
    positions = []; colorsForFrame = [];
    const segmentIndex = Math.floor(distance / segmentSize);
    for (let index = Math.max(0, segmentIndex - 2); index <= segmentIndex + 10; index += 1) {
      if (gapSegment(index)) {
        for (const offset of [1, 7]) {
          const edgeZ = distance - (index * segmentSize + offset);
          box(0, -0.42, edgeZ, 8.3, 0.75, 1.92, colors.roof);
          box(0, -0.045, edgeZ, 7.92, 0.045, 1.88, colors.roofEdge, 0.7);
          box(0, 0.006, edgeZ, 7.4, 0.016, 0.055, colors.orange, 1.1);
        }
        continue;
      }
      const z = distance - (index * segmentSize + segmentSize / 2);
      box(0, -0.42, z, 8.3, 0.75, 7.82, colors.roof);
      box(0, -0.045, z, 7.92, 0.045, 7.74, colors.roofEdge, 0.7);
      for (const markX of [-1.4, 1.4]) box(markX, 0.006, z, 0.026, 0.016, 7.35, colors.lane, 0.9);
      box(0, 0.006, z, 0.018, 0.016, 7.35, colors.lane, 0.65);
    }
    const cityStep = Math.floor(distance / 7);
    for (let i = -2; i < 12; i += 1) {
      const block = cityStep + i;
      const z = distance - (block * 7 + (distance % 7));
      addBuilding(-7.1 - buildingRandom(block + 3) * 1.6, z, block + 9, [colors.buildingA, colors.buildingB, colors.buildingC]);
      addBuilding(7.1 + buildingRandom(block + 18) * 1.6, z - 2.4, block + 30, [colors.buildingA, colors.buildingB, colors.buildingC]);
    }
    for (const obstacle of obstacleList) {
      const z = distance - obstacle.d;
      if (z < -78 || z > 9 || obstacle.hit) continue;
      const x = laneX[obstacle.lane];
      const color = obstacle.style === 0 ? colors.pink : obstacle.style === 1 ? colors.orange : colors.cyan;
      box(x, 0.46, z, 1.0, 0.92, 0.86, color);
      box(x, 0.98, z, 0.7, 0.14, 0.92, colors.white, 0.65);
      box(x - 0.22, 0.58, z + 0.445, 0.11, 0.12, 0.04, colors.white, 1.2);
      box(x + 0.22, 0.58, z + 0.445, 0.11, 0.12, 0.04, colors.white, 1.2);
    }
    for (const orb of orbList) {
      const z = distance - orb.d;
      if (z < -70 || z > 8 || orb.taken) continue;
      const pulse = 1 + Math.sin(now * 0.004 + orb.d) * 0.12;
      octahedron(laneX[orb.lane], 1.15 + Math.sin(now * 0.003 + orb.d) * 0.08, z, 0.31 * pulse, colors.lime, 1.3);
    }
    const jumpProgress = jumpTime / jumpDuration;
    const jumpHeight = jumpTime < jumpDuration ? Math.sin(jumpProgress * Math.PI) * 1.75 : 0;
    const stride = state === 'running' ? Math.sin(elapsed * 14) * 0.16 : 0;
    box(playerX, 1.00 + jumpHeight, 0, 0.55, 0.72, 0.40, colors.cyan, 1.1);
    box(playerX, 1.64 + jumpHeight, -0.035, 0.49, 0.43, 0.43, colors.white);
    box(playerX, 1.68 + jumpHeight, 0.20, 0.29, 0.09, 0.035, colors.pink, 1.3);
    box(playerX - 0.43, 1.05 + jumpHeight, 0, 0.18, 0.58, 0.18, colors.cyan, 0.8);
    box(playerX + 0.43, 1.05 + jumpHeight, 0, 0.18, 0.58, 0.18, colors.cyan, 0.8);
    box(playerX - 0.16, 0.35 + jumpHeight + stride, 0, 0.20, 0.65, 0.23, colors.pink);
    box(playerX + 0.16, 0.35 + jumpHeight - stride, 0, 0.20, 0.65, 0.23, colors.pink);
    box(playerX, 2.02 + jumpHeight, 0, 0.08, 0.21, 0.08, colors.lime);

    resize();
    gl.clearColor(0.045, 0.055, 0.105, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const projection = perspective(Math.PI / 3.4, canvas.width / canvas.height, 0.1, 140);
    const view = lookAt([0, 4.9, 8.4], [0, 1.2, -10], [0, 1, 0]);
    gl.uniformMatrix4fv(projectionLocation, false, projection);
    gl.uniformMatrix4fv(viewLocation, false, view);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colorsForFrame), gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, positions.length / 3);
  }

  function tick(now) {
    const dt = Math.min(0.04, Math.max(0, (now - (lastTime || now)) / 1000));
    lastTime = now;
    if (state === 'running') update(dt);
    drawScene(now);
    animationFrame = requestAnimationFrame(tick);
  }
  resize();
  drawScene(performance.now());
  animationFrame = requestAnimationFrame(tick);
  window.addEventListener('pagehide', () => cancelAnimationFrame(animationFrame), { once: true });
})();
