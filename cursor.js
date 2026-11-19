/* ---------- cursor on every page of the site (mouse only, styles in cursor.css) ----------
   A small white four-point star, like the list bullets, replaces the arrow
   (the layer inverts what is under it, so it reads on dark and light). Over
   a picture that opens larger it turns into a small magnifying glass with a
   plus that swings in; over links and buttons the star grows and tiny
   stars light up around it, one at a time (LINK below; the other hover effects, tried on index-cursor.html in
   the backup-2026-11-18 branch, switch with window.zcLink(name)). Phones, tablets and keyboard users keep the system behaviour.
   On the home page and 404 there are no pictures to open, so there it is
   just the star. The live shape is SHAPE below; the others (tried on
   case-alfa-pointer.html in the backup-2026-11-18 branch) switch
   through window.zcShape(name) */
(function () {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  var SHAPE = 'star';
  var LINK = 'pop';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // pictures in the case, and the picture in the preview while it is not zoomed
  var ZOOMABLE = '.case-body [role=button], .lb:not(.zoomed) img.lb-media';
  var en = (document.documentElement.lang || '').indexOf('en') === 0;

  // each shape: its markup and how closely it follows the pointer
  // (pointing shapes stick to it, round ones trail a little)
  var ARROW = 'M3.6 2.3c-.9-.4-1.8.5-1.4 1.4l7.4 17.5c.4.9 1.7.9 2-.1l2.2-6.4 6.4-2.2c1-.3 1-1.6.1-2L3.6 2.3z';
  var SHAPES = {
    dot:    { follow: 0.2, html: '<span class="zc-dot"></span>' },
    arrow:  { follow: 1, html: '<svg class="zc-arrow" viewBox="0 0 24 24"><path d="' + ARROW + '" fill="#fff"/></svg>' },
    figma:  { follow: 1, plain: true, html: '<svg class="zc-arrow" viewBox="0 0 24 24"><path d="' + ARROW + '" fill="#6e7df0" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg><span class="zc-tag">' + (en ? 'Guest' : 'Гость') + '</span>' },
    star:   { follow: 0.2, html: '<svg class="zc-star" viewBox="0 0 24 24"><path d="M12 0c.7 6.2 5.8 11.3 12 12-6.2.7-11.3 5.8-12 12-.7-6.2-5.8-11.3-12-12C6.2 11.3 11.3 6.2 12 0z" fill="#fff"/></svg>' },
    pen:    { follow: 1, html: '<svg class="zc-pen" viewBox="0 0 24 24"><path d="M2 2l11.5 4.5 4 6.5-4.5 4.5-6.5-4L2 2z" fill="#fff"/><path d="M2.3 2.3l7.2 7.2" stroke="#000" stroke-width="1.3" stroke-linecap="round"/><circle cx="9.8" cy="9.8" r="1.7" fill="#000"/><path d="M15.4 19.2l3.8-3.8 3.4 3.4-3.8 3.8z" fill="#fff"/></svg>' },
    cross:  { follow: 1, html: '<svg class="zc-cross" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"><path d="M12 1v7M12 16v7M1 12h7M16 12h7"/><circle cx="12" cy="12" r="1.3" fill="#fff" stroke="none"/></svg>' },
    drop:   { follow: 0.35, html: '<span class="zc-drop"></span>' },
    ring:   { follow: 1, trail: true, html: '<span class="zc-dot zc-dot-s"></span>' }
  };
  var LOUPE = '<svg class="zc-loupe" viewBox="0 0 120 120"><circle cx="48" cy="48" r="36" fill="none" stroke="#fff" stroke-width="8"/>' +
    '<path d="M75 75l22 22" stroke="#fff" stroke-width="12" stroke-linecap="round"/>' +
    '<path d="M48 32v32M32 48h32" stroke="#fff" stroke-width="8" stroke-linecap="round"/></svg>';

  var layer = document.createElement('div');
  layer.className = 'zc-layer';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);
  document.documentElement.classList.add('zc');
  // case pages zoom the whole page on desktop; mouse coordinates are real px,
  // so the layer takes the opposite zoom
  function unzoom() {
    var z = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
    layer.style.zoom = z === 1 ? '' : String(1 / z);
  }
  unzoom();
  window.addEventListener('resize', unzoom);
  var el, trail, shape, sparks;
  var x = 0, y = 0, cx = 0, cy = 0, tx = 0, ty = 0, raf = 0, target = null;

  function make(name) {
    shape = SHAPES[name] || SHAPES.dot;
    layer.className = 'zc-layer zc-s-' + (SHAPES[name] ? name : 'dot') + ' zc-l-' + LINK + (shape.plain ? ' zc-plain' : '') +
      (layer.classList.contains('zc-in') ? ' zc-in' : '');
    layer.innerHTML = (shape.trail ? '<span class="zc-trail"></span>' : '') +
      '<div class="zc-el"><span class="zc-glow"></span><span class="zc-sparks"></span><span class="zc-shape">' + shape.html + '</span>' + LOUPE + '</div>';
    el = layer.querySelector('.zc-el');
    sparks = layer.querySelector('.zc-sparks');
    trail = layer.querySelector('.zc-trail');
    target = null;
    place();
  }
  function place() {
    el.style.transform = 'translate(' + cx + 'px,' + cy + 'px)';
    if (trail) trail.style.transform = 'translate(' + tx + 'px,' + ty + 'px)';
  }
  function frame() {
    raf = 0;
    var k = reduce ? 1 : shape.follow;
    cx += (x - cx) * k; cy += (y - cy) * k;
    tx += (x - tx) * (reduce ? 1 : 0.16); ty += (y - ty) * (reduce ? 1 : 0.16);
    place();
    if (Math.abs(x - cx) > .3 || Math.abs(y - cy) > .3 || Math.abs(x - tx) > .3 || Math.abs(y - ty) > .3) raf = requestAnimationFrame(frame);
  }
  // what is under the pointer decides the look: glass, star over a link, or star
  function sense(node) {
    var t = node && node.closest ? node.closest(ZOOMABLE) : null;
    if (t !== target) {
      if (t && !target) { cx = x; cy = y; }   // the glass appears right under the pointer
      target = t;
      layer.classList.toggle('zc-on', !!t);
    }
    var link = !t && !!(node && node.closest && node.closest('a, button, summary, [role=button]'));
    if (link !== layer.classList.contains('zc-link')) { layer.classList.toggle('zc-link', link); if (link) linkOn(); else linkOff(); }
    return link;
  }
  document.addEventListener('mousemove', function (e) {
    x = e.clientX; y = e.clientY;
    if (!layer.classList.contains('zc-in')) { cx = tx = x; cy = ty = y; layer.classList.add('zc-in'); }
    if (sense(e.target) && LINK === 'trail') sprinkle();
    if (!raf) raf = requestAnimationFrame(frame);
  }, { passive: true });
  // scrolling with the wheel moves the page under a still pointer: check again
  // what is under it, otherwise the glass would stay on whatever comes next
  var scrollRaf = 0;
  window.addEventListener('scroll', function () {
    if (scrollRaf || !layer.classList.contains('zc-in')) return;
    scrollRaf = requestAnimationFrame(function () {
      scrollRaf = 0;
      sense(document.elementFromPoint(x, y));
    });
  }, { passive: true, capture: true });
  document.documentElement.addEventListener('mouseleave', function () {
    target = null; layer.classList.remove('zc-on', 'zc-in', 'zc-link'); linkOff();
  });
  // a click opens or zooms the preview: show the shape until the pointer moves again
  document.addEventListener('click', function () { target = null; layer.classList.remove('zc-on'); }, true);

  /* tiny stars around the cursor over clickable things */
  var STAR = '<svg viewBox="0 0 24 24"><path d="M12 0c.7 6.2 5.8 11.3 12 12-6.2.7-11.3 5.8-12 12-.7-6.2-5.8-11.3-12-12C6.2 11.3 11.3 6.2 12 0z" fill="#fff"/></svg>';
  var LINKS = ['spin', 'twinkle', 'pop', 'trail', 'burst', 'halo'];
  var timer = 0, lastSprinkle = 0;
  function spark(parent, px, py, size, cls, life, vars) {
    var sp = document.createElement('span');
    sp.className = 'zc-spark ' + cls;
    sp.style.cssText = 'left:' + px + 'px;top:' + py + 'px;--s:' + size + 'px;' + (vars || '');
    sp.innerHTML = STAR;
    parent.appendChild(sp);
    if (life) setTimeout(function () { sp.remove(); }, life);
    return sp;
  }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  // three tiny stars in fixed spots that light up in turn
  function twinkle(n) {
    var spots = [[-21, -14, 10, 0], [19, -19, 7, .5], [17, 17, 8, 1]];
    spots.slice(0, n).forEach(function (p) { spark(sparks, p[0], p[1], p[2], 'zc-tw', 0, '--d:' + p[3] + 's'); });
  }
  function linkOn() {
    if (reduce || !sparks) return;
    if (LINK === 'twinkle' || LINK === 'halo') twinkle(3);
    if (LINK === 'pop') {
      // one tiny star at a time, slowly, each in a new spot away from the last.
      // Only between the big star's rays (on the diagonals, ±20°) and clear of
      // its tips: the grown star reaches 18px out along the axes
      var last = Math.floor(rnd(0, 4));
      var pop = function () {
        var q = (last + 1 + Math.floor(rnd(0, 3))) % 4;
        last = q;
        var a = (45 + q * 90 + rnd(-20, 20)) * Math.PI / 180, r = rnd(26, 32);
        spark(sparks, Math.cos(a) * r, Math.sin(a) * r, rnd(9, 13), 'zc-pop', 2200);
      };
      pop(); timer = setInterval(pop, 800);
    }
    if (LINK === 'burst') {
      for (var i = 0; i < 6; i++) {
        var a = i / 6 * Math.PI * 2 + rnd(-.3, .3), r = rnd(22, 32);
        spark(sparks, 0, 0, rnd(5, 9), 'zc-fly', 700, '--dx:' + (Math.cos(a) * r).toFixed(1) + 'px;--dy:' + (Math.sin(a) * r).toFixed(1) + 'px');
      }
      setTimeout(function () { if (layer.classList.contains('zc-link') && LINK === 'burst') twinkle(2); }, 450);
    }
  }
  function linkOff() {
    clearInterval(timer); timer = 0;
    if (!sparks) return;
    // the tiny stars fade out instead of vanishing at once
    var old = [].slice.call(sparks.children);
    old.forEach(function (sp) { sp.classList.add('zc-gone'); });
    setTimeout(function () { old.forEach(function (sp) { sp.remove(); }); }, 400);
  }
  // trail: tiny stars sprinkle off the cursor while it moves over a link
  function sprinkle() {
    if (reduce) return;
    var now = Date.now();
    if (now - lastSprinkle < 45) return;
    lastSprinkle = now;
    spark(layer, cx + rnd(-8, 8), cy + rnd(-8, 8), rnd(4, 9), 'zc-fall', 800);
  }

  make(SHAPE);
  window.zcShape = function (name) { if (SHAPES[name]) make(name); };
  window.zcLink = function (name) {
    if (LINKS.indexOf(name) === -1) return;
    LINK = name; linkOff();
    LINKS.forEach(function (l) { layer.classList.remove('zc-l-' + l); });
    layer.classList.add('zc-l-' + name);
    if (layer.classList.contains('zc-link')) linkOn();
  };
})();
