'use strict';
// Constantes gerais do jogo: tamanho da grade, tipos de casa e tempos.

const TILE = 48, COLS = 19, ROWS = 15;           // tamanho de cada casa (px) e da grade (ímpares)
const EXTRA_WALLS_BATTLE = 10, EXTRA_WALLS_CAMPAIGN = 8; // paredes inquebráveis além dos pilares
const EMPTY = 0, WALL = 1, BLOCK = 2, BURN = 3;  // tipos de casa
const BOMB_TIME = 2.4;     // segundos até a bomba explodir
const FLAME_TIME = 0.55;   // duração do fogo da explosão
const BURN_TIME = 0.45;    // tempo do bloco queimando
const KICK_SPEED = 9;      // velocidade da bomba chutada (casas/s)
const MAX_SPEED = 5.6, SPEED_STEP = 0.45, MAX_RANGE = 8, MAX_BOMBS = 8;
const SHOT_SPEED = 9, SHOT_RANGE = 7;            // orbes de magia

const PLAYER_COLORS = ['#4da3ff', '#ff4d6d', '#4ee08a', '#ffb02e'];
