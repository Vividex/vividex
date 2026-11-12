/* Accessible navigation for Vividex mobile/tablet layouts */
(() => {
  const header = document.querySelector('.nav');
  const toggle = header?.querySelector('.nav-mobile-toggle');
  const panel = header?.querySelector('.nav-mobile-panel');
  if (!toggle || !panel) return;

  function setOpen(open, returnFocus = false) {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (returnFocus) toggle.focus();
  }

  toggle.addEventListener('click', () => {
    const opening = toggle.getAttribute('aria-expanded') !== 'true';
    setOpen(opening);
    if (opening) panel.querySelector('a')?.focus({ preventScroll: true });
  });

  panel.addEventListener('click', e => {
    if (e.target.closest('a')) setOpen(false);
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !panel.hidden) setOpen(false, true);
  });

  document.addEventListener('pointerdown', e => {
    if (!panel.hidden && !header.contains(e.target)) setOpen(false);
  });

  const desktop = window.matchMedia('(min-width: 961px)');
  desktop.addEventListener('change', () => {
    if (desktop.matches) setOpen(false);
  });
})();
