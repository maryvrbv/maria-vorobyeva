/* ---------- cursor on case pages (mouse only) ----------
   A small white shape replaces the arrow (the layer inverts what is under
   it, so it reads on dark and light). Over a picture that opens larger it
   turns into a small magnifying glass with a plus that swings in; over
   links and buttons the shape grows a little. Phones, tablets and keyboard
   users keep the system behaviour.
   The live shape is SHAPE below; case-alfa-pointer.html tries the others
   through window.zcShape(name) */
(function () {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  var SHAPE = 'dot';
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
  var el, trail, shape;
  var x = 0, y = 0, cx = 0, cy = 0, tx = 0, ty = 0, raf = 0, target = null;

  function make(name) {
    shape = SHAPES[name] || SHAPES.dot;
    layer.className = 'zc-layer zc-s-' + (SHAPES[name] ? name : 'dot') + (shape.plain ? ' zc-plain' : '') +
      (layer.classList.contains('zc-in') ? ' zc-in' : '');
    layer.innerHTML = (shape.trail ? '<span class="zc-trail"></span>' : '') +
      '<div class="zc-el"><span class="zc-shape">' + shape.html + '</span>' + LOUPE + '</div>';
    el = layer.querySelector('.zc-el');
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
  document.addEventListener('mousemove', function (e) {
    x = e.clientX; y = e.clientY;
    var t = e.target.closest ? e.target.closest(ZOOMABLE) : null;
    if (!layer.classList.contains('zc-in')) { cx = tx = x; cy = ty = y; layer.classList.add('zc-in'); }
    if (t !== target) {
      if (t && !target) { cx = x; cy = y; }   // the glass appears right under the pointer
      target = t;
      layer.classList.toggle('zc-on', !!t);
    }
    layer.classList.toggle('zc-link', !t && !!(e.target.closest && e.target.closest('a, button, summary, [role=button]')));
    if (!raf) raf = requestAnimationFrame(frame);
  }, { passive: true });
  document.documentElement.addEventListener('mouseleave', function () {
    target = null; layer.classList.remove('zc-on', 'zc-in', 'zc-link');
  });
  // a click opens or zooms the preview: show the shape until the pointer moves again
  document.addEventListener('click', function () { target = null; layer.classList.remove('zc-on'); }, true);

  make(SHAPE);
  window.zcShape = function (name) { if (SHAPES[name]) make(name); };
})();
