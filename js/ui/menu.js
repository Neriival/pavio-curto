'use strict';
// Menu principal, tela de ajuda e animações dos menus.

function refreshProfileBadge() {
  const p = Profiles.current();
  $('#profileBadge').innerHTML = `👤 <b>${esc(p.name)}</b> · 💰 ${p.coins} <span class="muted">· trocar / loja</span>`;
  refreshBossBanner();
}

// Estilo do nome de cada personagem na tela inicial, conforme o elemento
const NAME_STYLES = {
  faisca: { font: 'Audiowide', size: 23, fill: ['#fffbe0', '#ffd23f'], stroke: '#8a6400', glow: '#ffe14d' },
  bolota: { font: 'Rubik Dirt', size: 25, fill: ['#e2ddd6', '#8f8a84'], stroke: '#2f2c29' },
  brasa:  { font: 'Rubik Burned', size: 25, fill: ['#ffe066', '#ff7a1c', '#d9261c'], stroke: '#5a1206', glow: '#ff6a1c' },
  nimbo:  { font: 'Rubik Puddles', size: 25, fill: ['#d6f0ff', '#4aa8ff'], stroke: '#123f73' },
  geada:  { font: 'Snowburst One', size: 25, fill: ['#ffffff', '#9fe3ff'], stroke: '#2f6f99', glow: '#bff0ff' },
  broto:  { font: 'Chewy', size: 27, fill: ['#c8f59a', '#3fa832'], stroke: '#1d4f17' },
};

function drawElementName(ctx, ch, x, y, t) {
  const st = NAME_STYLES[ch.id] || { font: 'Lilita One', size: 24, fill: [ch.light, ch.color], stroke: ch.dark };
  ctx.save();
  ctx.font = `${st.size}px '${st.font}', 'Lilita One', sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  const w = ctx.measureText(ch.name).width;
  ctx.translate(x, y);
  if (w > 122) ctx.scale(122 / w, 1);
  const g = ctx.createLinearGradient(0, -st.size / 2, 0, st.size / 2);
  st.fill.forEach((c, k) => g.addColorStop(k / (st.fill.length - 1), c));
  ctx.strokeStyle = st.stroke; ctx.lineWidth = 5; ctx.strokeText(ch.name, 0, 0);
  if (st.glow) { ctx.shadowColor = st.glow; ctx.shadowBlur = 10 + Math.sin(t * (ch.id === 'brasa' ? 9 : 4)) * 4; }
  ctx.fillStyle = g; ctx.fillText(ch.name, 0, 0);
  ctx.restore();
}

// Chãozinho do elemento embaixo de cada personagem na tela inicial
function drawElementBase(ctx, id, x, y, t) {
  ctx.save(); ctx.translate(x, y);
  switch (id) {
    case 'faisca':                          // placa elétrica com faíscas piscando
      ctx.fillStyle = '#5a4a12'; ell(ctx, 0, 2, 30, 8);
      ctx.fillStyle = '#ffd23f'; ell(ctx, 0, 0, 28, 7);
      ctx.strokeStyle = '#fff6b0'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
      for (let k = 0; k < 3; k++) {
        if ((Math.floor(t * 6) + k) % 3 === 0) continue;
        const a = -20 + k * 20;
        ctx.beginPath(); ctx.moveTo(a - 4, -6); ctx.lineTo(a, -11); ctx.lineTo(a - 1, -14); ctx.lineTo(a + 4, -19); ctx.stroke();
      }
      break;
    case 'bolota':                          // pedras empilhadas
      ctx.fillStyle = '#4a4642'; ell(ctx, 0, 3, 30, 8);
      ctx.fillStyle = '#7d7873'; ell(ctx, 0, 0, 28, 7);
      ctx.fillStyle = '#a19b95';
      for (const [a, b, r] of [[-22, -3, 5], [21, -2, 6], [-12, 4, 3.5], [13, 4, 3]]) ell(ctx, a, b, r, r * 0.75);
      break;
    case 'brasa':                           // brasas acesas
      ctx.fillStyle = '#3a1208'; ell(ctx, 0, 2, 30, 8);
      ctx.fillStyle = '#b8321a'; ell(ctx, 0, 0, 27, 6.5);
      for (let k = 0; k < 4; k++) {
        const a = -21 + k * 14, h = 9 + Math.sin(t * 11 + k * 1.9) * 4;
        ctx.fillStyle = '#ff8a1c'; tongue(ctx, a, 0, 4, h);
        ctx.fillStyle = '#ffe066'; tongue(ctx, a, 0, 2, h * 0.55);
      }
      break;
    case 'nimbo': {                         // poça com ondinhas
      ctx.fillStyle = '#1d5fa8'; ell(ctx, 0, 1, 30, 8);
      ctx.fillStyle = '#4aa8ff'; ell(ctx, 0, 0, 27, 6.5);
      const k = (t * 0.8) % 1;
      ctx.strokeStyle = `rgba(220,240,255,${1 - k})`; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.ellipse(0, 0, 8 + k * 18, 2 + k * 4, 0, 0, Math.PI * 2); ctx.stroke();
      break;
    }
    case 'geada':                           // placa de gelo com cristais
      ctx.fillStyle = '#5fa8cf'; ell(ctx, 0, 2, 30, 8);
      ctx.fillStyle = '#d8f6ff'; ell(ctx, 0, 0, 28, 7);
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#5fa8cf'; ctx.lineWidth = 1;
      for (const [a, h] of [[-23, 12], [-17, 7], [19, 10], [24, 6]]) { poly(ctx, [[a, -h], [a + 2.5, -1], [a - 2.5, -1]], 1); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = `rgba(255,255,255,${0.5 + Math.sin(t * 5) * 0.4})`; circ(ctx, 10, -1, 1.6);
      break;
    case 'broto':                           // tufo de grama com florzinhas
      ctx.fillStyle = '#5a3a1b'; ell(ctx, 0, 3, 30, 8);
      ctx.fillStyle = '#3fa832'; ell(ctx, 0, 0, 28, 7);
      ctx.strokeStyle = '#6fd65a'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      for (let k = 0; k < 7; k++) {
        const a = -24 + k * 8, sw = Math.sin(t * 2.5 + k) * 1.5;
        ctx.beginPath(); ctx.moveTo(a, 1); ctx.lineTo(a + sw, -7 - (k % 2) * 3); ctx.stroke();
      }
      ctx.fillStyle = '#ffe14d'; circ(ctx, -20, -8, 2); ctx.fillStyle = '#ff8fab'; circ(ctx, 22, -9, 2);
      break;
  }
  ctx.restore();
}

// Garante que as fontes dos elementos carreguem antes de aparecerem no canvas
function loadNameFonts() {
  if (!document.fonts || !document.fonts.load) return;
  for (const s of Object.values(NAME_STYLES)) document.fonts.load(`${s.size}px '${s.font}'`, 'ABCabc').catch(() => { });
}

function drawMenus(t) {
  if (App.screen === 'menu') {
    const c = $('#titleCv'), x = c.getContext('2d');
    x.clearRect(0, 0, c.width, c.height);
    const prof = Profiles.current(), lo = Profiles.loadout(prof);
    CHARACTERS.forEach((ch, i) => {
      const px = 60 + i * 132, jump = Math.abs(Math.sin(t * 2.4 + i * 0.9)) * 12;
      const mine = i === prof.char;
      drawElementBase(x, ch.id, px, 140, t + i);
      drawCharacter(x, ch.id, px, 115 - jump, 80, { t: t + i, dir: 'down', moving: true, outfit: mine ? lo.outfit : null });
      if (i < CHARACTERS.length - 1) Render.bomb(x, { px: (px + 66) / TILE, py: 127 / TILE, timer: 1.5 + i }, t + i);
      drawElementName(x, ch, px, 36, t);
    });
  }
  if (App.screen === 'editor') drawEditor(t);
  drawPreviews(t);
}

function initHelp() {
  $('#helpKeys').innerHTML = `
    <p><b>Jogador A:</b> ${CONTROL_HELP.kbA}</p>
    <p><b>Jogador B:</b> ${CONTROL_HELP.kbB}</p>
    <p><b>Controle:</b> ${CONTROL_HELP.pad}</p>
    <p><kbd>Esc</kbd> pausa · <kbd>M</kbd> liga/desliga o som</p>`;
  $('#helpItems').innerHTML = Object.values(POWERUPS).map(p =>
    `<div class="item-row"><span class="ico" style="background:${p.color}">${p.icon}</span><span>${p.name}</span></div>`).join('');
  $('#helpSpells').innerHTML =
    `<p><b>Como lançar:</b> cada personagem tem uma magia do seu elemento. Uma mira 🎯 aparece em cima do alvo; troque de alvo com <kbd>R</kbd> ou clicando no personagem. Aperte <kbd>Q</kbd> (ou o botão de magia, ou clique com o botão direito no alvo): a magia sobe ao céu, persegue o alvo e cai em cima dele. Para se defender: pule com a montaria na hora certa, use o escudo 🛡️ ou tenha montaria (ela segura o golpe). Alguns personagens são imunes a certos elementos. Quem estiver colado no alvo também é atingido.</p>` +
    `<p><b>Níveis:</b> na Loja, compre a magia de outro personagem ou melhore qualquer magia até o nível ${SPELL_MAX_LV}. Cada nível diminui a recarga e deixa o efeito mais forte.</p>` +
    Object.entries(SPELLS).map(([k, s]) => { const o = CHARACTERS.find(c => c.spell === k);
      return `<p><b>${s.icon} ${s.name}</b>${o ? ` <span class="muted">(natural de ${o.name})</span>` : ''}: ${s.desc}</p>`; }).join('') +
    `<p><b>🛡️ Equipamentos:</b> capacete, armadura, calça, botas e escudo. Cada peça diminui o dano recebido. As botas dão velocidade, o escudo pode bloquear o golpe inteiro e a armadura dá vida extra. São ${GEAR_TIERS.length} materiais, do pano ao dragão, liberados pelo nível da conta.</p>`;
  $('#helpChars').innerHTML = CHARACTERS.map(c => `<p><b style="color:${c.color}">${c.icon} ${c.name}</b> (${c.element}): ${c.ability}. ${c.special}</p>`).join('');
}

function initMenu() {
  $$('[data-go]').forEach(b => b.onclick = () => {
    const go = b.dataset.go;
    if (go === 'campaign' || go === 'battle') openSetup(go);
    else show(go);
  });
  $('#profileBadge').onclick = () => show('shop');
  App.onShow.menu = refreshProfileBadge;
  refreshProfileBadge();
  loadNameFonts();
  initHelp();
}
