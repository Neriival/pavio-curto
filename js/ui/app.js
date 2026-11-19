'use strict';
// Base da interface: estado global da aplicação, troca de telas e componentes compartilhados.

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const SCREENS = ['menu', 'setup', 'online', 'lobby', 'help', 'shop', 'equip', 'stats', 'settings', 'editor'];

const App = {
  screen: 'menu',
  session: null,                       // partida em andamento (ver ui/session.js)
  setup: { mode: null, slots: [] },    // configuração local (ui/setup.js)
  lobby: null,                         // sala online do anfitrião (ui/online.js)
  lobbyView: null,                     // sala vista pelo convidado
  onShow: {},                          // ganchos chamados ao abrir cada tela
};

function show(id) {
  for (const s of SCREENS) $('#' + s).classList.toggle('hidden', s !== id);
  $('#gameWrap').classList.toggle('hidden', id !== 'game');
  App.screen = id;
  window.scrollTo(0, 0);
  if (App.onShow[id]) App.onShow[id]();
}

// ---------- Ficha do personagem ----------
function speedLevel(speed) { return Math.max(1, Math.min(5, Math.round((speed - 2.2) / 0.3))); }
function dots(n, max, on = '●', off = '○') { return on.repeat(Math.min(n, max)) + off.repeat(Math.max(0, max - n)); }

function charInfoHTML(c) {
  return `
    <div class="role">${c.icon} ${esc(c.element)} · ${esc(c.role)}</div>
    <p class="bio">${esc(c.bio)}</p>
    <div class="stats">
      <span>Vida</span><b class="hearts">❤ ${c.hp}</b>
      <span>Velocidade</span><b>${dots(speedLevel(c.speed), 5)}</b>
      <span>Bombas</span><b>${dots(c.bombs, 3)}</b>
      <span>Fogo</span><b>${dots(c.range, 4)}</b>
    </div>
    <div class="ability">⭐ ${esc(c.ability)}</div>
    <div class="special">${c.icon} ${esc(c.special)}</div>
    ${SPELLS[c.spell] ? `<div class="spell-info">✨ Magia: <b>${SPELLS[c.spell].icon} ${esc(SPELLS[c.spell].name)}</b> · ${esc(SPELLS[c.spell].desc)}</div>` : ''}`;
}

// Mostra magia e equipamentos (sem magia comprada, vale a magia natural do personagem)
function loadoutHTML(lo, c) {
  if (!lo) return '';
  const own = lo.spell && SPELLS[lo.spell], nat = c && SPELLS[c.spell];
  const sp = own || nat, g = gearTotals(lo.gear), pieces = lo.gear ? GEAR_SLOTS.filter(s => lo.gear[s.id] != null).length : 0;
  const life = c ? c.hp + ((lo.stats && lo.stats.hp) | 0) * STATS.hp.per + (lo.lifeLv | 0) * LIFE_STEP + g.hp : 0;
  return `<div class="loadout">
    <span class="${sp ? '' : 'none'}">${sp ? sp.icon + ' ' + sp.name + (own ? '' : ' (natural)') : 'sem magia'}</span>
    ${c ? `<span title="vida total com equipamentos e bônus">❤ ${life}</span>` : ''}
    <span class="${pieces ? '' : 'none'}" title="peças equipadas · defesa">${pieces ? `🛡 ${pieces}/5 · ${Math.round(g.def * 100)}%` : 'sem equipamento'}</span>
    ${lo.stats && statPointsUsed(lo.stats) ? `<span title="${esc(STAT_KEYS.filter(k => lo.stats[k]).map(k => STATS[k].name + ' +' + lo.stats[k]).join(' · '))}">📈 ${STAT_KEYS.filter(k => lo.stats[k]).map(k => STATS[k].icon + lo.stats[k]).join(' ')}</span>` : ''}
  </div>`;
}

// Cartão de jogador usado na seleção local e na sala online.
// opts: title, tag, off, pick(delta), extra (html), loadout {outfit, spell, gear, stats, lifeLv}
function slotCard(color, c, opts) {
  const el = document.createElement('div');
  el.className = 'slot' + (opts.off ? ' off' : '');
  el.style.setProperty('--pc', color);
  const lo = opts.loadout || {};
  el.innerHTML = `
    ${opts.tag ? `<span class="tag">${esc(opts.tag)}</span>` : ''}
    <div class="who">${esc(opts.title)}</div>
    <canvas class="preview" width="110" height="110" ${c ? `data-char="${c.id}"` : ''} data-color="${color}"
      data-outfit="${esc(JSON.stringify(lo.outfit || null))}" data-gear="${esc(JSON.stringify(lo.gear || null))}"></canvas>
    ${c ? `<div class="picker">${opts.pick ? '<button data-d="-1" aria-label="anterior">◀</button>' : ''}
      <div class="cname">${c.name}</div>${opts.pick ? '<button data-d="1" aria-label="próximo">▶</button>' : ''}</div>
      ${charInfoHTML(c)}${opts.loadout ? loadoutHTML(lo, c) : ''}`
    : '<div class="bio">Aguardando jogador…</div>'}
    ${opts.extra || ''}`;
  if (opts.pick) el.querySelectorAll('.picker button').forEach(b => b.onclick = () => opts.pick(+b.dataset.d));
  return el;
}

// Desenha os personagens animados de todos os <canvas class="preview"> da tela atual
function drawPreviews(t) {
  $$(`#${App.screen} canvas.preview`).forEach(c => {
    const x = c.getContext('2d');
    x.clearRect(0, 0, c.width, c.height);
    if (!c.dataset.char) return;
    let outfit = null, gear = null;
    try { outfit = JSON.parse(c.dataset.outfit || 'null'); gear = JSON.parse(c.dataset.gear || 'null'); } catch { }
    drawCharacter(x, c.dataset.char, c.width / 2, c.height * 0.56, c.width * 0.74,
      { t, dir: 'down', ring: c.dataset.color || null, outfit, gear });
  });
}
