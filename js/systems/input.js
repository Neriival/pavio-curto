'use strict';
// Teclado (dois esquemas) + até 4 controles (Gamepad API).

const SCHEMES = {
  kbA: { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD',
         bomb: ['Space', 'KeyF'], spell: ['KeyQ'], jump: ['KeyE'], target: ['KeyR', 'Tab'] },
  kbB: { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight',
         bomb: ['Enter', 'NumpadEnter', 'Numpad0'], spell: ['ShiftRight', 'Numpad1', 'Slash'], jump: ['ControlRight', 'Numpad2', 'Period'],
         target: ['End', 'Numpad3', 'Delete'] },
};
const DEFAULT_SCHEMES = JSON.parse(JSON.stringify(SCHEMES));

// Ações que podem ser trocadas na tela de Configurações
const ACTIONS = [
  { id: 'up', name: 'Cima', icon: '⬆️' }, { id: 'down', name: 'Baixo', icon: '⬇️' },
  { id: 'left', name: 'Esquerda', icon: '⬅️' }, { id: 'right', name: 'Direita', icon: '➡️' },
  { id: 'bomb', name: 'Bomba', icon: '💣' }, { id: 'spell', name: 'Magia', icon: '✨' },
  { id: 'target', name: 'Trocar alvo', icon: '🎯' },
];
const RESERVED_KEYS = ['Escape', 'KeyP', 'KeyM'];   // pausa e som

// Nome legível de uma tecla (KeyW → W, ArrowUp → ↑ ...)
function keyName(code) {
  if (!code) return '—';
  const map = { Space: 'Espaço', Enter: 'Enter', NumpadEnter: 'Enter (num)', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
    ShiftLeft: 'Shift esq.', ShiftRight: 'Shift dir.', ControlLeft: 'Ctrl esq.', ControlRight: 'Ctrl dir.', AltLeft: 'Alt', AltRight: 'Alt Gr',
    Tab: 'Tab', End: 'End', Home: 'Home', Delete: 'Delete', Insert: 'Insert', PageUp: 'Page Up', PageDown: 'Page Down', Backspace: 'Backspace',
    Slash: '/', Period: '.', Comma: ',', Semicolon: 'Ç', Quote: '~', BracketLeft: '´', BracketRight: '[', Backslash: ']', Minus: '-', Equal: '=', IntlRo: '/' , CapsLock: 'Caps Lock' };
  if (map[code]) return map[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return 'Num ' + code.slice(6);
  return code;
}
const keyList = k => (Array.isArray(k) ? k : [k]).filter(Boolean);

// Texto de ajuda dos controles (atualizado quando as teclas mudam)
const CONTROL_HELP = {
  kbA: '', kbB: '',
  pad: 'Analógico anda · A bomba · X magia · LB/RB troca o alvo',
};
const CONTROL_LABELS = {
  off: 'Desligado', kbA: '', kbB: '',
  pad0: 'Controle 1', pad1: 'Controle 2', pad2: 'Controle 3', pad3: 'Controle 4', cpu: 'CPU (bot)',
};
const GAME_KEYS = new Set();
function refreshControlTexts() {
  for (const id of ['kbA', 'kbB']) {
    const sc = SCHEMES[id], k = a => keyName(keyList(sc[a])[0]);
    const move = [k('up'), k('left'), k('down'), k('right')].join('');
    CONTROL_HELP[id] = `${move.length <= 4 ? move : [k('up'), k('left'), k('down'), k('right')].join(' ')} anda · ${k('bomb')} bomba · ${k('spell')} magia · ${k('target')} troca o alvo`;
    CONTROL_LABELS[id] = `Teclado ${id === 'kbA' ? 'A' : 'B'}: ${move.length <= 4 ? move : 'setas'} + ${k('bomb')}`;
  }
  GAME_KEYS.clear();
  for (const sc of Object.values(SCHEMES)) for (const a of ACTIONS) for (const c of keyList(sc[a.id])) GAME_KEYS.add(c);
}

// Teclas personalizadas salvas no navegador
const Controls = {
  KEY: 'pc_controls_v1',
  load() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(this.KEY)); } catch { }
    for (const id of Object.keys(SCHEMES)) {
      for (const a of ACTIONS) {
        const v = saved && saved[id] && saved[id][a.id];
        const list = keyList(v).filter(c => typeof c === 'string' && c.length < 30);
        if (!list.length) continue;
        SCHEMES[id][a.id] = ['up', 'down', 'left', 'right'].includes(a.id) ? list[0] : list;
      }
    }
    refreshControlTexts();
  },
  save() {
    const out = {};
    for (const id of Object.keys(SCHEMES)) { out[id] = {}; for (const a of ACTIONS) out[id][a.id] = SCHEMES[id][a.id]; }
    try { localStorage.setItem(this.KEY, JSON.stringify(out)); } catch { }
    refreshControlTexts();
  },
  // troca a tecla de uma ação; se ela já era usada em outro lugar, as duas trocam de lugar
  set(scheme, action, code) {
    if (RESERVED_KEYS.includes(code)) return false;
    const single = a => ['up', 'down', 'left', 'right'].includes(a);
    const old = keyList(SCHEMES[scheme][action])[0];
    for (const [sid, sc] of Object.entries(SCHEMES)) for (const a of ACTIONS) {
      if (sid === scheme && a.id === action) continue;
      const list = keyList(sc[a.id]);
      if (list.includes(code)) {
        const rest = list.filter(c => c !== code);
        const val = rest.length ? rest : (old ? [old] : []);
        sc[a.id] = single(a.id) ? (val[0] || null) : val;
      }
    }
    SCHEMES[scheme][action] = single(action) ? code : [code];
    this.save();
    return true;
  },
  reset(scheme) {
    SCHEMES[scheme] = JSON.parse(JSON.stringify(DEFAULT_SCHEMES[scheme]));
    this.save();
  },
};
refreshControlTexts();

const Input = {
  down: new Set(), order: [], pads: [],
  init() {
    addEventListener('keydown', e => {
      const typing = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT');
      if (typing) return;
      if (GAME_KEYS.has(e.code) && App.session) e.preventDefault();
      if (!this.down.has(e.code)) { this.down.add(e.code); this.order.push(e.code); }
    });
    addEventListener('keyup', e => {
      this.down.delete(e.code);
      this.order = this.order.filter(c => c !== e.code);
    });
    addEventListener('blur', () => { this.down.clear(); this.order = []; });
  },
  poll() {
    try { this.pads = navigator.getGamepads ? Array.from(navigator.getGamepads()) : []; } catch { this.pads = []; }
  },
  readKb(sc) {
    let dx = 0, dy = 0;
    for (let i = this.order.length - 1; i >= 0; i--) {
      const c = this.order[i];
      if (c === sc.up) { dy = -1; break; } if (c === sc.down) { dy = 1; break; }
      if (c === sc.left) { dx = -1; break; } if (c === sc.right) { dx = 1; break; }
    }
    const any = list => list.some(c => this.down.has(c));
    return { dx, dy, bomb: any(sc.bomb), spell: any(sc.spell), jump: any(sc.jump), target: any(sc.target) };
  },
  readPad(n) {
    const p = this.pads[n];
    if (!p) return { dx: 0, dy: 0, bomb: false, spell: false, jump: false, target: false };
    const b = i => !!(p.buttons[i] && p.buttons[i].pressed);
    const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
    let dx = 0, dy = 0;
    if (b(14)) dx = -1; else if (b(15)) dx = 1; else if (b(12)) dy = -1; else if (b(13)) dy = 1;
    else if (Math.max(Math.abs(ax), Math.abs(ay)) > 0.45) { if (Math.abs(ax) > Math.abs(ay)) dx = Math.sign(ax); else dy = Math.sign(ay); }
    // LB/RB trocam o alvo (a magia continua no X)
    return { dx, dy, bomb: b(0) || b(1), spell: b(2), jump: b(3), target: b(4) || b(5) || b(6) || b(7) };
  },
  read(dev) {
    if (SCHEMES[dev]) return this.readKb(SCHEMES[dev]);
    if (dev && dev.startsWith('pad')) return this.readPad(+dev.slice(3));
    // 'any': qualquer teclado ou controle (usado no online)
    const all = [this.readKb(SCHEMES.kbA), this.readKb(SCHEMES.kbB), this.readPad(0), this.readPad(1)];
    const mv = all.find(r => r.dx || r.dy) || { dx: 0, dy: 0 };
    return { dx: mv.dx, dy: mv.dy, bomb: all.some(r => r.bomb), spell: all.some(r => r.spell), jump: all.some(r => r.jump), target: all.some(r => r.target) };
  },
};
