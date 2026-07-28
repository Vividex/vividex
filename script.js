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

/* ── Hero signal background ── */
(function () {
  const canvas = document.getElementById('hero-signal');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const hero = canvas.parentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = hero.clientWidth * dpr;
    canvas.height = hero.clientHeight * dpr;
    canvas.style.width = hero.clientWidth + 'px';
    canvas.style.height = hero.clientHeight + 'px';
  }
  resize();
  window.addEventListener('resize', resize);

  const FREQ = 1.6, AMP_FRAC = 0.1, BASE_FRAC = 0.72;

  function lineY(nx, h, t) {
    const baseY = h * BASE_FRAC;
    const amp = h * AMP_FRAC;
    return baseY - amp * Math.sin(nx * Math.PI * FREQ + t * 0.6) * (0.4 + 0.6 * nx);
  }

  function drawDots(w, h) {
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#00d9ff';
    const spacing = 42 * dpr;
    for (let y = 0; y < h; y += spacing) {
      for (let x = 0; x < w; x += spacing) {
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawLine(w, h, t) {
    ctx.save();
    ctx.beginPath();
    for (let x = 0; x <= w; x += 4) {
      const nx = x / w;
      const y = lineY(nx, h, t);
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, 'rgba(0,92,255,0.15)');
    grad.addColorStop(0.6, 'rgba(0,150,255,0.55)');
    grad.addColorStop(1, 'rgba(0,217,255,0.9)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2 * dpr;
    ctx.shadowColor = 'rgba(0,217,255,0.6)';
    ctx.shadowBlur = 14;
    ctx.stroke();
    ctx.restore();
  }

  function pulsePosition(t) {
    return 1.15 - (t * 0.175) % 1.3;
  }

  function drawPulse(w, h, t) {
    const nx = pulsePosition(t);
    if (nx < 0 || nx > 1) return;
    const y = lineY(nx, h, t);
    const x = nx * w;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, 26 * dpr);
    grad.addColorStop(0, 'rgba(255,255,255,0.95)');
    grad.addColorStop(0.3, 'rgba(0,217,255,0.7)');
    grad.addColorStop(1, 'rgba(0,217,255,0)');
    ctx.save();
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, 26 * dpr, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  let t = 0;
  function draw() {
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    drawDots(w, h);
    drawLine(w, h, t);
    drawPulse(w, h, t);
    if (!reduceMotion) {
      t += 0.006;
      requestAnimationFrame(draw);
    }
  }
  draw();
})();
