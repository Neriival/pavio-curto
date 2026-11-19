'use strict';
// Ponto de entrada: carrega os perfis, liga as telas e inicia o laço do jogo.

Profiles.load();
Controls.load();          // teclas personalizadas (Configurações)
Input.init();
initMenu();
initSetup();
initHud();
initOnline();
initShop();
initStats();
initEquip();
initSettings();
refreshBossBanner();
initEditor();
requestAnimationFrame(loop);
