'use strict';
// Desenho dos inimigos da campanha (um "case" por tipo de js/data/enemies.js).

function drawEnemy(ctx, e, x, y, S, t) {
  const u = S / 48;
  ctx.save(); ctx.translate(x, y);
  if (e.spawnT > 0) ctx.globalAlpha *= 1 - Math.min(1, e.spawnT / 0.6) * 0.8;
  if (e.dying > 0) { const k = e.dying / 0.7; ctx.globalAlpha *= k; ctx.scale(1 + (1 - k) * 0.6, k); }
  if (e.invuln > 0 && Math.floor(t * 14) % 2) ctx.globalAlpha *= 0.4;
  const tt = e.frozen > 0 ? 0 : t;   // congelado = animação parada
  const look = e.dx * 2.5;
  const eyes = (c1, c2, dy = -2, gap = 5, r = 3.5) => {
    ctx.fillStyle = c1; ell(ctx, (-gap + look) * u, dy * u, r * u, (r + 1) * u); ell(ctx, (gap + look) * u, dy * u, r * u, (r + 1) * u);
    ctx.fillStyle = c2; circ(ctx, (-gap + look * 1.4) * u, (dy + 0.6) * u, r * 0.5 * u); circ(ctx, (gap + look * 1.4) * u, (dy + 0.6) * u, r * 0.5 * u);
  };
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  if (e.type !== 'morcego' && e.type !== 'fantasma') ell(ctx, 0, 15 * u, 13 * u, 4 * u);
  switch (e.type) {
    case 'gota': {
      const sq = 1 + Math.sin(tt * 7 + e.id) * 0.09;
      ctx.fillStyle = '#35c6dc'; ctx.strokeStyle = '#13707f'; ctx.lineWidth = 2 * u; ctx.beginPath();
      ctx.moveTo(0, -15 * u / sq);
      ctx.bezierCurveTo(9 * u * sq, -6 * u, 14 * u * sq, 2 * u, 13 * u * sq, 8 * u);
      ctx.quadraticCurveTo(0, 18 * u, -13 * u * sq, 8 * u);
      ctx.bezierCurveTo(-14 * u * sq, 2 * u, -9 * u * sq, -6 * u, 0, -15 * u / sq);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; ell(ctx, -5 * u, -4 * u, 3 * u, 5 * u);
      eyes('#fff', '#123', 2);
      break;
    }
    case 'morcego': {
      const f = Math.sin(tt * 22 + e.id) * 0.5;
      ctx.translate(0, Math.sin(tt * 5 + e.id) * 3 * u - 4 * u);
      ctx.fillStyle = 'rgba(0,0,0,0.2)'; ell(ctx, 0, 19 * u, 9 * u, 3 * u);
      ctx.fillStyle = '#6b3fa0';
      for (const sd of [-1, 1]) {
        ctx.save(); ctx.scale(sd, 1); ctx.rotate(f);
        ctx.beginPath(); ctx.moveTo(6 * u, -2 * u); ctx.lineTo(22 * u, -10 * u); ctx.lineTo(19 * u, 0);
        ctx.lineTo(15 * u, -2 * u); ctx.lineTo(12 * u, 4 * u); ctx.lineTo(6 * u, 4 * u); ctx.fill(); ctx.restore();
      }
      ctx.fillStyle = '#9b63d6'; circ(ctx, 0, 0, 10 * u);
      ctx.beginPath(); ctx.moveTo(-8 * u, -6 * u); ctx.lineTo(-6 * u, -14 * u); ctx.lineTo(-2 * u, -8 * u); ctx.fill();
      ctx.beginPath(); ctx.moveTo(8 * u, -6 * u); ctx.lineTo(6 * u, -14 * u); ctx.lineTo(2 * u, -8 * u); ctx.fill();
      eyes('#ffe14d', '#311', -1, 4, 2.6);
      break;
    }
    case 'fantasma': {
      ctx.globalAlpha *= 0.85;
      ctx.translate(0, Math.sin(tt * 3 + e.id) * 2 * u);
      ctx.fillStyle = 'rgba(0,0,0,0.15)'; ell(ctx, 0, 17 * u, 10 * u, 3 * u);
      ctx.fillStyle = '#eef2ff';
      ctx.beginPath(); ctx.arc(0, -3 * u, 13 * u, Math.PI, 0); ctx.lineTo(13 * u, 12 * u);
      for (let i = 0; i < 4; i++) {
        const xx = 13 - (i + 1) * 6.5, wv = Math.sin(tt * 8 + i + e.id) * 2;
        ctx.quadraticCurveTo((xx + 3.25) * u, (16 + wv) * u, xx * u, 11 * u);
      }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#2b2f55'; ell(ctx, (-5 + look) * u, -3 * u, 3 * u, 4.5 * u); ell(ctx, (5 + look) * u, -3 * u, 3 * u, 4.5 * u);
      ell(ctx, look * u, 5 * u, 2.5 * u, 2 * u);
      break;
    }
    case 'cacador': {
      ctx.save(); ctx.rotate(tt * 1.5);
      ctx.fillStyle = '#d9541f'; ctx.beginPath();
      for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2, r = (i % 2 ? 10 : 15) * u; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      ctx.closePath(); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#ff8a3d'; circ(ctx, 0, 0, 10.5 * u);
      eyes('#fff', '#200', -1, 4.5, 3);
      ctx.strokeStyle = '#3a1205'; ctx.lineWidth = 2 * u; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-8 * u, -7 * u); ctx.lineTo(-2 * u, -4.5 * u); ctx.moveTo(8 * u, -7 * u); ctx.lineTo(2 * u, -4.5 * u); ctx.stroke();
      break;
    }
    case 'tanque': {
      ctx.fillStyle = '#3b4148'; rr(ctx, -15 * u, 5 * u, 30 * u, 10 * u, 4 * u); ctx.fill();
      ctx.fillStyle = '#5b636d';
      const off = (tt * 20) % 6;
      for (let i = -15; i < 15; i += 6) ctx.fillRect((i + off) * u, 7 * u, 2 * u, 6 * u);
      ctx.fillStyle = '#7d8a99'; rr(ctx, -13 * u, -10 * u, 26 * u, 17 * u, 5 * u); ctx.fill();
      ctx.fillStyle = '#9aa7b6'; rr(ctx, -11 * u, -9 * u, 22 * u, 4 * u, 2 * u); ctx.fill();
      ctx.fillStyle = '#2a0f12'; rr(ctx, -9 * u, -4 * u, 18 * u, 6 * u, 3 * u); ctx.fill();
      ctx.fillStyle = '#ff3b3b'; circ(ctx, (look * 1.5 - 3) * u, -1 * u, 1.8 * u); circ(ctx, (look * 1.5 + 3) * u, -1 * u, 1.8 * u);
      hpPips(ctx, e, u, -15);
      break;
    }
    case 'bruxo': {
      ctx.translate(0, Math.sin(tt * 3 + e.id) * 1.5 * u);
      ctx.fillStyle = '#3b2a7a'; poly(ctx, [[-13, 14], [0, -6], [13, 14]], u); ctx.fill();
      ctx.fillStyle = '#e9d3b0'; circ(ctx, 0, -6 * u, 8 * u);
      eyes('#fff', '#1a1040', -6, 3.2, 2.3);
      ctx.fillStyle = '#d8d8e8'; poly(ctx, [[-6, -2], [0, 9], [6, -2]], u); ctx.fill();   // barba
      ctx.fillStyle = '#5b3fa0'; ell(ctx, 0, -12 * u, 12 * u, 3 * u);
      poly(ctx, [[-8, -12], [3, -30], [8, -12]], u); ctx.fill();
      ctx.fillStyle = '#ffd23f'; circ(ctx, 2 * u, -20 * u, 1.8 * u);
      ctx.strokeStyle = '#7a4f2a'; ctx.lineWidth = 2.2 * u;
      ctx.beginPath(); ctx.moveTo(14 * u, 14 * u); ctx.lineTo(14 * u, -12 * u); ctx.stroke();
      const glow = 3.5 + Math.sin(tt * 6) * 1;
      ctx.fillStyle = 'rgba(143,227,255,0.45)'; circ(ctx, 14 * u, -14 * u, (glow + 3) * u);
      ctx.fillStyle = '#c9f3ff'; circ(ctx, 14 * u, -14 * u, glow * u);
      hpPips(ctx, e, u, -34);
      break;
    }
    case 'rei': {
      ctx.scale(1.45, 1.45);
      const g = ctx.createRadialGradient(-4 * u, -6 * u, 2 * u, 0, 0, 17 * u);
      g.addColorStop(0, '#ffb347'); g.addColorStop(0.5, '#e0341b'); g.addColorStop(1, '#5a0d06');
      ctx.fillStyle = g; ell(ctx, 0, 1 * u, 15 * u, 13 * u);
      ctx.strokeStyle = `rgba(255,220,90,${0.6 + Math.sin(tt * 6) * 0.3})`; ctx.lineWidth = 1.4 * u;
      ctx.beginPath(); ctx.moveTo(-10 * u, 6 * u); ctx.lineTo(-5 * u, 2 * u); ctx.lineTo(-7 * u, -3 * u);
      ctx.moveTo(9 * u, 7 * u); ctx.lineTo(5 * u, 3 * u); ctx.lineTo(8 * u, -2 * u); ctx.stroke();
      ctx.fillStyle = '#ffd23f';
      poly(ctx, [[-9, -9], [-9, -17], [-5, -12], [0, -19], [5, -12], [9, -17], [9, -9]], u); ctx.fill();
      ctx.fillStyle = '#ff3b6b'; circ(ctx, 0, -13 * u, 1.6 * u);
      eyes('#fff3c4', '#300', -2, 5, 3.2);
      ctx.strokeStyle = '#300'; ctx.lineWidth = 1.8 * u;
      ctx.beginPath(); ctx.moveTo(-9 * u, -8 * u); ctx.lineTo(-2 * u, -5 * u); ctx.moveTo(9 * u, -8 * u); ctx.lineTo(2 * u, -5 * u); ctx.stroke();
      break;
    }
  }
  ctx.restore();
  if (!e.dying) drawStatus(ctx, x, y, S, e, t);
  if (ENEMY_TYPES[e.type].boss && !e.dying) {
    const w = S * 1.3;
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; rr(ctx, x - w / 2, y - S * 0.95, w, 6, 3); ctx.fill();
    ctx.fillStyle = '#ff3b1f'; rr(ctx, x - w / 2, y - S * 0.95, w * (e.hp / e.maxHp), 6, 3); ctx.fill();
  }
}

// Bolinhas de vida acima de inimigos resistentes
function hpPips(ctx, e, u, y) {
  for (let i = 0; i < e.maxHp; i++) {
    ctx.fillStyle = i < e.hp ? '#ffd23f' : 'rgba(0,0,0,0.35)';
    circ(ctx, (-(e.maxHp - 1) * 2.5 + i * 5) * u, y * u, 1.8 * u);
  }
}
