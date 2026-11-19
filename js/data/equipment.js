'use strict';
// Combate em números, equipamentos (15 sets × 5 peças) e nível da conta.

// ---------- dano (vida em números) ----------
const DMG = {
  bomb: 35,          // explosão de bomba
  touch: 30,         // encostar num inimigo (multiplicado pelo "damage" do inimigo; o Rei Magma tem 2)
  enemyBurn: 25,     // fogo do Rei Magma quando apaga
};
const HEART_HEAL = 30;          // item ❤ recupera
const LIFE_STEP = 10;           // vida extra por nível comprado na loja (aba Vida)
const LIFE_MAX_LV = 10;
function lifeUpgradeCost(lv) { return 80 + 50 * lv; }

// ---------- equipamentos ----------
// Cada peça dá defesa (% de dano a menos) e às vezes um bônus:
//   bota → velocidade · escudo → chance de bloquear o golpe inteiro · armadura → vida extra
const GEAR_SLOTS = [
  { id: 'helmet', name: 'Capacete', icon: '⛑️', def: 0.6 },
  { id: 'armor',  name: 'Armadura', icon: '🦺', def: 1.3, hp: 3 },
  { id: 'legs',   name: 'Calça',    icon: '👖', def: 0.9 },
  { id: 'boots',  name: 'Botas',    icon: '🥾', def: 0.4, speed: 0.035 },
  { id: 'shield', name: 'Escudo',   icon: '🛡️', def: 0.5, block: 1.0 },
];
// 15 materiais, do mais fraco ao mais forte. lvl = nível da conta necessário · color/dark/shine = cores do desenho
const GEAR_TIERS = [
  { id: 'pano',      name: 'de Pano',        lvl: 1,  color: '#c9b79c', dark: '#8a7a62', shine: '#efe3cf' },
  { id: 'couro',     name: 'de Couro',       lvl: 2,  color: '#9a6236', dark: '#5e3a1d', shine: '#c98d5b' },
  { id: 'madeira',   name: 'de Madeira',     lvl: 4,  color: '#b0814a', dark: '#6e4d27', shine: '#d6a96f' },
  { id: 'osso',      name: 'de Osso',        lvl: 6,  color: '#e8e1cf', dark: '#a39a83', shine: '#ffffff' },
  { id: 'bronze',    name: 'de Bronze',      lvl: 8,  color: '#c7803e', dark: '#7d4a1c', shine: '#f0b47a' },
  { id: 'ferro',     name: 'de Ferro',       lvl: 10, color: '#8d939c', dark: '#53585f', shine: '#c9ced6' },
  { id: 'aco',       name: 'de Aço',         lvl: 12, color: '#aab6c4', dark: '#5f6b7a', shine: '#e6eef8' },
  { id: 'prata',     name: 'de Prata',       lvl: 14, color: '#d4dbe6', dark: '#8790a0', shine: '#ffffff' },
  { id: 'gelo',      name: 'de Gelo Eterno', lvl: 16, color: '#8fdcff', dark: '#3f8fb8', shine: '#e8fbff' },
  { id: 'ouro',      name: 'de Ouro',        lvl: 18, color: '#f5c542', dark: '#a87b00', shine: '#fff1b0' },
  { id: 'cristal',   name: 'de Cristal',     lvl: 20, color: '#c58cff', dark: '#7a45b8', shine: '#f0dcff' },
  { id: 'obsidiana', name: 'de Obsidiana',   lvl: 22, color: '#3b3450', dark: '#1a1626', shine: '#7f76a8' },
  { id: 'rubi',      name: 'de Rubi',        lvl: 24, color: '#e0314f', dark: '#8a1328', shine: '#ff9aab' },
  { id: 'celeste',   name: 'Celestial',      lvl: 27, color: '#f2f6ff', dark: '#8fa6d6', shine: '#ffffff', glow: '#9fd0ff' },
  { id: 'dragao',    name: 'do Dragão',      lvl: 30, color: '#3fbf6a', dark: '#1d6b39', shine: '#a6f5c2', glow: '#ffcf4d' },
];
const GEAR_NAMES = { helmet: 'Capacete', armor: 'Armadura', legs: 'Calça', boots: 'Botas', shield: 'Escudo' };
function gearPrice(tier) { return Math.round(30 * Math.pow(tier + 1, 1.7) / 5) * 5; }
// Atributos de uma peça: { def (0-1), hp, speed, block (0-1) }
function gearStats(slot, tier) {
  const S = GEAR_SLOTS.find(s => s.id === slot), p = tier + 1;
  if (!S || !GEAR_TIERS[tier]) return null;
  return { def: S.def * p / 100, hp: (S.hp || 0) * p, speed: +((S.speed || 0) * p).toFixed(2), block: (S.block || 0) * p / 100 };
}
function gearName(slot, tier) { return `${GEAR_NAMES[slot]} ${GEAR_TIERS[tier].name}`; }
// Soma de tudo que está equipado ({ helmet: tier, ... })
function gearTotals(gear) {
  const t = { def: 0, hp: 0, speed: 0, block: 0 };
  for (const S of GEAR_SLOTS) {
    const tier = gear && gear[S.id];
    if (tier == null || !GEAR_TIERS[tier]) continue;
    const g = gearStats(S.id, tier);
    t.def += g.def; t.hp += g.hp; t.speed += g.speed; t.block += g.block;
  }
  t.def = Math.min(0.7, t.def);
  return t;
}
function cleanGear(g) {
  const out = {};
  for (const S of GEAR_SLOTS) { const v = g && g[S.id]; out[S.id] = Number.isInteger(v) && GEAR_TIERS[v] ? v : null; }
  return out;
}
function gearStatsText(slot, tier) {
  const g = gearStats(slot, tier), parts = [`🛡 defesa ${Math.round(g.def * 100)}%`];
  if (g.hp) parts.push(`❤ +${g.hp} vida`);
  if (g.speed) parts.push(`👟 +${g.speed} velocidade`);
  if (g.block) parts.push(`✋ ${Math.round(g.block * 100)}% de bloquear`);
  return parts.join(' · ');
}

// ---------- nível da conta (experiência ganha jogando) ----------
function xpForLevel(lv) { return 80 + 30 * lv; }          // XP para ir do nível lv ao lv+1
function levelFromXp(xp) {
  let lv = 1, left = xp | 0;
  while (left >= xpForLevel(lv) && lv < 99) { left -= xpForLevel(lv); lv++; }
  return { lv, into: left, need: xpForLevel(lv) };
}
