'use strict';
// Tela "Status": distribuir os pontos da conta e iniciar o Desafio do Chefe.

function renderStats() {
  const p = Profiles.current(), free = Profiles.freePoints(p);
  $('#stProfile').innerHTML = profileOptions(p.id);
  $('#stPoints').innerHTML = `<b>${free}</b> ${free === 1 ? 'ponto livre' : 'pontos livres'}`;
  $('#stPoints').classList.toggle('has', free > 0);
  $('#stRows').innerHTML = STAT_KEYS.map(k => {
    const S = STATS[k], lv = p.stats[k];
    const pips = Array.from({ length: S.max }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('');
    return `<div class="stat-row">
      <span class="ico">${S.icon}</span>
      <div class="stat-txt"><b>${S.name}</b><span class="muted">${S.desc}</span></div>
      <div class="pips">${pips}</div>
      <button class="btn small ghost" data-down="${k}" ${lv <= 0 ? 'disabled' : ''} aria-label="tirar ponto">−</button>
      <button class="btn small" data-up="${k}" ${free <= 0 || lv >= S.max ? 'disabled' : ''} aria-label="pôr ponto">+</button>
    </div>`;
  }).join('');
  $$('#stRows [data-up]').forEach(b => b.onclick = () => { if (Profiles.statUp(p, b.dataset.up)) { Sfx.play('power'); renderStats(); } });
  $$('#stRows [data-down]').forEach(b => b.onclick = () => { if (Profiles.statDown(p, b.dataset.down)) renderStats(); });
  $('#stReset').disabled = statPointsUsed(p.stats) === 0;

  const ready = Profiles.bossReady(p), n = Math.min(p.matches, MATCHES_PER_BOSS);
  $('#stBoss').innerHTML = `
    <div class="boss-progress"><div style="width:${n / MATCHES_PER_BOSS * 100}%"></div></div>
    <p>${ready ? '<b class="ok">O chefe está te esperando!</b>' : `Partidas: <b>${n}/${MATCHES_PER_BOSS}</b> · faltam ${MATCHES_PER_BOSS - n}`}</p>
    <p class="muted">Próximo chefe: <b>Rei Magma nível ${p.bossWins + 1}</b> · chefes vencidos: ${p.bossWins}</p>`;
  $('#stFight').disabled = !ready;
}

// Luta solo contra o chefe, com o personagem e os pontos do perfil atual
function startBoss() {
  const p = Profiles.current();
  if (!Profiles.bossReady(p)) return;
  const game = new Game({ mode: 'campaign', challenge: true, lives: 2, levels: [bossLevel(p.bossWins)],
    players: [{ name: p.name, char: CHARACTERS[p.char].id, color: PLAYER_COLORS[0], ...Profiles.loadout(p) }] });
  startSession({ kind: 'local', game, sources: [{ type: 'device', device: 'any' }], you: 0,
    credit: [{ pid: 0, profileId: p.id }], challenge: true, restart: startBoss, returnTo: 'stats' });
}

// Faixa no menu: progresso até o chefe (ou aviso de que ele está liberado)
function refreshBossBanner() {
  const p = Profiles.current(), ready = Profiles.bossReady(p), free = Profiles.freePoints(p);
  const b = $('#bossBanner');
  b.classList.remove('hidden');
  b.classList.toggle('ready', ready);
  b.innerHTML = ready ? '👑 <b>O chefe está liberado!</b> Clique para enfrentar'
    : `👑 Chefe: ${p.matches}/${MATCHES_PER_BOSS} partidas` + (free > 0 ? ` · <b>${free} ${free === 1 ? 'ponto' : 'pontos'} para distribuir!</b>` : '');
}

function initStats() {
  $('#stMatchesNeed').textContent = MATCHES_PER_BOSS;
  $('#stBossPts').textContent = BOSS_POINTS;
  $('#stProfile').onchange = e => { Profiles.setCurrent(e.target.value); renderStats(); };
  $('#stReset').onclick = () => { Profiles.resetStats(Profiles.current()); renderStats(); };
  $('#stFight').onclick = startBoss;
  $('#bossBanner').onclick = () => show('stats');
  App.onShow.stats = renderStats;
}
