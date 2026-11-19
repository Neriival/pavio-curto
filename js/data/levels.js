'use strict';
// Fases oficiais da campanha: 5 mundos com 10 fases cada (o mapa é sorteado a cada partida).
// Formato de cada fase:
//   title: nome · theme: mundo · density: quantidade de blocos · enemies: { tipo: quantidade }
//   powerups: itens escondidos nos blocos · boss/bossHp: fase do chefe (centro aberto, vida do chefe)
// As fases são montadas a partir da tabela WORLD_DEFS abaixo: para mudar a dificuldade de um mundo,
// mexa nos inimigos (pool), na densidade ou na vida do chefe.
// Fases feitas à mão ficam no editor (js/ui/editor.js) e usam o formato com "grid".

const WORLD_DEFS = [
  { theme: 'jardim', bossHp: 8, density: [0.42, 0.58], count: [3, 7],
    // tipo, peso, a partir de qual fase do mundo (1-10) ele aparece
    pool: [['gota', 5, 1], ['morcego', 3, 3], ['fantasma', 2, 6]],
    titles: ['Primeiros passos', 'Canteiro bagunçado', 'Trilha das flores', 'Horta proibida', 'Labirinto de arbustos',
      'Lago dos sapos', 'Noite no jardim', 'Estufa abandonada', 'Raízes antigas', 'Guardião do Jardim'] },
  { theme: 'deserto', bossHp: 11, density: [0.55, 0.62], count: [5, 8],
    pool: [['gota', 2, 1], ['morcego', 4, 1], ['fantasma', 3, 2], ['cacador', 2, 5]],
    titles: ['Dunas quentes', 'Oásis escondido', 'Cânion do vento', 'Ruínas assombradas', 'Pirâmide perdida',
      'Mercado de areia', 'Tempestade de areia', 'Vale dos escorpiões', 'Tumba do faraó', 'Guardião do Deserto'] },
  { theme: 'gelo', bossHp: 14, density: [0.58, 0.63], count: [5, 9],
    pool: [['morcego', 2, 1], ['fantasma', 4, 1], ['cacador', 3, 2], ['bruxo', 2, 4]],
    titles: ['Lago congelado', 'Pista de patinação', 'Caverna de cristal', 'Vila dos pinguins', 'Picos nevados',
      'Avalanche', 'Ponte de gelo', 'Torre do bruxo', 'Coração do inverno', 'Guardião do Gelo'] },
  { theme: 'fabrica', bossHp: 17, density: [0.6, 0.65], count: [6, 10],
    pool: [['gota', 2, 1], ['morcego', 2, 1], ['cacador', 3, 1], ['tanque', 3, 2], ['bruxo', 2, 5]],
    titles: ['Esteiras', 'Depósito de peças', 'Linha de montagem', 'Fornalha', 'Sala das engrenagens',
      'Prensa gigante', 'Laboratório secreto', 'Sala das caldeiras', 'Central elétrica', 'Guardião da Fábrica'] },
  { theme: 'vulcao', bossHp: 24, density: [0.62, 0.66], count: [7, 11],
    pool: [['fantasma', 2, 1], ['cacador', 3, 1], ['tanque', 3, 1], ['bruxo', 3, 3]],
    titles: ['Rio de lava', 'Pedras flutuantes', 'Ponte de obsidiana', 'Gêiseres', 'Cratera fumegante',
      'Câmara de magma', 'Muralha de fogo', 'Portões do castelo', 'Salão do trono', 'O Rei Magma'] },
];

// Distribui "total" inimigos entre os tipos liberados, conforme os pesos (sempre do mesmo jeito)
function splitEnemies(pool, total, stage) {
  const open = pool.filter(([, , from]) => stage >= from);
  const sum = open.reduce((n, [, w]) => n + w, 0), out = {};
  let left = total;
  open.forEach(([type, w], i) => {
    const n = i === open.length - 1 ? left : Math.max(1, Math.round(total * w / sum));
    if (n > 0 && left > 0) { out[type] = Math.min(n, left); left -= out[type]; }
  });
  return out;
}

const LEVELS = [];
WORLD_DEFS.forEach((W, w) => {
  for (let j = 0; j < 10; j++) {
    const stage = j + 1, k = j / 8;            // 0 → 1 ao longo das 9 fases normais
    const powerups = ['bomb', 'fire', stage % 2 ? 'speed' : 'kick'];
    if (stage % 3 === 0) powerups.push('life');
    if (w >= 1 || stage >= 5) powerups.push('heart');
    if (stage % 4 === 0 || w >= 3) powerups.push('shield');
    if (stage === 10) {
      // chefe do mundo: o Rei Magma, mais forte a cada mundo, com ajudantes
      const helpers = w < 2 ? { gota: 2 + w } : { gota: 2, bruxo: w - 1 };
      LEVELS.push({ theme: W.theme, title: W.titles[j], density: 0.36, boss: true, bossHp: W.bossHp,
        enemies: { rei: 1, ...helpers }, powerups: ['bomb', 'fire', 'fire', 'shield', 'heart', 'heart', 'speed'] });
      continue;
    }
    LEVELS.push({
      theme: W.theme, title: W.titles[j],
      density: +(W.density[0] + (W.density[1] - W.density[0]) * k).toFixed(2),
      enemies: splitEnemies(W.pool, Math.round(W.count[0] + (W.count[1] - W.count[0]) * k), stage),
      powerups,
    });
  }
});

// Mundos: grupos de fases seguidas com o mesmo tema → { theme, from, to } (índices das fases)
const WORLDS = LEVELS.reduce((acc, L, i) => {
  const last = acc[acc.length - 1];
  if (last && last.theme === L.theme) last.to = i; else acc.push({ theme: L.theme, from: i, to: i });
  return acc;
}, []);
function worldOfLevel(i) { return Math.max(0, WORLDS.findIndex(w => i >= w.from && i <= w.to)); }
