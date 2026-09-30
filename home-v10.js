// Alternative EN homepage (index-en-v10.html) — page-only behaviour on top
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

    // rows without a preview image (e.g. Citi) get no hover card
    expList.querySelectorAll('.exp-item[data-exp-img]').forEach((item) => {
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

  // ---- chrome pen nib next to the portrait (a "rig" in the style of the
  // Figma Rig experiment): the Figma pen-tool nib and its dark cap as 2D
  // SDFs — a five-point nib with breather hole and slit, a pill cap — each
  // extruded into a bevelled slab that reflects the same three-light
  // studio. Transparent background; the reflection swings toward the
  // pointer anywhere over the hero. Still frame under reduced motion.
  const rig = document.querySelector('canvas[data-figma-rig]');
  if (rig) (() => {
    const gl = rig.getContext('webgl', { antialias: true, premultipliedAlpha: true, alpha: true });
    if (!gl) { rig.remove(); return; }
    const FRAG = `
precision highp float;
uniform vec2 uRes; uniform float uRotY; uniform float uTiltX; uniform float uRough; uniform float uAno; uniform float uObj;
vec3 rotY(vec3 v, float a){ float c=cos(a),s=sin(a); return vec3(v.x*c+v.z*s, v.y, -v.x*s+v.z*c); }
vec3 rotX(vec3 v, float a){ float c=cos(a),s=sin(a); return vec3(v.x, v.y*c-v.z*s, v.y*s+v.z*c); }
float sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0); return length(pa-ba*h); }
// signed distance to a convex 5-point nib outline (tip down)
float sdNibPoly(vec2 p){
  vec2 v0=vec2(-0.30,0.28), v1=vec2(0.30,0.28), v2=vec2(0.37,0.04), v3=vec2(0.0,-0.72), v4=vec2(-0.37,0.04);
  float d = min(min(min(sdSeg(p,v0,v1), sdSeg(p,v1,v2)), min(sdSeg(p,v2,v3), sdSeg(p,v3,v4))), sdSeg(p,v4,v0));
  // inside test: p is left of every edge walked counter-clockwise
  #define LEFT(a,b) (((b).x-(a).x)*(p.y-(a).y) - ((b).y-(a).y)*(p.x-(a).x) >= 0.0)
  bool inside = LEFT(v0,v4) && LEFT(v4,v3) && LEFT(v3,v2) && LEFT(v2,v1) && LEFT(v1,v0);
  return inside ? -d : d;
}
float sdNib(vec2 p){
  float d = sdNibPoly(p) - 0.03;
  d = max(d, -(length(p-vec2(0.0,-0.12)) - 0.075));            // breather hole
  vec2 q = abs(p - vec2(0.0,-0.44)) - vec2(0.012, 0.30);          // slit to the tip
  d = max(d, -(length(max(q,0.0)) + min(max(q.x,q.y),0.0)));
  return d;
}
float sdCap(vec2 p){ vec2 q = abs(p - vec2(0.0,0.50)) - vec2(0.34-0.12, 0.0); return length(max(q,0.0)) + min(max(q.x,q.y),0.0) - 0.12; }
vec3 env(vec3 R, float rough){
  float soft = mix(0.05, 0.55, rough), softK = mix(0.015, 0.25, rough);
  vec3 c = vec3(0.02,0.021,0.024) + vec3(0.014,0.015,0.019)*clamp(R.y*0.5+0.5,0.0,1.0);
  c += smoothstep(0.55-soft,0.55+soft, dot(R, normalize(vec3(-0.55,0.65,0.6)))) * vec3(1.0,0.97,0.9)*1.15;
  c += smoothstep(0.82-softK,0.82+softK, dot(R, normalize(vec3(0.75,-0.35,0.45)))) * vec3(0.85,0.9,1.0)*1.4;
  c += smoothstep(0.5-soft,0.5+soft, dot(R, normalize(vec3(0.2,-0.7,-0.6)))) * vec3(0.35,0.36,0.4)*0.35;
  return c;
}
float sdAny(int m, vec2 p){ return m==0 ? sdNib(p) : sdCap(p); }
void main(){
  vec2 p = (gl_FragCoord.xy*2.0 - uRes) / min(uRes.x, uRes.y);
  p *= 0.92;
  float c=cos(uObj), s=sin(uObj); p = vec2(c*p.x + s*p.y, -s*p.x + c*p.y);
  p.y += 0.06;
  float dn = sdNib(p), dc = sdCap(p);
  int m = dn < dc ? 0 : 1; float d = min(dn, dc);
  float px = 1.5 / min(uRes.x, uRes.y);
  float cov = 1.0 - smoothstep(-px, px, d);
  if (cov <= 0.0) { gl_FragColor = vec4(0.0); return; }
  float e = 0.0015;
  vec2 g = vec2(sdAny(m, p+vec2(e,0.0)) - sdAny(m,p), sdAny(m, p+vec2(0.0,e)) - sdAny(m,p));
  vec2 G = length(g) > 1e-6 ? normalize(g) : vec2(0.0,1.0);
  // bevelled slab: rounded edge of radius B, flat face inside
  float B = m==0 ? 0.09 : 0.12;
  float ud = clamp(-d, 0.0, B);
  vec3 n = normalize(vec3(G*(B - ud), sqrt(max(ud*(2.0*B-ud), 0.0))));
  // un-rotate the in-plane normal so lighting stays fixed to the studio
  n.xy = vec2(c*n.x - s*n.y, s*n.x + c*n.y);
  vec3 R = rotY(rotX(reflect(vec3(0.0,0.0,-1.0), n), uTiltX), uRotY);
  vec3 base = m==0 ? vec3(0.93,0.94,0.96) : vec3(0.16,0.17,0.18);
  vec3 tint = mix(vec3(1.0), base, m==0 ? uAno : 1.0);
  vec3 spec = env(R, uRough) + pow(1.0-n.z, mix(4.5,2.0,uRough))*tint*0.5;
  vec3 col = spec * tint;
  // the nib is enamel-white: a steady diffuse body with the chrome
  // reflection laid over it, so it never turns grey as the studio spins
  if (m==0) col = tint * (0.60 + 0.28 * n.z) + spec * 0.45;
  gl_FragColor = vec4(col*cov, cov);
}`;
    const sh = (t, src) => { const o = gl.createShader(t); gl.shaderSource(o, src); gl.compileShader(o); return o; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, 'attribute vec2 a; void main(){ gl_Position = vec4(a,0.0,1.0); }'));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { rig.remove(); return; }
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(prog, 'uRes');
    const uRot = gl.getUniformLocation(prog, 'uRotY');
    const uTilt = gl.getUniformLocation(prog, 'uTiltX');
    // look tuned in the Figma Rig console: finish 0.46, rig angle -50°,
    // anodize 0.10, auto-spin on
    gl.uniform1f(gl.getUniformLocation(prog, 'uRough'), 0.46);
    gl.uniform1f(gl.getUniformLocation(prog, 'uAno'), 0.10);
    gl.uniform1f(gl.getUniformLocation(prog, 'uObj'), 0.6);  // nib tilted, cap upper-left
    const BASE = -50 * Math.PI / 180;
    gl.clearColor(0, 0, 0, 0);

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      rig.width = Math.max(1, Math.round(rig.clientWidth * dpr));
      rig.height = Math.max(1, Math.round(rig.clientHeight * dpr));
      gl.viewport(0, 0, rig.width, rig.height);
    };
    let tx = 0, ty = 0, ox = 0, oy = 0, t0 = performance.now(), raf = 0, visible = false;
    const draw = (rot, tilt) => {
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uRes, rig.width, rig.height);
      gl.uniform1f(uRot, rot); gl.uniform1f(uTilt, tilt);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    const loop = (now) => {
      const t = (now - t0) / 1000;
      ox += (tx - ox) * 0.08; oy += (ty - oy) * 0.08;
      // auto-spin: the studio turns slowly around the mark
      draw(BASE + t * 0.4 + ox * 0.6, -0.17 + oy * 0.35);
      raf = visible ? requestAnimationFrame(loop) : 0;
    };
    resize();
    if (reduceMotion) { draw(BASE, -0.17); }
    else {
      const area = rig.closest('.hero') || document;
      area.addEventListener('pointermove', (e) => {
        const r = area.getBoundingClientRect ? area.getBoundingClientRect() : { left: 0, top: 0, width: innerWidth, height: innerHeight };
        tx = ((e.clientX - r.left) / r.width) * 2 - 1;
        ty = ((e.clientY - r.top) / r.height) * 2 - 1;
      });
      area.addEventListener('pointerleave', () => { tx = 0; ty = 0; });
      new IntersectionObserver(([en]) => {
        visible = en.isIntersecting;
        if (visible && !raf) raf = requestAnimationFrame(loop);
      }).observe(rig);
    }
    window.addEventListener('resize', () => { resize(); if (reduceMotion) draw(BASE, -0.17); });
  })();
})();
