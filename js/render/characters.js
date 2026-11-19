'use strict';
// Desenho dos personagens jogáveis, com roupinhas, equipamentos e efeitos de magia.
// Unidade u = S/48: todos os números abaixo estão em "pixels de uma casa de 48px".

// opções (o): t, dir, moving, ring, alpha, dying, shield, outfit {hat,face,skin}, gear {helmet,armor,legs,boots,shield}, status
function drawCharacter(ctx, charId, x, y, S, o = {}) {
  const base = charById(charId), u = S / 48, t = o.t || 0;
  const c = skinPalette(base, o.outfit && o.outfit.skin, t);
  const dir = o.dir || 'down', moving = !!o.moving;
  const outfit = o.outfit || {}, gear = o.gear || null;
  ctx.save();
  ctx.translate(x, y);
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  if (o.dying != null) {
    const k = Math.max(0, Math.min(1, o.dying));
    ctx.globalAlpha *= k; ctx.rotate((1 - k) * 7); const sc = 0.3 + 0.7 * k; ctx.scale(sc, sc);
  }
  // sombra e anel do jogador
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ell(ctx, 0, 16 * u, 14 * u, 4.5 * u);
  if (o.ring) {
    ctx.strokeStyle = o.ring; ctx.lineWidth = 3 * u;
    ctx.beginPath(); ctx.ellipse(0, 16 * u, 15 * u, 5.5 * u, 0, 0, Math.PI * 2); ctx.stroke();
  }
  const ph = t * 14;
  const st = moving ? Math.sin(ph) : 0;
  const bob = moving ? Math.abs(Math.sin(ph)) * 3 * u : Math.sin(t * 3) * u;
  // pés (com botas, ficam da cor do material)
  const boots = gearTier(gear, 'boots');
  ctx.fillStyle = boots ? boots.dark : c.dark;
  ell(ctx, -7 * u, (14 - Math.max(0, st) * 3) * u, 5.4 * u, 3.8 * u);
  ell(ctx, 7 * u, (14 - Math.max(0, -st) * 3) * u, 5.4 * u, 3.8 * u);
  if (boots) {
    ctx.fillStyle = boots.color;
    ell(ctx, -7 * u, (13.4 - Math.max(0, st) * 3) * u, 4.4 * u, 2.6 * u);
    ell(ctx, 7 * u, (13.4 - Math.max(0, -st) * 3) * u, 4.4 * u, 2.6 * u);
  }
  ctx.translate(0, -bob);
  // mãos
  ctx.fillStyle = c.dark;
  circ(ctx, -13 * u, (4 + st * 2) * u, 3.6 * u); circ(ctx, 13 * u, (4 - st * 2) * u, 3.6 * u);
  // corpo
  const g = ctx.createRadialGradient(-5 * u, -7 * u, 2 * u, 0, 0, 17 * u);
  g.addColorStop(0, c.light); g.addColorStop(0.55, c.color); g.addColorStop(1, c.dark);
  ctx.fillStyle = g; ell(ctx, 0, 0, 14 * u, 13.5 * u);
  if (gear) drawGearBody(ctx, gear, u, t);              // calça e armadura
  // rosto
  const lx = dir === 'left' ? -3 : dir === 'right' ? 3 : 0;
  if (dir !== 'up') {
    if (outfit.face === 'mascara') { ctx.fillStyle = '#e23b3b'; rr(ctx, (-13 + lx) * u, -7.5 * u, 26 * u, 10 * u, 4 * u); ctx.fill(); }
    const blink = (Math.floor(t * 1000) % 3400) < 110;
    ctx.fillStyle = '#fff';
    ell(ctx, (-5 + lx) * u, -2 * u, 4 * u, blink ? 0.8 * u : 5 * u);
    ell(ctx, (5 + lx) * u, -2 * u, 4 * u, blink ? 0.8 * u : 5 * u);
    if (!blink) {
      ctx.fillStyle = '#1d1b2e';
      ell(ctx, (-5 + lx * 1.5) * u, -1 * u, 2.2 * u, 3 * u);
      ell(ctx, (5 + lx * 1.5) * u, -1 * u, 2.2 * u, 3 * u);
      ctx.fillStyle = '#fff'; circ(ctx, (-4.2 + lx * 1.5) * u, -2.4 * u, 0.9 * u); circ(ctx, (5.8 + lx * 1.5) * u, -2.4 * u, 0.9 * u);
    }
    ctx.strokeStyle = '#1d1b2e'; ctx.lineWidth = 1.6 * u; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(lx * u, 5 * u, 3 * u, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    drawFace(ctx, outfit.face, u, lx);
  }
  // capacete fica no lugar do chapéu/acessório
  if (gear && gear.helmet != null) { /* desenhado em drawGearTop */ }
  else if (outfit.hat) drawHat(ctx, outfit.hat, u, dir, t);
  else drawAccessory(ctx, base.id, u, dir, t);
  if (gear) drawGearTop(ctx, gear, u, dir, t);          // capacete e escudo
  if (o.shield) {
    ctx.strokeStyle = `rgba(170,230,255,${0.55 + Math.sin(t * 6) * 0.2})`; ctx.lineWidth = 2.5 * u;
    ctx.beginPath(); ctx.arc(0, -2 * u, 21 * u, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(170,230,255,0.12)'; circ(ctx, 0, -2 * u, 21 * u);
  }
  ctx.restore();
  if (o.status) drawStatus(ctx, x, y, S, o.status, t, 0);
}

// Paleta do personagem, trocada pela pintura comprada
function skinPalette(base, skinId, t) {
  const sk = skinId && cosmetic('skin', skinId);
  if (!sk) return base;
  if (sk.rainbow) {
    const h = (t * 70) % 360;
    return { color: `hsl(${h},85%,60%)`, light: `hsl(${(h + 40) % 360},90%,82%)`, dark: `hsl(${(h + 330) % 360},70%,38%)` };
  }
  return sk;
}

// Acessório natural de cada personagem (some quando ele usa chapéu)
function drawAccessory(ctx, id, u, dir, t) {
  switch (id) {
    case 'faisca':
      if (dir !== 'up') { ctx.fillStyle = 'rgba(255,120,150,0.55)'; circ(ctx, -10 * u, 4 * u, 2.6 * u); circ(ctx, 10 * u, 4 * u, 2.6 * u); }
      ctx.fillStyle = '#fff6b0'; ctx.strokeStyle = '#b88a00'; ctx.lineWidth = 1.5 * u; ctx.lineJoin = 'round';
      poly(ctx, [[-3, -11], [3, -21], [0, -21], [5, -30], [-4, -18], [-1, -18], [-6, -11]], u);
      ctx.fill(); ctx.stroke();
      break;
    case 'bolota': {                       // pedra: topo de rocha lascado, rachaduras e pedrinhas
      ctx.lineJoin = 'round';
      // lascas de rocha no topo da cabeça
      ctx.fillStyle = '#6f6a65'; ctx.strokeStyle = '#46423e'; ctx.lineWidth = 1.3 * u;
      poly(ctx, [[-13, -6], [-12, -12], [-7, -15], [-4, -12], [0, -17], [5, -15], [8, -16], [12, -11], [13, -6], [6, -9], [0, -8], [-6, -9]], u);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#b9b3ac';                    // faces iluminadas das lascas
      poly(ctx, [[-11, -11], [-7, -14], [-5, -11], [-9, -9]], u); ctx.fill();
      poly(ctx, [[0, -16], [4, -14], [2, -11], [-1, -12]], u); ctx.fill();
      // rachaduras nas laterais do corpo
      ctx.strokeStyle = '#4a4642'; ctx.lineWidth = 1.2 * u; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-13 * u, 2 * u); ctx.lineTo(-10 * u, 5 * u); ctx.lineTo(-11 * u, 9 * u);
      ctx.moveTo(12 * u, -3 * u); ctx.lineTo(10 * u, 1 * u); ctx.lineTo(12.5 * u, 4 * u);
      ctx.stroke();
      // pedrinhas e um tufo de musgo
      ctx.fillStyle = '#7d7873';
      circ(ctx, -9 * u, 10 * u, 1.2 * u); circ(ctx, 8 * u, 9 * u, 1 * u); circ(ctx, 11 * u, 7 * u, 0.8 * u);
      ctx.fillStyle = '#6fae4a'; ell(ctx, 9 * u, -13 * u, 3.4 * u, 1.6 * u);
      ctx.fillStyle = '#8fcc62'; ell(ctx, 8 * u, -13.8 * u, 1.8 * u, 0.9 * u);
      break;
    }
    case 'brasa':
      for (const i of [-1, 1, 0]) {
        const h = (9 + Math.sin(t * 17 + i * 2.1) * 2.5 + (i === 0 ? 6 : 0)) * u;
        ctx.fillStyle = '#ff8a1c'; tongue(ctx, i * 6 * u, -9 * u, 5 * u, h);
        ctx.fillStyle = '#ffe066'; tongue(ctx, i * 6 * u, -9 * u, 2.6 * u, h * 0.6);
      }
      break;
    case 'nimbo': {                       // nuvem de chuva com gotinhas caindo
      ctx.fillStyle = '#eef4fb';
      for (const [a, b, r] of [[-8, -11, 6], [0, -15, 7.5], [8, -11, 6], [-13, -5, 4], [13, -5, 4]]) circ(ctx, a * u, b * u, r * u);
      ctx.fillStyle = '#c4d6ea'; circ(ctx, 3 * u, -13 * u, 3 * u);
      ctx.fillStyle = '#7cc4ff';
      for (let i = 0; i < 2; i++) {
        const k = (t * 1.4 + i * 0.5) % 1;
        ctx.globalAlpha *= 1 - k * 0.6;
        tongue(ctx, (i ? 15 : -15) * u, (-2 + k * 14) * u, 1.6 * u, 4 * u);
        ctx.globalAlpha /= 1 - k * 0.6;
      }
      break;
    }
    case 'geada':                          // coroa de cristais de gelo
      ctx.fillStyle = '#e8fbff'; ctx.strokeStyle = '#5fa8cf'; ctx.lineWidth = 1.2 * u; ctx.lineJoin = 'round';
      for (const [cx, cy, h] of [[-8, -10, 9], [0, -12, 13], [8, -10, 9]]) {
        poly(ctx, [[cx, cy - h], [cx + 3.2, cy - h / 2], [cx, cy], [cx - 3.2, cy - h / 2]], u); ctx.fill(); ctx.stroke();
      }
      ctx.fillStyle = `rgba(255,255,255,${0.5 + Math.sin(t * 5) * 0.4})`; circ(ctx, 1 * u, -21 * u, 1.3 * u);
      if (dir !== 'up') { ctx.fillStyle = 'rgba(120,190,255,0.5)'; circ(ctx, -10 * u, 4 * u, 2.4 * u); circ(ctx, 10 * u, 4 * u, 2.4 * u); }
      break;
    case 'broto': {                        // brotinho com duas folhas balançando
      const sway = Math.sin(t * 2.5) * 0.15;
      ctx.save(); ctx.translate(0, -12 * u); ctx.rotate(sway);
      ctx.strokeStyle = '#3f8f2a'; ctx.lineWidth = 2.4 * u; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(2 * u, -6 * u, 0, -11 * u); ctx.stroke();
      ctx.fillStyle = '#5cc94a';
      ctx.beginPath(); ctx.ellipse(-5 * u, -11 * u, 6 * u, 3 * u, -0.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8ee66e';
      ctx.beginPath(); ctx.ellipse(5 * u, -13 * u, 6 * u, 3 * u, 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      if (dir !== 'up') { ctx.fillStyle = 'rgba(255,140,160,0.5)'; circ(ctx, -10 * u, 4 * u, 2.4 * u); circ(ctx, 10 * u, 4 * u, 2.4 * u); }
      break;
    }
  }
}

// ---------- Roupinhas ----------
function drawHat(ctx, id, u, dir, t) {
  switch (id) {
    case 'bone': {
      ctx.fillStyle = '#e8413c'; ctx.beginPath(); ctx.ellipse(0, -8 * u, 14 * u, 9.5 * u, 0, Math.PI, 0); ctx.fill();
      if (dir !== 'up') { const bx = dir === 'left' ? -9 : dir === 'right' ? 9 : 0; ctx.fillStyle = '#b52a26'; ell(ctx, bx * u, -8 * u, 11 * u, 3.2 * u); }
      ctx.fillStyle = '#fff'; circ(ctx, 0, -17 * u, 2 * u);
      break;
    }
    case 'laco':
      ctx.fillStyle = '#ff5fa2';
      poly(ctx, [[8, -12], [1, -19], [1, -5]], u); ctx.fill();
      poly(ctx, [[8, -12], [15, -19], [15, -5]], u); ctx.fill();
      ctx.fillStyle = '#d23a7f'; circ(ctx, 8 * u, -12 * u, 2.8 * u);
      break;
    case 'cartola':
      ctx.fillStyle = '#1d1b2e'; ell(ctx, 0, -10 * u, 15 * u, 3.6 * u);
      rr(ctx, -8.5 * u, -29 * u, 17 * u, 19 * u, 2 * u); ctx.fill();
      ctx.fillStyle = '#e23b3b'; ctx.fillRect(-8.5 * u, -15 * u, 17 * u, 3 * u);
      break;
    case 'cowboy':
      ctx.fillStyle = '#8a5a2b'; ell(ctx, 0, -10 * u, 20 * u, 4.6 * u);
      rr(ctx, -9 * u, -23 * u, 18 * u, 14 * u, 5 * u); ctx.fill();
      ctx.fillStyle = '#5a3a1b'; ctx.fillRect(-9 * u, -13.5 * u, 18 * u, 2.6 * u);
      break;
    case 'bruxa':
      ctx.fillStyle = '#5b3fa0'; ell(ctx, 0, -10 * u, 18 * u, 4.2 * u);
      ctx.beginPath(); ctx.moveTo(-11 * u, -11 * u);
      ctx.quadraticCurveTo(-2 * u, -25 * u, 7 * u, -37 * u);
      ctx.quadraticCurveTo(4 * u, -22 * u, 11 * u, -11 * u); ctx.fill();
      ctx.fillStyle = '#ffd23f'; poly(ctx, [[0, -22], [1.4, -18.5], [4.5, -18.5], [2, -16.3], [3, -13], [0, -15], [-3, -13], [-2, -16.3], [-4.5, -18.5], [-1.4, -18.5]], u); ctx.fill();
      break;
    case 'coroa':
      ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = '#b88a00'; ctx.lineWidth = 1.2 * u;
      poly(ctx, [[-10, -10], [-11, -22], [-5, -16], [0, -25], [5, -16], [11, -22], [10, -10]], u); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ff3b6b'; circ(ctx, 0, -14 * u, 2 * u);
      ctx.fillStyle = '#4da3ff'; circ(ctx, -6 * u, -13 * u, 1.4 * u); circ(ctx, 6 * u, -13 * u, 1.4 * u);
      break;
  }
}

function drawFace(ctx, id, u, lx) {
  switch (id) {
    case 'oculos':
      ctx.fillStyle = '#14131f';
      rr(ctx, (-10.5 + lx) * u, -5.5 * u, 9 * u, 6.5 * u, 2.5 * u); ctx.fill();
      rr(ctx, (1.5 + lx) * u, -5.5 * u, 9 * u, 6.5 * u, 2.5 * u); ctx.fill();
      ctx.fillRect((-1.5 + lx) * u, -4 * u, 3 * u, 1.5 * u);
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect((-9 + lx) * u, -4.5 * u, 3 * u, 1.2 * u); ctx.fillRect((3 + lx) * u, -4.5 * u, 3 * u, 1.2 * u);
      break;
    case 'bigode':
      ctx.fillStyle = '#3a2416';
      ctx.beginPath(); ctx.ellipse((-3.5 + lx) * u, 3.2 * u, 4.2 * u, 1.9 * u, -0.25, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse((3.5 + lx) * u, 3.2 * u, 4.2 * u, 1.9 * u, 0.25, 0, Math.PI * 2); ctx.fill();
      break;
  }
}

// ---------- Efeitos de magia sobre personagens e inimigos ----------
function drawStatus(ctx, x, y, S, st, t, raise = 0) {
  const u = S / 48;
  ctx.save(); ctx.translate(x, y);
  if (st.rooted > 0) {
    ctx.strokeStyle = '#2f7d2a'; ctx.lineWidth = 2.6 * u; ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const a = -16 + i * 8, h = 12 + (i % 2) * 6;
      ctx.beginPath(); ctx.moveTo(a * u, 17 * u);
      ctx.quadraticCurveTo((a + (i % 2 ? 6 : -6)) * u, (17 - h / 2) * u, (a + 2) * u, (17 - h) * u); ctx.stroke();
    }
    ctx.fillStyle = '#5cd65c';
    for (let i = 0; i < 5; i++) ell(ctx, (-14 + i * 8) * u, (6 - (i % 2) * 6) * u, 2.6 * u, 1.6 * u);
  }
  if (st.frozen > 0) {
    ctx.fillStyle = 'rgba(165,225,255,0.55)'; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2 * u;
    rr(ctx, -18 * u, (-24 - raise) * u, 36 * u, (42 + raise) * u, 6 * u); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2.5 * u;
    ctx.beginPath(); ctx.moveTo(-12 * u, (-10 - raise) * u); ctx.lineTo(-4 * u, (-20 - raise) * u);
    ctx.moveTo(-12 * u, (0 - raise) * u); ctx.lineTo(2 * u, (-16 - raise) * u); ctx.stroke();
  }
  if (st.wet > 0) {                         // encharcado: poça embaixo e gotas pingando
    ctx.fillStyle = 'rgba(74,168,255,0.45)'; ell(ctx, 0, 16 * u, 17 * u, 5 * u);
    ctx.fillStyle = '#7cc4ff';
    for (let i = 0; i < 3; i++) {
      const k = (t * 1.6 + i / 3) % 1;
      ctx.globalAlpha = 1 - k * 0.7;
      tongue(ctx, (-10 + i * 10) * u, (-18 - raise + k * 26) * u, 1.8 * u, 4.5 * u);
    }
    ctx.globalAlpha = 1;
  }
  if (st.burning > 0) {
    for (let i = 0; i < 4; i++) {
      const fx = (-12 + i * 8) * u, h = (14 + Math.sin(t * 20 + i * 1.7) * 5) * u;
      ctx.fillStyle = 'rgba(255,110,30,0.85)'; tongue(ctx, fx, (10 - raise) * u, 5 * u, h);
      ctx.fillStyle = 'rgba(255,230,100,0.9)'; tongue(ctx, fx, (10 - raise) * u, 2.4 * u, h * 0.55);
    }
  }
  ctx.restore();
}
