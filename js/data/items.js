'use strict';
// Itens que aparecem ao quebrar blocos.

const POWERUPS = {
  bomb:   { icon: '💣', name: '+1 Bomba',   color: '#5b6cff' },
  fire:   { icon: '🔥', name: '+1 Fogo',    color: '#ff7a2e' },
  speed:  { icon: '👟', name: 'Velocidade', color: '#20b8a8' },
  kick:   { icon: '🦶', name: 'Chute',      color: '#a06cff' },
  shield: { icon: '🛡️', name: 'Escudo (bloqueia 1 golpe ou magia)', color: '#8796a8' },
  heart:  { icon: '💗', name: 'Cura (+30 de vida)', color: '#ff7eb6' },
  life:   { icon: '🍀', name: 'Vida extra (só na campanha)', color: '#3fae5a' },
};

// Chance relativa de cada item cair de um bloco na Batalha
const BATTLE_DROPS = [['bomb', 30], ['fire', 30], ['speed', 20], ['kick', 8], ['shield', 7], ['heart', 10]];
