'use strict';
// Utilitários da grade: índices, pontos de início, geração de mapas e espiral da morte súbita.

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIRVEC = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const SPAWNS = [[1, 1], [COLS - 2, ROWS - 2], [COLS - 2, 1], [1, ROWS - 2]];
// Comando de um jogador num quadro. cycle = trocar de alvo · pick = escolher alvo {k:'p'|'e', id}
const NO_INPUT = Object.freeze({ dx: 0, dy: 0, bomb: false, spell: false, jump: false, cycle: false, pick: null });

function idx(x, y) { return y * COLS + x; }
function rnd(a, b) { return a + Math.random() * (b - a); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function weighted(list) {
  let tot = 0; for (const [, w] of list) tot += w;
  let r = Math.random() * tot;
  for (const [k, w] of list) { if ((r -= w) < 0) return k; }
  return list[0][0];
}
function isBorder(x, y) { return x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1; }
function isPillar(x, y) { return x % 2 === 0 && y % 2 === 0; }

// Casas que precisam ficar livres em volta de cada ponto de início
const SPAWN_ZONE = (() => {
  const z = new Set();
  for (const [sx, sy] of SPAWNS) for (const [dx, dy] of [[0, 0], ...DIRS]) z.add(idx(sx + dx, sy + dy));
  return z;
})();

// Todas as casas não-parede estão conectadas? (blocos contam como passáveis, pois quebram)
function gridConnected(g) {
  const start = idx(SPAWNS[0][0], SPAWNS[0][1]);
  const seen = new Uint8Array(g.length); seen[start] = 1;
  const q = [start]; let open = 0;
  for (let i = 0; i < g.length; i++) if (g[i] !== WALL) open++;
  for (let h = 0; h < q.length; h++) {
    const c = q[h], x = c % COLS, y = (c / COLS) | 0;
    for (const [dx, dy] of DIRS) {
      const n = idx(x + dx, y + dy);
      if (!seen[n] && g[n] !== WALL) { seen[n] = 1; q.push(n); }
    }
  }
  return q.length === open;
}

// Gera um mapa: bordas, pilares, paredes inquebráveis extras (sem isolar áreas) e blocos
function generateGrid(density, extraWalls) {
  const g = [];
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) g.push(isBorder(x, y) || isPillar(x, y) ? WALL : EMPTY);
  const cand = shuffle(g.map((t, i) => t === EMPTY && !SPAWN_ZONE.has(i) ? i : -1).filter(i => i >= 0));
  let placed = 0;
  for (const i of cand) {
    if (placed >= extraWalls) break;
    g[i] = WALL;
    if (gridConnected(g)) placed++; else g[i] = EMPTY;
  }
  for (let i = 0; i < g.length; i++) if (g[i] === EMPTY && !SPAWN_ZONE.has(i) && Math.random() < density) g[i] = BLOCK;
  return g;
}

// Converte a grade de uma fase do editor (string de dígitos) em array válido
function parseGrid(str) {
  const g = [];
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const k = idx(x, y);
    let t = +(str[k] || 0);
    if (isBorder(x, y)) t = WALL;
    else if (SPAWN_ZONE.has(k)) t = EMPTY;
    else if (t !== WALL && t !== BLOCK) t = EMPTY;
    g.push(t);
  }
  return g;
}

// Ordem em espiral usada na "morte súbita" da batalha
const SPIRAL = (() => {
  const out = []; let x0 = 1, y0 = 1, x1 = COLS - 2, y1 = ROWS - 2;
  while (x0 <= x1 && y0 <= y1) {
    for (let x = x0; x <= x1; x++) out.push([x, y0]);
    for (let y = y0 + 1; y <= y1; y++) out.push([x1, y]);
    if (y1 > y0) for (let x = x1 - 1; x >= x0; x--) out.push([x, y1]);
    if (x1 > x0) for (let y = y1 - 1; y > y0; y--) out.push([x0, y]);
    x0++; y0++; x1--; y1--;
  }
  return out;
})();
