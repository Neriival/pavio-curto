'use strict';
// Evolução da conta: pontos de status que valem para qualquer personagem do perfil,
// e o Desafio do Chefe, liberado a cada MATCHES_PER_BOSS partidas terminadas.

// Atributos que recebem pontos. max = níveis máximos · per = quanto cada nível dá
const STATS = {
  hp:    { name: 'Vida',       icon: '❤️', max: 3, per: 20,   desc: '+20 de vida por nível' },
  speed: { name: 'Velocidade', icon: '👟', max: 5, per: 0.12, desc: 'anda um pouco mais rápido' },
  bombs: { name: 'Bombas',     icon: '💣', max: 2, per: 1,    desc: '+1 bomba ao mesmo tempo' },
  range: { name: 'Alcance',    icon: '🔥', max: 2, per: 1,    desc: '+1 casa de explosão' },
  magic: { name: 'Magia',      icon: '✨', max: 5, per: 0.08, desc: 'recarga da magia 8% menor' },
};
const STAT_KEYS = Object.keys(STATS);
const MATCHES_PER_BOSS = 15;      // partidas para liberar o chefe
const BOSS_POINTS = 3;            // pontos ganhos ao vencer o chefe
const BOSS_COINS = 120;           // moedas extras ao vencer o chefe

// Garante que os níveis são válidos (usado para dados salvos e vindos da rede)
function cleanStats(st) {
  const o = {};
  for (const k of STAT_KEYS) o[k] = Math.max(0, Math.min(STATS[k].max, (st && st[k]) | 0));
  return o;
}
function statPointsUsed(st) { return STAT_KEYS.reduce((n, k) => n + ((st && st[k]) | 0), 0); }

// Fase do Desafio do Chefe. tier = quantos chefes a conta já venceu (fica mais difícil).
function bossLevel(tier) {
  const themes = ['vulcao', 'fabrica', 'gelo', 'deserto', 'jardim'];
  const minions = { gota: 2 + Math.min(4, tier), bruxo: 1 + Math.min(2, Math.floor(tier / 2)) };
  if (tier >= 2) minions.cacador = Math.min(3, tier - 1);
  return {
    name: `👑 Desafio do Chefe · Nível ${tier + 1}`,
    theme: themes[tier % themes.length], density: 0.36, boss: true, noExit: true,
    bossHp: 12 + tier * 4,
    enemies: { rei: 1, ...minions },
    powerups: ['bomb', 'fire', 'fire', 'shield', 'heart', 'heart', 'speed'],
  };
}
