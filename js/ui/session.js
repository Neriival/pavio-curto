'use strict';
// Partida em andamento: laço principal, coleta de comandos, rede e crédito de moedas.
//
// Sessão (App.session):
//   kind: 'local' | 'host' | 'client'
//   game: Game (local/host) · sources[pid]: { type: 'device'|'bot'|'remote', ... }
//   you: id do jogador desta tela (-1 = nenhum) · credit: [{ pid, profileId }]
//   returnTo: tela para voltar ao sair

const cv = $('#cv'), ctx = cv.getContext('2d');
cv.width = COLS * TILE; cv.height = ROWS * TILE;
document.documentElement.style.setProperty('--board-ratio', String(COLS / ROWS));

const TERMINAL_PHASES = ['matchEnd', 'gameover', 'victory'];

function startSession(S) {
  Object.assign(S, {
    prevKeys: [], paused: false, menuOpen: false, ovKey: null, hudT: 0,
    credit: S.credit || [], credited: false, earned: 0,
  });
  App.session = S;
  $('#overlay').innerHTML = '';
  show('game');
  Sfx.init();
}

function endSession() { App.session = null; $('#overlay').innerHTML = ''; }

// Estado atual visto por esta tela
function sessionState(S) { return S.kind === 'client' ? (S.cur && S.cur.s) : S.game.s; }

// Passa as moedas ganhas na partida para os perfis dos jogadores desta tela (uma única vez)
function creditCoins(S) {
  if (!S || S.credited) return;
  const s = sessionState(S); if (!s) return;
  S.credited = true; S.earned = 0; S.earnedXp = 0;
  const finished = TERMINAL_PHASES.includes(s.phase);
  const mult = S.reward || 1;   // dificuldade dos bots: Fácil ×0,6 · Médio ×1 · Difícil ×1,8
  for (const c of S.credit) {
    const p = s.players[c.pid];
    const coins = p ? Math.round(p.coins * mult) : 0;
    if (coins > 0) { Profiles.addCoins(c.profileId, coins); S.earned += coins; }
    // experiência: o que ganhou em moedas + bônus por terminar a partida (sobe o nível da conta)
    if (p) { const xp = Math.round((p.coins + (finished ? 25 : 0) + p.kills * 10) * mult); Profiles.addXp(c.profileId, xp); S.earnedXp += xp; }
    // campanha oficial: libera o mundo da fase mais longe alcançada
    if (s.mode === 'campaign' && !s.custom) Profiles.unlockWorld(c.profileId, worldOfLevel(s.levelIndex));
    if (!finished) continue;
    // Desafio do Chefe vencido: pontos de status. Partidas normais contam para liberar o chefe.
    if (S.challenge) { if (s.phase === 'victory' && Profiles.winBoss(c.profileId)) S.bossWon = true; }
    else if (S.returnTo !== 'editor') Profiles.addMatch(c.profileId);
  }
  refreshProfileBadge();
}

function leaveGame() {
  const S = App.session;
  creditCoins(S);
  const back = S && S.returnTo;
  if (S && S.kind !== 'local') { Net.close(); App.lobby = null; App.lobbyView = null; }
  endSession();
  show(back || 'menu');
}

// ---------- laço ----------
let lastFrame = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000)); lastFrame = now;
  const t = now / 1000;
  Input.poll();
  const S = App.session;
  if (!S) { drawMenus(t); return; }
  try {
    if (S.kind === 'client') clientFrame(S, dt, now); else hostFrame(S, dt, now);
  } catch (e) { console.error(e); }
}

// Detecta o "apertou agora" de bomba, magia, pulo e troca de alvo
function edges(S, pid, r) {
  const prev = S.prevKeys[pid] || {};
  S.prevKeys[pid] = { bomb: r.bomb, spell: r.spell, jump: r.jump, target: r.target };
  return { dx: r.dx, dy: r.dy, bomb: r.bomb && !prev.bomb, spell: r.spell && !prev.spell, jump: r.jump && !prev.jump,
    cycle: !!r.target && !prev.target, pick: null };
}

// Jogador controlado pelo mouse e pelos botões da tela (o primeiro do teclado/controle desta tela)
function mousePid(S) {
  if (S.kind !== 'local') return S.you;
  return S.sources.findIndex(src => src.type === 'device');
}

// Mouse e botões na tela: clicar num personagem escolhe o alvo
function takeUi(S) {
  const u = S.ui || {}; S.ui = {};
  return u;
}

function pickAt(s, px, py) {
  let best = null, bd = 0.9;
  for (const p of s.players) if (p.alive) { const d = Math.hypot(p.x - px, p.y - 0.15 - py); if (d < bd) { bd = d; best = { k: 'p', id: p.id }; } }
  for (const e of s.enemies) if (!e.dying) { const d = Math.hypot(e.x - px, e.y - py); if (d < bd) { bd = d; best = { k: 'e', id: e.id }; } }
  return best;
}

function hostFrame(S, dt, now) {
  const g = S.game;
  if (!S.paused) {
    const inputs = [];
    S.sources.forEach((src, pid) => {
      let inp = NO_INPUT;
      if (src.type === 'device') inp = edges(S, pid, Input.read(src.device));
      else if (src.type === 'bot') inp = src.bot.update(dt);
      else if (src.type === 'remote') {
        const r = S.remote[pid], l = S.lastSeq[pid];
        if (r) {
          inp = { dx: r.dx, dy: r.dy, bomb: r.b !== l.b, spell: r.s !== l.s, jump: r.j !== l.j,
            cycle: r.c !== l.c, pick: r.pn !== l.pn ? r.pk : null };
          S.lastSeq[pid] = { b: r.b, s: r.s, j: r.j, c: r.c, pn: r.pn };
        }
      }
      inputs[pid] = { ...inp };
    });
    const u = takeUi(S), mp = mousePid(S);
    if (inputs[mp]) {
      if (u.spell) inputs[mp].spell = true;
      if (u.cycle) inputs[mp].cycle = true;
      if (u.pick) inputs[mp].pick = u.pick;
    }
    const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
    for (let i = 0; i < steps; i++) {
      g.update(dt / steps, inputs);
      if (i === 0) for (const x of inputs) if (x) { x.bomb = false; x.spell = false; x.jump = false; x.cycle = false; x.pick = null; }
    }
  }
  const evs = g.s.events.splice(0);
  for (const e of evs) Sfx.play(e);
  if (S.kind === 'host') {
    S.pending.push(...evs);
    S.sendT -= dt;
    if (S.sendT <= 0) {
      S.sendT = 1 / 20;
      Net.broadcast({ t: 'state', s: { ...g.s, events: S.pending } });
      S.pending = [];
    }
  }
  if (TERMINAL_PHASES.includes(g.s.phase)) creditCoins(S);
  Render.draw(ctx, g.s, now / 1000, S.you);
  updateUI(g.s, S, dt);
}

function clientFrame(S, dt, now) {
  const r = Input.read('any');
  const prev = S.prevKeys[0] || {};
  if (r.bomb && !prev.bomb) S.seq.b++;
  if (r.spell && !prev.spell) S.seq.s++;
  if (r.jump && !prev.jump) S.seq.j++;
  if (r.target && !prev.target) S.seq.c = (S.seq.c || 0) + 1;
  const u = takeUi(S);
  if (u.spell) S.seq.s++;
  if (u.cycle) S.seq.c = (S.seq.c || 0) + 1;
  if (u.pick) { S.seq.pn = (S.seq.pn || 0) + 1; S.seq.pk = u.pick; }
  S.prevKeys[0] = r;
  const key = [r.dx, r.dy, S.seq.b, S.seq.s, S.seq.j, S.seq.c, S.seq.pn].join(',');
  S.inT -= dt;
  if (key !== S.lastKey || S.inT <= 0) {
    Net.send({ t: 'input', dx: r.dx, dy: r.dy, b: S.seq.b, s: S.seq.s, j: S.seq.j, c: S.seq.c || 0, pn: S.seq.pn || 0, pk: S.seq.pk || null });
    S.lastKey = key; S.inT = 0.1;
  }
  if (S.cur) {
    if (TERMINAL_PHASES.includes(S.cur.s.phase)) creditCoins(S);
    Render.draw(ctx, interpState(S, now), now / 1000, S.you);
    updateUI(S.cur.s, S, dt);
  } else updateUI(null, S, dt);
}

// Suaviza o movimento entre dois pacotes recebidos do anfitrião
function interpState(S, now) {
  if (!S.prev) return S.cur.s;
  const a = Math.min(1, (now - S.cur.t) / 50);
  const P = S.prev.s, C = S.cur.s;
  const lerp = (cl, pl, kx, ky) => cl.map(o => {
    const q = pl.find(z => z.id === o.id);
    if (!q) return o;
    const dx = o[kx] - q[kx], dy = o[ky] - q[ky];
    if (Math.abs(dx) + Math.abs(dy) > 2.5) return o;
    return { ...o, [kx]: q[kx] + dx * a, [ky]: q[ky] + dy * a };
  });
  return { ...C, players: lerp(C.players, P.players, 'x', 'y'), enemies: lerp(C.enemies, P.enemies, 'x', 'y'),
    bombs: lerp(C.bombs, P.bombs, 'px', 'py'), shots: lerp(C.shots || [], P.shots || [], 'x', 'y') };
}
