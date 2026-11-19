'use strict';
// Fases criadas no editor, salvas no navegador. Também exporta/importa como código de texto.
// Formato: { id, name, theme, grid: "0120…" (COLS*ROWS dígitos), exit: {x,y}|null,
//            enemies: [{type,x,y}], items: [{type,x,y}], cols, rows }

const LevelStore = {
  KEY: 'pc_levels_v1',
  list() {
    try {
      const l = JSON.parse(localStorage.getItem(this.KEY));
      return Array.isArray(l) ? l.filter(v => v && v.cols === COLS && v.rows === ROWS) : [];
    } catch { return []; }
  },
  saveAll(list) { try { localStorage.setItem(this.KEY, JSON.stringify(list)); return true; } catch { return false; } },
  get(id) { return this.list().find(l => l.id === id) || null; },
  put(level) {
    const list = this.list();
    if (!level.id) level.id = 'L' + Date.now().toString(36);
    const i = list.findIndex(l => l.id === level.id);
    if (i >= 0) list[i] = level; else list.push(level);
    return this.saveAll(list) ? level : null;
  },
  remove(id) { this.saveAll(this.list().filter(l => l.id !== id)); },

  exportCode(level) {
    const { id, ...rest } = level;
    return 'PC1:' + btoa(unescape(encodeURIComponent(JSON.stringify(rest))));
  },
  importCode(code) {
    const raw = String(code || '').trim().replace(/^PC1:/, '');
    const lv = JSON.parse(decodeURIComponent(escape(atob(raw))));
    if (!lv || typeof lv.grid !== 'string' || lv.cols !== COLS || lv.rows !== ROWS) throw new Error('formato');
    lv.name = String(lv.name || 'Fase importada').slice(0, 24);
    lv.enemies = (lv.enemies || []).filter(e => ENEMY_TYPES[e.type]);
    lv.items = (lv.items || []).filter(e => POWERUPS[e.type]);
    if (!THEMES[lv.theme]) lv.theme = 'jardim';
    delete lv.id;
    return lv;
  },
};
