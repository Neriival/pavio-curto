'use strict';
// Tela de configuração da Campanha / Batalha local: quem joga, com qual controle, perfil e personagem.

const SETUP_CONTROLS = ['kbA', 'kbB', 'pad0', 'pad1', 'pad2', 'pad3'];
const MAX_PLAYERS = 4;          // o mapa tem 4 pontos de início

function openSetup(mode, preset = {}) {
  const st = App.setup;
  if (st.mode !== mode) {
    st.mode = mode;
    const cur = Profiles.current();
    st.slots = [{ control: 'kbA', char: cur.char, profile: cur.id }];   // só pessoas; bots são sorteados
    if (st.bots == null) st.bots = 3;
  }
  $('#setupTitle').textContent = mode === 'campaign' ? 'Campanha' : 'Batalha';
  $('#setupHint').textContent = mode === 'campaign'
    ? 'Escolha seu personagem. Quer jogar em co-op no mesmo computador? Adicione mais jogadores.'
    : 'Escolha seu personagem e quantos bots vão enfrentar você. Os bots têm personagens sorteados em segredo.';
  $('#battleOpts').classList.toggle('hidden', mode !== 'battle');
  $('#campOpts').classList.toggle('hidden', mode !== 'campaign');
  fillLevelSelects(preset.levelId);
  $('#setupErr').textContent = '';
  renderSetup();
  show('setup');
}

function fillLevelSelects(selectId) {
  const custom = LevelStore.list();
  const cOpts = custom.map(l => `<option value="c:${l.id}">✏️ ${esc(l.name)}</option>`).join('');
  const lv = $('#optLevels'), prev = lv.value;
  // mundos liberados: o mais longe que alguma pessoa da tela já chegou
  const unlocked = Math.max(0, ...App.setup.slots.map(s => (Profiles.get(s.profile) || {}).campWorld | 0));
  const worlds = WORLDS.map((w, k) => {
    const label = k === 0 ? `🗺️ Campanha completa (${LEVELS.length} fases)`
      : `${k <= unlocked ? '▶' : '🔒'} Mundo ${k + 1}: ${THEMES[w.theme].name} (a partir da fase ${w.from + 1})`;
    return `<option value="w:${k}"${k > unlocked ? ' disabled' : ''}>${label}</option>`;
  }).join('');
  lv.innerHTML = worlds +
    (custom.length ? `<option value="allcustom">Todas as minhas fases (${custom.length})</option>${cOpts}` : '');
  lv.value = selectId ? 'c:' + selectId : (prev && [...lv.options].some(o => o.value === prev && !o.disabled) ? prev : 'w:0');
  const ar = $('#optArena'), prevA = ar.value;
  ar.innerHTML = '<option value="random">Aleatória</option>' +
    Object.entries(THEMES).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('') + cOpts;
  if (prevA && [...ar.options].some(o => o.value === prevA)) ar.value = prevA;
}

function profileOptions(sel) {
  return Profiles.list().map(p => `<option value="${p.id}"${p.id === sel ? ' selected' : ''}>👤 ${esc(p.name)} · 💰${p.coins}</option>`).join('');
}

// Quantos bots cabem: total de participantes limitado a MAX_PLAYERS e mínimo de 2 na batalha
function botLimits() {
  const st = App.setup, humans = st.slots.length;
  return { min: humans >= 2 ? 0 : 1, max: MAX_PLAYERS - humans };
}

function renderBotSelect() {
  const st = App.setup, { min, max } = botLimits();
  st.bots = Math.max(min, Math.min(max, st.bots));
  const sel = $('#optBots');
  sel.innerHTML = '';
  for (let n = min; n <= max; n++) sel.innerHTML += `<option value="${n}"${n === st.bots ? ' selected' : ''}>${n === 0 ? 'Nenhum' : n + (n === 1 ? ' bot' : ' bots')}</option>`;
  sel.onchange = () => { st.bots = +sel.value; renderSetup(); };
  $('#botsHint').textContent = `Máximo de ${MAX_PLAYERS - st.slots.length} ${MAX_PLAYERS - st.slots.length === 1 ? 'bot' : 'bots'} (até ${MAX_PLAYERS} participantes na arena).`;
}

function renderSetup() {
  const st = App.setup, box = $('#slots');
  box.innerHTML = '';
  const used = st.slots.map(s => s.control);
  st.slots.forEach((sl, i) => {
    if (!Profiles.get(sl.profile)) sl.profile = Profiles.current().id;
    const prof = Profiles.get(sl.profile);
    const ctrl = `<label class="mini">Controle<select data-k="control">${SETUP_CONTROLS.map(k =>
      `<option value="${k}"${k === sl.control ? ' selected' : ''}${k !== sl.control && used.includes(k) ? ' disabled' : ''}>${CONTROL_LABELS[k]}</option>`).join('')}</select></label>`;
    const pf = `<label class="mini">Perfil<select data-k="profile">${profileOptions(sl.profile)}</select></label>`;
    const help = `<div class="keys">${CONTROL_HELP[sl.control.startsWith('pad') ? 'pad' : sl.control]}</div>`;
    const rm = i > 0 ? `<button class="btn small ghost" data-rm>✕ Remover jogador</button>` : '';
    const el = slotCard(PLAYER_COLORS[i], CHARACTERS[sl.char], {
      title: prof.name, tag: `J${i + 1}`, extra: ctrl + pf + help + rm,
      loadout: Profiles.loadout(prof),
      pick: d => {
        sl.char = (sl.char + d + CHARACTERS.length) % CHARACTERS.length;
        prof.char = sl.char; Profiles.save();
        renderSetup();
      },
    });
    el.querySelectorAll('select[data-k]').forEach(s => s.onchange = e => { sl[s.dataset.k] = e.target.value; renderSetup(); });
    const rb = el.querySelector('[data-rm]'); if (rb) rb.onclick = () => { st.slots.splice(i, 1); renderSetup(); };
    box.appendChild(el);
  });
  // botão para outra pessoa jogar no mesmo computador
  const addBox = $('#slotsAdd'); addBox.innerHTML = '';
  if (st.slots.length < MAX_PLAYERS) {
    const add = document.createElement('button');
    add.className = 'btn small ghost';
    add.textContent = '+ Adicionar jogador';
    add.title = 'Outra pessoa jogando no mesmo computador';
    add.onclick = () => {
      const control = SETUP_CONTROLS.find(k => !used.includes(k));
      const others = Profiles.list().filter(p => !st.slots.some(s => s.profile === p.id));
      const prof = others[0] || Profiles.current();
      st.slots.push({ control, char: prof.char || 0, profile: prof.id });
      renderSetup();
    };
    addBox.appendChild(add);
  }
  if (st.mode === 'battle') renderBotSelect();
  else fillLevelSelects();            // mundos liberados dependem dos perfis escolhidos
}

function randomLoadout(diff = 'medio') {
  // sem magia comprada a CPU usa a magia natural do personagem
  const D = BOT_LEVELS[diff] || BOT_LEVELS.medio;
  // equipamentos da CPU: cada peça de um material sorteado na faixa da dificuldade
  const gear = {}; for (const S of GEAR_SLOTS) if (Math.random() < 0.8) gear[S.id] = D.gear[0] + Math.floor(Math.random() * (D.gear[1] - D.gear[0] + 1));
  return { outfit: null, spell: Math.random() < 0.25 ? pick(SHOP_SPELLS) : null, gear, stats: D.stats,
    spellLv: D.spellLv ? Object.fromEntries(Object.keys(SPELLS).map(k => [k, D.spellLv])) : null };
}

function startLocal() {
  const st = App.setup, err = m => { $('#setupErr').textContent = m; };
  const act = st.slots.map((sl, i) => ({ ...sl, slot: i }));
  if (st.mode === 'battle') for (let b = 0; b < st.bots && act.length < MAX_PLAYERS; b++) act.push({ control: 'cpu', char: 0, slot: act.length });
  if (st.mode === 'battle' && act.length < 2) return err('A batalha precisa de pelo menos 2 participantes.');
  const devs = act.filter(a => a.control !== 'cpu').map(a => a.control);
  if (new Set(devs).size !== devs.length) return err('Dois jogadores estão usando o mesmo controle.');

  // CPUs recebem personagens sorteados, diferentes dos escolhidos pelas pessoas (e entre si)
  const taken = new Set(act.filter(a => a.control !== 'cpu').map(a => a.char));
  const pool = shuffle(CHARACTERS.map((c, k) => k).filter(k => !taken.has(k)));
  for (const a of act) if (a.control === 'cpu') {
    a.char = pool.length ? pool.pop() : pick(CHARACTERS.map((c, k) => k).filter(k => !taken.has(k)));
  }

  const diff = BOT_LEVELS[$('#optDiff').value] ? $('#optDiff').value : 'medio';
  let cpuN = 0;
  const players = act.map(a => {
    const prof = a.control === 'cpu' ? null : Profiles.get(a.profile);
    const lo = prof ? Profiles.loadout(prof) : randomLoadout(diff);
    return { name: prof ? prof.name : `CPU ${++cpuN}`, char: CHARACTERS[a.char].id, color: PLAYER_COLORS[a.slot], ...lo, bot: !prof };
  });
  const opts = { mode: st.mode, players, winsNeeded: +$('#optWins').value, roundTime: +$('#optTime').value, arena: $('#optArena').value };
  if (st.mode === 'campaign') {
    const v = $('#optLevels').value;
    if (v === 'allcustom') opts.levels = LevelStore.list();
    else if (v.startsWith('c:')) { const l = LevelStore.get(v.slice(2)); if (l) opts.levels = [l]; }
  } else if (opts.arena.startsWith('c:')) {
    const l = LevelStore.get(opts.arena.slice(2));
    if (l) { opts.arenaGrid = l.grid; opts.arenaTheme = l.theme; }
  }
  if (st.mode === 'campaign' && $('#optLevels').value.startsWith('w:')) opts.startLevel = WORLDS[+$('#optLevels').value.slice(2)].from;
  const game = new Game(opts);
  const sources = act.map((a, k) => a.control === 'cpu' ? { type: 'bot', bot: new Bot(game, k, diff) } : { type: 'device', device: a.control });
  const credit = act.map((a, k) => a.control === 'cpu' ? null : { pid: k, profileId: a.profile }).filter(Boolean);
  // contra bots, a dificuldade multiplica moedas e XP (campanha e partidas só de humanos ficam ×1)
  const reward = st.mode === 'battle' && act.some(a => a.control === 'cpu') ? BOT_LEVELS[diff].reward : 1;
  startSession({ kind: 'local', game, sources, you: -1, credit, restart: startLocal, reward, diff: BOT_LEVELS[diff].name });
}

function initSetup() {
  $('#btnStartLocal').onclick = startLocal;
  const diffHint = () => { const D = BOT_LEVELS[$('#optDiff').value]; $('#diffHint').textContent = D ? `${D.hint} Prêmio: moedas e XP ×${String(D.reward).replace('.', ',')}.` : ''; };
  $('#optDiff').onchange = diffHint;
  diffHint();
}
