/* ---------- image preview (all case pages) ----------
   Every illustration in a case opens full screen on click: it grows out of
   its place on the page, arrows / swipe go through all of them in page
   order, a click on the picture (or the magnifier button) zooms in where you
   clicked and the zoom follows the pointer (on phones: tap to zoom, drag to
   look around). Esc, the cross or a click on the dark background close it.
   Looping videos open bigger with controls; the research recording with its
   own controls stays as it is. No hover effects on the pictures; with a
   mouse, cursor.js turns the pointer into a small magnifier over them. */
(function () {
  var SEL = '.case-body img, .case-body video:not([controls])';
  var items = [].slice.call(document.querySelectorAll(SEL));
  if (!items.length) return;
  var en = (document.documentElement.lang || '').indexOf('en') === 0;
  var T = en
    ? { dialog: 'Image preview', prev: 'Previous', next: 'Next', close: 'Close', zoom: 'Zoom in', unzoom: 'Zoom out', open: 'Open larger' }
    : { dialog: 'Просмотр иллюстрации', prev: 'Предыдущая', next: 'Следующая', close: 'Закрыть', zoom: 'Увеличить', unzoom: 'Уменьшить', open: 'Открыть крупнее' };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  items.forEach(function (el, i) {
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', T.open + ': ' + (el.getAttribute('alt') || el.getAttribute('aria-label') || ''));
    el.addEventListener('click', function (e) { e.preventDefault(); open(i); });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i); }
    });
  });

  // the overlay
  var lb = document.createElement('div');
  lb.className = 'lb';
  lb.hidden = true;
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.setAttribute('aria-label', T.dialog);
  lb.innerHTML =
    '<button type="button" class="lb-btn lb-close" aria-label="' + T.close + '"><i class="ph-bold ph-x"></i></button>' +
    '<div class="lb-stage">' +
      '<button type="button" class="lb-btn lb-side lb-prev" aria-label="' + T.prev + '"><i class="ph-bold ph-arrow-left"></i></button>' +
      '<button type="button" class="lb-btn lb-side lb-next" aria-label="' + T.next + '"><i class="ph-bold ph-arrow-right"></i></button>' +
    '</div>' +
    '<div class="lb-bar">' +
      '<span class="lb-count" aria-live="polite"></span>' +
      '<span class="lb-cap"></span>' +
      '<span class="lb-ctrl">' +
        '<button type="button" class="lb-btn lb-zoom" aria-label="' + T.zoom + '"><i class="ph-bold ph-magnifying-glass-plus"></i></button>' +
      '</span>' +
    '</div>';
  document.body.appendChild(lb);
  var stage = lb.querySelector('.lb-stage');
  var countEl = lb.querySelector('.lb-count');
  var capEl = lb.querySelector('.lb-cap');
  var zoomBtn = lb.querySelector('.lb-zoom');
  var prevBtn = lb.querySelector('.lb-prev');
  var nextBtn = lb.querySelector('.lb-next');
  var media = null, cur = -1, lastFocus = null, zoomed = false, scale = 2.2;

  function srcOf(el) {
    if (el.tagName === 'IMG') return el.currentSrc || el.src;
    return null;
  }

  function build(i) {
    var el = items[i];
    var m;
    if (el.tagName === 'VIDEO') {
      m = document.createElement('video');
      m.muted = true; m.loop = el.loop; m.playsInline = true; m.controls = true;
      [].forEach.call(el.querySelectorAll('source'), function (s) {
        var c = document.createElement('source'); c.src = s.src || s.getAttribute('src'); c.type = s.type; m.appendChild(c);
      });
      if (!m.children.length && el.src) m.src = el.src;
      m.autoplay = true;
    } else {
      m = document.createElement('img');
      m.src = srcOf(el);
      m.alt = el.alt || '';
      m.draggable = false;
    }
    m.className = 'lb-media';
    return m;
  }

  function setZoom(on, x, y) {
    if (!media || media.tagName !== 'IMG') return;
    zoomed = on;
    lb.classList.toggle('zoomed', on);
    zoomBtn.setAttribute('aria-label', on ? T.unzoom : T.zoom);
    zoomBtn.innerHTML = '<i class="ph-bold ph-magnifying-glass-' + (on ? 'minus' : 'plus') + '"></i>';
    if (on) {
      // zoom past the fitted size, at least 2x, more for detailed pictures
      var r = media.getBoundingClientRect();
      scale = Math.max(2, Math.min(3, (media.naturalWidth || r.width) / r.width * 1.1));
      origin(x == null ? r.left + r.width / 2 : x, y == null ? r.top + r.height / 2 : y);
      media.style.transform = 'scale(' + scale + ')';
    } else {
      media.style.transform = '';
    }
  }
  function origin(x, y) {
    var r = media.getBoundingClientRect();
    // the rect is the scaled one while zoomed; work from the unscaled box
    var w = r.width / (zoomed ? scale : 1), h = r.height / (zoomed ? scale : 1);
    var left = r.left + (r.width - w) * (parseFloat(media.dataset.ox || 50) / 100);
    var top = r.top + (r.height - h) * (parseFloat(media.dataset.oy || 50) / 100);
    if (!zoomed) { left = r.left; top = r.top; }
    var ox = Math.max(0, Math.min(100, (x - left) / w * 100));
    var oy = Math.max(0, Math.min(100, (y - top) / h * 100));
    media.dataset.ox = ox; media.dataset.oy = oy;
    media.style.transformOrigin = ox + '% ' + oy + '%';
  }

  function show(i, fromEl) {
    if (media) media.remove();
    zoomed = false; lb.classList.remove('zoomed');
    cur = (i + items.length) % items.length;
    media = build(cur);
    stage.appendChild(media);
    var el = items[cur];
    countEl.textContent = (cur + 1) + ' / ' + items.length;
    capEl.textContent = el.getAttribute('alt') || el.getAttribute('aria-label') || '';
    zoomBtn.hidden = media.tagName !== 'IMG';
    zoomBtn.setAttribute('aria-label', T.zoom);
    zoomBtn.innerHTML = '<i class="ph-bold ph-magnifying-glass-plus"></i>';
    prevBtn.hidden = nextBtn.hidden = items.length < 2;

    // grow out of the picture on the page
    if (fromEl && !reduce) {
      var from = fromEl.getBoundingClientRect();
      var ready = function () {
        var to = media.getBoundingClientRect();
        if (!to.width || !to.height) return;
        var sx = from.width / to.width, sy = from.height / to.height;
        media.style.transition = 'none';
        media.style.transformOrigin = '0 0';
        media.style.transform = 'translate(' + (from.left - to.left) + 'px,' + (from.top - to.top) + 'px) scale(' + sx + ',' + sy + ')';
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            media.style.transition = '';
            media.style.transform = '';
            setTimeout(function () { media.style.transformOrigin = ''; }, 300);
          });
        });
      };
      if (media.tagName === 'IMG' && !media.complete) media.addEventListener('load', ready, { once: true });
      else if (media.tagName === 'VIDEO') media.addEventListener('loadedmetadata', ready, { once: true });
      else ready();
    }
    if (window.gtag) window.gtag('event', 'image_zoom', { image: (srcOf(el) || '').split('/').pop() || 'video' });
  }

  function open(i) {
    lastFocus = document.activeElement;
    lb.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    show(i, items[i]);
    requestAnimationFrame(function () { lb.classList.add('on'); });
    lb.querySelector('.lb-close').focus({ preventScroll: true });
  }
  function close() {
    lb.classList.remove('on');
    document.documentElement.style.overflow = '';
    var done = function () { lb.hidden = true; if (media) { media.remove(); media = null; } };
    if (reduce) done(); else setTimeout(done, 220);
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }

  prevBtn.addEventListener('click', function () { show(cur - 1); });
  nextBtn.addEventListener('click', function () { show(cur + 1); });
  lb.querySelector('.lb-close').addEventListener('click', close);
  zoomBtn.addEventListener('click', function () { setZoom(!zoomed); });

  // click on the dark area closes; on the picture zooms
  stage.addEventListener('click', function (e) {
    if (moved) return;
    if (e.target === stage) { close(); return; }
    if (e.target === media && media.tagName === 'IMG') setZoom(!zoomed, e.clientX, e.clientY);
  });
  lb.querySelector('.lb-bar').addEventListener('click', function (e) { if (e.target === this) close(); });

  // desktop: while zoomed the view follows the pointer
  stage.addEventListener('mousemove', function (e) {
    if (zoomed && media) { lb.classList.add('panning'); origin(e.clientX, e.clientY); }
  });
  stage.addEventListener('mouseleave', function () { lb.classList.remove('panning'); });

  // touch: swipe left/right between pictures, swipe down to close, drag to pan when zoomed
  var sx = 0, sy = 0, moved = false, startOx = 50, startOy = 50;
  stage.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse') { moved = false; return; }
    sx = e.clientX; sy = e.clientY; moved = false;
    startOx = parseFloat((media && media.dataset.ox) || 50); startOy = parseFloat((media && media.dataset.oy) || 50);
  });
  stage.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'mouse' || !media) return;
    var dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) moved = true;
    if (zoomed) {
      var r = media.getBoundingClientRect();
      var ox = Math.max(0, Math.min(100, startOx - dx / r.width * 100 * scale));
      var oy = Math.max(0, Math.min(100, startOy - dy / r.height * 100 * scale));
      media.dataset.ox = ox; media.dataset.oy = oy;
      lb.classList.add('panning');
      media.style.transformOrigin = ox + '% ' + oy + '%';
    }
  });
  stage.addEventListener('pointerup', function (e) {
    lb.classList.remove('panning');
    if (e.pointerType === 'mouse' || zoomed) { setTimeout(function () { moved = false; }, 0); return; }
    var dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) show(cur + (dx < 0 ? 1 : -1));
    else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) close();
    setTimeout(function () { moved = false; }, 0);
  });

  document.addEventListener('keydown', function (e) {
    if (lb.hidden) return;
    if (e.key === 'Escape') { if (zoomed) setZoom(false); else close(); }
    else if (e.key === 'ArrowRight') show(cur + 1);
    else if (e.key === 'ArrowLeft') show(cur - 1);
    else if (e.key === 'Tab') {
      // keep focus inside the dialog
      var f = [].slice.call(lb.querySelectorAll('button:not([hidden]), video[controls]'));
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
})();
