// Alternative EN homepage, version 6 (index-en-v6.html) — page-only
// behaviour on top of the shared script.js (reveal, lang switch, email
// copy, click tracking).
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = window.matchMedia('(hover: hover) and (min-width: 761px)').matches;

  // ---- work index: the case cover floats next to the cursor while a row
  // is hovered or focused (after 21st.dev "Hover Image List"): position
  // eases toward the pointer and the card tilts with horizontal speed ----
  const list = document.querySelector('[data-hover-list]');
  const float = document.querySelector('.float-cover');
  if (list && float && canHover && !reduceMotion) {
    const img = float.querySelector('img');
    let x = 0, y = 0, tx = 0, ty = 0, raf = 0, active = false;

    const tick = () => {
      const dx = tx - x;
      x += dx * 0.14;
      y += (ty - y) * 0.14;
      const tilt = Math.max(-8, Math.min(8, dx * 0.08));
      float.style.setProperty('--x', `${x}px`);
      float.style.setProperty('--y', `${y}px`);
      float.style.setProperty('--tilt', `${tilt}deg`);
      raf = active || Math.abs(dx) > 0.5 ? requestAnimationFrame(tick) : 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
    const show = (row) => {
      const src = row.dataset.cover;
      if (src && img.getAttribute('src') !== src) img.src = src;
      active = true;
      float.classList.add('on');
      kick();
    };

    list.querySelectorAll('.index-row').forEach((row) => {
      row.addEventListener('pointerenter', (e) => {
        if (!float.classList.contains('on')) { x = tx = e.clientX + 140; y = ty = e.clientY; }
        show(row);
      });
      row.addEventListener('pointermove', (e) => { tx = e.clientX + 140; ty = e.clientY; kick(); });
      // keyboard: park the cover beside the focused row's arrow
      row.addEventListener('focus', () => {
        const r = row.getBoundingClientRect();
        x = tx = r.right - 260; y = ty = r.top + r.height / 2;
        show(row);
      });
      row.addEventListener('blur', () => { active = false; float.classList.remove('on'); });
    });
    list.addEventListener('pointerleave', () => { active = false; float.classList.remove('on'); });
    window.addEventListener('scroll', () => { if (!list.matches(':hover')) float.classList.remove('on'); }, { passive: true });
  }
})();
