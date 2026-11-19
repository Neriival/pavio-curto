'use strict';
// Bot para o modo Batalha: foge do perigo, quebra blocos, pega itens e caça oponentes.

// Dificuldades da Batalha
//   aggro: vontade de caçar/plantar bomba perto de rivais · think: intervalo entre decisões (s, maior = reage mais devagar)
//   spell: chance por quadro de lançar magia pronta · spellRange: distância máxima do alvo
//   blunder: chance de esquecer de fugir do perigo numa decisão · gear: faixa de material dos equipamentos da CPU · stats: pontos de status da CPU
const BOT_LEVELS = {
  facil:   { name: 'Fácil',   aggro: [0.2, 0.4],  think: [0.55, 0.85], spell: 0.006, spellRange: 5, blunder: 0.25, gear: [0, 1], stats: null, reward: 0.6,
    hint: 'Bots distraídos: reagem devagar e quase não usam magia.' },
  medio:   { name: 'Médio',   aggro: [0.55, 0.9], think: [0.22, 0.4],  spell: 0.025, spellRange: 8, blunder: 0, gear: [2, 4], stats: null, reward: 1,
    hint: 'Bots espertos: fogem das explosões e caçam você.' },
  dificil: { name: 'Difícil', aggro: [0.85, 1],   think: [0.1, 0.18],  spell: 0.06,  spellRange: 11, blunder: 0, gear: [6, 9], reward: 1.8,
    stats: { hp: 1, speed: 2, bombs: 1, magic: 2 }, spellLv: 4,
    hint: 'Bots implacáveis: reagem na hora, usam muita magia e têm equipamento forte, +20 de vida, +1 bomba e mais velocidade.' },
};

class Bot {
  constructor(game, pid, level = 'medio') {
    this.g = game; this.pid = pid;
    this.D = BOT_LEVELS[level] || BOT_LEVELS.medio;
    this.path = []; this.thinkT = 0; this.placeNow = false;
    this.lastPos = null; this.stuckT = 0; this.roundKey = '';
    this.aggro = rnd(this.D.aggro[0], this.D.aggro[1]);
  }
  get p() { return this.g.s.players[this.pid]; }

  walkable(x, y) { return this.g.tile(x, y) === EMPTY && !this.g.bombAt(x, y); }

  blast(d, bx, by, range, val) {
    d[idx(bx, by)] = Math.max(d[idx(bx, by)], val);
    for (const [dx, dy] of DIRS) for (let i = 1; i <= range; i++) {
      const x = bx + dx * i, y = by + dy * i, t = this.g.tile(x, y);
      if (t !== EMPTY) break;
      const k = idx(x, y); d[k] = Math.max(d[k], val);
      if (this.g.bombAt(x, y)) break;
    }
  }

  // 0 = seguro, 1 = vai explodir, 2 = mortal agora
  dangerMap(extra) {
    const s = this.g.s, d = new Uint8Array(COLS * ROWS);
    for (const b of s.bombs) this.blast(d, Math.floor(b.px), Math.floor(b.py), b.range, b.timer < 0.45 ? 2 : 1);
    if (extra) this.blast(d, extra.x, extra.y, extra.range, 1);
    for (const f of s.flames) d[idx(f.x, f.y)] = 2;
    // sombras de magias caindo: o bot se afasta delas (menos das próprias e das que perseguem ele,
    // que não dá para evitar correndo)
    for (const m of s.meteors || []) {
      if (m.owner === this.pid || (m.tgt && m.tgt.k === 'p' && m.tgt.id === this.pid)) continue;
      const v = m.fall - m.t < 0.3 ? 2 : 1;
      for (const [x, y] of spellArea(m.type, m.tx, m.ty, m.area)) if (x >= 0 && y >= 0 && x < COLS && y < ROWS) d[idx(x, y)] = Math.max(d[idx(x, y)], v);
    }
    if (s.sudden) for (let i = s.suddenIdx; i < Math.min(SPIRAL.length, s.suddenIdx + 10); i++) {
      d[idx(SPIRAL[i][0], SPIRAL[i][1])] = 2;
    }
    return d;
  }

  bfs(sx, sy, danger, allowDanger, maxD = 40) {
    const N = COLS * ROWS, dist = new Int16Array(N).fill(-1), prev = new Int16Array(N).fill(-1);
    const start = idx(sx, sy); dist[start] = 0;
    const q = [start];
    for (let h = 0; h < q.length; h++) {
      const cur = q[h], x = cur % COLS, y = (cur / COLS) | 0;
      if (dist[cur] >= maxD) continue;
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy, ni = idx(nx, ny);
        if (dist[ni] >= 0 || !this.walkable(nx, ny)) continue;
        if (danger[ni] === 2 || (!allowDanger && danger[ni] === 1)) continue;
        dist[ni] = dist[cur] + 1; prev[ni] = cur; q.push(ni);
      }
    }
    return { dist, prev, start };
  }

  nearest(r, pred, maxD = 99) {
    let best = -1, bd = 1e9;
    for (let i = 0; i < r.dist.length; i++) {
      const d = r.dist[i];
      if (d < 0 || d > maxD || d >= bd) continue;
      if (pred(i)) { best = i; bd = d + Math.random() * 0.5; }
    }
    return best;
  }

  pathTo(r, t) {
    const out = [];
    for (let c = t; c !== r.start && c >= 0; c = r.prev[c]) out.push([c % COLS, (c / COLS) | 0]);
    return out.reverse();
  }

  opponentInLine(cx, cy, range) {
    const s = this.g.s;
    for (const o of s.players) {
      if (o.id === this.pid || !o.alive) continue;
      const ox = Math.floor(o.x), oy = Math.floor(o.y);
      if (ox === cx && oy === cy) return true;
      if (ox !== cx && oy !== cy) continue;
      const dx = Math.sign(ox - cx), dy = Math.sign(oy - cy);
      const n = Math.abs(ox - cx) + Math.abs(oy - cy);
      if (n > range) continue;
      let clear = true;
      for (let i = 1; i < n; i++) if (this.g.tile(cx + dx * i, cy + dy * i) !== EMPTY) { clear = false; break; }
      if (clear) return true;
    }
    return false;
  }

  nextToBlock(i) {
    const x = i % COLS, y = (i / COLS) | 0;
    return DIRS.some(([dx, dy]) => this.g.tile(x + dx, y + dy) === BLOCK);
  }

  think() {
    const p = this.p, g = this.g, s = g.s;
    this.path = []; this.placeNow = false;
    if (!p.alive || s.phase !== 'play') return;
    const cx = Math.floor(p.x), cy = Math.floor(p.y);
    const danger = this.dangerMap();

    // 1) fugir (no Fácil, às vezes o bot se distrai)
    if (danger[idx(cx, cy)] && !(this.D.blunder && Math.random() < this.D.blunder)) {
      const r = this.bfs(cx, cy, danger, true);
      const t = this.nearest(r, i => danger[i] === 0);
      if (t >= 0) this.path = this.pathTo(r, t);
      return;
    }
    // 2) plantar bomba se for útil e houver rota de fuga
    if (g.canPlaceBomb(p)) {
      const useful = this.opponentInLine(cx, cy, p.range) ? Math.random() < this.aggro
        : (this.nextToBlock(idx(cx, cy)) && Math.random() < 0.8);
      if (useful) {
        const d2 = this.dangerMap({ x: cx, y: cy, range: p.range });
        const r = this.bfs(cx, cy, d2, true, 8);
        const t = this.nearest(r, i => d2[i] === 0, 7);
        if (t >= 0) { this.placeNow = true; this.path = this.pathTo(r, t); return; }
      }
    }
    // 3) objetivos: itens > blocos > oponentes
    const r = this.bfs(cx, cy, danger, false);
    let t = this.nearest(r, i => s.powerups.some(pu => idx(pu.x, pu.y) === i), 9);
    if (t < 0) {
      const opp = s.players.filter(o => o.id !== this.pid && o.alive);
      const hunt = Math.random() < this.aggro * 0.6;
      if (hunt && opp.length) {
        const targ = new Set(opp.map(o => idx(Math.floor(o.x), Math.floor(o.y))));
        t = this.nearest(r, i => {
          const x = i % COLS, y = (i / COLS) | 0;
          for (const k of targ) { const ox = k % COLS, oy = (k / COLS) | 0; if (Math.abs(ox - x) + Math.abs(oy - y) <= 2) return true; }
          return false;
        });
      }
      if (t < 0) t = this.nearest(r, i => i !== r.start && this.nextToBlock(i));
      if (t < 0 && opp.length) t = this.nearest(r, i => i !== r.start && Math.random() < 0.15);
    }
    if (t >= 0) this.path = this.pathTo(r, t);
  }

  update(dt) {
    const p = this.p, s = this.g.s;
    const key = s.round + ':' + s.phase;
    if (key !== this.roundKey) { this.roundKey = key; this.path = []; this.placeNow = false; }
    if (!p.alive || s.phase !== 'play' || p.jump) return NO_INPUT;

    // detecção de travamento
    if (this.lastPos && Math.abs(this.lastPos[0] - p.x) + Math.abs(this.lastPos[1] - p.y) < 0.001 && this.path.length) {
      this.stuckT += dt; if (this.stuckT > 0.6) { this.stuckT = 0; this.path = []; }
    } else this.stuckT = 0;
    this.lastPos = [p.x, p.y];

    this.thinkT -= dt;
    if (this.thinkT <= 0 || (!this.path.length && !this.placeNow)) {
      this.think(); this.thinkT = rnd(this.D.think[0], this.D.think[1]);
    }
    let bomb = false;
    if (this.placeNow) { bomb = true; this.placeNow = false; }

    // magia: mira no rival mais próximo (dentro do alcance da dificuldade) e lança de vez em quando
    let spell = false, pickT = null;
    if (p.spell && p.spellCd <= 0 && p.frozen <= 0 && Math.random() < this.D.spell) {
      const opp = s.players.filter(o => o.id !== this.pid && o.alive && !o.jump);
      const d = o => Math.abs(o.x - p.x) + Math.abs(o.y - p.y);
      const near = opp.filter(o => d(o) <= this.D.spellRange).sort((a, b) => d(a) - d(b))[0];
      if (near) { pickT = { k: 'p', id: near.id }; spell = true; }
    }
    const out = (dx, dy) => ({ dx, dy, bomb, spell, jump: false, cycle: false, pick: pickT });

    while (this.path.length) {
      const [wx, wy] = this.path[0];
      if (Math.abs(p.x - (wx + 0.5)) < 0.12 && Math.abs(p.y - (wy + 0.5)) < 0.12) this.path.shift();
      else break;
    }
    if (!this.path.length) return out(0, 0);
    const [wx, wy] = this.path[0];
    // não entrar em fogo ativo
    if (this.g.s.flames.some(f => f.x === wx && f.y === wy)) { this.path = []; return out(0, 0); }
    const ddx = wx + 0.5 - p.x, ddy = wy + 0.5 - p.y;
    if (Math.abs(ddx) > Math.abs(ddy)) return out(Math.sign(ddx), 0);
    return out(0, Math.sign(ddy));
  }
}
