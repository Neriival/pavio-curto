'use strict';
// Desenho do cenário e de tudo que acontece nele. Render.draw(ctx, estado, tempo, idDoJogadorLocal)

const Render = {
  draw(ctx, s, t, you) {
    const th = THEMES[s.theme] || THEMES.jardim, T = TILE, g = s.grid;
    if (!g || !g.length) return;
    // chão
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      ctx.fillStyle = ((x + y) & 1) ? th.floorA : th.floorB;
      ctx.fillRect(x * T, y * T, T, T);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    for (let y = 1; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      if (g[idx(x, y)] !== WALL && g[idx(x, y - 1)] !== EMPTY) ctx.fillRect(x * T, y * T, T, T * 0.2);
    }
    if (s.exit && g[idx(s.exit.x, s.exit.y)] === EMPTY) this.exit(ctx, s.exit.x, s.exit.y, s.exitOpen, t);
    for (const pu of s.powerups) this.powerup(ctx, pu, t);
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const v = g[idx(x, y)];
      if (v === WALL) this.wall(ctx, x, y, th);
      else if (v === BLOCK) this.block(ctx, x, y, th, t);
    }
    for (const b of s.burning) this.burning(ctx, b, th, t);
    for (const b of s.bombs) this.bomb(ctx, b, t);
    this.flames(ctx, s.flames, t);
    for (const m of s.meteors || []) this.spellShadow(ctx, m, t);
    // entidades ordenadas por profundidade (quem está mais embaixo é desenhado por cima)
    const ents = [];
    for (const e of s.enemies) ents.push({ y: e.y, e });
    for (const p of s.players) if (!p.out && (p.alive || p.dying > 0)) ents.push({ y: p.y, p });
    ents.sort((a, b) => a.y - b.y);
    for (const it of ents) {
      if (it.e) drawEnemy(ctx, it.e, it.e.x * T, it.e.y * T, T, t);
      else this.player(ctx, it.p, t, you);
    }
    this.shots(ctx, s.shots || [], t);
    this.reticles(ctx, s, t);
    for (const im of s.impacts || []) this.impact(ctx, im);
    for (const m of s.meteors || []) this.spellFall(ctx, m, t);
    this.popups(ctx, s.popups || []);
    if (s.sudden) {
      const a = 0.12 + Math.sin(t * 6) * 0.06, W = COLS * T, H = ROWS * T;
      const grd = ctx.createRadialGradient(W / 2, H / 2, T * 3, W / 2, H / 2, W * 0.65);
      grd.addColorStop(0, 'rgba(255,0,0,0)'); grd.addColorStop(1, `rgba(255,30,30,${a})`);
      ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
    }
  },

  player(ctx, p, t, you) {
    const T = TILE, x = p.x * T, y = p.y * T;
    const blink = p.alive && p.invuln > 0 && Math.floor(t * 12) % 2;
    drawCharacter(ctx, p.char, x, y - 4, T, {
      t: p.frozen > 0 ? 0 : t + p.id * 0.7, dir: p.dir, moving: p.moving && p.alive, ring: p.color,
      alpha: blink ? 0.35 : 1, dying: p.alive ? null : p.dying / 1.2, shield: p.shield && p.alive,
      outfit: p.outfit, gear: p.gear, status: p.alive ? p : null,
    });
    if (!p.alive) return;
    this.nameplate(ctx, p, x, y - T * (p.gear && p.gear.helmet >= 9 ? 1.18 : 1.04), p.id === you, t);
  },

  // Plaquinha em cima do personagem: nome (com a cor do jogador) e barra de vida com o número
  nameplate(ctx, p, x, top, me, t) {
    const label = me ? 'VOCÊ' : p.name;
    ctx.save();
    ctx.font = '900 12px Nunito, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = Math.max(ctx.measureText(label).width + 18, 58), h = 32;
    const bx = x - w / 2, by = top - 10;
    // sombra + fundo escuro com borda colorida
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; rr(ctx, bx + 1, by + 2, w, h, 8); ctx.fill();
    ctx.fillStyle = 'rgba(18,15,36,0.88)'; rr(ctx, bx, by, w, h, 8); ctx.fill();
    ctx.strokeStyle = p.color; ctx.lineWidth = 2; rr(ctx, bx, by, w, h, 8); ctx.stroke();
    // faixa do nome na cor do jogador
    ctx.fillStyle = p.color; rr(ctx, bx + 2, by + 2, w - 4, 13, 6); ctx.fill();
    ctx.fillStyle = '#14112a'; ctx.fillText(label, x, by + 9);
    // barra de vida (verde → amarela → vermelha) com o número em cima
    const k = Math.max(0, Math.min(1, p.hp / p.maxHp)), bw = w - 10, hy = by + 18;
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; rr(ctx, bx + 5, hy, bw, 10, 5); ctx.fill();
    ctx.fillStyle = k > 0.5 ? '#4cd964' : k > 0.25 ? '#ffc93c' : '#ff4d4d';
    if (k > 0) { rr(ctx, bx + 5, hy, Math.max(6, bw * k), 10, 5); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; if (k > 0) { rr(ctx, bx + 7, hy + 1.5, Math.max(2, bw * k - 4), 2.5, 1.2); ctx.fill(); }
    ctx.font = '900 9.5px Nunito, system-ui, sans-serif'; ctx.fillStyle = '#fff';
    ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
    const num = `${Math.ceil(p.hp)}/${p.maxHp}`;
    ctx.strokeText(num, x, hy + 5.5); ctx.fillText(num, x, hy + 5.5);
    // setinha embaixo para "VOCÊ"
    if (me) { ctx.fillStyle = p.color; poly(ctx, [[x - 5, by + h], [x + 5, by + h], [x, by + h + 5 + Math.sin(t * 6)]], 1); ctx.fill(); }
    ctx.restore();
  },

  shots(ctx, shots, t) {
    for (const sh of shots) {
      const S = SPELLS[sh.type]; if (!S) continue;
      const X = sh.x * TILE, Y = sh.y * TILE - 6;
      for (let i = 3; i >= 1; i--) {
        ctx.fillStyle = S.color; ctx.globalAlpha = 0.18 * (4 - i);
        circ(ctx, X - sh.dx * i * 9, Y - sh.dy * i * 9, 9 - i * 1.5);
      }
      ctx.globalAlpha = 1;
      const g = ctx.createRadialGradient(X, Y, 1, X, Y, 14);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, S.color); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; circ(ctx, X, Y, 14 + Math.sin(t * 30) * 1.5);
      ctx.font = emojiFont(13); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(S.icon, X, Y + 1);
    }
  },

  // números de dano/cura subindo em cima de quem foi atingido
  popups(ctx, list) {
    for (const pp of list) {
      const k = 1 - pp.t, x = pp.x * TILE, y = pp.y * TILE - 46 - k * 26;
      ctx.save(); ctx.globalAlpha = Math.min(1, pp.t * 2.5);
      const big = /^-/.test(pp.text) ? 18 : 15;
      ctx.font = `400 ${big + (k < 0.15 ? (0.15 - k) * 40 : 0)}px 'Lilita One', sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(20,10,30,0.9)'; ctx.lineWidth = 4; ctx.strokeText(pp.text, x, y);
      ctx.fillStyle = pp.color; ctx.fillText(pp.text, x, y);
      ctx.restore();
    }
  },

  // ---------- magia lançada ao céu ----------
  // Sombra no chão: cresce e escurece conforme a magia se aproxima
  spellShadow(ctx, m, t) {
    const S = SPELLS[m.type]; if (!S) return;
    const T = TILE, k = Math.min(1, m.t / m.fall);
    const pulse = 0.5 + Math.sin(t * (8 + k * 18)) * 0.5;
    for (const [x, y] of spellArea(m.type, m.tx, m.ty, m.area)) {
      if (x <= 0 || y <= 0 || x >= COLS - 1 || y >= ROWS - 1) continue;
      ctx.fillStyle = `rgba(10,5,20,${0.2 + k * 0.42})`;
      rr(ctx, x * T + 2, y * T + 2, T - 4, T - 4, 8); ctx.fill();
      ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      rr(ctx, x * T + 2, y * T + 2, T - 4, T - 4, 8); ctx.stroke();
      ctx.strokeStyle = S.color; ctx.globalAlpha = 0.55 + pulse * 0.45; ctx.lineWidth = 2.5;
      ctx.setLineDash([7, 5]); ctx.lineDashOffset = -t * 30;
      rr(ctx, x * T + 2, y * T + 2, T - 4, T - 4, 8); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
    }
    // sombra redonda da magia: começa pequena e fica do tamanho da casa
    const cx = (m.tx + 0.5) * T, cy = (m.ty + 0.5) * T, R = 8 + k * 16;
    ctx.fillStyle = `rgba(0,0,0,${0.3 + k * 0.4})`;
    ell(ctx, cx, cy + 6, R, R * 0.5);
    ctx.strokeStyle = S.color; ctx.lineWidth = 2; ctx.globalAlpha = 0.8;
    ctx.beginPath(); ctx.ellipse(cx, cy + 6, R + 3, (R + 3) * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  },

  // A magia sobe do lançador e cai no alvo num arco alto
  spellFall(ctx, m, t) {
    const S = SPELLS[m.type]; if (!S) return;
    const T = TILE, k = Math.min(1, m.t / m.fall);
    const sx = m.sx * T, sy = m.sy * T, ex = (m.tx + 0.5) * T, ey = (m.ty + 0.5) * T;
    // altura do arco: alta, mas sem sair do topo do tabuleiro
    const peak = Math.max(T * 1.2, Math.min(T * 4.5, Math.min(sy, ey) - 18));
    const pos = kk => [sx + (ex - sx) * kk, sy + (ey - sy) * kk - Math.sin(Math.PI * kk) * peak - 6];
    const [X, Y] = pos(k);
    const r = m.type === 'pedra' ? 17 : 12;
    // rastro
    for (let i = 1; i <= 4; i++) {
      const [tx, ty] = pos(Math.max(0, k - i * 0.035));
      ctx.globalAlpha = 0.16 * (5 - i); ctx.fillStyle = S.color; circ(ctx, tx, ty, r * (1 - i * 0.15));
    }
    ctx.globalAlpha = 1;
    const g = ctx.createRadialGradient(X, Y, 1, X, Y, r + 6);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, S.color); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; circ(ctx, X, Y, r + 6 + Math.sin(t * 30) * 1.5);
    ctx.font = emojiFont(m.type === 'pedra' ? 22 : 15); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(S.icon, X, Y + 1);
  },

  // Clarão no momento em que a magia cai
  impact(ctx, im) {
    const S = SPELLS[im.type]; if (!S) return;
    const T = TILE, k = 1 - im.t / 0.45;
    ctx.globalAlpha = Math.max(0, 1 - k);
    for (const [x, y] of spellArea(im.type, im.x, im.y, im.area)) {
      if (x <= 0 || y <= 0 || x >= COLS - 1 || y >= ROWS - 1) continue;
      ctx.fillStyle = S.color; rr(ctx, x * T + 2, y * T + 2, T - 4, T - 4, 8); ctx.fill();
    }
    if (im.type === 'raio') {      // o raio desce do céu
      const cx = (im.x + 0.5) * T;
      ctx.strokeStyle = '#fffbe0'; ctx.lineWidth = 5; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(cx - 6, 0);
      for (let yy = 0, i = 0; yy < (im.y + 0.5) * T; yy += 30, i++) ctx.lineTo(cx + (i % 2 ? 10 : -10), yy);
      ctx.lineTo(cx, (im.y + 0.5) * T); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  },

  // Mira: cada pessoa (não bot) vê um alvo com a sua cor em cima de quem vai receber a magia
  reticles(ctx, s, t) {
    const T = TILE;
    for (const p of s.players) {
      if (p.bot || !p.alive || !p.tgt || !SPELLS[p.spell]) continue;
      const o = p.tgt.k === 'p' ? s.players[p.tgt.id] : s.enemies.find(e => e.id === p.tgt.id);
      if (!o || (o.alive === false) || o.dying) continue;
      const X = o.x * T, Y = o.y * T - 4, ready = p.spellCd <= 0;
      const R = 22 + Math.sin(t * 5) * 2;
      ctx.save(); ctx.translate(X, Y); ctx.rotate(t * (ready ? 1.6 : 0.5));
      ctx.strokeStyle = p.color; ctx.lineWidth = ready ? 3 : 2; ctx.globalAlpha = ready ? 0.95 : 0.45;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath(); ctx.arc(0, 0, R, i * Math.PI / 2 + 0.25, i * Math.PI / 2 + Math.PI / 2 - 0.25); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(R - 6, 0); ctx.lineTo(R + 5, 0); ctx.stroke();
        ctx.rotate(Math.PI / 2);
      }
      ctx.restore();
    }
  },

  wall(ctx, x, y, th) {
    const T = TILE, X = x * T, Y = y * T;
    ctx.fillStyle = th.wallDark; ctx.fillRect(X, Y, T, T);
    ctx.fillStyle = th.wall; rr(ctx, X + 3, Y + 2, T - 6, T - 9, 6); ctx.fill();
    ctx.fillStyle = th.wallTop; rr(ctx, X + 7, Y + 5, T - 14, 7, 3.5); ctx.fill();
  },

  block(ctx, x, y, th, t, scale = 1) {
    const T = TILE, X = x * T, Y = y * T;
    ctx.save();
    if (scale !== 1) { ctx.translate(X + T / 2, Y + T / 2); ctx.scale(scale, scale); ctx.translate(-X - T / 2, -Y - T / 2); }
    switch (th.style) {
      case 'bush':
        ctx.fillStyle = th.blockDark;
        circ(ctx, X + 15, Y + 30, 14); circ(ctx, X + 33, Y + 30, 14); circ(ctx, X + 24, Y + 34, 13);
        ctx.fillStyle = th.block;
        circ(ctx, X + 15, Y + 24, 13); circ(ctx, X + 33, Y + 24, 13); circ(ctx, X + 24, Y + 16, 13);
        ctx.fillStyle = th.blockTop; circ(ctx, X + 20, Y + 12, 5); circ(ctx, X + 34, Y + 19, 4);
        ctx.fillStyle = '#ff5c7a'; circ(ctx, X + 13, Y + 26, 2); circ(ctx, X + 31, Y + 31, 2);
        break;
      case 'crate':
        ctx.fillStyle = th.blockDark; rr(ctx, X + 3, Y + 4, T - 6, T - 6, 4); ctx.fill();
        ctx.fillStyle = th.block; rr(ctx, X + 3, Y + 2, T - 6, T - 8, 4); ctx.fill();
        ctx.strokeStyle = th.blockDark; ctx.lineWidth = 2.5;
        ctx.strokeRect(X + 8, Y + 7, T - 16, T - 18);
        ctx.beginPath(); ctx.moveTo(X + 8, Y + 7); ctx.lineTo(X + T - 8, Y + T - 11); ctx.stroke();
        ctx.fillStyle = th.blockTop; ctx.fillRect(X + 5, Y + 3, T - 10, 3);
        break;
      case 'ice':
        ctx.fillStyle = th.blockDark; rr(ctx, X + 3, Y + 4, T - 6, T - 6, 7); ctx.fill();
        ctx.fillStyle = th.block; rr(ctx, X + 3, Y + 2, T - 6, T - 8, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(X + 11, Y + 26); ctx.lineTo(X + 24, Y + 10); ctx.moveTo(X + 19, Y + 31); ctx.lineTo(X + 29, Y + 19); ctx.stroke();
        ctx.fillStyle = th.blockTop; rr(ctx, X + 7, Y + 5, T - 14, 4, 2); ctx.fill();
        break;
      case 'brick': {
        ctx.fillStyle = th.blockDark; ctx.fillRect(X + 2, Y + 2, T - 4, T - 4);
        ctx.fillStyle = th.block;
        for (let r = 0; r < 4; r++) {
          const off = r % 2 ? 0 : -9;
          for (let c = 0; c < 3; c++) {
            const bx = X + 3 + off + c * 18;
            const x0 = Math.max(X + 3, bx), x1 = Math.min(X + T - 3, bx + 16);
            if (x1 > x0) ctx.fillRect(x0, Y + 3 + r * 11, x1 - x0, 10);
          }
        }
        ctx.fillStyle = th.blockTop; ctx.fillRect(X + 3, Y + 3, T - 6, 2);
        break;
      }
      case 'rock': {
        ctx.fillStyle = th.blockDark;
        poly(ctx, [[X + 6, Y + 40], [X + 3, Y + 20], [X + 12, Y + 5], [X + 32, Y + 3], [X + 45, Y + 16], [X + 43, Y + 40]], 1); ctx.fill();
        ctx.fillStyle = th.block;
        poly(ctx, [[X + 7, Y + 35], [X + 5, Y + 19], [X + 13, Y + 7], [X + 31, Y + 5], [X + 42, Y + 16], [X + 40, Y + 35]], 1); ctx.fill();
        ctx.strokeStyle = `rgba(255,${120 + Math.sin(t * 3 + x + y) * 40 | 0},40,0.85)`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(X + 14, Y + 14); ctx.lineTo(X + 22, Y + 22); ctx.lineTo(X + 19, Y + 31);
        ctx.moveTo(X + 22, Y + 22); ctx.lineTo(X + 33, Y + 20); ctx.stroke();
        break;
      }
    }
    ctx.restore();
  },

  burning(ctx, b, th, t) {
    const k = Math.max(0, b.t / BURN_TIME);
    ctx.save(); ctx.globalAlpha = k;
    this.block(ctx, b.x, b.y, th, t, 0.6 + 0.4 * k);
    ctx.restore();
    const X = b.x * TILE + TILE / 2, Y = b.y * TILE + TILE / 2;
    for (let i = 0; i < 5; i++) {
      const a = i * 1.3 + t * 4, r = (1 - k) * 16;
      ctx.fillStyle = i % 2 ? 'rgba(255,170,40,0.9)' : 'rgba(255,90,30,0.85)';
      circ(ctx, X + Math.cos(a) * r, Y + Math.sin(a) * r - (1 - k) * 8, 5 * k + 2);
    }
  },

  bomb(ctx, b, t) {
    const T = TILE, X = b.px * T, Y = b.py * T;
    const urgent = b.timer < 0.8;
    const pulse = 1 + Math.sin(t * (urgent ? 32 : 11)) * 0.07;
    const r = T * 0.33 * pulse;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ell(ctx, X, Y + T * 0.3, r * 0.9, r * 0.3);
    const g = ctx.createRadialGradient(X - r * 0.4, Y - r * 0.4, r * 0.1, X, Y, r);
    g.addColorStop(0, urgent ? '#d65a5a' : '#59627f'); g.addColorStop(1, urgent ? '#4a0d0d' : '#12152a');
    ctx.fillStyle = g; circ(ctx, X, Y + 2, r);
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ell(ctx, X - r * 0.38, Y - r * 0.35, r * 0.22, r * 0.15);
    ctx.fillStyle = '#2a2f45'; rr(ctx, X - 5, Y - r - 3, 10, 6, 2); ctx.fill();
    ctx.strokeStyle = '#c9a36b'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(X, Y - r - 2); ctx.quadraticCurveTo(X + 4, Y - r - 10, X + 9, Y - r - 9); ctx.stroke();
    const sp = 3 + Math.random() * 3;
    ctx.fillStyle = '#ff9f1c'; circ(ctx, X + 9, Y - r - 9, sp);
    ctx.fillStyle = '#fff6a0'; circ(ctx, X + 9, Y - r - 9, sp * 0.5);
  },

  flames(ctx, flames, t) {
    if (!flames.length) return;
    const T = TILE, set = new Set(flames.map(f => idx(f.x, f.y)));
    const layers = [[0.86, '#ff4f1f'], [0.62, '#ffa91f'], [0.34, '#fff4c2']];
    for (const [w, color] of layers) {
      ctx.fillStyle = color;
      for (const f of flames) {
        const a = Math.min(1, (f.t / FLAME_TIME) * 1.8);
        const hw = w * T / 2 * a * (1 + Math.sin(t * 40 + f.x * 3 + f.y) * 0.05);
        const cx = f.x * T + T / 2, cy = f.y * T + T / 2;
        const has = (dx, dy) => set.has(idx(f.x + dx, f.y + dy));
        circ(ctx, cx, cy, hw);
        if (f.k !== 'v') {
          if (has(-1, 0)) ctx.fillRect(f.x * T, cy - hw, T / 2, hw * 2);
          if (has(1, 0)) ctx.fillRect(cx, cy - hw, T / 2, hw * 2);
        }
        if (f.k !== 'h') {
          if (has(0, -1)) ctx.fillRect(cx - hw, f.y * T, hw * 2, T / 2);
          if (has(0, 1)) ctx.fillRect(cx - hw, cy, hw * 2, T / 2);
        }
      }
    }
  },

  powerup(ctx, pu, t) {
    const T = TILE, P = POWERUPS[pu.type]; if (!P) return;
    const sc = Math.min(1, pu.age * 5);
    const X = pu.x * T + T / 2, Y = pu.y * T + T / 2 + Math.sin(t * 4 + pu.x) * 2;
    ctx.save(); ctx.translate(X, Y); ctx.scale(sc, sc);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ell(ctx, 0, T * 0.36, T * 0.3, T * 0.08);
    ctx.fillStyle = '#fff'; rr(ctx, -T * 0.38, -T * 0.38, T * 0.76, T * 0.76, 10); ctx.fill();
    ctx.fillStyle = P.color; rr(ctx, -T * 0.33, -T * 0.33, T * 0.66, T * 0.66, 8); ctx.fill();
    ctx.font = emojiFont(T * 0.42); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(P.icon, 0, 2);
    const gl = (t * 0.8 + pu.x * 0.3) % 2;
    if (gl < 1) { ctx.fillStyle = `rgba(255,255,255,${0.5 * (1 - gl)})`; circ(ctx, -T * 0.22, -T * 0.22, 4 * (1 - gl) + 1); }
    ctx.restore();
  },

  exit(ctx, x, y, open, t) {
    const T = TILE, X = x * T + T / 2, Y = y * T + T / 2;
    ctx.fillStyle = '#2b2d3a'; circ(ctx, X, Y, T * 0.42);
    ctx.fillStyle = '#4a4d61'; circ(ctx, X, Y, T * 0.36);
    if (open) {
      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = ['#7af0ff', '#b48bff', '#ffffff'][i]; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(X, Y, T * (0.3 - i * 0.08), t * (3 + i) + i, t * (3 + i) + i + Math.PI * 1.3); ctx.stroke();
      }
      ctx.fillStyle = `rgba(122,240,255,${0.25 + Math.sin(t * 5) * 0.15})`; circ(ctx, X, Y, T * 0.36);
    } else {
      ctx.fillStyle = '#1b1c26'; circ(ctx, X, Y, T * 0.2);
      ctx.fillStyle = '#8b8fa8'; rr(ctx, X - 6, Y - 3, 12, 10, 2); ctx.fill();
      ctx.strokeStyle = '#8b8fa8'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(X, Y - 3, 4, Math.PI, 0); ctx.stroke();
    }
  },
};
