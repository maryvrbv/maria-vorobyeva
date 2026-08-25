const io = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// horizontal-scroll rows (e.g. superpowers): fade hint at the right edge,
// scroll-position dots below, and mouse-drag scrolling on desktop
document.querySelectorAll('.power-scroll').forEach(scroller => {
  const wrap = scroller.closest('.power-wrap');
  if (!wrap) return;
  const cards = [...scroller.querySelectorAll('.power-card')];
  const dots = [...wrap.querySelectorAll('.power-dot')];

  // hide the fade hint once scrolled all the way to the end, and keep the
  // dot indicator in sync with whichever card is currently at the left edge
  const updateState = () => {
    const atEnd = scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 2;
    wrap.classList.toggle('at-end', atEnd);

    if (!dots.length) return;
    let closest = cards.length - 1;
    if (!atEnd) {
      let minDist = Infinity;
      cards.forEach((card, i) => {
        const dist = Math.abs(card.offsetLeft - scroller.scrollLeft);
        if (dist < minDist) { minDist = dist; closest = i; }
      });
    }
    dots.forEach((d, i) => d.classList.toggle('active', i === closest));
  };
  scroller.addEventListener('scroll', updateState, { passive: true });
  window.addEventListener('resize', updateState);
  updateState();

  // clicking a dot scrolls straight to its card
  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      const card = cards[i];
      if (card) scroller.scrollTo({ left: card.offsetLeft, behavior: 'smooth' });
    });
  });

  // mouse-drag scrolling for desktop (touch/trackpad scroll already works natively)
  let isDragging = false;
  let dragMoved = false;
  let startX = 0;
  let startScrollLeft = 0;

  scroller.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return; // left click only
    isDragging = true;
    dragMoved = false;
    startX = e.pageX;
    startScrollLeft = scroller.scrollLeft;
    scroller.classList.add('dragging');
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.pageX - startX;
    if (Math.abs(dx) > 3) dragMoved = true;
    scroller.scrollLeft = startScrollLeft - dx;
  });

  const endDrag = () => {
    if (!isDragging) return;
    isDragging = false;
    scroller.classList.remove('dragging');
  };
  window.addEventListener('mouseup', endDrag);
  scroller.addEventListener('mouseleave', endDrag);

  // suppress the trailing click that a mouse-drag would otherwise fire
  // (nothing inside power-card is currently clickable, but keep this so
  // dragging never misfires future interactive content inside a card)
  scroller.addEventListener('click', (e) => {
    if (dragMoved) { e.preventDefault(); e.stopPropagation(); }
  }, true);
});

// dot field: a field of dots that drift in a slow idle wave and scatter
// away from touch/cursor, paused off-screen/hidden tab. Shared engine
// behind the homepage hero canvas and each case page's title canvas —
// they only differ in size, color and how tall the canvas needs to be.

// sums offsetTop up through the offsetParent chain — gives an element's
// position relative to the page in the same pre-zoom layout space as
// canvas.offsetWidth/Height, so no extra scale correction is needed
function pageOffsetTop(el) {
  let y = 0;
  while (el) { y += el.offsetTop || 0; el = el.offsetParent; }
  return y;
}

function createDotField(canvas, { color, spacing = 26, fadeTail = 60, getHeight, getFadeStart, setCanvasHeight = false }) {
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let w = 0, h = 0, cols = 0, rows = 0, fadeStart = 0;
  let mouseX = -9999, mouseY = -9999;
  let pendingEvent = null;
  let rafId = null;
  let isVisible = true;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    w = canvas.offsetWidth;
    h = getHeight();
    if (setCanvasHeight) canvas.style.height = h + 'px';
    // fade anchors to where the real content ends (getFadeStart), not an
    // arbitrary "last fadeTail px of the canvas" — falls back to that only
    // when the caller has no content edge to anchor to
    fadeStart = Math.max(0, getFadeStart ? getFadeStart() : h - fadeTail);

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(w / spacing) + 2;
    rows = Math.ceil(h / spacing) + 2;
  }

  function applyPointer() {
    if (!pendingEvent) return;
    const rect = canvas.getBoundingClientRect();
    const e = pendingEvent;
    const touch = e.touches && e.touches[0];
    const clientX = touch ? touch.clientX : e.clientX;
    const clientY = touch ? touch.clientY : e.clientY;
    // rect is in post-zoom physical CSS px, while the drawing grid (w, h)
    // is measured pre-zoom — rescale so the repel point tracks the cursor
    // exactly even when the page is zoomed (desktop `zoom: 1.25`)
    const scaleX = rect.width ? w / rect.width : 1;
    const scaleY = rect.height ? h / rect.height : 1;
    mouseX = (clientX - rect.left) * scaleX;
    mouseY = (clientY - rect.top) * scaleY;
    pendingEvent = null;
  }

  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = color;

    const hasMouse = mouseX > -900;
    const mouseRadius = 150, mouseRadiusSq = mouseRadius * mouseRadius;
    const ts = t * 1.1;

    for (let row = 0; row < rows; row++) {
      const y = row * spacing;

      // smooth fade-out near the bottom edge, instead of a hard cutoff
      let rowFade = 1;
      if (y > fadeStart) {
        const ft = Math.min(1, (y - fadeStart) / (h - fadeStart || 1));
        rowFade = 1 - ft * ft * (3 - 2 * ft); // smoothstep
      }
      if (rowFade <= 0.01) continue;

      for (let col = 0; col < cols; col++) {
        const x = col * spacing;

        const waveX = reduceMotion ? 0 : Math.sin(x * 0.01 - ts * 0.6 + y * 0.005) * 3;
        const waveY = reduceMotion ? 0 : Math.cos(y * 0.009 - ts * 0.5 + x * 0.004) * 3;
        let px = x + waveX, py = y + waveY;
        let alpha = reduceMotion ? 0.35 : 0.35 + Math.sin(x * 0.006 - ts * 0.4 + y * 0.004) * 0.12;
        let size = 2.3;

        if (hasMouse) {
          const mDx = x - mouseX, mDy = y - mouseY;
          const distSq = mDx * mDx + mDy * mDy;
          if (distSq < mouseRadiusSq) {
            const dist = Math.sqrt(distSq) || 0.0001;
            const influence = 1 - dist / mouseRadius;
            const smooth = influence * influence * influence;
            const repel = smooth * 59;
            px += (mDx / dist) * repel;
            py += (mDy / dist) * repel;
            alpha += smooth * 0.55;
            size += smooth * 1.8;
          }
        }

        // the idle/hover floor keeps dots visible in normal strength; rowFade
        // is applied last so it can still bring a dot all the way to 0 in
        // the fade-out tail near the bottom edge
        ctx.globalAlpha = Math.max(0.15, Math.min(alpha, 1)) * rowFade;
        ctx.beginPath();
        ctx.arc(px, py, size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function animate(timestamp) {
    applyPointer();
    draw(timestamp * 0.001);
    rafId = isVisible ? requestAnimationFrame(animate) : null;
  }
  function start() { if (rafId === null) rafId = requestAnimationFrame(animate); }
  function stop() { if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; } }

  const onMove = (e) => { pendingEvent = e; };
  const onLeave = () => { mouseX = -9999; mouseY = -9999; pendingEvent = null; };

  // tracked at the document level (not just over the canvas's own element)
  // since it breaks out to full viewport width, wider than its container
  document.addEventListener('mousemove', onMove, { passive: true });
  document.addEventListener('mouseleave', onLeave);
  document.addEventListener('touchstart', onMove, { passive: true });
  document.addEventListener('touchmove', onMove, { passive: true });
  document.addEventListener('touchend', onLeave);
  document.addEventListener('touchcancel', onLeave);
  window.addEventListener('resize', resize);

  new IntersectionObserver(([entry]) => {
    isVisible = entry.isIntersecting;
    if (isVisible && !document.hidden) start(); else stop();
  }, { threshold: 0 }).observe(canvas);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else if (isVisible) start();
  });

  resize();
  start();

  // re-measure once web fonts and images have actually settled — this runs
  // before the page fully loads (script is the last tag in body), so a
  // getHeight/getFadeStart anchored to something further down the page can
  // be measured against fallback-font metrics and drift once Inter loads
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(resize);
  window.addEventListener('load', resize);
}

// ru/en language switch: a tiny dot-matrix glyph (same idea as the hero dot
// fields, but a static letter shape instead of a drifting wave). At rest it
// spells out the current language; hovering/focusing morphs the dots into
// the other language as a preview, then the click just follows the href —
// each language lives on its own static HTML page, there's no in-page
// state to restore, so the morph only ever needs to run one-way at a time.
function initLangSwitchDots() {
  const GLYPHS = {
    R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
    U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
    N: ['#...#', '##..#', '#.#.#', '#.#.#', '#..##', '#...#', '#...#'],
  };
  function glyphPoints(letter, offsetCol) {
    const pts = [];
    GLYPHS[letter].forEach((row, r) => {
      for (let c = 0; c < row.length; c++) if (row[c] === '#') pts.push({ col: offsetCol + c, row: r });
    });
    return pts;
  }
  function wordPoints(word) {
    let pts = [];
    word.split('').forEach((letter, i) => { pts = pts.concat(glyphPoints(letter, i * 6)); });
    return pts;
  }
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // sized to sit level with the nav text next to it, not dominate it
  const cols = 11, rows = 7, cell = 1.7, cssW = 22, cssH = 13, dotRadius = 0.6;
  const padX = (cssW - (cols - 1) * cell) / 2;
  const padY = (cssH - (rows - 1) * cell) / 2;
  const ink = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#f2f2f0';

  document.querySelectorAll('.lang-switch[data-lang]').forEach((link) => {
    const canvas = link.querySelector('.ls-canvas');
    const fallback = link.querySelector('.ls-fallback');
    if (!canvas || !canvas.getContext) return;

    const currentWord = link.dataset.lang === 'ru' ? 'RU' : 'EN';
    const targetWord = link.dataset.targetLang === 'ru' ? 'RU' : 'EN';

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    ctx.scale(dpr, dpr);

    const ptsCurrent = wordPoints(currentWord);
    const ptsTarget = wordPoints(targetWord);
    const total = Math.max(ptsCurrent.length, ptsTarget.length);
    const dots = [];
    for (let i = 0; i < total; i++) {
      const a = ptsCurrent[i] || ptsTarget[i];
      const b = ptsTarget[i] || ptsCurrent[i];
      dots.push({
        aCol: a.col, aRow: a.row, aOn: i < ptsCurrent.length,
        bCol: b.col, bRow: b.row, bOn: i < ptsTarget.length,
        col: a.col, row: a.row, opacity: i < ptsCurrent.length ? 1 : 0,
      });
    }

    function draw() {
      ctx.clearRect(0, 0, cssW, cssH);
      ctx.fillStyle = ink;
      dots.forEach((d) => {
        if (d.opacity <= 0.02) return;
        ctx.globalAlpha = Math.min(1, d.opacity) * 0.92;
        ctx.beginPath();
        ctx.arc(padX + d.col * cell, padY + d.row * cell, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }

    let animId = null;
    function goTo(next) {
      const toTarget = next === 'target';
      if (reduceMotion) {
        dots.forEach((d) => {
          d.col = toTarget ? d.bCol : d.aCol;
          d.row = toTarget ? d.bRow : d.aRow;
          d.opacity = (toTarget ? d.bOn : d.aOn) ? 1 : 0;
        });
        draw();
        return;
      }
      if (animId) cancelAnimationFrame(animId);
      const froms = dots.map((d) => ({ col: d.col, row: d.row, opacity: d.opacity }));
      let start = null;
      const duration = 420;
      function frame(now) {
        if (start === null) start = now;
        const t = Math.min(1, (now - start) / duration);
        dots.forEach((d, i) => {
          const targetCol = toTarget ? d.bCol : d.aCol;
          const targetRow = toTarget ? d.bRow : d.aRow;
          const targetOn = toTarget ? d.bOn : d.aOn;
          const delay = (targetCol / (cols - 1)) * 0.18;
          const lt = Math.max(0, Math.min(1, (t - delay) / (1 - delay)));
          const ease = easeOutCubic(lt);
          d.col = lerp(froms[i].col, targetCol, ease);
          d.row = lerp(froms[i].row, targetRow, ease);
          d.opacity = lerp(froms[i].opacity, targetOn ? 1 : 0, ease);
        });
        draw();
        if (t < 1) animId = requestAnimationFrame(frame);
      }
      animId = requestAnimationFrame(frame);
    }

    draw();
    canvas.style.display = 'block';
    if (fallback) fallback.style.display = 'none';

    link.addEventListener('mouseenter', () => goTo('target'));
    link.addEventListener('mouseleave', () => goTo('current'));
    link.addEventListener('focus', () => goTo('target'));
    link.addEventListener('blur', () => goTo('current'));
    link.addEventListener('touchstart', () => goTo('target'), { passive: true });
  });
}

function hexToRgb01(hex) {
  const raw = hex.replace('#', '');
  const h = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  const num = parseInt(h, 16);
  return [((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255];
}

// mesh-text hover: warps a short button label across a fine WebGL2 grid
// that drags toward the cursor and springs back — an accent touch on the
// hero buttons. Gated to hover-capable desktops and off under
// prefers-reduced-motion; falls back to the plain (real, still-in-DOM)
// text label if WebGL2 isn't available at all.
function initMeshText(el) {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const text = el.textContent;
  const cs = getComputedStyle(el);
  const w = el.offsetWidth, h = el.offsetHeight;
  if (!w || !h) return;

  const pad = 16;
  const paddedW = w + pad * 2, paddedH = h + pad * 2;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  // render the label onto a plain 2D canvas (never inserted in the page) —
  // its alpha channel becomes the glyph mask the shader reads
  const texCanvas = document.createElement('canvas');
  texCanvas.width = paddedW * dpr;
  texCanvas.height = paddedH * dpr;
  const tctx = texCanvas.getContext('2d');
  tctx.scale(dpr, dpr);
  tctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  tctx.fillStyle = cs.color;
  tctx.textBaseline = 'middle';
  tctx.textAlign = 'left';
  tctx.fillText(text, pad, paddedH / 2);

  const canvas = document.createElement('canvas');
  canvas.className = 'mesh-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.left = -pad + 'px';
  canvas.style.top = -pad + 'px';
  canvas.style.width = paddedW + 'px';
  canvas.style.height = paddedH + 'px';
  canvas.width = paddedW * dpr;
  canvas.height = paddedH * dpr;

  const gl = canvas.getContext('webgl2', { alpha: true, antialias: true, premultipliedAlpha: false });
  if (!gl) return;

  const VERT_SRC = `#version 300 es
in vec2 aPos;
in vec2 aUv;
in vec2 aDisp;
out vec2 vUv;
out float vMag;
void main() {
  gl_Position = vec4(aPos + aDisp, 0.0, 1.0);
  vUv = aUv;
  vMag = length(aDisp);
}`;

  const FRAG_SRC = `#version 300 es
precision highp float;
in vec2 vUv;
in float vMag;
out vec4 outColor;
uniform sampler2D uTex;
uniform vec3 uFringe;
void main() {
  vec4 base = texture(uTex, vUv);
  float o = clamp(vMag * 6.0, 0.0, 1.0) * 0.006;
  float a1 = texture(uTex, vUv + vec2(o, 0.0)).a;
  float a2 = texture(uTex, vUv - vec2(o, 0.0)).a;
  vec3 col = base.rgb * base.a;
  col += uFringe * max(0.0, a1 - base.a) * 0.9;
  col += (vec3(1.0) - uFringe) * max(0.0, a2 - base.a) * 0.35;
  float alpha = max(base.a, max(a1, a2));
  outColor = vec4(col, alpha);
}`;

  function compile(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error('mesh-text shader error:', gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }
  const vs = compile(gl.VERTEX_SHADER, VERT_SRC);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG_SRC);
  if (!vs || !fs) return;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('mesh-text link error:', gl.getProgramInfoLog(prog));
    return;
  }

  // one vertex roughly every 6px
  const cell = 6;
  const cols = Math.max(6, Math.round(paddedW / cell));
  const rows = Math.max(3, Math.round(paddedH / cell));
  const vertCount = (cols + 1) * (rows + 1);

  const positions = new Float32Array(vertCount * 2);
  const uvs = new Float32Array(vertCount * 2);
  const disp = new Float32Array(vertCount * 2);
  const vel = new Float32Array(vertCount * 2);
  const clipDisp = new Float32Array(vertCount * 2);

  let vi = 0;
  for (let row = 0; row <= rows; row++) {
    for (let col = 0; col <= cols; col++) {
      const u = col / cols, v = row / rows;
      positions[vi * 2] = u * 2 - 1;
      positions[vi * 2 + 1] = (1 - v) * 2 - 1;
      uvs[vi * 2] = u;
      uvs[vi * 2 + 1] = v;
      vi++;
    }
  }

  const indices = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const i0 = row * (cols + 1) + col;
      const i1 = i0 + 1;
      const i2 = i0 + cols + 1;
      const i3 = i2 + 1;
      indices.push(i0, i2, i1, i1, i2, i3);
    }
  }
  const indexArray = new Uint16Array(indices);

  const posBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'aPos');

  const uvBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
  gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
  const aUv = gl.getAttribLocation(prog, 'aUv');

  const dispBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, dispBuf);
  gl.bufferData(gl.ARRAY_BUFFER, disp, gl.DYNAMIC_DRAW);
  const aDisp = gl.getAttribLocation(prog, 'aDisp');

  const idxBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexArray, gl.STATIC_DRAW);

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
  gl.enableVertexAttribArray(aUv);
  gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, dispBuf);
  gl.enableVertexAttribArray(aDisp);
  gl.vertexAttribPointer(aDisp, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  // no FLIP_Y: texture v=0 samples the canvas's own row 0 (its top) directly,
  // matching the vertex grid's row=0 -> v=0 -> clip-space top mapping below
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texCanvas);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  const uTexLoc = gl.getUniformLocation(prog, 'uTex');
  const uFringeLoc = gl.getUniformLocation(prog, 'uFringe');
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#7c3aed';
  const fringe = hexToRgb01(accent);

  const RADIUS = 46, DRAG = 0.9, DAMPING = 0.86, SPRING = 0.13, MAX_DISP = 22, WAKE_EPS = 0.02;
  let mouseX = -9999, mouseY = -9999, lastX = -9999, lastY = -9999;
  let pendingEvent = null, rafId = null, hovering = false;

  function applyPointer() {
    if (!pendingEvent) return;
    const rect = canvas.getBoundingClientRect();
    const e = pendingEvent;
    const scaleX = rect.width ? paddedW / rect.width : 1;
    const scaleY = rect.height ? paddedH / rect.height : 1;
    lastX = mouseX; lastY = mouseY;
    mouseX = (e.clientX - rect.left) * scaleX;
    mouseY = (e.clientY - rect.top) * scaleY;
    pendingEvent = null;
  }

  function step() {
    applyPointer();
    const dx = lastX > -9000 ? mouseX - lastX : 0;
    const dy = lastY > -9000 ? mouseY - lastY : 0;
    let maxMag = 0;

    for (let i = 0; i < vertCount; i++) {
      if (mouseX > -9000 && (dx || dy)) {
        const px = (i % (cols + 1)) / cols * paddedW;
        const py = Math.floor(i / (cols + 1)) / rows * paddedH;
        const ddx = px - mouseX, ddy = py - mouseY;
        const dist = Math.sqrt(ddx * ddx + ddy * ddy);
        if (dist < RADIUS) {
          const inf = 1 - dist / RADIUS;
          vel[i * 2] += dx * DRAG * inf * inf;
          vel[i * 2 + 1] += dy * DRAG * inf * inf;
        }
      }
      vel[i * 2] *= DAMPING;
      vel[i * 2 + 1] *= DAMPING;
      disp[i * 2] += vel[i * 2];
      disp[i * 2 + 1] += vel[i * 2 + 1];
      disp[i * 2] *= (1 - SPRING);
      disp[i * 2 + 1] *= (1 - SPRING);
      const mag = Math.hypot(disp[i * 2], disp[i * 2 + 1]);
      if (mag > MAX_DISP) {
        const s = MAX_DISP / mag;
        disp[i * 2] *= s; disp[i * 2 + 1] *= s;
      }
      if (mag > maxMag) maxMag = mag;
      clipDisp[i * 2] = disp[i * 2] / paddedW * 2;
      clipDisp[i * 2 + 1] = -disp[i * 2 + 1] / paddedH * 2;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, dispBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, clipDisp);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(prog);
    gl.bindVertexArray(vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(uTexLoc, 0);
    gl.uniform3f(uFringeLoc, fringe[0], fringe[1], fringe[2]);
    gl.drawElements(gl.TRIANGLES, indexArray.length, gl.UNSIGNED_SHORT, 0);

    if (maxMag > WAKE_EPS || hovering) {
      rafId = requestAnimationFrame(step);
    } else {
      rafId = null;
    }
  }

  function wake() {
    if (rafId === null) rafId = requestAnimationFrame(step);
  }

  el.classList.add('mesh-ready');
  el.appendChild(canvas);

  const btn = el.closest('a') || el.parentElement;
  btn.addEventListener('mousemove', (e) => { pendingEvent = e; wake(); }, { passive: true });
  btn.addEventListener('mouseenter', () => { hovering = true; wake(); });
  btn.addEventListener('mouseleave', () => {
    hovering = false;
    mouseX = -9999; mouseY = -9999; lastX = -9999; lastY = -9999;
    wake();
  });

  step(); // paint the at-rest (zero-displacement) label immediately —
          // otherwise the canvas stays blank until the first hover event
}

(() => {
  initLangSwitchDots();
  document.querySelectorAll('.hero-actions .mesh-text').forEach(initMeshText);

  // homepage hero: spans the whole page top (behind the nav) down through
  // the hero buttons, with a long fade tail
  createDotField(document.getElementById('heroCanvas'), {
    color: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#7c3aed',
    fadeTail: 140,
    setCanvasHeight: true,
    getHeight: () => {
      const heroActions = document.querySelector('.hero-actions');
      return heroActions ? pageOffsetTop(heroActions) + heroActions.offsetHeight + 140 : 600;
    },
  });

  // case page titles: spans the whole page top (behind the nav) down
  // through the case title/description, fading out a little past the first
  // body heading so it grazes the text that follows — anchored to the
  // heading rather than "the first <p>", since what directly follows a
  // heading varies by page (paragraph, bullet list, stat grid…) and isn't
  // reliably the nearest <p> in the DOM
  document.querySelectorAll('.case-hero-canvas').forEach((canvas) => {
    const heroSection = document.querySelector('.case-hero');
    const content = heroSection ? heroSection.querySelector('.case-hero-content') : null;
    const firstHeading = document.querySelector('.case-body .case-h2, .case-body .case-h3');
    createDotField(canvas, {
      color: canvas.dataset.color || '#7c3aed',
      setCanvasHeight: true,
      getHeight: () => {
        if (firstHeading) return pageOffsetTop(firstHeading) + firstHeading.offsetHeight + 110;
        return heroSection ? pageOffsetTop(heroSection) + heroSection.offsetHeight + 90 : 600;
      },
      getFadeStart: () => content ? pageOffsetTop(content) + content.offsetHeight : 0,
    });
  });

  // the real nav (.nav-hero) sits in normal flow and just scrolls away with
  // the page; this fixed duplicate (.nav-reveal) stays hidden until that
  // original nav has fully scrolled out of view, then fades smoothly into
  // place — driven by scroll position rather than IntersectionObserver so
  // mobile's dynamic address bar (which resizes the viewport mid-scroll)
  // can't make it flicker
  const navOriginal = document.querySelector('header.nav.nav-hero');
  const navReveal = document.getElementById('navReveal');
  if (navOriginal && navReveal) {
    let navRevealTicking = false;
    function updateNavReveal() {
      navRevealTicking = false;
      const show = (window.scrollY || window.pageYOffset) > navOriginal.offsetHeight;
      navReveal.classList.toggle('visible', show);
      navReveal.inert = !show;
    }
    function onScrollForNavReveal() {
      if (navRevealTicking) return;
      navRevealTicking = true;
      requestAnimationFrame(updateNavReveal);
    }
    updateNavReveal(); // correct on load even if the browser restores a scroll position
    window.addEventListener('scroll', onScrollForNavReveal, { passive: true });
    window.addEventListener('resize', updateNavReveal);
  }
})();
