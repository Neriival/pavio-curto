'use strict';
// Desenho dos equipamentos: no boneco (drawGearBody / drawGearTop) e como ícone (drawGearIcon).
// As cores vêm do material (GEAR_TIERS em js/data/equipment.js). Unidade u = S/48, como no personagem.

const gearTier = (gear, slot) => (gear && gear[slot] != null ? GEAR_TIERS[gear[slot]] : null);

// brilho mágico dos materiais mais raros
function gearGlow(ctx, T, u, t, draw) {
  if (!T.glow) return draw();
  ctx.save(); ctx.shadowColor = T.glow; ctx.shadowBlur = (6 + Math.sin(t * 4) * 3) * u; draw(); ctx.restore();
}

// Calça e armadura: desenhadas por cima do corpo, antes do rosto
function drawGearBody(ctx, gear, u, t) {
  const L = gearTier(gear, 'legs'), A = gearTier(gear, 'armor');
  if (L) {                                   // calça: parte de baixo do corpo, com cinto
    ctx.save();
    ctx.beginPath(); ctx.ellipse(0, 0, 14 * u, 13.5 * u, 0, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = L.color; ctx.fillRect(-15 * u, 8.5 * u, 30 * u, 6 * u);
    ctx.fillStyle = L.dark; ctx.fillRect(-15 * u, 8 * u, 30 * u, 1.8 * u);
    ctx.fillStyle = L.shine; ctx.fillRect(-1 * u, 8 * u, 2 * u, 1.8 * u);          // fivela
    ctx.restore();
  }
  if (A) gearGlow(ctx, A, u, t, () => {      // armadura: ombreiras + peitoral abaixo da boca
    ctx.fillStyle = A.dark; ell(ctx, -12 * u, -0.5 * u, 5.5 * u, 4.4 * u); ell(ctx, 12 * u, -0.5 * u, 5.5 * u, 4.4 * u);
    ctx.fillStyle = A.color; ell(ctx, -12 * u, -1.2 * u, 4.8 * u, 3.6 * u); ell(ctx, 12 * u, -1.2 * u, 4.8 * u, 3.6 * u);
    ctx.fillStyle = A.shine; ell(ctx, -13 * u, -2.2 * u, 2 * u, 1.2 * u); ell(ctx, 11 * u, -2.2 * u, 2 * u, 1.2 * u);
    ctx.fillStyle = A.dark; rr(ctx, -8.5 * u, 6.8 * u, 17 * u, 5.6 * u, 2.5 * u); ctx.fill();
    ctx.fillStyle = A.color; rr(ctx, -8 * u, 6.8 * u, 16 * u, 4.6 * u, 2.2 * u); ctx.fill();
    ctx.fillStyle = A.shine; rr(ctx, -6 * u, 7.4 * u, 5 * u, 1.3 * u, 0.6 * u); ctx.fill();
  });
}

// Capacete (no lugar do chapéu/acessório) e escudo (na mão), desenhados por último
function drawGearTop(ctx, gear, u, dir, t) {
  const H = gearTier(gear, 'helmet'), S = gearTier(gear, 'shield');
  if (H) gearGlow(ctx, H, u, t, () => {
    const tier = gear.helmet;
    ctx.fillStyle = H.dark; ctx.beginPath(); ctx.ellipse(0, -6.5 * u, 15 * u, 10.5 * u, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = H.color; ctx.beginPath(); ctx.ellipse(0, -7 * u, 14 * u, 9.5 * u, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = H.dark; rr(ctx, -15 * u, -8 * u, 30 * u, 3.2 * u, 1.6 * u); ctx.fill();          // aba
    ctx.fillStyle = H.shine; ctx.beginPath(); ctx.ellipse(-5 * u, -12 * u, 4 * u, 2.2 * u, -0.4, 0, Math.PI * 2); ctx.fill();
    if (dir !== 'up' && tier >= 4) { ctx.fillStyle = H.dark; rr(ctx, -1.3 * u, -8 * u, 2.6 * u, 6 * u, 1 * u); ctx.fill(); }   // proteção do nariz
    if (tier >= 9) {                          // crista dos capacetes raros
      const plume = H.glow || H.shine;
      ctx.fillStyle = plume;
      ctx.beginPath(); ctx.moveTo(-2 * u, -16 * u);
      ctx.quadraticCurveTo(2 * u, -27 * u + Math.sin(t * 5) * u, 9 * u, -22 * u);
      ctx.quadraticCurveTo(4 * u, -20 * u, 2 * u, -16 * u); ctx.fill();
    }
  });
  if (S) gearGlow(ctx, S, u, t, () => {
    const tier = gear.shield, side = dir === 'left' ? 1 : -1, x = 14 * side * u, y = 5 * u;
    ctx.save(); ctx.translate(x, y);
    shieldShape(ctx, u * (0.85 + tier * 0.015), tier, S);
    ctx.restore();
  });
}

// Forma do escudo: redondo nos materiais simples, "brasão" nos melhores
function shieldShape(ctx, k, tier, S) {
  if (tier < 5) {
    ctx.fillStyle = S.dark; circ(ctx, 0, 0, 7 * k);
    ctx.fillStyle = S.color; circ(ctx, 0, 0, 5.8 * k);
    ctx.fillStyle = S.shine; circ(ctx, 0, 0, 1.8 * k);
    return;
  }
  const kite = (r) => { ctx.beginPath(); ctx.moveTo(-6 * r, -6.5 * r); ctx.lineTo(6 * r, -6.5 * r); ctx.lineTo(6 * r, 0);
    ctx.quadraticCurveTo(5 * r, 6 * r, 0, 9 * r); ctx.quadraticCurveTo(-5 * r, 6 * r, -6 * r, 0); ctx.closePath(); ctx.fill(); };
  ctx.fillStyle = S.dark; kite(k * 1.12);
  ctx.fillStyle = S.color; kite(k);
  ctx.fillStyle = S.shine; ctx.fillRect(-0.9 * k, -5 * k, 1.8 * k, 11 * k); ctx.fillRect(-4.5 * k, -1.8 * k, 9 * k, 1.8 * k);   // cruz
}

// Ícone de uma peça (loja / tela de equipamento)
function drawGearIcon(ctx, slot, tier, cx, cy, size, t = 0) {
  const T = GEAR_TIERS[tier]; if (!T) return;
  const k = size / 40;
  ctx.save(); ctx.translate(cx, cy);
  if (T.glow) { ctx.shadowColor = T.glow; ctx.shadowBlur = (8 + Math.sin(t * 4) * 3) * k; }
  ctx.lineJoin = 'round';
  switch (slot) {
    case 'helmet':
      ctx.fillStyle = T.dark; ctx.beginPath(); ctx.ellipse(0, 6 * k, 16 * k, 15 * k, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = T.color; ctx.beginPath(); ctx.ellipse(0, 5 * k, 14.5 * k, 13.5 * k, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = T.dark; rr(ctx, -17 * k, 4 * k, 34 * k, 5 * k, 2.5 * k); ctx.fill();
      ctx.fillStyle = T.shine; ctx.beginPath(); ctx.ellipse(-5 * k, -3 * k, 4.5 * k, 2.5 * k, -0.4, 0, Math.PI * 2); ctx.fill();
      if (tier >= 4) { ctx.fillStyle = T.dark; rr(ctx, -1.8 * k, 5 * k, 3.6 * k, 9 * k, 1.5 * k); ctx.fill(); }
      if (tier >= 9) { ctx.fillStyle = T.glow || T.shine; ctx.beginPath(); ctx.moveTo(-2 * k, -8 * k);
        ctx.quadraticCurveTo(3 * k, -20 * k, 12 * k, -14 * k); ctx.quadraticCurveTo(5 * k, -12 * k, 3 * k, -8 * k); ctx.fill(); }
      break;
    case 'armor':
      ctx.fillStyle = T.dark;
      poly(ctx, [[-16, -10], [-6, -14], [0, -10], [6, -14], [16, -10], [14, 0], [10, 0], [10, 15], [-10, 15], [-10, 0], [-14, 0]], k); ctx.fill();
      ctx.fillStyle = T.color;
      poly(ctx, [[-14, -9], [-6, -12], [0, -8], [6, -12], [14, -9], [12, -1], [8, -1], [8, 13], [-8, 13], [-8, -1], [-12, -1]], k); ctx.fill();
      ctx.fillStyle = T.shine; rr(ctx, -6 * k, -6 * k, 4 * k, 12 * k, 2 * k); ctx.fill();
      ctx.fillStyle = T.dark; ctx.fillRect(-8 * k, 6 * k, 16 * k, 2 * k);
      break;
    case 'legs':
      ctx.fillStyle = T.dark; poly(ctx, [[-12, -13], [12, -13], [13, 15], [3, 15], [0, -2], [-3, 15], [-13, 15]], k); ctx.fill();
      ctx.fillStyle = T.color; poly(ctx, [[-10.5, -9], [10.5, -9], [11.5, 13.5], [4, 13.5], [0, -1], [-4, 13.5], [-11.5, 13.5]], k); ctx.fill();
      ctx.fillStyle = T.dark; ctx.fillRect(-12 * k, -13 * k, 24 * k, 4 * k);
      ctx.fillStyle = T.shine; ctx.fillRect(-1.5 * k, -12.5 * k, 3 * k, 3 * k); ctx.fillRect(-9 * k, -6 * k, 2.5 * k, 14 * k);
      break;
    case 'boots':
      for (const sx of [-1, 1]) {
        ctx.save(); ctx.translate(sx * 8 * k, 0);
        ctx.fillStyle = T.dark; poly(ctx, [[-6, -14], [5, -14], [5, 6], [12 * (sx > 0 ? 1 : 0.6), 8], [12 * (sx > 0 ? 1 : 0.6), 14], [-6, 14]], k); ctx.fill();
        ctx.fillStyle = T.color; poly(ctx, [[-4.5, -12.5], [3.5, -12.5], [3.5, 7], [10 * (sx > 0 ? 1 : 0.6), 9], [10 * (sx > 0 ? 1 : 0.6), 12], [-4.5, 12]], k); ctx.fill();
        ctx.fillStyle = T.shine; ctx.fillRect(-3 * k, -11 * k, 2 * k, 14 * k);
        ctx.restore();
      }
      break;
    case 'shield':
      shieldShape(ctx, k * 2.1, tier, T);
      break;
  }
  ctx.restore();
}
