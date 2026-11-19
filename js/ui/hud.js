'use strict';
// Placar no topo (HUD) e mensagens sobre o tabuleiro (contagem, vitórias, pausa…).

function updateUI(s, S, dt) {
  S.hudT -= dt;
  if (s && S.hudT <= 0) { S.hudT = 0.1; renderHud(s, S); }
  const [key, html] = overlayFor(s, S);
  if (key !== S.ovKey) { S.ovKey = key; $('#overlay').innerHTML = html; }
}

// Barra de vida do placar com o número
function hpBarHTML(hp, max) {
  const k = Math.max(0, Math.min(1, hp / max)), cls = k > 0.5 ? 'ok' : k > 0.25 ? 'mid' : 'low';
  return `<span class="hpbar ${cls}"><i style="width:${(k * 100).toFixed(1)}%"></i><em>❤ ${Math.ceil(hp)}/${max}</em></span>`;
}

function renderHud(s, S) {
  const camp = s.mode === 'campaign';
  let center;
  if (camp) {
    const left = s.enemies.filter(e => !e.dying).length;
    center = `<div class="hud-center">Fase ${s.levelIndex + 1}/${s.levelCount} · 👾 ${left}${s.exitOpen ? ' · 🌀' : ''}</div>`;
  } else if (s.sudden) center = `<div class="hud-center hot">⚠ ARENA FECHANDO</div>`;
  else {
    const t = Math.max(0, Math.ceil(s.timer));
    center = `<div class="hud-center">⏱ ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}</div>`;
  }
  const chips = s.players.map(p => {
    const c = charById(p.char), dead = camp ? p.out : !p.alive;
    const hearts = p.alive ? hpBarHTML(p.hp, p.maxHp) : '💀';
    const right = camp ? `🍀${Math.max(0, p.lives)} · ⭐${p.score}` : `🏆 ${p.wins}/${s.winsNeeded}`;
    const sp = p.spell && SPELLS[p.spell];
    const spell = sp ? `<span class="${p.spellCd > 0 ? 'cd' : 'ready'}">${sp.icon}${p.spellCd > 0 ? Math.ceil(p.spellCd) + 's' : ''}</span>` : '';
    const mount = p.def > 0 || p.block > 0 ? `<span title="defesa · bloqueio">🛡${Math.round(p.def * 100)}%${p.block ? ' ✋' + Math.round(p.block * 100) + '%' : ''}</span>` : '';
    const st = (p.frozen > 0 ? '🧊' : '') + (p.rooted > 0 ? '🌱' : '') + (p.burning > 0 ? '🔥' : '') + (p.wet > 0 ? '💦' : '');
    return `<div class="chip${dead ? ' dead' : ''}${p.id === S.you ? ' me' : ''}" style="--pc:${p.color}">
      <b>${esc(p.name)} <span class="muted">· ${c.name}</span> ${st}</b>
      <span class="hp">${hearts}</span><span>${right} · 💰${p.coins}</span>
      <span class="st">💣${p.bombs} 🔥${p.range} 👟${(p.speed + (p.gearSpeed || 0)).toFixed(1)}${p.kick ? ' 🦶' : ''}${p.shield ? ' 🛡️' : ''} ${spell} ${mount}</span></div>`;
  });
  const half = Math.ceil(chips.length / 2);
  $('#hud').innerHTML = chips.slice(0, half).join('') + center + chips.slice(half).join('');
  renderSpellBar(s, S);
}

// Botão de magia na tela + nome do alvo atual (para o jogador do mouse)
function renderSpellBar(s, S) {
  const bar = $('#spellBar'), p = s.players[mousePid(S)];
  const sp = p && SPELLS[p.spell];
  if (!sp || !p.alive || s.phase !== 'play') { bar.classList.add('hidden'); return; }
  bar.classList.remove('hidden');
  const o = p.tgt && (p.tgt.k === 'p' ? s.players[p.tgt.id] : s.enemies.find(e => e.id === p.tgt.id));
  const tname = !o ? 'ninguém' : p.tgt.k === 'p' ? esc(o.name) : esc(ENEMY_TYPES[o.type].name || 'inimigo');
  const ready = p.spellCd <= 0;
  const key = `${p.spell}|${p.spellLv}|${ready ? 'r' : Math.ceil(p.spellCd)}|${tname}`;
  if (bar.dataset.key === key) return;
  bar.dataset.key = key;
  $('#btnSpell').innerHTML = `${sp.icon} ${esc(sp.name)} <span class="muted">Nv.${p.spellLv || 1}</span> ${ready ? '<b>pronta!</b>' : `<span class="muted">${Math.ceil(p.spellCd)}s</span>`}`;
  $('#btnSpell').classList.toggle('ready', ready);
  $('#spellTarget').innerHTML = `🎯 Alvo: <b>${tname}</b>`;
}

const ovPass = html => `<div class="ov pass">${html}</div>`;
const ovPanel = (html, btns) => `<div class="ov panel">${html}<div class="btns">${btns.map(([a, l], i) =>
  `<button class="btn${i ? ' ghost' : ''}" data-a="${a}">${l}</button>`).join('')}</div></div>`;

function endButtons(S) {
  if (S.challenge) return S.bossWon ? [['stats', 'Distribuir pontos'], ['quit', 'Menu principal']]
    : [['again', 'Tentar de novo'], ['quit', 'Menu principal']];
  if (S.kind === 'local') return S.returnTo === 'editor'
    ? [['again', 'Testar de novo'], ['quit', 'Voltar ao editor']]
    : [['again', 'Jogar de novo'], ['quit', 'Menu principal']];
  if (S.kind === 'host') return [['toLobby', 'Voltar à sala'], ['quit', 'Encerrar sala']];
  return [['quit', 'Sair da sala']];
}

function scoreTable(s, key) {
  const rows = [...s.players].sort((a, b) => b[key] - a[key])
    .map(p => `<tr><td style="color:${p.color}">●</td><td>${esc(p.name)} <span class="muted">(${charById(p.char).name})</span></td>
      <td class="n">${p[key]}${key === 'wins' ? ' 🏆' : ' pts'}</td><td class="n coin">+${p.coins} 💰</td></tr>`);
  return `<table>${rows.join('')}</table>`;
}

function earnedLine(S) {
  if (!S.credit.length) return '';
  const bonus = S.reward && S.reward !== 1 ? ` <small>(${esc(S.diff || '')} ×${String(S.reward).replace('.', ',')})</small>` : '';
  return `<div class="sub coin">💰 +${S.earned} moedas e ⭐ +${S.earnedXp || 0} XP para ${S.credit.length > 1 ? 'os perfis' : 'seu perfil'}!${bonus}</div>`;
}

function overlayFor(s, S) {
  if (S.closed) return ['closed', ovPanel(`<div class="big" style="font-size:42px">Conexão encerrada</div><div class="sub">${esc(S.closed)}</div>`, [['quit', 'Voltar ao menu']])];
  if (!s) return ['wait', ovPass('<div class="sub">Aguardando o anfitrião…</div>')];
  if (S.paused) return ['paused', ovPanel('<div class="big">Pausado</div>', [['resume', 'Continuar'], ['quit', 'Sair']])];
  if (S.menuOpen) return ['menuOpen', ovPanel('<div class="big" style="font-size:42px">Sair da partida?</div><div class="sub">O jogo continua rodando para os outros.</div>', [['resume', 'Voltar ao jogo'], ['quit', 'Sair']])];
  const name = id => { const p = s.players[id]; return p ? (p.id === S.you ? 'Você' : p.name) : '?'; };
  switch (s.phase) {
    case 'intro':
      return ['intro' + s.levelIndex, ovPass(`<div class="big pop">${esc(s.message)}</div><div class="sub">Derrote os inimigos e encontre o portal 🌀</div>`)];
    case 'countdown': {
      const n = Math.max(1, Math.ceil(s.phaseT));
      return ['cd' + s.round + '-' + n, ovPass(`<div class="sub">${esc(s.message)}</div><div class="big pop">${n}</div>`)];
    }
    case 'play':
      if (s.sudden && s.time - s.suddenAt < 2.5) return ['sudden', ovPass('<div class="big pop">MORTE SÚBITA!</div>')];
      if (s.time - s.playAt < 0.8) return ['go' + s.round + s.levelIndex, ovPass('<div class="big pop">JÁ!</div>')];
      if (s.exitOpen && s.time - s.openAt < 2) return ['open' + s.levelIndex, ovPass(`<div class="big pop" style="font-size:44px">${s.exit ? 'Portal aberto! 🌀' : 'Inimigos derrotados!'}</div>`)];
      return ['', ''];
    case 'roundEnd':
      return ['re' + s.round, ovPass(s.winner >= 0
        ? `<div class="big pop" style="color:${s.players[s.winner].color}">${esc(name(s.winner))} venceu a rodada!</div>`
        : '<div class="big pop">Empate!</div>')];
    case 'clear':
      return ['clear' + s.levelIndex, ovPass('<div class="big pop">Fase concluída!</div><div class="sub">+1000 pontos e +40 💰 para quem sobreviveu</div>')];
    case 'matchEnd':
      return ['match', ovPanel(`<div class="big">🏆 ${esc(name(s.winner))} venceu!</div>${scoreTable(s, 'wins')}${earnedLine(S)}`, endButtons(S))];
    case 'gameover':
      if (s.challenge) return ['over', ovPanel(`<div class="big">O chefe venceu…</div><div class="sub">Sem problema: o desafio continua liberado. Distribua seus pontos e tente de novo!</div>${earnedLine(S)}`, endButtons(S))];
      return ['over', ovPanel(`<div class="big">Fim de jogo</div><div class="sub">Chegou até a fase ${s.levelIndex + 1}</div>${scoreTable(s, 'score')}${earnedLine(S)}`, endButtons(S))];
    case 'victory':
      if (s.challenge) return ['win', ovPanel(`<div class="big">Chefe derrotado! 👑</div><div class="sub coin">+${BOSS_POINTS} pontos de status e +${BOSS_COINS} 💰</div>${earnedLine(S)}`, endButtons(S))];
      return ['win', ovPanel(`<div class="big">Vitória! 🎉</div><div class="sub">${s.custom ? 'Fase personalizada concluída!' : 'O Rei Magma foi derrotado!'}</div>${scoreTable(s, 'score')}${earnedLine(S)}`, endButtons(S))];
  }
  return ['', ''];
}

function togglePause() {
  const S = App.session; if (!S || S.closed) return;
  const s = sessionState(S);
  if (s && TERMINAL_PHASES.includes(s.phase)) return;
  if (S.kind === 'local') S.paused = !S.paused; else S.menuOpen = !S.menuOpen;
}
function toggleMute() { const m = Sfx.toggle(); $('#btnMute').textContent = m ? '🔇 Som (M)' : '🔊 Som (M)'; }

function initHud() {
  $('#overlay').addEventListener('click', e => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    const S = App.session;
    switch (b.dataset.a) {
      case 'resume': if (S) { S.paused = false; S.menuOpen = false; } break;
      case 'again': creditCoins(S); if (S.restart) S.restart(); break;
      case 'quit': leaveGame(); break;
      case 'toLobby': creditCoins(S); hostBackToLobby(); break;
      case 'stats': creditCoins(S); endSession(); show('stats'); break;
    }
  });
  addEventListener('keydown', e => {
    if (e.target && e.target.tagName === 'INPUT') return;
    if (!App.session) return;
    if (e.code === 'Escape' || e.code === 'KeyP') togglePause();
    if (e.code === 'KeyM') toggleMute();
  });
  // magia pelos botões da tela e alvo escolhido com clique no personagem
  const ui = () => { const S = App.session; if (S) S.ui = S.ui || {}; return S && S.ui; };
  $('#btnSpell').onclick = () => { const u = ui(); if (u) u.spell = true; };
  $('#btnTarget').onclick = () => { const u = ui(); if (u) u.cycle = true; };
  $('#cv').addEventListener('mousedown', e => {
    const S = App.session, u = ui(); if (!S || !u) return;
    const s = S.kind === 'client' ? S.cur && S.cur.s : S.game.s; if (!s) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width * COLS, py = (e.clientY - r.top) / r.height * ROWS;
    const t = pickAt(s, px, py);
    if (t) { u.pick = t; if (e.button === 2 || e.shiftKey) u.spell = true; }
  });
  $('#cv').addEventListener('contextmenu', e => e.preventDefault());
  $('#btnPause').onclick = togglePause;
  $('#btnMute').onclick = toggleMute;
  if (Sfx.muted) $('#btnMute').textContent = '🔇 Som (M)';
}
