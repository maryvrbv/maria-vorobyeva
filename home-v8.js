// Alternative EN homepage (index-en-v8.html) — page-only behaviour on top
// of the shared script.js (reveal, nav, lang switch, email copy, tracking).
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- blur-in text (from 21st.dev "Portfolio Hero" BlurText) ----
  // splits into letters or words, each fading in from blur with a stagger;
  // the text stays in the DOM, so it reads fine without JS or motion
  document.querySelectorAll('.blur-in').forEach((el) => {
    if (reduceMotion) return;
    const byWords = el.dataset.blur === 'words';
    const step = byWords ? 90 : 60;
    const base = Number(el.dataset.blurDelay || 0);
    const parts = byWords ? el.textContent.trim().split(/\s+/) : [...el.textContent.trim()];
    el.textContent = '';
    parts.forEach((part, i) => {
      const seg = document.createElement('span');
      seg.className = 'blur-seg';
      seg.textContent = part;
      seg.style.transitionDelay = `${base + i * step}ms`;
      el.appendChild(seg);
      if (byWords && i < parts.length - 1) el.appendChild(document.createTextNode(' '));
    });
    // two frames so the initial blurred state is painted before transitioning
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
  });

  // ---- hero: the inline image cycles through the case covers ----
  document.querySelectorAll('[data-cycle]').forEach((pill) => {
    const imgs = [...pill.querySelectorAll('img')];
    if (reduceMotion || imgs.length < 2) return;
    let i = 0;
    let timer = null;
    const step = () => {
      imgs[i].classList.remove('on');
      i = (i + 1) % imgs.length;
      imgs[i].classList.add('on');
    };
    const start = () => { if (!timer) timer = setInterval(step, 2200); };
    const stop = () => { clearInterval(timer); timer = null; };
    // no work while the tab is hidden
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    start();
  });

  // ---- stacking case cards (from 21st.dev "Stacking Cards") ----
  // items are position:sticky in CSS; here each card is scaled down and
  // dimmed by how far the cards after it have slid over it
  document.querySelectorAll('[data-stack]').forEach((stack) => {
    const items = [...stack.querySelectorAll('.stack-item')];
    items.forEach((item, i) => item.style.setProperty('--i', i));
    if (reduceMotion || items.length < 2) return;

    const cards = items.map((item) => item.querySelector('.case-card'));
    let ticking = false;

    function update() {
      ticking = false;
      // p[i] = how much card i is covered by card i+1 (0..1)
      // measured on the (untransformed) sticky wrappers, so the scale applied
      // below never feeds back into the next measurement
      const p = items.map((item, i) => {
        const next = items[i + 1];
        if (!next) return 0;
        const h = cards[i].offsetHeight;
        const covered = (item.getBoundingClientRect().top + h - next.getBoundingClientRect().top) / h;
        return Math.max(0, Math.min(1, covered));
      });
      cards.forEach((card, i) => {
        let depth = 0;
        for (let j = i; j < cards.length - 1; j++) depth += p[j];
        card.style.setProperty('--s', (1 - depth * 0.05).toFixed(4));
        card.style.setProperty('--dim', Math.min(0.55, depth * 0.35).toFixed(3));
      });
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
  });

  // ---- case covers: short looping videos (WebM) instead of heavy GIFs;
  // nothing downloads until a card is about to scroll into view, and
  // playback pauses off-screen. Without JS or WebM support the static
  // poster image stays in place.
  const lazyVideos = document.querySelectorAll('video[data-lazy-video]');
  if ('IntersectionObserver' in window) {
    const vidIO = new IntersectionObserver((entries) => {
      entries.forEach(({ target: v, isIntersecting }) => {
        if (isIntersecting) {
          if (!v.dataset.loaded) {
            v.querySelectorAll('source[data-src]').forEach((s) => { s.src = s.dataset.src; });
            v.load();
            v.dataset.loaded = '1';
          }
          if (!reduceMotion) v.play().catch(() => {});
        } else if (!v.paused) {
          v.pause();
        }
      });
    }, { rootMargin: '300px 0px' });
    lazyVideos.forEach((v) => vidIO.observe(v));
  }

  // ---- experience: hovering a row floats a screen with the company logo
  // next to the cursor; it eases toward the pointer and tilts with speed ----
  const expList = document.querySelector('[data-exp-list]');
  const expFloat = document.querySelector('.exp-float');
  const canHover = window.matchMedia('(hover: hover) and (min-width: 901px)').matches;
  if (expList && expFloat && canHover && !reduceMotion) {
    const shot = expFloat.querySelector('.exp-float-img');
    const logo = expFloat.querySelector('.exp-float-logo');
    let x = 0, y = 0, tx = 0, ty = 0, raf = 0, active = false;
    const tick = () => {
      const dx = tx - x;
      x += dx * 0.15;
      y += (ty - y) * 0.15;
      expFloat.style.setProperty('--x', `${x}px`);
      expFloat.style.setProperty('--y', `${y}px`);
      expFloat.style.setProperty('--tilt', `${Math.max(-8, Math.min(8, dx * 0.08))}deg`);
      raf = active || Math.abs(dx) > 0.5 ? requestAnimationFrame(tick) : 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
    const hide = () => { active = false; expFloat.classList.remove('on'); };
    // offset so the card sits to the right of the pointer, not under it
    const place = (e) => { tx = e.clientX + 230; ty = e.clientY - 40; };

    expList.querySelectorAll('.exp-item').forEach((item) => {
      const summary = item.querySelector('summary');
      summary.addEventListener('pointerenter', (e) => {
        if (shot.getAttribute('src') !== item.dataset.expImg) shot.src = item.dataset.expImg;
        if (logo.getAttribute('src') !== item.dataset.expLogo) logo.src = item.dataset.expLogo;
        if (!expFloat.classList.contains('on')) { place(e); x = tx; y = ty; }
        active = true;
        expFloat.classList.add('on');
        kick();
      });
      summary.addEventListener('pointermove', (e) => { place(e); kick(); });
      summary.addEventListener('pointerleave', hide);
      // an opened row shows its text; the preview would cover it
      summary.addEventListener('click', hide);
    });
    window.addEventListener('scroll', hide, { passive: true });
  }

  // ---- glow panels: grainy "fluted glass" gradient in WebGL ----
  // Domain-warped value noise drives a violet / periwinkle / peach / ink
  // palette; a sine on x adds vertical ribbing like fluted glass, and a
  // per-pixel hash adds film grain. Renders only while on screen; under
  // reduced motion it draws one still frame. The CSS gradient on
  // .glow-panel stays underneath as the fallback.
  const PALETTES = {
    dawn: [[0.73, 0.64, 1.00], [0.43, 0.49, 0.94], [0.96, 0.71, 0.55], [0.15, 0.10, 0.36]],
    dusk: [[0.56, 0.45, 0.98], [0.96, 0.62, 0.52], [0.36, 0.55, 0.95], [0.10, 0.07, 0.24]],
  };
  const FRAG = `
precision mediump float;
uniform vec2 uRes; uniform float uTime; uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform vec3 uD; uniform float uSeed;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1, 0)), u.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ v += a * n(p); p *= 2.02; a *= 0.5; } return v; }
void main(){
  vec2 uv = gl_FragCoord.xy / uRes; vec2 p = uv * vec2(uRes.x / uRes.y, 1.0) * 1.6;
  float t = uTime * 0.05 + uSeed;
  // fluted glass: offset the lookup with a fine vertical sine
  p.x += sin(uv.x * 90.0) * 0.006;
  vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(p + 2.0 * q + vec2(1.7, 9.2) + t * 0.7), fbm(p + 2.0 * q + vec2(8.3, 2.8) - t * 0.6));
  float f = fbm(p + 2.5 * r);
  vec3 col = mix(uA, uB, smoothstep(0.2, 0.75, f));
  col = mix(col, uC, smoothstep(0.35, 0.9, r.x) * 0.9);
  col = mix(col, uD, smoothstep(0.55, 1.0, q.y) * 0.75);
  // soft highlights along the ribs
  col += 0.025 * sin(uv.x * 90.0 + f * 6.0);
  col += (h(gl_FragCoord.xy + fract(uTime)) - 0.5) * 0.09;
  gl_FragColor = vec4(col, 1.0);
}`;
  const VERT = 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }';

  document.querySelectorAll('canvas[data-glow]').forEach((canvas, idx) => {
    const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false });
    if (!gl) { canvas.remove(); return; }
    const sh = (type, src) => { const o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); return o; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.remove(); return; }
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = (name) => gl.getUniformLocation(prog, name);
    const pal = PALETTES[canvas.dataset.glow] || PALETTES.dawn;
    ['uA', 'uB', 'uC', 'uD'].forEach((k, i) => gl.uniform3fv(u(k), pal[i]));
    gl.uniform1f(u('uSeed'), idx * 7.3);

    const resize = () => {
      // render at reduced resolution: the picture is soft, and it keeps the GPU cool
      const scale = Math.min(window.devicePixelRatio || 1, 1.5) * 0.6;
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * scale));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(u('uRes'), canvas.width, canvas.height);
    };
    const draw = (ms) => { gl.uniform1f(u('uTime'), ms / 1000); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); };
    resize();
    let raf = 0, visible = false;
    const loop = (ms) => { draw(ms); raf = visible ? requestAnimationFrame(loop) : 0; };
    if (reduceMotion) { draw(12000); } else {
      new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        if (visible && !raf) raf = requestAnimationFrame(loop);
      }).observe(canvas);
    }
    window.addEventListener('resize', () => { resize(); if (reduceMotion) draw(12000); });
  });

  // ---- case KPIs count up the first time a card scrolls into view ----
  const kpiNums = document.querySelectorAll('.kpi b[data-count]');
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const kIO = new IntersectionObserver((entries) => {
      entries.forEach(({ target: el, isIntersecting }) => {
        if (!isIntersecting) return;
        kIO.unobserve(el);
        const to = +el.dataset.count, pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
        const t0 = performance.now();
        const step = (now) => {
          const k = Math.min(1, (now - t0) / 1100);
          el.textContent = pre + Math.round(to * (1 - Math.pow(1 - k, 3))) + suf;
          if (k < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.6 });
    kpiNums.forEach((el) => kIO.observe(el));
  }
})();
