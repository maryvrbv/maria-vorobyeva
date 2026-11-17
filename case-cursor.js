/* ---------- cursor on case pages (mouse only) ----------
   A small white dot replaces the arrow (it inverts what is under it, so it
   reads on dark and light). Over a picture that opens larger it turns into
   a small magnifying glass with a plus that swings in; over links and
   buttons the dot grows a little. Phones, tablets and keyboard users keep
   the system behaviour. Chosen from the try-outs on case-alfa-cursor.html
   (variant 8, the glass three times smaller) */
(function () {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // pictures in the case, and the picture in the preview while it is not zoomed
  var ZOOMABLE = '.case-body [role=button], .lb:not(.zoomed) img.lb-media';

  var layer = document.createElement('div');
  layer.className = 'zc-layer';
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML =
    '<div class="zc-el"><span class="zc-dot"></span>' +
    '<svg viewBox="0 0 120 120"><circle cx="48" cy="48" r="36" fill="none" stroke="#fff" stroke-width="8"/>' +
    '<path d="M75 75l22 22" stroke="#fff" stroke-width="12" stroke-linecap="round"/>' +
    '<path d="M48 32v32M32 48h32" stroke="#fff" stroke-width="8" stroke-linecap="round"/></svg></div>';
  document.body.appendChild(layer);
  document.documentElement.classList.add('zc');
  var el = layer.firstChild;
  var x = 0, y = 0, cx = 0, cy = 0, raf = 0, target = null;

  function frame() {
    raf = 0;
    var k = reduce ? 1 : 0.2;   // the dot trails the pointer a little
    cx += (x - cx) * k; cy += (y - cy) * k;
    el.style.transform = 'translate(' + cx + 'px,' + cy + 'px)';
    if (Math.abs(x - cx) > .3 || Math.abs(y - cy) > .3) raf = requestAnimationFrame(frame);
  }
  document.addEventListener('mousemove', function (e) {
    x = e.clientX; y = e.clientY;
    var t = e.target.closest ? e.target.closest(ZOOMABLE) : null;
    if (!layer.classList.contains('zc-in')) { cx = x; cy = y; layer.classList.add('zc-in'); }
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
  // a click opens or zooms the preview: show the dot until the pointer moves again
  document.addEventListener('click', function () { target = null; layer.classList.remove('zc-on'); }, true);
})();
