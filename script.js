/* ── Nav scroll state ── */
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

/* ── Services accordion ── */
const srvRows = document.querySelectorAll('.srv-row');
const panel = document.getElementById('srv-panel');
const panelTitle = document.getElementById('srv-panel-title');
const panelDesc = document.getElementById('srv-panel-desc');
let activeRow = null;

srvRows.forEach(row => {
  const activate = () => {
    if (activeRow === row) {
      row.classList.remove('active');
      panel.classList.remove('open');
      activeRow = null;
      return;
    }
    srvRows.forEach(r => r.classList.remove('active'));
    row.classList.add('active');
    panelTitle.textContent = row.dataset.title;
    panelDesc.textContent = row.dataset.desc;
    panel.classList.add('open');
    activeRow = row;
  };
  row.addEventListener('click', activate);
  row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); } });
});

/* ── Smooth scroll ── */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const t = document.querySelector(a.getAttribute('href'));
    if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth' }); }
  });
});

/* ── Horizontal featured work gallery ── */
(() => {
  const gallery = document.getElementById('work-catalogue');
  if (!gallery) return;

  const rail = gallery.querySelector('.catalogue-stage');
  const cards = Array.from(rail.querySelectorAll('.cat-card'));
  const nav = document.querySelector('.work .catalogue-nav');
  if (!nav || !cards.length) return;

  const previous = nav.querySelector('.cat-prev');
  const next = nav.querySelector('.cat-next');
  const count = document.getElementById('work-catalogue-index');
  const fill = document.getElementById('work-catalogue-progress-fill');
  const progress = document.getElementById('work-catalogue-progress');
  const status = document.getElementById('work-catalogue-status');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0;
  let pendingFrame = null;

  function positions() {
    return cards.map(card => card.offsetLeft - cards[0].offsetLeft);
  }

  function render(index) {
    current = index;
    cards.forEach((card, i) => card.classList.toggle('is-active', i === index));
    previous.disabled = index === 0;
    next.disabled = index === cards.length - 1;
    count.textContent = String(index + 1).padStart(2, '0');
    fill.style.width = ((index + 1) / cards.length * 100) + '%';
    progress.setAttribute('aria-valuenow', String(index + 1));
    const title = cards[index].querySelector('.cat-name');
    status.textContent = 'Project ' + (index + 1) + ' of ' + cards.length + ': ' + (title ? title.textContent : '');
  }

  function sync() {
    pendingFrame = null;
    const stops = positions();
    const closest = stops.reduce((best, stop, i) =>
      Math.abs(stop - rail.scrollLeft) < Math.abs(stops[best] - rail.scrollLeft) ? i : best, 0);
    if (closest !== current) render(closest);
  }

  function goTo(index) {
    const safe = Math.min(cards.length - 1, Math.max(0, index));
    render(safe);
    rail.scrollTo({
      left: positions()[safe],
      behavior: reducedMotion.matches ? 'instant' : 'smooth'
    });
  }

  previous.addEventListener('click', () => goTo(current - 1));
  next.addEventListener('click', () => goTo(current + 1));
  rail.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight') { event.preventDefault(); goTo(current + 1); }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); goTo(current - 1); }
  });
  rail.addEventListener('scroll', () => {
    if (pendingFrame === null) pendingFrame = requestAnimationFrame(sync);
  }, { passive: true });
  window.addEventListener('resize', sync, { passive: true });

  render(0);
})();

/* ── Site circuit backgrounds ── */
(function () {
  document.querySelectorAll('main > section, body > .footer').forEach((surface, surfaceIndex) => {
  surface.classList.add('circuit-surface');
  let canvas = surface.querySelector('#hero-signal');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    surface.prepend(canvas);
  }
  canvas.classList.add('circuit-canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const hero = canvas.parentElement;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(pointer: fine)');
  const isHero = surfaceIndex === 0;
  let width = 0, height = 0, frame = null, visible = false;
  let lastDpr = 0, lastPaint = 0, scrolling = false, scrollIdleTimer = null;
  let time = 0;

  // The hero keeps its travelling light on desktop only. Other sections
  // retain the same circuit composition as a static backdrop.
  function shouldAnimate() {
    return isHero && visible && !scrolling && !document.hidden &&
      !motion.matches && finePointer.matches && width >= 640;
  }

  // Angular traces frame the content rather than passing through the headline.
  function trace(points, brightness, strong, phase = 0) {
    ctx.beginPath();
    points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.strokeStyle = strong ? `rgba(0,190,255,${brightness})` : `rgba(0,92,255,${brightness})`;
    ctx.lineWidth = strong ? 1.8 : 1;
    ctx.shadowColor = '#007bff';
    ctx.shadowBlur = strong ? 18 : 5;
    ctx.stroke();
    const [x, y] = points[points.length - 1];
    ctx.beginPath();
    ctx.arc(x, y, strong ? 3 : 2, 0, Math.PI * 2);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
    ctx.shadowBlur = 0;
    if (strong && shouldAnimate()) {
      const lengths = points.slice(1).map(([px, py], i) => Math.hypot(px - points[i][0], py - points[i][1]));
      const total = lengths.reduce((sum, length) => sum + length, 0);
      const travelMs = 6500, flashMs = 180, fadeMs = 650, restMs = 500;
      const cycleMs = travelMs + flashMs + fadeMs + restMs;
      const elapsed = (time + (phase + surfaceIndex * 0.17) * cycleMs) % cycleMs;
      const progress = Math.min(1, elapsed / travelMs);
      const arrivalMs = elapsed - travelMs;
      // Maintain full travelling luminosity; flash and fade only at the terminal.
      const fade = arrivalMs < flashMs ? 1 : Math.max(0, 1 - (arrivalMs - flashMs) / fadeMs);
      const terminalBrightness = arrivalMs >= 0 ? 1.25 : 1;
      let distance = progress * total;
      let [x, y] = points[points.length - 1];
      for (let i = 0; i < lengths.length; i++) {
        if (distance <= lengths[i]) {
          const fraction = lengths[i] ? distance / lengths[i] : 0;
          x = points[i][0] + (points[i + 1][0] - points[i][0]) * fraction;
          y = points[i][1] + (points[i + 1][1] - points[i][1]) * fraction;
          break;
        }
        distance -= lengths[i];
      }
      const glow = ctx.createRadialGradient(x, y, 0, x, y, 22);
      glow.addColorStop(0, `rgba(225,250,255,${fade})`);
      glow.addColorStop(0.15, `rgba(0,220,255,${fade * 0.95})`);
      glow.addColorStop(0.5, `rgba(0,110,255,${fade * 0.45})`);
      glow.addColorStop(1, 'rgba(0,92,255,0)');
      // Avoid costly full-canvas filter compositing in the animation loop.
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, 22 * terminalBrightness, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function render(now = 0) {
    time = now;
    ctx.clearRect(0, 0, width, height);
    const mobile = width < 640;
    const pulse = shouldAnimate() ? 0.72 + 0.1 * Math.sin(now / 1800) : 0.72;
    const unit = Math.min(width * 0.4, 480);
    // Each section gets its own composition: different edges, bends and density.
    const layouts = [
      [{side: 'right', y: 0.02, count: 5, path: [[0,-30],[0.5,0.5],[0.88,0.5],[1,0.62]]},
       {side: 'left', y: 0.02, count: 3, path: [[0,-30],[0.2,0.2],[0.58,0.2]]}],
      [{side: 'right', y: 0.26, count: 4, path: [[0,0],[0.24,0.24],[0.24,0.55],[0.45,0.76],[0.72,0.76]]}],
      [{side: 'left', y: 0.42, count: 5, path: [[0,0],[0.18,-0.18],[0.18,-0.42],[0.4,-0.64],[0.7,-0.64]]},
       {side: 'right', y: 0.7, count: 4, path: [[0,0],[0.35,-0.35],[0.8,-0.35]]},
       {side: 'right', y: 0.08, count: 3, path: [[0,0],[0.22,0.22],[0.58,0.22],[0.72,0.36]]},
       {side: 'left', y: 0.85, count: 3, path: [[0,0],[0.22,-0.22],[0.6,-0.22]]}],
      [{side: 'right', y: 0.1, count: 5, path: [[0,0],[0.25,0.25],[0.55,0.25],[0.7,0.4],[0.7,0.62]]}],
      [{side: 'left', y: 0.74, count: 4, path: [[0,0],[0.3,-0.3],[0.68,-0.3],[0.82,-0.44]]},
       {side: 'right', y: 0.13, count: 2, path: [[0,0],[0.2,0.2],[0.2,0.5]]}],
      [{side: 'right', y: 0.6, count: 3, path: [[0,0],[0.3,-0.3],[0.3,-0.55],[0.5,-0.75],[0.85,-0.75]]},
       {side: 'left', y: 0.06, count: 2, path: [[0,0],[0.15,0.15],[0.55,0.15]]}],
      [{side: 'right', y: 0.05, count: 3, path: [[0,0],[0.12,0.12],[0.55,0.12],[0.68,0]]}]
    ];
    const layout = layouts[surfaceIndex % layouts.length];
    layout.forEach((bundle, bundleIndex) => {
      for (let i = 0; i < bundle.count; i++) {
        const offset = i * (mobile ? 12 : 22);
        const strong = i === 1 || (bundle.count > 4 && i === 4);
        const points = bundle.path.map(([x, y], pointIndex) => [
          bundle.side === 'right' ? width + 12 - x * unit : -12 + x * unit,
          height * bundle.y + (pointIndex === 0 && y === -30 ? -30 : y * unit) + offset
        ]);
        trace(points, (strong ? 0.95 : 0.46) * pulse, strong, i * 0.23 + bundleIndex * 0.43);
      }
      const endpoint = bundle.path[bundle.path.length - 1];
      const tipX = bundle.side === 'right' ? width + 12 - endpoint[0] * unit : -12 + endpoint[0] * unit;
      const tipY = height * bundle.y + endpoint[1] * unit;
      ctx.fillStyle = `rgba(0,126,255,${0.35 * pulse})`;
      for (let i = 0; i < 3 + surfaceIndex % 3; i++) {
        ctx.beginPath();
        ctx.arc(tipX + (bundle.side === 'right' ? 1 : -1) * i * 16, tipY - 18, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    // Rendering is deliberately not scheduled here: only the hero's
    // low-rate animation loop can schedule subsequent frames.
  }

  function tick(now) {
    frame = null;
    if (!shouldAnimate()) return;
    // 15fps is sufficient for a slow travelling circuit pulse, and
    // avoids repeatedly repainting an entire page-sized canvas at 60fps.
    if (now - lastPaint >= 66) {
      render(now);
      lastPaint = now;
    }
    frame = requestAnimationFrame(tick);
  }

  function restart() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    if (isHero && scrolling) return;
    const now = performance.now();
    render(now);
    lastPaint = now;
    if (shouldAnimate()) frame = requestAnimationFrame(tick);
  }

  function resize() {
    const nextWidth = hero.clientWidth;
    const nextHeight = hero.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, nextWidth < 640 ? 1 : 1.25);
    if (nextWidth === width && nextHeight === height && dpr === lastDpr) return;
    width = nextWidth;
    height = nextHeight;
    lastDpr = dpr;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    restart();
  }

  new ResizeObserver(resize).observe(hero);
  if (isHero) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      restart();
    }).observe(hero);

    // Stop painting during scrolling so the browser can prioritize
    // responding to touch/wheel input. Resume only after scrolling ends.
    window.addEventListener('scroll', () => {
      scrolling = true;
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      clearTimeout(scrollIdleTimer);
      scrollIdleTimer = setTimeout(() => {
        scrolling = false;
        if (visible) restart();
      }, 230);
    }, { passive: true });

    motion.addEventListener('change', restart);
    finePointer.addEventListener('change', restart);
    document.addEventListener('visibilitychange', restart);
  }
  resize();
  });
})();
