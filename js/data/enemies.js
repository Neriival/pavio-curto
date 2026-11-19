'use strict';
// Inimigos da campanha.
// ai: wander (vaga), erratic (muda muito de direção), drift (persegue às vezes), chase (persegue)
// pass: atravessa blocos · caster: magia que lança · damage: multiplicador do dano por toque (DMG.touch, padrão 1)

const ENEMY_TYPES = {
  gota:     { name: 'Gota',      speed: 1.4, hp: 1, pass: false, ai: 'wander',  points: 100 },
  morcego:  { name: 'Morcego',   speed: 2.5, hp: 1, pass: false, ai: 'erratic', points: 200 },
  fantasma: { name: 'Fantasma',  speed: 1.7, hp: 1, pass: true,  ai: 'drift',   points: 300 },
  cacador:  { name: 'Caçador',   speed: 2.1, hp: 1, pass: false, ai: 'chase',   points: 400 },
  tanque:   { name: 'Tanque',    speed: 1.1, hp: 3, pass: false, ai: 'wander',  points: 500 },
  bruxo:    { name: 'Bruxo',     speed: 1.4, hp: 2, pass: false, ai: 'wander',  points: 450, caster: 'gelo' },
  rei:      { name: 'Rei Magma', speed: 1.5, hp: 12, pass: true, ai: 'chase',   points: 1500, boss: true, caster: 'fogo', damage: 2 },
};
