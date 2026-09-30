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

/* ── Work drum carousel ── */
document.querySelectorAll('.catalogue-nav').forEach(nav => {
  const prevBtn = nav.querySelector('.cat-prev');
  const nextBtn = nav.querySelector('.cat-next');
  const status = nav.querySelector('.cat-status');
  const track = document.getElementById(prevBtn.dataset.target);
  if (!track) return;
  const stage = track.querySelector('.catalogue-stage');
  const cards = Array.from(stage.querySelectorAll('.cat-card'));
  if (!cards.length) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const total = cards.length;
  let current = 0;

  function sizeStage() {
    stage.style.height = Math.max(...cards.map(c => c.offsetHeight)) + 'px';
  }

  function layout() {
    const radius = cards[0].offsetWidth * 1.05;
    cards.forEach((card, i) => {
      let offset = i - current;
      if (offset > total / 2) offset -= total;
      if (offset < -total / 2) offset += total;
      const abs = Math.abs(offset);
      const sign = Math.sign(offset);
      const active = abs === 0;

      if (reduceMotion) {
        card.style.transform = `translateX(-50%) scale(${active ? 1 : 0.92})`;
        card.style.opacity = active ? '1' : '0';
        card.style.filter = 'none';
      } else {
        let angle, scale, opacity, blur;
        if (abs === 0)      { angle = 0;        scale = 1;    opacity = 1;    blur = 0; }
        else if (abs === 1) { angle = 42 * sign; scale = 0.86; opacity = 0.55; blur = 1; }
        else if (abs === 2) { angle = 78 * sign; scale = 0.74; opacity = 0;    blur = 2; }
        else                { angle = 100 * sign; scale = 0.68; opacity = 0;   blur = 2; }
        const rad = angle * Math.PI / 180;
        const x = Math.sin(rad) * radius;
        const z = -radius * (1 - Math.cos(rad));
        card.style.transform = `translateX(-50%) translate3d(${x}px, 0, ${z}px) rotateY(${angle}deg) scale(${scale})`;
        card.style.opacity = String(opacity);
        card.style.filter = blur ? `blur(${blur}px)` : 'none';
      }
      card.style.zIndex = String(active ? 30 : 20 - abs);
      card.dataset.active = String(active);
      card.setAttribute('aria-hidden', String(!active));
      const link = card.querySelector('a');
      if (link) link.tabIndex = active ? 0 : -1;
    });
  }

  function updateStatus() {
    if (!status) return;
    const name = cards[current].querySelector('.cat-name');
    status.textContent = `Project ${current + 1} of ${total}: ${name ? name.textContent : ''}`;
  }

  function go(delta) {
    current = (current + delta + total) % total;
    layout();
    updateStatus();
  }

  prevBtn.disabled = total <= 1;
  nextBtn.disabled = total <= 1;
  prevBtn.addEventListener('click', () => go(-1));
  nextBtn.addEventListener('click', () => go(1));
  track.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
  });

  sizeStage();
  cards.forEach(c => { c.style.transition = 'none'; });
  layout();
  updateStatus();
  void stage.offsetWidth;
  requestAnimationFrame(() => cards.forEach(c => { c.style.transition = ''; }));

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { sizeStage(); layout(); }, 120);
  });
});

/* ── Hero circuit background ── */
(function () {
  const canvas = document.getElementById('hero-signal');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const hero = canvas.parentElement;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let width = 0, height = 0, frame = null, visible = true;

  // Angular traces frame the content rather than passing through the headline.
  function trace(points, brightness, strong) {
    ctx.beginPath();
    points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.strokeStyle = strong ? `rgba(0,190,255,${brightness})` : `rgba(0,92,255,${brightness})`;
    ctx.lineWidth = strong ? 1.8 : 1;
    ctx.shadowColor = '#007bff';
    ctx.shadowBlur = strong ? 12 : 0;
    ctx.stroke();
    const [x, y] = points[points.length - 1];
    ctx.beginPath();
    ctx.arc(x, y, strong ? 3 : 2, 0, Math.PI * 2);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function render(now = 0) {
    frame = null;
    ctx.clearRect(0, 0, width, height);
    const mobile = width < 640;
    const pulse = motion.matches ? 0.72 : 0.72 + 0.1 * Math.sin(now / 1800);
    const unit = Math.min(width * 0.4, 480);
    for (let i = 0; i < 6; i++) {
      const offset = i * (mobile ? 14 : 24);
      const strong = i === 1 || i === 4;
      const alpha = (strong ? 0.58 : 0.25) * pulse;
      trace([
        [width + 30, -30 + offset],
        [width - unit * 0.55, unit * 0.55 + offset],
        [width - unit * 0.94, unit * 0.55 + offset],
        [width - unit * 1.03, unit * 0.64 + offset]
      ], alpha, strong);
      trace([
        [width + 30, height * 0.55 + offset],
        [width - unit * 0.6, height * 0.55 + unit * 0.6 + offset],
        [width - unit * 1.02, height * 0.55 + unit * 0.6 + offset],
        [width - unit * 1.16, height * 0.55 + unit * 0.74 + offset]
      ], alpha * 0.8, strong);
      trace([
        [-30, -30 + offset],
        [unit * 0.15, unit * 0.15 + offset],
        [unit * 0.48, unit * 0.15 + offset],
        [unit * 0.6, unit * 0.03 + offset]
      ], alpha * 0.5, strong);
    }
    // Restrained rows of circuit contacts near the upper-right edge.
    ctx.fillStyle = `rgba(0,126,255,${0.35 * pulse})`;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(width - unit * 0.75 + i * 18, unit * 0.42, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    if (visible && !document.hidden && !motion.matches) frame = requestAnimationFrame(render);
  }

  function restart() {
    if (frame !== null) cancelAnimationFrame(frame);
    render(performance.now());
  }
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = hero.clientWidth;
    height = hero.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    restart();
  }
  new ResizeObserver(resize).observe(hero);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    restart();
  }).observe(hero);
  motion.addEventListener('change', restart);
  document.addEventListener('visibilitychange', restart);
  resize();
})();
