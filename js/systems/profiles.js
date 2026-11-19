'use strict';
// Perfis de jogador salvos no navegador: nome, moedas, itens comprados e itens equipados.
// Chave de item: "<categoria>:<id>", ex.: "spell:gelo", "hat:coroa", "gear:armor:5" (armadura de ferro).

const Profiles = {
  KEY: 'pc_profiles_v1',
  data: null,

  load() {
    try { this.data = JSON.parse(localStorage.getItem(this.KEY)); } catch { this.data = null; }
    if (!this.data || !Array.isArray(this.data.list) || !this.data.list.length) {
      this.data = { current: 'p1', list: [this.blank('p1', 'Jogador')] };
    }
    for (const p of this.data.list) {
      p.owned = Array.isArray(p.owned) ? p.owned : [];
      p.equip = Object.assign({ hat: null, face: null, skin: null, spell: null }, p.equip || {});
      p.coins = Math.max(0, p.coins | 0);
      p.char = p.char | 0;
      // evolução da conta (js/data/progress.js)
      p.stats = cleanStats(p.stats);
      p.matches = Math.max(0, p.matches | 0);
      p.bossWins = Math.max(0, p.bossWins | 0);
      p.points = Math.max(0, p.points | 0);
      p.campWorld = Math.max(0, Math.min(WORLDS.length - 1, p.campWorld | 0));   // mundo mais longe alcançado
      p.spellLv = this.cleanSpellLv(p.spellLv);                                   // nível de cada magia
      // equipamentos (js/data/equipment.js), experiência e vida comprada
      p.gear = cleanGear(p.gear);
      p.xp = Math.max(0, p.xp | 0);
      p.lifeLv = Math.max(0, Math.min(LIFE_MAX_LV, p.lifeLv | 0));
      // as montarias saíram do jogo: devolve as moedas de quem tinha comprado
      const mounts = p.owned.filter(k => k.startsWith('mount:'));
      if (mounts.length) {
        p.coins += mounts.reduce((n, k) => n + (OLD_MOUNT_PRICES[k.slice(6)] || 0), 0);
        p.owned = p.owned.filter(k => !k.startsWith('mount:'));
      }
      delete p.equip.mount;
    }
    if (!this.get(this.data.current)) this.data.current = this.data.list[0].id;
    this.save();
  },
  save() { try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch { } },
  blank(id, name) {
    return { id, name, coins: START_COINS, owned: [], char: 0,
      equip: { hat: null, face: null, skin: null, spell: null },
      stats: cleanStats(null), matches: 0, bossWins: 0, points: 0, campWorld: 0, spellLv: this.cleanSpellLv(null),
      gear: cleanGear(null), xp: 0, lifeLv: 0 };
  },
  // ---------- nível da conta e equipamentos ----------
  level(p) { return levelFromXp(p.xp).lv; },
  addXp(id, n) { const p = this.get(id); if (p && n > 0) { p.xp += Math.round(n); this.save(); } },
  gearKey: (slot, tier) => `gear:${slot}:${tier}`,
  buyGear(p, slot, tier) {
    const T = GEAR_TIERS[tier];
    if (!T || this.level(p) < T.lvl) return 'nivel';
    if (!this.buy(p, this.gearKey(slot, tier), gearPrice(tier))) return 'moedas';
    p.gear[slot] = tier; this.save();
    return 'ok';
  },
  equipGear(p, slot, tier) {
    if (tier != null && !this.owns(p, this.gearKey(slot, tier))) return false;
    p.gear[slot] = tier; this.save(); return true;
  },
  // vida extra comprada na loja
  buyLife(p) {
    if (p.lifeLv >= LIFE_MAX_LV) return false;
    const cost = lifeUpgradeCost(p.lifeLv);
    if (p.coins < cost) return false;
    p.coins -= cost; p.lifeLv++; this.save(); return true;
  },
  // vida total e atributos que o perfil leva para a partida com um personagem
  combatStats(p, c) {
    const g = gearTotals(p.gear);
    return { hp: c.hp + (p.stats.hp | 0) * STATS.hp.per + p.lifeLv * LIFE_STEP + g.hp, def: g.def, block: g.block,
      speed: c.speed + (p.stats.speed | 0) * STATS.speed.per + g.speed };
  },
  cleanSpellLv(o) {
    const out = {};
    for (const k of Object.keys(SPELLS)) out[k] = Math.max(1, Math.min(SPELL_MAX_LV, (o && o[k]) | 0 || 1));
    return out;
  },
  // sobe 1 nível da magia (vale para a natural e para a comprada)
  upgradeSpell(p, type) {
    const lv = p.spellLv[type];
    if (!SPELLS[type] || lv >= SPELL_MAX_LV) return false;
    const cost = spellUpgradeCost(lv);
    if (p.coins < cost) return false;
    p.coins -= cost; p.spellLv[type] = lv + 1; this.save();
    return true;
  },

  list() { return this.data.list; },
  get(id) { return this.data.list.find(p => p.id === id) || null; },
  current() { return this.get(this.data.current) || this.data.list[0]; },
  setCurrent(id) { if (this.get(id)) { this.data.current = id; this.save(); } },

  create(name) {
    const id = 'p' + Date.now().toString(36) + Math.floor(Math.random() * 1000);
    const p = this.blank(id, this.cleanName(name));
    this.data.list.push(p); this.data.current = id; this.save();
    return p;
  },
  rename(p, name) { p.name = this.cleanName(name); this.save(); },
  remove(p) {
    if (this.data.list.length <= 1) return false;
    this.data.list = this.data.list.filter(o => o !== p);
    if (this.data.current === p.id) this.data.current = this.data.list[0].id;
    this.save(); return true;
  },
  cleanName(n) { return String(n || 'Jogador').replace(/[<>]/g, '').trim().slice(0, 10) || 'Jogador'; },

  owns(p, key) { return p.owned.includes(key); },
  buy(p, key, price) {
    if (this.owns(p, key) || p.coins < price) return false;
    p.coins -= price; p.owned.push(key); this.save();
    return true;
  },
  // slot: hat | face | skin | spell | mount — id null tira o item
  equip(p, slot, id) {
    if (id && !this.owns(p, slot + ':' + id)) return false;
    p.equip[slot] = id; this.save();
    return true;
  },
  addCoins(id, n) {
    const p = this.get(id);
    if (!p || !(n > 0)) return;
    p.coins += Math.round(n); this.save();
  },

  // ---------- evolução da conta ----------
  freePoints(p) { return p.points - statPointsUsed(p.stats); },
  statUp(p, k) {
    if (!STATS[k] || this.freePoints(p) <= 0 || p.stats[k] >= STATS[k].max) return false;
    p.stats[k]++; this.save(); return true;
  },
  statDown(p, k) {
    if (!STATS[k] || p.stats[k] <= 0) return false;
    p.stats[k]--; this.save(); return true;
  },
  resetStats(p) { p.stats = cleanStats(null); this.save(); },
  // libera o mundo w da campanha (para poder começar dele depois)
  unlockWorld(id, w) {
    const p = this.get(id);
    if (p && w > p.campWorld) { p.campWorld = Math.min(WORLDS.length - 1, w); this.save(); }
  },
  bossReady(p) { return p.matches >= MATCHES_PER_BOSS; },
  addMatch(id) { const p = this.get(id); if (p) { p.matches++; this.save(); } },
  winBoss(id) {
    const p = this.get(id); if (!p || !this.bossReady(p)) return false;
    p.matches -= MATCHES_PER_BOSS; p.bossWins++; p.points += BOSS_POINTS; p.coins += BOSS_COINS;
    this.save(); return true;
  },

  // O que vai para dentro da partida
  outfitOf(p) { return p ? { hat: p.equip.hat, face: p.equip.face, skin: p.equip.skin } : null; },
  loadout(p) {
    return p ? { outfit: this.outfitOf(p), spell: p.equip.spell, stats: cleanStats(p.stats), spellLv: { ...p.spellLv },
        gear: cleanGear(p.gear), lifeLv: p.lifeLv }
      : { outfit: null, spell: null, stats: null, spellLv: null, gear: null, lifeLv: 0 };
  },
};
