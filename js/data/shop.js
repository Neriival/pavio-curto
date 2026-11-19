'use strict';
// Tudo o que pode ser comprado na loja: magias e roupinhas.

// Magias: cd = recarga (s) · dur = duração do efeito (s) · fall = tempo até cair (s)
// area: 'one' (1 casa), 'cross' (casa + 4 vizinhas), 'square' (3x3)
// A magia é lançada para o céu e persegue o alvo escolhido: a sombra segue ele pelo chão e a magia
// cai em cima dele. Só escapa quem estiver pulando com a montaria, com escudo ou for imune.
// Quem estiver perto do alvo (dentro da área) também é atingido.
// innate = é a magia natural de algum personagem (ele já nasce com ela, sem comprar)
// grow = o que melhora a cada nível (além da recarga, que cai SPELL_LV_CD por nível):
//   dur: +% de duração por nível · area2: a partir de areaAt a área cresce · dano: +12% por nível (todas)
// Equilíbrio: TODA magia causa dano (SPELL_DMG, maior a cada nível). As de dano puro (raio, pedra) recarregam mais rápido;
// as que também prendem/congelam/queimam recarregam mais devagar e só ferem quando o efeito acaba (hit: 'end').
const SPELL_DMG = 20;                // dano base no nível 1 (sobe SPELL_LV_DMG por nível)
const SPELL_LV_DMG = 0.12;
const SPELLS = {
  mato: { name: 'Raízes', icon: '🌿', color: '#5cd65c', cd: 20, dur: 3, fall: 1.3, area: 'cross', price: 150, hit: 'end', grow: { dur: 0.09 },
    desc: 'Um mato brota em cima do alvo e prende ele no chão; quando solta, os espinhos causam dano.' },
  gelo: { name: 'Congelar', icon: '❄️', color: '#8fe3ff', cd: 21, dur: 2, fall: 1.3, area: 'cross', price: 250, hit: 'end', grow: { dur: 0.08 },
    desc: 'Congela o alvo (não anda, não planta bombas, não usa magia); quando o gelo quebra, ele sofre o dano.' },
  fogo: { name: 'Incendiar', icon: '🔥', color: '#ff7a2e', cd: 20, dur: 3, fall: 1.3, area: 'cross', price: 350, hit: 'end', grow: { areaAt: 6, area2: 'square' },
    desc: 'Põe o alvo em chamas; quando o fogo apaga, ele sofre o dano. O fogo pula para quem encostar e queima blocos.' },
  raio: { name: 'Relâmpago', icon: '⚡', color: '#ffe14d', cd: 16, dur: 0, fall: 0.9, area: 'one', price: 300, innate: true, grow: {},
    desc: 'Um raio cai bem rápido em cima do alvo e causa dano na hora.' },
  pedra: { name: 'Pedregulho', icon: '⛰️', color: '#a19b95', cd: 17, dur: 0, fall: 1.6, area: 'square', price: 300, innate: true, grow: { areaAt: 8, area2: 'diamond' },
    desc: 'Uma rocha enorme cai no alvo e em volta dele: causa dano na hora e quebra os blocos.' },
  agua: { name: 'Tromba d\'água', icon: '💧', color: '#4aa8ff', cd: 19, dur: 2.5, fall: 1.2, area: 'cross', price: 200, innate: true, grow: { dur: 0.09 },
    desc: 'Encharca o alvo: causa dano na hora, deixa ele com metade da velocidade e apaga o fogo.' },
};
// texto de vida: 0.5 → "½ coração", 1 → "1 coração", 1.5 → "1½ corações"
function heartsText(n) {
  const whole = Math.floor(n), half = n - whole >= 0.5;
  const num = whole ? whole + (half ? '½' : '') : (half ? '½' : '0');
  return `${num} ${n > 1 ? 'corações' : 'coração'}`;
}
const SHOP_SPELLS = Object.keys(SPELLS);       // todas as magias podem ser compradas
const SPELL_MAX_LV = 10;
const SPELL_LV_CD = 0.03;                      // recarga 3% menor por nível
const AREA_NAMES = { one: '1 casa', cross: 'cruz', square: '3x3', diamond: 'losango gigante' };
// preço para subir do nível lv para lv+1
function spellUpgradeCost(lv) { return 60 + 40 * lv; }
// valores da magia num nível: { cd, dur, dmg, area, fall }
function spellStats(type, lv = 1) {
  const S = SPELLS[type], G = (S && S.grow) || {}, k = Math.max(1, Math.min(SPELL_MAX_LV, lv | 0)) - 1;
  if (!S) return null;
  return {
    cd: +(S.cd * (1 - SPELL_LV_CD * k)).toFixed(1),
    dur: +(S.dur * (1 + (G.dur || 0) * k)).toFixed(1),
    dmg: Math.round(SPELL_DMG * (1 + SPELL_LV_DMG * k)),
    area: G.areaAt && k + 1 >= G.areaAt ? G.area2 : S.area,
    fall: S.fall,
  };
}
// texto curto com os valores do nível
function spellStatsText(type, lv) {
  const S = SPELLS[type], v = spellStats(type, lv);
  return [`recarga ${v.cd} s`, `dano ${v.dmg}`, v.dur ? `duração ${v.dur} s` : null, `área: ${AREA_NAMES[v.area]}`].filter(Boolean).join(' · ');
}
// Casas atingidas por uma magia que cai em (x, y); "area" permite a área melhorada pelo nível
function spellArea(type, x, y, area) {
  const a = area || (SPELLS[type] || {}).area, o = [];
  if (a === 'one') return [[x, y]];
  if (a === 'square') { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) o.push([x + dx, y + dy]); return o; }
  if (a === 'diamond') { for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (Math.abs(dx) + Math.abs(dy) <= 2) o.push([x + dx, y + dy]); return o; }
  return [[x, y], [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
}

// As montarias saíram do jogo (os equipamentos ficaram no lugar). Preços antigos, para devolver as moedas
// de quem já tinha comprado (veja Profiles.load).
const OLD_MOUNT_PRICES = { lagartixa: 250, coelho: 320, avestruz: 450, dragao: 750 };

// Roupinhas (o desenho de cada uma fica em js/render/characters.js)
const COSMETICS = {
  hat: [
    { id: 'bone', name: 'Boné', price: 80 },
    { id: 'laco', name: 'Laço', price: 100 },
    { id: 'cartola', name: 'Cartola', price: 160 },
    { id: 'cowboy', name: 'Chapéu de cowboy', price: 180 },
    { id: 'bruxa', name: 'Chapéu de bruxo', price: 220 },
    { id: 'coroa', name: 'Coroa', price: 350 },
  ],
  face: [
    { id: 'bigode', name: 'Bigode', price: 70 },
    { id: 'oculos', name: 'Óculos escuros', price: 90 },
    { id: 'mascara', name: 'Máscara de herói', price: 140 },
  ],
  skin: [
    { id: 'menta', name: 'Menta', price: 150, color: '#5fe0b0', light: '#c8fbe6', dark: '#24966c' },
    { id: 'chiclete', name: 'Chiclete', price: 150, color: '#ff7eb6', light: '#ffd0e6', dark: '#c23c7c' },
    { id: 'noite', name: 'Noite', price: 250, color: '#4b4f8f', light: '#8f94d6', dark: '#1f2150' },
    { id: 'ouro', name: 'Dourado', price: 400, color: '#f5c542', light: '#fff4c4', dark: '#a87b00' },
    { id: 'arcoiris', name: 'Arco-íris', price: 600, rainbow: true },
  ],
};
const COSMETIC_SLOTS = { hat: 'Chapéus', face: 'Rosto', skin: 'Pinturas' };
function cosmetic(slot, id) { return (COSMETICS[slot] || []).find(c => c.id === id) || null; }

// Moedas iniciais de um perfil novo
const START_COINS = 150;
