'use strict';
// Temas visuais dos cenários. style define o desenho do bloco quebrável (js/render/world.js).

const THEMES = {
  jardim:  { name: 'Jardim',  floorA: '#79c552', floorB: '#70bb4a', wall: '#6b7785', wallTop: '#8d99a6', wallDark: '#48525d',
             block: '#3f9a3a', blockTop: '#5cc055', blockDark: '#2b6e28', style: 'bush' },
  deserto: { name: 'Deserto', floorA: '#e8c27a', floorB: '#e0b86e', wall: '#a9744a', wallTop: '#c89366', wallDark: '#7a4f2e',
             block: '#b5823f', blockTop: '#d29e55', blockDark: '#7f5626', style: 'crate' },
  gelo:    { name: 'Geleira', floorA: '#dceffc', floorB: '#cfe6f7', wall: '#5f7fa3', wallTop: '#86a6c9', wallDark: '#3f5a78',
             block: '#9fd6f2', blockTop: '#c9ecff', blockDark: '#5fa8cf', style: 'ice' },
  fabrica: { name: 'Fábrica', floorA: '#8a8f98', floorB: '#81868f', wall: '#3d434c', wallTop: '#5a616c', wallDark: '#262a30',
             block: '#b5543c', blockTop: '#d06a4f', blockDark: '#7c3626', style: 'brick' },
  vulcao:  { name: 'Vulcão',  floorA: '#4a3b3b', floorB: '#433535', wall: '#2a2222', wallTop: '#463a3a', wallDark: '#160f0f',
             block: '#6b4d45', blockTop: '#86635a', blockDark: '#3d2925', style: 'rock' },
};
