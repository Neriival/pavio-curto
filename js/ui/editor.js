'use strict';
// Editor de fases: pinte terreno, inimigos, itens escondidos e o portal; salve, teste e compartilhe.

const EDITOR_TOOLS = [
  { group: 'Terreno', items: [
    { id: 'empty', label: 'Chão', icon: '⬜' },
    { id: 'block', label: 'Bloco', icon: '🧱' },
    { id: 'wall', label: 'Parede', icon: '⬛' },
    { id: 'exit', label: 'Portal', icon: '🌀' },
  ] },
  { group: 'Inimigos', items: Object.entries(ENEMY_TYPES).map(([id, e]) => ({ id: 'e:' + id, label: e.name, enemy: id })) },
  { group: 'Itens (escondidos no bloco)', items: Object.entries(POWERUPS).map(([id, p]) => ({ id: 'i:' + id, label: p.name.split(' (')[0], icon: p.icon })) },
];

const Ed = { level: null, tool: 'block', painting: false, erase: false, hover: null, editingId: null };

function blankLevel() {
  const grid = [];
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) grid.push(isBorder(x, y) || isPillar(x, y) ? WALL : EMPTY);
  return { name: 'Minha fase', theme: 'jardim', grid, exit: null, enemies: [], items: [] };
}

function edMsg(m, bad) { const el = $('#edMsg'); el.textContent = m || ''; el.classList.toggle('err', !!bad); }

function edLoad(level) {
  Ed.level = {
    name: level.name, theme: level.theme,
    grid: typeof level.grid === 'string' ? parseGrid(level.grid) : level.grid.slice(),
    exit: level.exit ? { ...level.exit } : null,
    enemies: (level.enemies || []).map(e => ({ ...e })), items: (level.items || []).map(i => ({ ...i })),
  };
  Ed.editingId = level.id || null;
  $('#edName').value = Ed.level.name; $('#edTheme').value = Ed.level.theme;
}

function edSerialize() {
  const L = Ed.level;
  return { id: Ed.editingId || undefined, name: ($('#edName').value.trim() || 'Minha fase').slice(0, 24), theme: $('#edTheme').value,
    cols: COLS, rows: ROWS, grid: L.grid.join(''), exit: L.exit, enemies: L.enemies, items: L.items };
}

// Aplica a ferramenta atual em uma casa
function edPaint(x, y, erase) {
  const L = Ed.level; if (!L) return;
  if (x < 0 || y < 0 || x >= COLS || y >= ROWS || isBorder(x, y)) return;
  const k = idx(x, y);
  if (SPAWN_ZONE.has(k)) { edMsg('Essa área é o ponto de início dos jogadores e fica sempre livre.', true); return; }
  const tool = erase ? 'empty' : Ed.tool;
  const dropEnemy = () => { L.enemies = L.enemies.filter(e => !(e.x === x && e.y === y)); };
  const dropItem = () => { L.items = L.items.filter(e => !(e.x === x && e.y === y)); };
  const dropExit = () => { if (L.exit && L.exit.x === x && L.exit.y === y) L.exit = null; };
  if (tool === 'empty') { L.grid[k] = EMPTY; dropEnemy(); dropItem(); dropExit(); }
  else if (tool === 'block') { L.grid[k] = BLOCK; dropEnemy(); }
  else if (tool === 'wall') { L.grid[k] = WALL; dropEnemy(); dropItem(); dropExit(); }
  else if (tool === 'exit') { if (L.grid[k] === WALL) L.grid[k] = EMPTY; L.exit = { x, y }; }
  else if (tool.startsWith('e:')) {
    const type = tool.slice(2);
    if (L.enemies.length >= 40 && !L.enemies.some(e => e.x === x && e.y === y)) return edMsg('Limite de 40 inimigos.', true);
    if (L.grid[k] === WALL || (L.grid[k] === BLOCK && !ENEMY_TYPES[type].pass)) L.grid[k] = EMPTY;
    dropEnemy(); dropItem(); L.enemies.push({ type, x, y });
  } else if (tool.startsWith('i:')) {
    L.grid[k] = BLOCK; dropEnemy(); dropItem(); L.items.push({ type: tool.slice(2), x, y });
  }
}

function edTileFromEvent(e) {
  const c = $('#edCv'), r = c.getBoundingClientRect();
  return [Math.floor((e.clientX - r.left) / r.width * COLS), Math.floor((e.clientY - r.top) / r.height * ROWS)];
}

// Desenha o editor (chamado a cada quadro quando a tela está aberta)
function drawEditor(t) {
  const L = Ed.level; if (!L) return;
  const c = $('#edCv'), x = c.getContext('2d');
  const theme = $('#edTheme').value;
  const players = SPAWNS.map(([sx, sy], i) => ({ id: i, char: CHARACTERS[i].id, x: sx + 0.5, y: sy + 0.5, alive: true, dir: 'down',
    color: PLAYER_COLORS[i], name: 'J' + (i + 1), hp: 3, maxHp: 3, invuln: 0 }));
  const enemies = L.enemies.map((e, i) => ({ id: i, type: e.type, x: e.x + 0.5, y: e.y + 0.5, dx: 0, hp: ENEMY_TYPES[e.type].hp, maxHp: ENEMY_TYPES[e.type].hp }));
  const visibleItems = L.items.filter(it => L.grid[idx(it.x, it.y)] === EMPTY).map((it, i) => ({ ...it, id: i, age: 1 }));
  Render.draw(x, { theme, grid: L.grid, exit: L.exit, exitOpen: true, powerups: visibleItems, bombs: [], flames: [], burning: [], shots: [], enemies, players }, t, -1);
  // marcas: itens/portal escondidos sob blocos, zona de início e casa sob o mouse
  x.font = emojiFont(18); x.textAlign = 'center'; x.textBaseline = 'middle';
  for (const it of L.items) if (L.grid[idx(it.x, it.y)] === BLOCK) {
    x.fillStyle = 'rgba(0,0,0,0.45)'; circ(x, it.x * TILE + 36, it.y * TILE + 36, 12);
    x.fillText(POWERUPS[it.type].icon, it.x * TILE + 36, it.y * TILE + 37);
  }
  if (L.exit && L.grid[idx(L.exit.x, L.exit.y)] === BLOCK) {
    x.fillStyle = 'rgba(0,0,0,0.45)'; circ(x, L.exit.x * TILE + 12, L.exit.y * TILE + 12, 12);
    x.fillText('🌀', L.exit.x * TILE + 12, L.exit.y * TILE + 13);
  }
  x.fillStyle = 'rgba(255,255,255,0.12)';
  for (const k of SPAWN_ZONE) x.fillRect((k % COLS) * TILE, Math.floor(k / COLS) * TILE, TILE, TILE);
  if (Ed.hover) {
    x.strokeStyle = '#ffffff'; x.lineWidth = 3;
    x.strokeRect(Ed.hover[0] * TILE + 2, Ed.hover[1] * TILE + 2, TILE - 4, TILE - 4);
  }
  // ícones dos inimigos na paleta
  $$('#edTools canvas[data-enemy]').forEach(cv => {
    const g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height);
    drawEnemy(g, { id: 1, type: cv.dataset.enemy, dx: 0, hp: 1, maxHp: 1 }, cv.width / 2, cv.height / 2 + 2, cv.width * 0.9, t);
  });
}

function renderEdTools() {
  $('#edTools').innerHTML = EDITOR_TOOLS.map(g => `<div class="tool-group"><h4>${g.group}</h4><div class="tools">${g.items.map(it =>
    `<button class="tool${it.id === Ed.tool ? ' on' : ''}" data-tool="${it.id}" title="${esc(it.label)}">
      ${it.enemy ? `<canvas width="40" height="40" data-enemy="${it.enemy}"></canvas>` : `<span class="ti">${it.icon}</span>`}
      <span>${esc(it.label)}</span></button>`).join('')}</div></div>`).join('');
}

function renderEdList() {
  const list = LevelStore.list();
  $('#edList').innerHTML = list.length ? list.map(l => `<div class="lv-row">
      <span><b>${esc(l.name)}</b> <span class="muted">· ${THEMES[l.theme] ? THEMES[l.theme].name : ''} · 👾${l.enemies.length}</span></span>
      <span class="lv-btns"><button class="btn small" data-lv="play" data-id="${l.id}">Jogar</button>
      <button class="btn small ghost" data-lv="edit" data-id="${l.id}">Editar</button>
      <button class="btn small ghost" data-lv="del" data-id="${l.id}">🗑</button></span></div>`).join('')
    : '<p class="muted">Nenhuma fase salva ainda. Desenhe uma e clique em Salvar!</p>';
}

function edSave() {
  const lv = edSerialize();
  const saved = LevelStore.put(lv);
  if (!saved) return edMsg('Não foi possível salvar (armazenamento do navegador cheio ou bloqueado).', true);
  Ed.editingId = saved.id;
  edMsg(`"${saved.name}" salva!${lv.exit ? '' : ' (Sem portal: a fase termina ao derrotar todos os inimigos.)'}`);
  renderEdList();
}

// Testa a fase atual na hora, com o perfil atual
function edTest() {
  const lv = edSerialize();
  const prof = Profiles.current();
  const game = new Game({ mode: 'campaign', levels: [lv],
    players: [{ name: prof.name, char: CHARACTERS[prof.char].id, color: PLAYER_COLORS[0], ...Profiles.loadout(prof) }] });
  startSession({ kind: 'local', game, sources: [{ type: 'device', device: 'any' }], you: 0, returnTo: 'editor', restart: edTest,
    credit: [] });
}

function initEditor() {
  const c = $('#edCv'); c.width = COLS * TILE; c.height = ROWS * TILE;
  $('#edTheme').innerHTML = Object.entries(THEMES).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('');
  App.onShow.editor = () => { if (!Ed.level) edLoad(blankLevel()); renderEdTools(); renderEdList(); };

  $('#edTools').onclick = e => { const b = e.target.closest('[data-tool]'); if (b) { Ed.tool = b.dataset.tool; renderEdTools(); edMsg(''); } };
  c.addEventListener('contextmenu', e => e.preventDefault());
  c.addEventListener('pointerdown', e => {
    Ed.painting = true; Ed.erase = e.button === 2; c.setPointerCapture(e.pointerId);
    const [x, y] = edTileFromEvent(e); edPaint(x, y, Ed.erase);
  });
  c.addEventListener('pointermove', e => {
    const [x, y] = edTileFromEvent(e); Ed.hover = [x, y];
    if (Ed.painting && !Ed.tool.startsWith('e:') && Ed.tool !== 'exit') edPaint(x, y, Ed.erase);
  });
  c.addEventListener('pointerup', () => { Ed.painting = false; });
  c.addEventListener('pointerleave', () => { Ed.hover = null; });

  $('#edNew').onclick = () => { edLoad(blankLevel()); edMsg('Nova fase em branco.'); };
  $('#edRandom').onclick = () => {
    const keep = { name: $('#edName').value, theme: $('#edTheme').value };
    const grid = generateGrid(0.55, EXTRA_WALLS_CAMPAIGN);
    const blocks = grid.map((v, k) => v === BLOCK ? k : -1).filter(k => k >= 0);
    const ex = pick(blocks);
    edLoad({ ...keep, grid, exit: { x: ex % COLS, y: Math.floor(ex / COLS) }, enemies: [], items: [] });
    Ed.editingId = null;
    edMsg('Terreno aleatório gerado: agora coloque os inimigos!');
  };
  $('#edSave').onclick = edSave;
  $('#edTest').onclick = edTest;
  $('#edExport').onclick = () => {
    const code = LevelStore.exportCode(edSerialize());
    $('#edCode').value = code;
    try { navigator.clipboard.writeText(code); edMsg('Código copiado! Mande para um amigo importar.'); } catch { edMsg('Código gerado abaixo.'); }
  };
  $('#edImport').onclick = () => {
    try { const lv = LevelStore.importCode($('#edCode').value); edLoad(lv); Ed.editingId = null; edMsg(`"${lv.name}" importada! Clique em Salvar para guardar.`); }
    catch { edMsg('Código inválido.', true); }
  };
  $('#edList').onclick = e => {
    const b = e.target.closest('[data-lv]'); if (!b) return;
    const lv = LevelStore.get(b.dataset.id); if (!lv) return;
    if (b.dataset.lv === 'edit') { edLoad(lv); edMsg(`Editando "${lv.name}".`); window.scrollTo(0, 0); }
    else if (b.dataset.lv === 'play') openSetup('campaign', { levelId: lv.id });
    else if (b.dataset.lv === 'del') {
      if (b.dataset.confirm !== '1') { b.dataset.confirm = '1'; b.textContent = 'Certeza?'; return; }
      LevelStore.remove(lv.id); if (Ed.editingId === lv.id) Ed.editingId = null; renderEdList(); edMsg('Fase excluída.');
    }
  };
}
