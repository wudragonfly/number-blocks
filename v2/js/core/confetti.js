// confetti.js — lightweight canvas confetti (no dependencies).
import { PALETTE } from './blocks.js';

const COLORS = Object.values(PALETTE).slice(0, 9);
let canvas, ctx, particles = [], rafId = null;

function ensureCanvas() {
  if (!canvas) {
    canvas = document.getElementById('confetti-canvas');
    ctx = canvas.getContext('2d');
    const fit = () => {
      canvas.width = window.innerWidth * devicePixelRatio;
      canvas.height = window.innerHeight * devicePixelRatio;
    };
    fit();
    window.addEventListener('resize', fit);
  }
  return canvas;
}

function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const dpr = devicePixelRatio;
  particles = particles.filter((p) => p.life > 0);
  for (const p of particles) {
    p.vy += 0.16 * dpr;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;
    p.life -= 1;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = Math.min(1, p.life / 30);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
    ctx.restore();
  }
  if (particles.length) {
    rafId = requestAnimationFrame(loop);
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    rafId = null;
  }
}

function spawn(x, y, count, spread) {
  ensureCanvas();
  const dpr = devicePixelRatio;
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * spread;
    const speed = (3 + Math.random() * 6) * dpr;
    particles.push({
      x: x * dpr, y: y * dpr,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      vr: (Math.random() - 0.5) * 0.3,
      rot: Math.random() * Math.PI,
      size: (5 + Math.random() * 7) * dpr,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      life: 70 + Math.random() * 50,
    });
  }
  if (!rafId) rafId = requestAnimationFrame(loop);
}

/** Small burst at an element (e.g. the correct answer button). */
export function confettiBurst(target) {
  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;
  if (target?.getBoundingClientRect) {
    const r = target.getBoundingClientRect();
    x = r.left + r.width / 2;
    y = r.top + r.height / 2;
  }
  spawn(x, y, 26, 1.6);
}

/** Big celebration: several bursts across the top of the screen. */
export function confettiRain() {
  const w = window.innerWidth;
  [0.2, 0.5, 0.8].forEach((fx, i) => {
    setTimeout(() => spawn(w * fx, window.innerHeight * 0.22, 44, 2.4), i * 220);
  });
}
