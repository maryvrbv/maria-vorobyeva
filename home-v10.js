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

  // ---- chrome objects next to the portrait (in the style of the Figma Rig
  // experiment): a pen nib with its cap, an "Aa" type tile and a heart. Each
  // is a 2D outline extruded into a solid with rounded edges and raymarched,
  // so it has real thickness: the side walls show as it turns about its own
  // axis on scroll. All three reflect the same three-light studio, which
  // swings toward the pointer anywhere over the hero; the objects lean a
  // little toward it too. Transparent background; still frame under reduced
  // motion.
  const RIG_HEAD = `
precision highp float;
uniform vec2 uRes; uniform float uRotY; uniform float uTiltX; uniform float uRough;
uniform float uObj; uniform float uSpin; uniform float uYaw; uniform float uPitch; uniform float uTime;
vec3 rotX(vec3 v, float a){ float c=cos(a),s=sin(a); return vec3(v.x, v.y*c-v.z*s, v.y*s+v.z*c); }
vec3 rotY(vec3 v, float a){ float c=cos(a),s=sin(a); return vec3(v.x*c+v.z*s, v.y, -v.x*s+v.z*c); }
vec3 rotZ(vec3 v, float a){ float c=cos(a),s=sin(a); return vec3(v.x*c-v.y*s, v.x*s+v.y*c, v.z); }
// view <-> object: in-plane angle, spin about the object's own y axis,
// then the lean toward the viewer
vec3 toObj(vec3 v){ return rotY(rotZ(rotX(rotY(v, -uYaw), -uPitch), -uObj), -uSpin); }
vec3 toView(vec3 v){ return rotY(rotX(rotZ(rotY(v, uSpin), uObj), uPitch), uYaw); }
// 2D distance d2 extruded to half-depth h, every edge rounded by r
float sdSlab(float d2, float z, float h, float r){
  vec2 w = vec2(d2 + r, abs(z) - h + r);
  return min(max(w.x, w.y), 0.0) + length(max(w, 0.0)) - r;
}
float sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0); return length(pa-ba*h); }
vec3 env(vec3 R, float rough){
  float soft = mix(0.05, 0.55, rough), softK = mix(0.015, 0.25, rough);
  vec3 c = vec3(0.02,0.021,0.024) + vec3(0.014,0.015,0.019)*clamp(R.y*0.5+0.5,0.0,1.0);
  c += smoothstep(0.55-soft,0.55+soft, dot(R, normalize(vec3(-0.55,0.65,0.6)))) * vec3(1.0,0.97,0.9)*1.15;
  c += smoothstep(0.82-softK,0.82+softK, dot(R, normalize(vec3(0.75,-0.35,0.45)))) * vec3(0.85,0.9,1.0)*1.4;
  c += smoothstep(0.5-soft,0.5+soft, dot(R, normalize(vec3(0.2,-0.7,-0.6)))) * vec3(0.35,0.36,0.4)*0.35;
  // broad softbox behind the camera: faces turned toward the viewer stay
  // bright, so the darker side walls read as thickness
  c += smoothstep(0.15, 1.0, dot(R, normalize(vec3(0.15,0.25,1.0)))) * vec3(0.95,0.95,0.97)*0.55 + 0.07;
  return c;
}
// chrome with an optional enamel (diffuse) coat, lit by the studio
vec3 metal(vec3 base, vec3 nv, vec3 R, float enamel){
  vec3 spec = env(R, uRough) + pow(1.0 - abs(nv.z), mix(4.5,2.0,uRough)) * base * 0.5;
  return mix(spec * base, base * (0.60 + 0.28 * abs(nv.z)) + spec * 0.45, enamel);
}
`;
  // each object supplies map(q) and shade(q, nv, R) before this
  const RIG_MAIN = `
void main(){
  vec2 p = (gl_FragCoord.xy*2.0 - uRes) / min(uRes.x, uRes.y) * 0.92;
  vec3 ro = toObj(vec3(p, 2.0)), rd = toObj(vec3(0.0, 0.0, -1.0));
  float b = dot(ro, rd), disc = b*b - dot(ro, ro) + 1.0;
  if (disc < 0.0) { gl_FragColor = vec4(0.0); return; }
  float t = max(-b - sqrt(disc), 0.0), tEnd = -b + sqrt(disc);
  float dmin = 1e9, tmin = t; bool hit = false;
  for (int i = 0; i < 96; i++){
    float d = map(ro + rd*t);
    if (d < dmin){ dmin = d; tmin = t; }
    if (d < 0.0006){ hit = true; break; }
    t += d * STEP;
    if (t > tEnd) break;
  }
  // soft silhouette from the ray's closest approach
  float px = 1.7 / min(uRes.x, uRes.y);
  float cov = hit ? 1.0 : 1.0 - smoothstep(0.0, px, dmin);
  if (cov <= 0.0) { gl_FragColor = vec4(0.0); return; }
  vec3 q = ro + rd*tmin;
  vec2 e = vec2(0.0015, -0.0015);
  vec3 n = normalize(e.xyy*map(q+e.xyy) + e.yyx*map(q+e.yyx) + e.yxy*map(q+e.yxy) + e.xxx*map(q+e.xxx));
  vec3 nv = toView(n);
  vec3 R = rotY(rotX(reflect(vec3(0.0,0.0,-1.0), nv), uTiltX), uRotY);
  vec3 col = shade(q, nv, R);
  col += (fract(sin(dot(gl_FragCoord.xy + uTime, vec2(12.9898,78.233)))*43758.5453) - 0.5) / 255.0;
  gl_FragColor = vec4(col*cov, cov);
}`;

  // canvas: the rig's <canvas>; body: GLSL with map/shade (or just shade
  // when o.mesh names a model to rasterise instead of raymarching); o.set(gl,
  // U) sets the look; o.spin(scrollY) is the scroll-driven turn;
  // o.init(gl, U, redraw) for extra resources (textures)
  const MESH_VS = `
attribute vec3 aP; attribute vec3 aN; varying vec3 vN;
void main(){
  vec3 v = toView(aP);
  vN = toView(aN);
  gl_Position = vec4(v.xy / 0.92 * min(uRes.x, uRes.y) / uRes, -v.z * 0.5, 1.0);
}`;
  const MESH_FS = `
varying vec3 vN;
void main(){
  vec3 nv = normalize(vN);
  vec3 R = rotY(rotX(reflect(vec3(0.0,0.0,-1.0), nv), uTiltX), uRotY);
  vec3 col = shade(vec3(0.0), nv, R);
  col += (fract(sin(dot(gl_FragCoord.xy + uTime, vec2(12.9898,78.233)))*43758.5453) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}`;
  function chromeRig(canvas, body, o) {
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { antialias: true, premultipliedAlpha: true, alpha: true });
    if (!gl) { canvas.remove(); return; }
    const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram();
    if (o.mesh) {
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, RIG_HEAD + MESH_VS));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, RIG_HEAD + body + MESH_FS));
    } else {
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, 'attribute vec2 a; void main(){ gl_Position = vec4(a,0.0,1.0); }'));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, RIG_HEAD + body + RIG_MAIN));
    }
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.remove(); return; }
    gl.useProgram(prog);
    // model: [nVerts, nIdx] uint32, then xyz+normal float32 per vertex, then
    // uint16 triangle indices
    let count = o.mesh ? 0 : -1;
    if (o.mesh) {
      gl.enable(gl.DEPTH_TEST);
      fetch(o.mesh).then((r) => r.arrayBuffer()).then((buf) => {
        const [nv, ni] = new Uint32Array(buf, 0, 2);
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(buf, 8, nv * 6), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(buf, 8 + nv * 24, ni), gl.STATIC_DRAW);
        const aP = gl.getAttribLocation(prog, 'aP'), aN = gl.getAttribLocation(prog, 'aN');
        gl.enableVertexAttribArray(aP); gl.vertexAttribPointer(aP, 3, gl.FLOAT, false, 24, 0);
        gl.enableVertexAttribArray(aN); gl.vertexAttribPointer(aN, 3, gl.FLOAT, false, 24, 12);
        count = ni;
        if (reduceMotion) draw();
      }, () => canvas.remove());
    } else {
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'a');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    }
    const U = (n) => gl.getUniformLocation(prog, n);
    o.set(gl, U);
    gl.clearColor(0, 0, 0, 0);
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    let tx = 0, ty = 0, ox = 0, oy = 0, spin = 0, raf = 0, visible = false;
    const draw = () => {
      if (count === 0) return;
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniform2f(U('uRes'), canvas.width, canvas.height);
      gl.uniform1f(U('uSpin'), o.spin0 + spin);
      gl.uniform1f(U('uYaw'), o.yaw + ox * 0.3);
      gl.uniform1f(U('uPitch'), o.pitch + oy * 0.22);
      gl.uniform1f(U('uRotY'), o.base + ox * 0.6);
      gl.uniform1f(U('uTiltX'), -0.17 + oy * 0.35);
      gl.uniform1f(U('uTime'), performance.now() * 0.001);
      if (count > 0) gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 0);
      else gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    const loop = () => {
      ox += (tx - ox) * 0.08; oy += (ty - oy) * 0.08;
      spin += (o.spin(window.scrollY || 0) - spin) * 0.12;
      draw();
      raf = visible ? requestAnimationFrame(loop) : 0;
    };
    if (o.init) o.init(gl, U, () => { if (reduceMotion) draw(); });
    resize();
    if (reduceMotion) draw();
    else {
      const area = canvas.closest('.hero') || document.documentElement;
      area.addEventListener('pointermove', (e) => {
        const r = area.getBoundingClientRect();
        tx = ((e.clientX - r.left) / r.width) * 2 - 1;
        ty = ((e.clientY - r.top) / r.height) * 2 - 1;
      });
      area.addEventListener('pointerleave', () => { tx = 0; ty = 0; });
      new IntersectionObserver(([en]) => {
        visible = en.isIntersecting;
        if (visible && !raf) raf = requestAnimationFrame(loop);
      }).observe(canvas);
    }
    window.addEventListener('resize', () => { resize(); if (reduceMotion) draw(); });
  }

  // pen nib (five-point outline with breather hole and slit) and its pill
  // cap, both plain chrome. From the Pen Rig console: finish 0.76, studio
  // 13°, pen tilt 138° (tip to the upper right)
  chromeRig(document.querySelector('canvas[data-figma-rig]'), `
#define STEP 0.9
float sdNibPoly(vec2 p){
  vec2 v0=vec2(-0.27,0.25), v1=vec2(0.27,0.25), v2=vec2(0.33,0.03), v3=vec2(0.0,-0.62), v4=vec2(-0.33,0.03);
  float d = min(min(min(sdSeg(p,v0,v1), sdSeg(p,v1,v2)), min(sdSeg(p,v2,v3), sdSeg(p,v3,v4))), sdSeg(p,v4,v0));
  #define LEFT(a,b) (((b).x-(a).x)*(p.y-(a).y) - ((b).y-(a).y)*(p.x-(a).x) >= 0.0)
  bool inside = LEFT(v0,v4) && LEFT(v4,v3) && LEFT(v3,v2) && LEFT(v2,v1) && LEFT(v1,v0);
  return inside ? -d : d;
}
float sdNib2(vec2 p){
  // generous corner radius: a soft, friendly nib rather than a blade
  float d = sdNibPoly(p) - 0.075;
  d = max(d, -(length(p-vec2(0.0,-0.12)) - 0.075));
  // slit stops short of the rounded tip
  vec2 q = abs(p - vec2(0.0,-0.38)) - vec2(0.018, 0.20);
  return max(d, -(length(max(q,0.0)) + min(max(q.x,q.y),0.0)));
}
float sdCap2(vec2 p){ vec2 q = abs(p - vec2(0.0,0.47)) - vec2(0.21, 0.0); return length(max(q,0.0)) + min(max(q.x,q.y),0.0) - 0.12; }
// half-depths are scaled to each canvas so all three objects look about
// as thick as each other on the card (pen canvas 31.5%, tile 24%, heart 32.5%)
float nib(vec3 q){ return sdSlab(sdNib2(q.xy + vec2(0.0,0.06)), q.z, 0.065, 0.045); }
float cap(vec3 q){ return sdSlab(sdCap2(q.xy + vec2(0.0,0.06)), q.z, 0.065, 0.055); }
float map(vec3 q){ return min(nib(q), cap(q)); }
vec3 shade(vec3 q, vec3 nv, vec3 R){
  return metal(vec3(0.93,0.94,0.96), nv, R, 0.0);
}`, {
    set(gl, U) {
      gl.uniform1f(U('uRough'), 0.76);
      gl.uniform1f(U('uObj'), 138 * Math.PI / 180);
    },
    base: 13 * Math.PI / 180, spin0: 0.55, yaw: 0.0, pitch: 0.12,
    // one full turn per ~1000px of scroll, eased so it glides to a stop
    spin: (y) => y * 0.0063,
  });

  // bakes a white shape painted on an N×N canvas into a signed distance
  // texture (Felzenszwalb EDT) on unit 0: the canvas spans `span` units,
  // 0.5 = edge, ±0.5 = ±range units
  function bakeSdf(gl, N, span, range, paint) {
    const edt1 = (f, n) => {
      const d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1);
      let k = 0; v[0] = 0; z[0] = -1e20; z[1] = 1e20;
      for (let q = 1; q < n; q++) {
        let s;
        do { const r = v[k]; s = ((f[q] + q * q) - (f[r] + r * r)) / (2 * q - 2 * r); } while (s <= z[k] && --k >= 0);
        k++; v[k] = q; z[k] = s; z[k + 1] = 1e20;
      }
      k = 0;
      for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; const dq = q - v[k]; d[q] = dq * dq + f[v[k]]; }
      return d;
    };
    const edt = (g) => {
      const f = new Float64Array(N);
      for (let x = 0; x < N; x++) { for (let y = 0; y < N; y++) f[y] = g[y * N + x]; const d = edt1(f, N); for (let y = 0; y < N; y++) g[y * N + x] = d[y]; }
      for (let y = 0; y < N; y++) { for (let x = 0; x < N; x++) f[x] = g[y * N + x]; const d = edt1(f, N); for (let x = 0; x < N; x++) g[y * N + x] = Math.sqrt(d[x]); }
    };
    const c = document.createElement('canvas'); c.width = c.height = N;
    const x = c.getContext('2d');
    x.fillStyle = '#fff';
    paint(x, N);
    const a = x.getImageData(0, 0, N, N).data, inG = new Float64Array(N * N), outG = new Float64Array(N * N);
    for (let i = 0; i < N * N; i++) { const on = a[i * 4 + 3] > 127; inG[i] = on ? 1e20 : 0; outG[i] = on ? 0 : 1e20; }
    edt(inG); edt(outG);
    const px = new Uint8Array(N * N), rangePx = N * range / span;
    for (let j = 0; j < N * N; j++) px[j] = Math.round((0.5 + 0.5 * Math.max(-1, Math.min(1, (outG[j] - inG[j]) / rangePx))) * 255);
    if (!gl.__sdfTex) gl.__sdfTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, gl.__sdfTex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, N, N, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, px);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  // "Aa" type tile: a rounded chrome tile with raised letters; the letters
  // are text baked into a signed distance field (Felzenszwalb EDT) at load.
  // The back carries the Figma logo, chrome like the letters.
  // Look tuned in the Type Rig console: finish 0.66, studio -17°, tile tilt
  // -9°, chrome tile, letters enamel 0.62. Turns opposite to the pen
  chromeRig(document.querySelector('canvas[data-type-rig]'), `
#define STEP 0.8
uniform float uGlyphEnamel; uniform sampler2D uSdf;
const float TILE = 0.62, TR = 0.20, TH = 0.085, RANGE = 0.18;
float sdTile2(vec2 p){ vec2 q = abs(p) - vec2(TILE - TR); return length(max(q,0.0)) + min(max(q.x,q.y),0.0) - TR; }
// glyph SDF baked from text into a texture: 0.5 = edge, +-0.5 = +-RANGE
float sdGlyph2(vec2 p){
  vec2 uv = p / (TILE*2.0*0.80) + 0.5;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return RANGE;
  return (texture2D(uSdf, vec2(uv.x, 1.0 - uv.y)).r - 0.5) * 2.0 * RANGE;
}
float sdBox2(vec2 p, vec2 c, vec2 h){ vec2 q = abs(p - c) - h; return length(max(q,0.0)) + min(max(q.x,q.y),0.0); }
// Figma logo on the back, in its 38x57 SVG units (y down), mirrored so it
// reads from behind; five pieces with a hairline gap between them
const float LS = 0.78 / 57.0, GAP = 0.7;
float sdFigma2(vec2 p){
  vec2 u = vec2(19.0 - p.x / LS, 28.5 - p.y / LS);
  float d = min(length(u - vec2(9.5,9.5)) - 9.5, sdBox2(u, vec2(14.25,9.5), vec2(4.75,9.5)));
  d = min(d, min(length(u - vec2(28.5,9.5)) - 9.5, sdBox2(u, vec2(23.75,9.5), vec2(4.75,9.5))));
  d = min(d, min(length(u - vec2(9.5,28.5)) - 9.5, sdBox2(u, vec2(14.25,28.5), vec2(4.75,9.5))));
  d = min(d, length(u - vec2(28.5,28.5)) - 9.5);
  d = min(d, min(length(u - vec2(9.5,47.5)) - 9.5, sdBox2(u, vec2(14.25,42.75), vec2(4.75,4.75))));
  return (d + GAP) * LS;
}
float tile(vec3 q){ return sdSlab(sdTile2(q.xy), q.z, TH, 0.07); }
float glyph(vec3 q){ return sdSlab(sdGlyph2(q.xy), q.z - TH, 0.045, 0.028); }
float logo(vec3 q){ return sdSlab(sdFigma2(q.xy), q.z + TH, 0.04, 0.024); }
float map(vec3 q){ return min(tile(q), min(glyph(q), logo(q))); }
vec3 shade(vec3 q, vec3 nv, vec3 R){
  float dt = tile(q), dg = glyph(q), dl = logo(q);
  if (dg < dt && dg < dl) return metal(vec3(0.96,0.96,0.97), nv, R, uGlyphEnamel);
  if (dl < dt) return metal(vec3(0.96,0.96,0.97), nv, R, uGlyphEnamel);
  vec3 col = metal(vec3(0.93,0.94,0.96), nv, R, 0.0);
  // contact shadow of the raised letters / logo on the tile faces
  if (q.z > TH - 0.03) col *= mix(0.55, 1.0, smoothstep(-0.01, 0.05, sdGlyph2(q.xy + vec2(-0.025, 0.035))));
  if (q.z < -TH + 0.03) col *= mix(0.55, 1.0, smoothstep(-0.01, 0.05, sdFigma2(q.xy + vec2(0.025, 0.035))));
  return col;
}`, {
    set(gl, U) {
      gl.uniform1i(U('uSdf'), 0);
      gl.uniform1f(U('uRough'), 0.66);
      gl.uniform1f(U('uObj'), -9 * Math.PI / 180);
      gl.uniform1f(U('uGlyphEnamel'), 0.62);
    },
    init(gl, U, redraw) {
      const bake = () => bakeSdf(gl, 512, 0.62 * 2 * 0.80, 0.18, (x, N) => {
        x.textAlign = 'center'; x.textBaseline = 'alphabetic';
        x.font = '700 ' + Math.round(N * 0.64) + 'px "Bricolage Grotesque", "Helvetica Neue", Arial, sans-serif';
        x.fillText('Aa', N / 2, N * 0.73);
      });
      bake();
      if (document.fonts && document.fonts.load) document.fonts.load('700 128px "Bricolage Grotesque"').then(() => { bake(); redraw(); }, () => {});
    },
    base: -17 * Math.PI / 180, spin0: -0.4, yaw: 0.0, pitch: 0.18,
    // flips to the Figma logo within the first ~250px, while still in view
    spin: (y) => -y * 0.011,
  });

  // heart: the puffy heart-emoji model (body only, without its sticker
  // highlights; normalised and baked to images/home/heart.bin), rendered as
  // a mesh in the same chrome. Pen's finish so the three objects read as a set
  chromeRig(document.querySelector('canvas[data-heart-rig]'), `
uniform float uEnamel; uniform float uAno;
vec3 shade(vec3 q, vec3 nv, vec3 R){ return metal(mix(vec3(1.0), vec3(0.93,0.94,0.96), uAno), nv, R, uEnamel); }`, {
    set(gl, U) {
      gl.uniform1f(U('uRough'), 0.76);
      gl.uniform1f(U('uEnamel'), 0.21);
      gl.uniform1f(U('uAno'), 0.23);
      gl.uniform1f(U('uObj'), 12 * Math.PI / 180);
    },
    mesh: 'images/home/heart.bin',
    base: 13 * Math.PI / 180, spin0: 0.32, yaw: 0.0, pitch: -0.15,
    spin: (y) => y * 0.0045,
  });
})();
