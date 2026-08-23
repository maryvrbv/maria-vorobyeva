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
