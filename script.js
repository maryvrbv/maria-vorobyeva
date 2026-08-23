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
}

(() => {
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

  // case page titles: confined to their own (short) .case-hero section.
  // Height is measured from the parent section and written back onto the
  // canvas explicitly — .case-hero is auto-height (sized by its content),
  // and top:0;bottom:0 doesn't reliably stretch a positioned child against
  // an auto-height positioned ancestor
  document.querySelectorAll('.case-hero-canvas').forEach((canvas) => {
    const heroSection = canvas.parentElement;
    const content = heroSection.querySelector('.case-hero-content');
    createDotField(canvas, {
      color: canvas.dataset.color || '#7c3aed',
      setCanvasHeight: true,
      getHeight: () => heroSection.offsetHeight,
      // fade starts right where the back-link/heading/description block
      // ends, not an arbitrary distance from the section's bottom edge —
      // content.offsetTop is measured against .case-hero itself (the
      // nearest positioned ancestor), i.e. the same coordinate space the
      // canvas draws in
      getFadeStart: () => content ? content.offsetTop + content.offsetHeight : heroSection.offsetHeight,
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
