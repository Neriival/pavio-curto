'use strict';
// Telas "Online" e "Sala": criar/entrar em sala, lobby sincronizado e início da partida em rede.
// Mensagens: hello, char (convidado→anfitrião) · lobby, busy, start, state (anfitrião→convidados) · input

function netStatus(m) { $('#netStatus').textContent = m || ''; }
function myNetName() {
  const n = Profiles.cleanName($('#netName').value || Profiles.current().name);
  try { localStorage.setItem('pc_name', n); } catch { }
  return n;
}
const clampChar = c => ((c | 0) % CHARACTERS.length + CHARACTERS.length) % CHARACTERS.length;
// Garante que um loadout vindo da rede só tem itens válidos
function cleanLoadout(lo) {
  lo = lo || {}; const o = lo.outfit || {};
  return {
    spell: SHOP_SPELLS.includes(lo.spell) ? lo.spell : null,
    gear: cleanGear(lo.gear), lifeLv: Math.max(0, Math.min(LIFE_MAX_LV, lo.lifeLv | 0)),
    stats: cleanStats(lo.stats),
    spellLv: Profiles.cleanSpellLv(lo.spellLv),
    outfit: { hat: cosmetic('hat', o.hat) ? o.hat : null, face: cosmetic('face', o.face) ? o.face : null, skin: cosmetic('skin', o.skin) ? o.skin : null },
  };
}

// ---------- anfitrião ----------
function hostMsg(d, conn) {
  const L = App.lobby; if (!L) return;
  const me = L.players.find(p => p.peer === conn.peer);
  if (d.t === 'hello') {
    if (me || App.session || L.players.length >= 4) return;
    L.players.push({ kind: 'remote', peer: conn.peer, name: Profiles.cleanName(d.name), char: clampChar(d.char), ...cleanLoadout(d.loadout) });
    renderLobby(); broadcastLobby();
  } else if (d.t === 'char' && me) {
    me.char = clampChar(d.char); renderLobby(); broadcastLobby();
  } else if (d.t === 'input') {
    const S = App.session;
    if (!S || S.kind !== 'host') return;
    const pid = S.peerPid[conn.peer]; if (pid == null) return;
    const cl = v => Math.max(-1, Math.min(1, Math.round(+v || 0)));
    const pk = d.pk && (d.pk.k === 'p' || d.pk.k === 'e') ? { k: d.pk.k, id: d.pk.id | 0 } : null;
    S.remote[pid] = { dx: cl(d.dx), dy: cl(d.dy), b: d.b | 0, s: d.s | 0, j: d.j | 0, c: d.c | 0, pn: d.pn | 0, pk };
  }
}

function broadcastLobby() {
  const L = App.lobby; if (!L) return;
  const players = L.players.map(p => ({ name: p.name, char: p.char, kind: p.kind, outfit: p.outfit, spell: p.spell, gear: p.gear }));
  for (const c of Net.conns.values()) {
    const you = L.players.findIndex(p => p.peer === c.peer);
    Net.sendTo(c, { t: 'lobby', code: L.code, mode: L.mode, wins: L.wins, players, you });
  }
}

function startOnline() {
  const L = App.lobby; if (!L) return;
  let list = L.players;
  if (L.mode === 'campaign') list = list.filter(p => p.kind !== 'cpu');
  if (L.mode === 'battle' && list.length < 2) { $('#lobbyErr').textContent = 'Precisa de pelo menos 2 participantes (adicione uma CPU).'; return; }
  let cpuN = 0;
  const players = list.map((p, k) => ({
    name: p.kind === 'cpu' ? `CPU ${++cpuN}` : p.name, char: CHARACTERS[p.char].id, color: PLAYER_COLORS[k],
    outfit: p.outfit, spell: p.spell, gear: p.kind === 'cpu' ? null : p.gear, lifeLv: p.kind === 'cpu' ? 0 : p.lifeLv, stats: p.kind === 'cpu' ? null : p.stats, spellLv: p.kind === 'cpu' ? null : p.spellLv, bot: p.kind === 'cpu',
  }));
  const game = new Game({ mode: L.mode, players, winsNeeded: L.wins, roundTime: 150, arena: 'random' });
  const S = { kind: 'host', game, sources: [], remote: {}, lastSeq: [], peerPid: {}, pending: [], sendT: 0, you: 0,
    credit: [{ pid: 0, profileId: Profiles.current().id }] };
  list.forEach((p, k) => {
    if (p.kind === 'local') S.sources[k] = { type: 'device', device: 'any' };
    else if (p.kind === 'cpu') S.sources[k] = { type: 'bot', bot: new Bot(game, k) };
    else { S.sources[k] = { type: 'remote' }; S.peerPid[p.peer] = k; S.lastSeq[k] = { b: 0, s: 0, j: 0, c: 0, pn: 0 }; }
  });
  for (const c of Net.conns.values()) {
    const pid = S.peerPid[c.peer];
    Net.sendTo(c, { t: 'start', you: pid == null ? -1 : pid });
  }
  startSession(S);
}

function hostBackToLobby() {
  endSession();
  renderLobby(); show('lobby'); broadcastLobby();
}

// ---------- convidado ----------
function clientMsg(d) {
  if (d.t === 'lobby') {
    App.lobbyView = d;
    if (App.session) { creditCoins(App.session); endSession(); }
    renderLobby();
    if (App.screen !== 'lobby') show('lobby');
  } else if (d.t === 'busy') {
    Net.close(); App.lobbyView = null; netStatus(d.reason || 'Não foi possível entrar.'); show('online');
  } else if (d.t === 'start') {
    startSession({ kind: 'client', you: d.you, seq: { b: 0, s: 0, j: 0, c: 0, pn: 0, pk: null }, cur: null, prev: null, inT: 0, lastKey: '',
      credit: d.you >= 0 ? [{ pid: d.you, profileId: Profiles.current().id }] : [] });
  } else if (d.t === 'state') {
    const S = App.session; if (!S || S.kind !== 'client' || !d.s) return;
    S.prev = S.cur; S.cur = { s: d.s, t: performance.now() };
    for (const e of d.s.events || []) Sfx.play(e);
  }
}

// ---------- sala ----------
function renderLobby() {
  const host = Net.isHost && App.lobby;
  const V = host ? { ...App.lobby, you: 0 } : App.lobbyView;
  if (!V) return;
  $('#lobbyCode').textContent = V.code;
  $('#lobbyHint').textContent = host
    ? 'Passe o código para seus amigos (clique nele para copiar). Quando todos estiverem prontos, comece!'
    : `Modo: ${V.mode === 'battle' ? `Batalha (${V.wins} vitórias)` : 'Campanha co-op'} · aguardando o anfitrião começar…`;
  $('#lobbyHost').classList.toggle('hidden', !host);
  $('#btnStartOnline').classList.toggle('hidden', !host);
  $('#lobbyErr').textContent = '';
  if (host) { $('#lobMode').value = V.mode; $('#lobWins').value = String(V.wins); }
  const box = $('#lobbySlots'); box.innerHTML = '';
  for (let i = 0; i < 4; i++) {
    const p = V.players[i], color = PLAYER_COLORS[i];
    if (!p) { box.appendChild(slotCard(color, null, { title: 'Vaga livre', off: true })); continue; }
    const mine = i === V.you, cpu = p.kind === 'cpu';
    const tag = mine ? 'Você' : cpu ? 'CPU' : (p.kind === 'local' ? 'Anfitrião' : 'Online');
    const canPick = mine || (host && cpu);
    const el = slotCard(color, CHARACTERS[p.char], {
      title: cpu ? 'CPU' : p.name, tag,
      loadout: cpu ? null : { outfit: p.outfit, spell: p.spell, gear: p.gear, stats: p.stats, lifeLv: p.lifeLv },
      extra: host && cpu ? '<button class="btn small ghost" data-rm="1">Remover</button>' : '',
      pick: canPick ? d => {
        const nc = (p.char + d + CHARACTERS.length) % CHARACTERS.length;
        if (mine) { Profiles.current().char = nc; Profiles.save(); }
        if (host) { App.lobby.players[i].char = nc; renderLobby(); broadcastLobby(); }
        else { p.char = nc; Net.send({ t: 'char', char: nc }); renderLobby(); }
      } : null,
    });
    const rm = el.querySelector('[data-rm]');
    if (rm) rm.onclick = () => { App.lobby.players.splice(i, 1); renderLobby(); broadcastLobby(); };
    box.appendChild(el);
  }
}

function initOnline() {
  Net.onMsg = (d, conn) => {
    if (!d || typeof d !== 'object') return;
    if (Net.isHost) hostMsg(d, conn); else clientMsg(d);
  };
  Net.onJoin = conn => {
    const L = App.lobby; if (!L) return;
    if (App.session || L.players.length >= 4) {
      Net.sendTo(conn, { t: 'busy', reason: App.session ? 'A partida já começou. Tente quando voltarem à sala.' : 'A sala está cheia.' });
      setTimeout(() => { try { conn.close(); } catch { } }, 400);
    }
  };
  Net.onLeave = conn => {
    if (Net.isHost) {
      const L = App.lobby; if (!L) return;
      L.players = L.players.filter(p => p.peer !== conn.peer);
      const S = App.session;
      if (S && S.kind === 'host') {
        const pid = S.peerPid[conn.peer];
        if (pid != null) { S.sources[pid] = { type: 'bot', bot: new Bot(S.game, pid) }; delete S.peerPid[conn.peer]; }
      } else { renderLobby(); broadcastLobby(); }
    } else {
      const S = App.session;
      if (S) S.closed = 'O anfitrião encerrou a sala ou a conexão caiu.';
      else { Net.close(); App.lobbyView = null; netStatus('Você foi desconectado da sala.'); show('online'); }
    }
  };

  App.onShow.online = () => { if (!$('#netName').value) $('#netName').value = Profiles.current().name; };

  $('#btnHost').onclick = () => {
    if (!Net.available()) return netStatus('A biblioteca de rede não carregou — o modo online precisa de internet.');
    netStatus('Criando sala…');
    Net.host((err, code) => {
      if (err) { Net.close(); return netStatus(netErrorText(err)); }
      const prof = Profiles.current();
      App.lobby = { code, mode: 'battle', wins: 3, players: [{ kind: 'local', name: myNetName(), char: prof.char, ...Profiles.loadout(prof) }] };
      netStatus(''); renderLobby(); show('lobby');
    });
  };
  $('#btnJoin').onclick = () => {
    if (!Net.available()) return netStatus('A biblioteca de rede não carregou — o modo online precisa de internet.');
    const code = $('#joinCode').value.trim().toUpperCase();
    if (code.length !== 5) return netStatus('Digite o código de 5 caracteres.');
    netStatus('Conectando…');
    Net.join(code, err => {
      if (err) { Net.close(); return netStatus(netErrorText(err)); }
      const prof = Profiles.current();
      Net.send({ t: 'hello', name: myNetName(), char: prof.char, loadout: Profiles.loadout(prof) });
      netStatus('Conectado! Entrando na sala…');
    });
  };
  $('#joinCode').addEventListener('keydown', e => { if (e.key === 'Enter') $('#btnJoin').click(); });
  $('#btnLeave').onclick = () => { Net.close(); App.lobby = null; App.lobbyView = null; netStatus(''); show('online'); };
  $('#btnStartOnline').onclick = startOnline;
  $('#btnAddCpu').onclick = () => {
    const L = App.lobby; if (!L || L.players.length >= 4) return;
    L.players.push({ kind: 'cpu', name: 'CPU', char: Math.floor(Math.random() * CHARACTERS.length), ...randomLoadout() });
    renderLobby(); broadcastLobby();
  };
  $('#lobMode').onchange = e => { App.lobby.mode = e.target.value; renderLobby(); broadcastLobby(); };
  $('#lobWins').onchange = e => { App.lobby.wins = +e.target.value; broadcastLobby(); };
  $('#lobbyCode').onclick = () => {
    try { navigator.clipboard.writeText($('#lobbyCode').textContent); $('#lobbyHint').textContent = 'Código copiado! ✔'; } catch { }
  };
}
