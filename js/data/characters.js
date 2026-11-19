'use strict';
// Personagens jogáveis, um de cada elemento. Para criar um novo, adicione uma entrada aqui
// e desenhe o acessório dele em js/render/characters.js (função drawAccessory).
//
// Efeitos especiais (todos opcionais):
//   fuse       tempo do pavio das bombas (padrão BOMB_TIME)
//   pierce     quantos blocos a explosão atravessa
//   flameTime  quanto tempo o fogo da explosão dura (padrão FLAME_TIME)
//   onHit      efeito em quem sobrevive à explosão: { status: 'frozen'|'rooted', dur }
//   immune     magias/efeitos que não afetam o personagem: 'fogo' | 'gelo' | 'mato'
//   regen      recupera regenAmt de vida a cada N segundos
//   spell      magia natural do personagem (veja SPELLS em js/data/shop.js)

const CHARACTERS = [
  { id: 'faisca', name: 'Faísca', element: 'Raio', icon: '⚡', role: 'Velocista',
    color: '#ffd23f', light: '#fff2a8', dark: '#c99a00',
    bio: 'Um raiozinho elétrico que nunca para quieto. Atravessa a arena antes de todo mundo e foge das explosões no último segundo.',
    ability: 'Começa com velocidade alta, mas tem só 90 de vida',
    special: 'Pavio elétrico: suas bombas explodem mais rápido (1.8 s em vez de 2.4 s).',
    speed: 3.7, bombs: 1, range: 2, kick: false, hp: 90, fuse: 1.8, spell: 'raio' },
  { id: 'bolota', name: 'Bolota', element: 'Terra', icon: '⛰️', role: 'Tanque',
    color: '#9a9590', light: '#d2cdc6', dark: '#5c5752',
    bio: 'Uma pedrinha teimosa que rolou da montanha. Dura como rocha, carrega bombas extras e aguenta pancada como ninguém, mas é meio lenta.',
    ability: 'Começa com 2 bombas e 140 de vida, porém anda mais devagar',
    special: 'Terremoto: a explosão atravessa 1 bloco e quebra o seguinte também.',
    speed: 2.8, bombs: 2, range: 2, kick: false, hp: 140, pierce: 1, spell: 'pedra' },
  { id: 'brasa', name: 'Brasa', element: 'Fogo', icon: '🔥', role: 'Explosiva',
    color: '#ff6b4a', light: '#ffb7a3', dark: '#b8321a',
    bio: 'Nasceu dentro de um vulcão e acha que toda explosão deveria ser maior. Suas bombas alcançam longe desde o começo.',
    ability: 'Começa com alcance de fogo 3',
    special: 'Chamas teimosas: o fogo das suas explosões dura quase o dobro.',
    speed: 3.0, bombs: 1, range: 3, kick: false, hp: 100, flameTime: 1.0, spell: 'fogo' },
  { id: 'nimbo', name: 'Nimbo', element: 'Água', icon: '💧', role: 'Estrategista',
    color: '#4aa8ff', light: '#d2ecff', dark: '#1f5fb8',
    bio: 'Uma nuvem de chuva brincalhona que chuta tudo o que vê pela frente. Adora mandar bombas deslizando na direção dos rivais.',
    ability: 'Já começa sabendo chutar bombas',
    special: 'Corpo de água: imune a queimaduras e à Tromba d’água.',
    speed: 3.0, bombs: 1, range: 2, kick: true, hp: 100, immune: ['fogo', 'agua'], spell: 'agua' },
  { id: 'geada', name: 'Geada', element: 'Gelo', icon: '❄️', role: 'Controlador',
    color: '#bdeeff', light: '#ffffff', dark: '#5fa8cf',
    bio: 'Um floquinho de neve calmo e calculista. Prefere deixar os rivais parados no lugar antes de terminar o serviço.',
    ability: 'Atributos equilibrados',
    special: 'Explosão gélida: quem sobrevive à sua explosão fica congelado por 1 s. Imune a Congelar.',
    speed: 3.0, bombs: 1, range: 2, kick: false, hp: 100, onHit: { status: 'frozen', dur: 1 }, immune: ['gelo'], spell: 'gelo' },
  { id: 'broto', name: 'Broto', element: 'Planta', icon: '🌱', role: 'Resistente',
    color: '#7ed957', light: '#d6f7bd', dark: '#3f8f2a',
    bio: 'Uma sementinha que brotou no meio da arena. Paciente, se recupera com a luz do sol e enrosca os rivais em raízes.',
    ability: 'Recupera 8 de vida a cada 5 s',
    special: 'Raízes explosivas: quem sobrevive à sua explosão fica preso por 1.5 s. Imune a Raízes.',
    speed: 3.0, bombs: 1, range: 2, kick: false, hp: 110, regen: 5, regenAmt: 8, onHit: { status: 'rooted', dur: 1.5 }, immune: ['mato'], spell: 'mato' },
];

function charById(id) { return CHARACTERS.find(c => c.id === id) || CHARACTERS[0]; }
function isImmune(p, effect) { const c = charById(p.char); return !!(c.immune && c.immune.includes(effect)); }
