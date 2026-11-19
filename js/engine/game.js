'use strict';
// Simulação do jogo. Todo o estado jogável fica em `game.s` (objeto JSON puro),
// para que o anfitrião online possa enviá-lo aos outros jogadores.

const ASSIST = 0.28;           // tolerância para "deslizar" nas quinas (helpers da grade em engine/grid.js)

class Game {
  // opts: { mode: 'campaign'|'battle', players: [{name, char, color, spell, outfit}],
  //         winsNeeded, roundTime, arena, arenaGrid, levels }
  constructor(opts) {
    this.opts = opts;
    this.levels = opts.levels && opts.levels.length ? opts.levels : LEVELS;
    this.uid = 1;
    this.hidden = {};
    const campaign = opts.mode === 'campaign';
    this.s = {
      mode: opts.mode, theme: 'jardim', grid: [],
      players: opts.players.map((p, i) => ({
        id: i, name: p.name, char: p.char, color: p.color || PLAYER_COLORS[i],
        // magia comprada na loja; sem ela, vale a magia natural do personagem
        spell: SPELLS[p.spell] ? p.spell : (charById(p.char).spell || null), outfit: p.outfit || null,
        bot: !!p.bot, tgt: null, wet: 0, stats: cleanStats(p.stats),   // pontos de status da conta
        spellLv: 1,
        // equipamentos ({ helmet: nível do material, ... }) e vida comprada na loja
        gear: cleanGear(p.gear), lifeLv: Math.max(0, Math.min(LIFE_MAX_LV, p.lifeLv | 0)),
        def: 0, block: 0, gearSpeed: 0,
        mount: null, mounted: false, jump: null,      // montarias saíram do jogo
        x: 1.5, y: 1.5, alive: true, dying: 0, out: false,
        lives: campaign ? (opts.lives || 3) : 1, wins: 0, score: 0, coins: 0, kills: 0,
        hp: 100, maxHp: 100, bombs: 1, range: 2, speed: 3, kick: false, shield: false, invuln: 0,
        spellCd: 0, frozen: 0, rooted: 0, burning: 0, burnBy: -1,
        dir: 'down', moving: false,
      })),
      bombs: [], flames: [], burning: [], enemies: [], powerups: [], shots: [], meteors: [], impacts: [],
      exit: null, exitOpen: false,
      phase: 'intro', phaseT: 0, time: 0, playAt: -99, openAt: -99,
      timer: 0, roundTime: opts.roundTime || 120,
      sudden: false, suddenIdx: 0, suddenT: 0, suddenAt: 0, endPending: null,
      round: 0, winsNeeded: opts.winsNeeded || 3,
      levelIndex: 0, levelCount: this.levels.length, custom: !!(opts.levels && opts.levels.length),
      challenge: !!opts.challenge,             // Desafio do Chefe
      winner: -1, message: '', events: [],
    };
    // startLevel: começar a campanha a partir de outra fase (mundo já liberado)
    this.firstLevel = Math.max(0, Math.min(this.levels.length - 1, opts.startLevel | 0));
    // nível da magia que cada um vai usar (opts.players[i].spellLv = { tipo: nível })
    this.s.players.forEach((p, i) => {
      const lv = p.spell && opts.players[i].spellLv ? opts.players[i].spellLv[p.spell] | 0 : 1;
      p.spellLv = Math.max(1, Math.min(SPELL_MAX_LV, lv || 1));
    });
    if (campaign) this.startLevel(this.firstLevel); else this.startRound();
  }

  // ---------- utilidades ----------
  ev(name) { this.s.events.push(name); }
  tile(x, y) { return (x < 0 || y < 0 || x >= COLS || y >= ROWS) ? WALL : this.s.grid[idx(x, y)]; }
  bombAt(x, y) {
    for (const b of this.s.bombs) if (Math.floor(b.px) === x && Math.floor(b.py) === y) return b;
    return null;
  }
  powerupAt(x, y) { return this.s.powerups.find(p => p.x === x && p.y === y) || null; }
  canPass(x, y, passSoft) {
    const t = this.tile(x, y);
    if (t === WALL) return false;
    if ((t === BLOCK || t === BURN) && !passSoft) return false;
    return !this.bombAt(x, y);
  }
  // Direção até um alvo na mesma linha/coluna, sem paredes nem blocos no caminho
  lineDir(x, y, targets, range) {
    for (const o of targets) {
      const ox = Math.floor(o.x), oy = Math.floor(o.y);
      if (ox !== x && oy !== y) continue;
      const n = Math.abs(ox - x) + Math.abs(oy - y);
      if (n === 0 || n > range) continue;
      const dx = Math.sign(ox - x), dy = Math.sign(oy - y);
      let clear = true;
      for (let i = 1; i < n; i++) if (this.tile(x + dx * i, y + dy * i) !== EMPTY) { clear = false; break; }
      if (clear) return [dx, dy];
    }
    return null;
  }

  // ---------- montagem de mapas ----------
  buildMap(density, extraWalls) {
    this.s.grid = generateGrid(density, extraWalls);
  }

  speedOf(p) {
    const v = p.speed + (p.gearSpeed || 0);       // botas dão velocidade
    return p.wet > 0 ? v * 0.5 : v;               // encharcado anda na metade da velocidade
  }

  clearWorld() {
    const s = this.s;
    s.bombs = []; s.flames = []; s.burning = []; s.enemies = []; s.powerups = []; s.shots = [];
    s.meteors = []; s.impacts = []; s.popups = [];
    s.exit = null; s.exitOpen = false; this.hidden = {};
  }

  applyCharStats(p) {
    const c = charById(p.char);
    const st = p.stats || {};                     // + pontos de status da conta
    p.bombs = Math.min(MAX_BOMBS, c.bombs + (st.bombs | 0) * STATS.bombs.per);
    p.range = Math.min(MAX_RANGE, c.range + (st.range | 0) * STATS.range.per);
    p.speed = c.speed + (st.speed | 0) * STATS.speed.per;
    p.kick = c.kick; p.shield = false;
    // vida = personagem + pontos de status + vida comprada na loja + armadura
    const g = gearTotals(p.gear);
    p.maxHp = c.hp + (st.hp | 0) * STATS.hp.per + (p.lifeLv | 0) * LIFE_STEP + g.hp; p.hp = p.maxHp;
    p.def = g.def; p.block = g.block; p.gearSpeed = g.speed;
  }

  clearStatus(p) {
    p.frozen = 0; p.rooted = 0; p.burning = 0; p.burnBy = -1; p.spellCd = 0; p.wet = 0; p.tgt = null;
    p.burnDmg = 0; p.iceDmg = 0; p.iceBy = -1; p.rootDmg = 0; p.rootBy = -1;   // dano guardado para o fim do efeito
  }

  placePlayer(p) {
    const [sx, sy] = SPAWNS[p.id];
    p.x = sx + 0.5; p.y = sy + 0.5; p.alive = true; p.dying = 0; p.dir = 'down'; p.moving = false;
    p.hp = p.maxHp; this.clearStatus(p);
    p.mounted = false; p.jump = null; p.regenT = 0;
  }

  startRound() {
    const s = this.s;
    s.round++;
    const arena = this.opts.arena;
    s.theme = THEMES[arena] ? arena : pick(Object.keys(THEMES));
    this.clearWorld();
    if (this.opts.arenaGrid) { s.grid = parseGrid(this.opts.arenaGrid); if (this.opts.arenaTheme) s.theme = this.opts.arenaTheme; }
    else this.buildMap(0.7, EXTRA_WALLS_BATTLE);
    for (const p of s.players) { this.applyCharStats(p); this.placePlayer(p); p.invuln = 0; p.coins += 5; }
    s.phase = 'countdown'; s.phaseT = 3; s.timer = s.roundTime;
    s.sudden = false; s.suddenIdx = 0; s.suddenT = 0; s.endPending = null; s.winner = -1;
    s.message = `Rodada ${s.round}`;
    this.ev('tick');
  }

  startLevel(i) {
    const s = this.s, L = this.levels[i];
    s.levelIndex = i; s.theme = THEMES[L.theme] ? L.theme : 'jardim';
    this.clearWorld();
    const cx = Math.floor(COLS / 2), cy = Math.floor(ROWS / 2);
    if (L.grid) {
      // fase criada no editor
      s.grid = parseGrid(L.grid);
      if (L.exit) {
        s.exit = { x: L.exit.x, y: L.exit.y };
        if (s.grid[idx(L.exit.x, L.exit.y)] === WALL) s.grid[idx(L.exit.x, L.exit.y)] = EMPTY;
      }
      for (const it of L.items || []) {
        if (!POWERUPS[it.type]) continue;
        const k = idx(it.x, it.y);
        if (s.grid[k] === BLOCK) this.hidden[k] = it.type;
        else if (s.grid[k] === EMPTY) this.addPowerup(it.x, it.y, it.type, 1);
      }
    } else {
      this.buildMap(L.density, EXTRA_WALLS_CAMPAIGN);
      if (L.boss) for (let y = cy - 2; y <= cy + 2; y++) for (let x = cx - 2; x <= cx + 2; x++) {
        if (!isPillar(x, y)) s.grid[idx(x, y)] = EMPTY;
      }
      const blocks = shuffle(s.grid.map((t, k) => t === BLOCK ? k : -1).filter(k => k >= 0));
      if (!L.noExit) {                 // sem portal: a fase termina ao derrotar todos
        const ex = blocks.pop();
        s.exit = { x: ex % COLS, y: Math.floor(ex / COLS) };
      }
      for (const type of L.powerups) { if (!blocks.length) break; this.hidden[blocks.pop()] = type; }
    }
    for (const p of s.players) {
      if (p.out) continue;
      if (i === this.firstLevel) this.applyCharStats(p);
      this.placePlayer(p); p.invuln = 2;
    }
    if (Array.isArray(L.enemies)) {
      for (const e of L.enemies) {
        if (!ENEMY_TYPES[e.type] || this.tile(e.x, e.y) === WALL) continue;
        if (!ENEMY_TYPES[e.type].pass && s.grid[idx(e.x, e.y)] === BLOCK) s.grid[idx(e.x, e.y)] = EMPTY;
        this.addEnemy(e.type, e.x, e.y);
      }
    } else {
      const starts = s.players.map(p => SPAWNS[p.id]);
      const cand = [];
      for (let y = 1; y < ROWS - 1; y++) for (let x = 1; x < COLS - 1; x++) {
        if (s.grid[idx(x, y)] !== EMPTY) continue;
        if (starts.every(([sx, sy]) => Math.abs(sx - x) + Math.abs(sy - y) >= 6)) cand.push([x, y]);
      }
      shuffle(cand);
      for (const [type, n] of Object.entries(L.enemies)) {
        for (let k = 0; k < n; k++) {
          if (ENEMY_TYPES[type].boss) {
            const b = this.addEnemy(type, cx, cy);
            if (L.bossHp) { b.hp = L.bossHp; b.maxHp = L.bossHp; }
            continue;
          }
          const c = cand.pop(); if (c) this.addEnemy(type, c[0], c[1]);
        }
      }
    }
    s.phase = 'intro'; s.phaseT = 2.6;
    s.message = L.name ? L.name : L.boss ? `👑 Fase ${i + 1} — ${L.title || 'O Rei Magma!'}` : `Fase ${i + 1} — ${L.title || THEMES[s.theme].name}`;
    this.ev('tick');
  }

  addEnemy(type, x, y, spawnT = 0.6) {
    const T = ENEMY_TYPES[type];
    const e = { id: this.uid++, type, x: x + 0.5, y: y + 0.5, tx: x, ty: y, fx: x, fy: y, dx: 0, dy: 0,
      hp: T.hp, maxHp: T.hp, invuln: 0, dying: 0, spawnT, timer: rnd(4, 7), cast: rnd(2, 4),
      frozen: 0, rooted: 0, burning: 0, burnBy: -1 };
    this.s.enemies.push(e);
    return e;
  }

  // ---------- laço principal ----------
  update(dt, inputs) {
    const s = this.s;
    s.time += dt;
    switch (s.phase) {
      case 'intro':
      case 'countdown': {
        const before = Math.ceil(s.phaseT);
        s.phaseT -= dt;
        if (s.phase === 'countdown' && s.phaseT > 0 && Math.ceil(s.phaseT) !== before) this.ev('tick');
        for (const pu of s.powerups) pu.age += dt;
        if (s.phaseT <= 0) { s.phase = 'play'; s.playAt = s.time; this.ev('go'); }
        return;
      }
      case 'play':
        this.world(dt, inputs);
        this.checks(dt);
        return;
      case 'roundEnd':
        this.world(dt, null);
        s.phaseT -= dt;
        if (s.phaseT <= 0) {
          const champ = s.players.find(p => p.wins >= s.winsNeeded);
          if (champ) { s.phase = 'matchEnd'; s.winner = champ.id; champ.coins += 60; this.ev('win'); }
          else this.startRound();
        }
        return;
      case 'clear':
        s.phaseT -= dt;
        if (s.phaseT <= 0) {
          if (s.levelIndex + 1 < this.levels.length) this.startLevel(s.levelIndex + 1);
          else {
            s.phase = 'victory'; this.ev('win');
            for (const p of s.players) if (!p.out) p.coins += s.custom ? 20 : 150;
          }
        }
        return;
      default: return; // matchEnd / gameover / victory
    }
  }

  world(dt, inputs) {
    this.updatePlayers(dt, inputs);
    this.updateBombs(dt);
    this.updateBurning(dt);
    this.updateFlames(dt);
    this.updateShots(dt);
    this.updateMeteors(dt);
    this.updateEnemies(dt);
    this.contact();
    for (const pu of this.s.powerups) pu.age += dt;
    if (this.s.sudden) this.updateSudden(dt);
  }

  checks(dt) {
    const s = this.s;
    if (s.mode === 'battle') {
      s.timer -= dt;
      if (s.timer <= 0 && !s.sudden) {
        s.timer = 0; s.sudden = true; s.suddenAt = s.time; s.suddenT = 0; this.ev('hurry');
      }
      const alive = s.players.filter(p => p.alive);
      if (alive.length <= 1 && s.endPending === null) s.endPending = 0.8;
      if (s.endPending !== null) {
        s.endPending -= dt;
        if (s.endPending <= 0) {
          s.endPending = null;
          const al = s.players.filter(p => p.alive);
          if (al.length <= 1) {
            s.winner = al.length ? al[0].id : -1;
            if (s.winner >= 0) { s.players[s.winner].wins++; s.players[s.winner].coins += 25; }
            s.phase = 'roundEnd'; s.phaseT = 3.2;
            this.ev(s.winner >= 0 ? 'roundwin' : 'draw');
          }
        }
      }
    } else {
      const left = s.enemies.filter(e => !e.dying).length;
      if (!s.exitOpen && left === 0) { s.exitOpen = true; s.openAt = s.time; this.ev('open'); }
      const exitReady = s.exit && this.tile(s.exit.x, s.exit.y) === EMPTY;
      const onExit = exitReady && s.players.some(p => p.alive && Math.floor(p.x) === s.exit.x && Math.floor(p.y) === s.exit.y);
      if (s.exitOpen && (onExit || !s.exit)) {
        for (const p of s.players) if (p.alive) { p.score += 1000; p.coins += 40; }
        s.phase = 'clear'; s.phaseT = 2.8; this.ev('clear');
        return;
      }
      if (s.players.every(p => p.out)) { s.phase = 'gameover'; this.ev('lose'); }
    }
  }

  // ---------- jogadores ----------
  updatePlayers(dt, inputs) {
    const s = this.s;
    for (const p of s.players) {
      if (p.out) continue;
      if (!p.alive) {
        if (p.dying > 0) {
          p.dying -= dt;
          if (p.dying <= 0 && s.mode === 'campaign') {
            if (p.lives > 0) { this.placePlayer(p); p.invuln = 3; }
            else p.out = true;
          }
        }
        continue;
      }
      if (p.invuln > 0) p.invuln -= dt;
      if (p.spellCd > 0) p.spellCd = Math.max(0, p.spellCd - dt);
      if (p.frozen > 0) {
        p.frozen = Math.max(0, p.frozen - dt);
        if (p.frozen <= 0 && p.iceDmg) { const d = p.iceDmg; p.iceDmg = 0; this.ev('fizz'); this.damagePlayer(p, d, p.iceBy, 'pierce'); if (!p.alive) continue; }
      }
      if (p.rooted > 0) {
        p.rooted = Math.max(0, p.rooted - dt);
        if (p.rooted <= 0 && p.rootDmg) { const d = p.rootDmg; p.rootDmg = 0; this.damagePlayer(p, d, p.rootBy, 'pierce'); if (!p.alive) continue; }
      }
      if (p.wet > 0) p.wet = Math.max(0, p.wet - dt);
      if (p.burning > 0) {
        p.burning -= dt;
        if (p.burning <= 0) {
          p.burning = 0;
          this.damagePlayer(p, p.burnDmg || DMG.enemyBurn, p.burnBy, 'pierce');
          if (!p.alive) continue;
        }
      }
      const ch = charById(p.char);
      if (ch.regen && p.hp < p.maxHp) {           // Broto: fotossíntese
        p.regenT = (p.regenT || 0) + dt;
        if (p.regenT >= ch.regen) { p.regenT = 0; this.heal(p, ch.regenAmt || 8); }
      } else p.regenT = 0;
      const inp = (inputs && inputs[p.id]) || NO_INPUT;
      // mira: clique/escolha direta (pick) ou trocar para o próximo alvo (cycle)
      if (inp.pick && this.targetObj(inp.pick) && !this.isSelf(p, inp.pick)) p.tgt = { k: inp.pick.k, id: inp.pick.id };
      if (inp.cycle) this.cycleTarget(p);
      this.ensureTarget(p);
      let dx = inp.dx || 0, dy = inp.dy || 0;
      if (dx && dy) dy = 0;
      const frozen = p.frozen > 0;
      if ((dx || dy) && !frozen) {
        p.dir = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
        if (p.rooted <= 0) {
          this.move(p, dx, dy, this.speedOf(p) * dt);
          p.moving = true;
          if (p.kick) this.tryKick(p, dx, dy);
        } else p.moving = false;
      } else p.moving = false;
      if (!frozen) {
        if (inp.bomb) this.placeBomb(p);
        if (inp.spell) this.castSpell(p);
      }
      const pu = this.powerupAt(Math.floor(p.x), Math.floor(p.y));
      if (pu) this.collect(p, pu);
    }
  }

  // Movimento em grade com "assistência de quina": o personagem se alinha
  // sozinho ao corredor e escorrega para a passagem mais próxima.
  move(e, dx, dy, dist) {
    const horiz = dx !== 0;
    const d = horiz ? dx : dy;
    let a = horiz ? e.x : e.y;   // eixo do movimento
    let b = horiz ? e.y : e.x;   // eixo transversal
    const ca = Math.floor(a), cb = Math.floor(b);
    const pass = (ma, mb) => horiz ? this.canPass(ma, mb, false) : this.canPass(mb, ma, false);
    const off = b - (cb + 0.5);
    const aheadOpen = pass(ca + d, cb);
    let lane = cb;
    if (!aheadOpen) {
      if (off > ASSIST && pass(ca, cb + 1) && pass(ca + d, cb + 1)) lane = cb + 1;
      else if (off < -ASSIST && pass(ca, cb - 1) && pass(ca + d, cb - 1)) lane = cb - 1;
    }
    if (aheadOpen || lane !== cb) {
      const target = lane + 0.5;
      const diff = target - b;
      if (Math.abs(diff) > 1e-4) {
        const step = Math.min(dist, Math.abs(diff));
        b += Math.sign(diff) * step; dist -= step;
      }
      if (lane === cb && Math.abs(target - b) <= 1e-4) { b = target; a += d * dist; }
    } else {
      const target = ca + 0.5;
      if ((target - a) * d > 0) a = d > 0 ? Math.min(target, a + dist) : Math.max(target, a - dist);
    }
    if (horiz) { e.x = a; e.y = b; } else { e.y = a; e.x = b; }
  }

  tryKick(p, dx, dy) {
    const cx = Math.floor(p.x), cy = Math.floor(p.y);
    const b = this.bombAt(cx + dx, cy + dy);
    if (!b || b.mdx || b.mdy) return;
    if (Math.abs(p.x - (cx + 0.5)) > 0.1 || Math.abs(p.y - (cy + 0.5)) > 0.1) return;
    if (this.bombBlocked(cx + dx * 2, cy + dy * 2, b)) return;
    b.mdx = dx; b.mdy = dy;
    this.ev('kick');
  }

  canPlaceBomb(p) {
    const x = Math.floor(p.x), y = Math.floor(p.y);
    if (!p.alive || p.frozen > 0 || this.tile(x, y) !== EMPTY || this.bombAt(x, y)) return false;
    let n = 0; for (const b of this.s.bombs) if (b.owner === p.id) n++;
    return n < p.bombs;
  }

  placeBomb(p) {
    if (!this.canPlaceBomb(p)) return;
    const x = Math.floor(p.x), y = Math.floor(p.y), c = charById(p.char);
    this.s.bombs.push({ id: this.uid++, px: x + 0.5, py: y + 0.5, owner: p.id, range: p.range,
      timer: c.fuse || BOMB_TIME, mdx: 0, mdy: 0, char: c.id });
    this.ev('place');
  }

  collect(p, pu) {
    this.s.powerups = this.s.powerups.filter(o => o !== pu);
    switch (pu.type) {
      case 'bomb': p.bombs = Math.min(MAX_BOMBS, p.bombs + 1); break;
      case 'fire': p.range = Math.min(MAX_RANGE, p.range + 1); break;
      case 'speed': p.speed = Math.min(MAX_SPEED, p.speed + SPEED_STEP); break;
      case 'kick': p.kick = true; break;
      case 'shield': p.shield = true; break;
      case 'heart': this.heal(p, HEART_HEAL); break;
      case 'life': p.lives++; break;
    }
    p.score += 50;
    this.ev('power');
  }

  // número que sobe em cima do personagem (dano em vermelho, cura em verde, "BLOQUEOU")
  popup(p, text, color) {
    const s = this.s; s.popups = s.popups || [];
    s.popups.push({ x: p.x, y: p.y, text: String(text), color, t: 1 });
    if (s.popups.length > 24) s.popups.shift();
  }
  heal(p, amt) {
    const before = p.hp; p.hp = Math.min(p.maxHp, p.hp + amt);
    if (p.hp > before) { this.popup(p, '+' + Math.round(p.hp - before), '#5ee07a'); this.ev('heal'); }
  }

  // mode: 'normal' (respeita invulnerabilidade, escudo, bloqueio e defesa), 'pierce' (só a defesa), 'kill' (morte instantânea)
  damagePlayer(p, amt, by, mode = 'normal') {
    if (!p.alive) return;
    const s = this.s;
    if (mode === 'normal') {
      if (p.invuln > 0) return;
      if (p.shield) { p.shield = false; p.invuln = 1.5; this.ev('shield'); this.popup(p, 'ESCUDO!', '#9fe3ff'); return; }
      // escudo equipado: chance de bloquear o golpe inteiro
      if (p.block > 0 && Math.random() < p.block) { p.invuln = 0.6; this.ev('shield'); this.popup(p, 'BLOQUEOU!', '#9fe3ff'); return; }
    }
    if (mode !== 'kill') {
      const dmg = Math.max(1, Math.round(amt * (1 - (p.def || 0))));   // defesa da armadura
      p.hp -= dmg;
      this.popup(p, '-' + dmg, '#ff5a5a');
      if (p.hp > 0) { p.invuln = Math.max(p.invuln, 1.4); this.ev('hurt'); return; }
    }
    p.hp = 0; p.alive = false; p.dying = 1.2; p.moving = false;
    p.frozen = 0; p.rooted = 0; p.burning = 0;
    if (s.mode === 'campaign') p.lives--;
    const k = s.players[by];
    if (s.mode === 'battle' && k && k !== p) { k.kills++; k.coins += 15; }
    this.ev('die');
  }

  // ---------- mira ----------
  // Alvos possíveis: na Batalha, os rivais vivos; na Campanha, os inimigos.
  targetsFor(p) {
    const s = this.s;
    if (s.mode === 'battle') return s.players.filter(o => o !== p && o.alive).map(o => ({ k: 'p', id: o.id, o }));
    return s.enemies.filter(e => !e.dying && e.spawnT <= 0).map(e => ({ k: 'e', id: e.id, o: e }));
  }
  targetObj(t) {
    if (!t) return null;
    if (t.k === 'p') { const o = this.s.players[t.id]; return o && o.alive && this.s.mode === 'battle' ? o : null; }
    return this.s.enemies.find(e => e.id === t.id && !e.dying) || null;
  }
  isSelf(p, t) { return t.k === 'p' && t.id === p.id; }
  ensureTarget(p) {
    if (!SPELLS[p.spell]) return;
    if (this.targetObj(p.tgt)) return;
    const list = this.targetsFor(p);
    if (!list.length) { p.tgt = null; return; }
    const d = o => Math.abs(o.x - p.x) + Math.abs(o.y - p.y);
    const best = list.reduce((a, b) => d(b.o) < d(a.o) ? b : a);
    p.tgt = { k: best.k, id: best.id };
  }
  cycleTarget(p) {
    const list = this.targetsFor(p);
    if (!list.length) return;
    const i = p.tgt ? list.findIndex(t => t.k === p.tgt.k && t.id === p.tgt.id) : -1;
    const n = list[(i + 1) % list.length];
    p.tgt = { k: n.k, id: n.id };
    this.ev('aim');
  }

  // ---------- magias ----------
  // A magia sobe ao céu e persegue o alvo: a sombra (tx, ty) segue ele a cada quadro
  // e a magia cai em cima dele. Defesas: pular com a montaria, escudo, montaria e imunidade.
  castSpell(p) {
    const S = SPELLS[p.spell];
    if (!S || p.spellCd > 0) return;
    this.ensureTarget(p);
    const o = this.targetObj(p.tgt);
    if (!o) return;
    const v = spellStats(p.spell, p.spellLv);          // valores do nível da magia
    this.s.meteors.push({ id: this.uid++, type: p.spell, owner: p.id, sx: p.x, sy: p.y,
      tx: Math.floor(o.x), ty: Math.floor(o.y), tgt: { k: p.tgt.k, id: p.tgt.id }, t: 0, fall: v.fall || 1.3,
      area: v.area, dmg: v.dmg, dur: v.dur });
    p.spellCd = v.cd * (1 - ((p.stats && p.stats.magic) | 0) * STATS.magic.per);
    this.ev('cast');
  }

  updateMeteors(dt) {
    const s = this.s;
    for (const im of s.impacts) im.t -= dt;
    for (const pp of s.popups || []) pp.t -= dt;
    if (s.popups) s.popups = s.popups.filter(pp => pp.t > 0);
    s.impacts = s.impacts.filter(im => im.t > 0);
    for (const m of s.meteors) {
      m.t += dt;
      const o = this.targetObj(m.tgt);           // persegue o alvo enquanto ele estiver vivo
      if (o) { m.tx = Math.floor(o.x); m.ty = Math.floor(o.y); }
      if (m.t >= m.fall) { m.dead = true; this.landSpell(m); }
    }
    s.meteors = s.meteors.filter(m => !m.dead);
  }

  landSpell(m) {
    const s = this.s, S = SPELLS[m.type];
    const area = spellArea(m.type, m.tx, m.ty, m.area).filter(([x, y]) => x > 0 && y > 0 && x < COLS - 1 && y < ROWS - 1);
    const inArea = o => area.some(([x, y]) => Math.floor(o.x) === x && Math.floor(o.y) === y);
    const sh = { type: m.type, owner: m.owner, fromEnemy: false, dur: m.dur };
    s.impacts.push({ x: m.tx, y: m.ty, type: m.type, area: m.area, t: 0.45 });
    // blocos: a pedra esmaga, o fogo queima
    for (const [x, y] of area) {
      if ((m.type === 'pedra' || m.type === 'fogo') && this.tile(x, y) === BLOCK) this.burnBlock(x, y);
      if (m.type === 'fogo') { const b = this.bombAt(x, y); if (b) b.timer = 0; }
    }
    // dano: todas causam m.dmg (cresce com o nível). Raio, pedra e água ferem na hora; fogo, gelo e raízes só
    // quando o efeito acaba (hit: 'end'), guardando o dano no alvo.
    const endHit = S.hit === 'end', pure = !S.dur;
    if (s.mode === 'battle') {
      for (const p of s.players) {
        if (!p.alive || p.id === m.owner || !inArea(p)) continue;
        if (isImmune(p, m.type)) { this.ev('fizz'); continue; }
        if (endHit) { this.applySpell(p, { ...sh, endDmg: m.dmg }); continue; }
        const guarded = p.shield || p.invuln > 0;    // escudo de item ou invulnerável: segura o golpe todo
        this.damagePlayer(p, m.dmg, m.owner);
        if (!pure && p.alive && !guarded) this.applySpell(p, sh);
      }
    }
    for (const e of s.enemies) {     // inimigos (campanha): sempre perdem 1 de vida, mais o efeito
      if (e.dying || e.spawnT > 0 || !inArea(e)) continue;
      this.hurtEnemy(e, m.owner);
      if (m.dmg >= 30) this.hurtEnemy(e, m.owner, true);   // magia forte (nível alto) tira 2 de vida dos inimigos
      if (!pure && !e.dying) this.applySpell(e, sh);
    }
    this.ev(m.type === 'pedra' ? 'boom' : 'spell_' + m.type);
  }

  updateShots(dt) {
    const s = this.s;
    for (const sh of s.shots) {
      const step = SHOT_SPEED * dt;
      sh.x += sh.dx * step; sh.y += sh.dy * step; sh.d += step;
      const tx = Math.floor(sh.x), ty = Math.floor(sh.y), t = this.tile(tx, ty);
      if (sh.d > SHOT_RANGE || t === WALL || t === BURN) { sh.dead = true; continue; }
      if (t === BLOCK) { if (sh.type === 'fogo') this.burnBlock(tx, ty); sh.dead = true; this.ev('fizz'); continue; }
      const b = this.bombAt(tx, ty);
      if (b && sh.d > 0.6) { if (sh.type === 'fogo') b.timer = 0; sh.dead = true; continue; }
      const hit = o => Math.abs(o.x - sh.x) < 0.55 && Math.abs(o.y - sh.y) < 0.55;
      const pvp = sh.fromEnemy || s.mode === 'battle';
      if (pvp) {
        const p = s.players.find(p => p.alive && !p.jump && p.id !== (sh.fromEnemy ? -1 : sh.owner) && hit(p));
        if (p) { this.applySpell(p, sh); sh.dead = true; continue; }
      }
      if (!sh.fromEnemy) {
        const e = s.enemies.find(e => !e.dying && e.spawnT <= 0 && hit(e));
        if (e) { this.applySpell(e, sh); sh.dead = true; continue; }
      }
    }
    s.shots = s.shots.filter(sh => !sh.dead);
  }

  applySpell(o, sh) {
    const S = SPELLS[sh.type], isPlayer = this.s.players.includes(o);
    if (isPlayer && o.shield) { o.shield = false; o.invuln = Math.max(o.invuln, 1); this.ev('shield'); return; }
    if (isPlayer && isImmune(o, sh.type)) { this.ev('fizz'); return; }   // Nimbo/Geada/Broto
    // magias que ferem no fim (fogo, gelo, raízes): a montaria segura o golpe inteiro
    if (isPlayer && sh.endDmg && o.mounted) { o.mounted = false; o.invuln = Math.max(o.invuln, 1.5); this.ev('dismount'); return; }
    const dur = sh.dur || S.dur;                      // duração melhorada pelo nível da magia
    const by = sh.fromEnemy ? -1 : sh.owner;
    if (sh.type === 'gelo') { o.frozen = dur; o.burning = 0; if (isPlayer && sh.endDmg) { o.iceDmg = sh.endDmg; o.iceBy = by; } }
    else if (sh.type === 'mato') { o.rooted = dur; if (isPlayer && sh.endDmg) { o.rootDmg = sh.endDmg; o.rootBy = by; } }
    else if (sh.type === 'fogo') { o.burning = dur; o.burnBy = by; o.burnDmg = sh.endDmg || DMG.enemyBurn; o.frozen = 0; }
    else if (sh.type === 'agua') { o.burning = 0; if (isPlayer) o.wet = dur; else o.rooted = Math.max(o.rooted, 1.5); }
    this.ev('spell_' + sh.type);
  }

  // ---------- bombas e explosões ----------
  bombBlocked(x, y, self) {
    if (this.tile(x, y) !== EMPTY) return true;
    for (const b of this.s.bombs) if (b !== self && Math.floor(b.px) === x && Math.floor(b.py) === y) return true;
    for (const p of this.s.players) if (p.alive && Math.floor(p.x) === x && Math.floor(p.y) === y) return true;
    for (const e of this.s.enemies) if (!e.dying && Math.floor(e.x) === x && Math.floor(e.y) === y) return true;
    return !!this.powerupAt(x, y);
  }

  updateBombs(dt) {
    const s = this.s;
    for (const b of s.bombs) {
      b.timer -= dt;
      if (b.mdx || b.mdy) {
        let dist = KICK_SPEED * dt;
        const cx = Math.floor(b.px), cy = Math.floor(b.py);
        const to = (cx + 0.5 - b.px) * b.mdx + (cy + 0.5 - b.py) * b.mdy;
        if (to >= 0 && to <= dist) {
          b.px = cx + 0.5; b.py = cy + 0.5; dist -= to;
          if (this.bombBlocked(cx + b.mdx, cy + b.mdy, b)) { b.mdx = 0; b.mdy = 0; dist = 0; }
        }
        b.px += b.mdx * dist; b.py += b.mdy * dist;
      }
    }
    let guard = 0, again = true;
    while (again && guard++ < 64) {
      again = false;
      for (const b of s.bombs.slice()) {
        if (b.timer <= 0 && s.bombs.includes(b)) { this.explode(b); again = true; }
      }
    }
  }

  explode(b) {
    const s = this.s;
    s.bombs = s.bombs.filter(o => o !== b);
    const bx = Math.floor(b.px), by = Math.floor(b.py);
    const c = charById(b.char), dur = c.flameTime || FLAME_TIME, el = c.id;
    this.addFlame(bx, by, 'c', b.owner, dur, el);
    for (const [dx, dy] of DIRS) {
      let pierce = c.pierce || 0;                 // Bolota: a explosão atravessa blocos
      for (let i = 1; i <= b.range + (c.pierce || 0); i++) {
        const x = bx + dx * i, y = by + dy * i;
        const t = this.tile(x, y);
        if (t === WALL || (t === BURN && !pierce)) break;
        if (t === BLOCK || t === BURN) {
          if (t === BLOCK) this.burnBlock(x, y);
          if (pierce-- > 0) continue;
          break;
        }
        if (i > b.range) break;
        const ob = this.bombAt(x, y);
        this.addFlame(x, y, dx ? 'h' : 'v', b.owner, dur, el);
        if (ob) { ob.timer = 0; break; }
      }
    }
    this.ev('boom');
  }

  addFlame(x, y, k, owner, dur = FLAME_TIME, el = null) {
    const f = this.s.flames.find(f => f.x === x && f.y === y);
    if (f) { f.t = Math.max(f.t, dur); if (f.k !== k) f.k = 'c'; f.owner = owner; f.el = el; return; }
    this.s.flames.push({ x, y, k, t: dur, owner, el });
  }

  // Efeito elemental de quem sobreviveu a uma explosão (Geada congela, Broto enraíza)
  elementHit(o, f, isPlayer) {
    const c = f.el && charById(f.el);
    if (!c || !c.onHit) return;
    if (isPlayer && (o.id === f.owner || (c.onHit.status === 'frozen' && isImmune(o, 'gelo')) || (c.onHit.status === 'rooted' && isImmune(o, 'mato')))) return;
    o[c.onHit.status] = Math.max(o[c.onHit.status] || 0, c.onHit.dur);
  }

  burnBlock(x, y) {
    this.s.grid[idx(x, y)] = BURN;
    this.s.burning.push({ x, y, t: BURN_TIME });
  }

  updateBurning(dt) {
    const s = this.s;
    for (const b of s.burning) {
      b.t -= dt;
      if (b.t > 0) continue;
      const k = idx(b.x, b.y);
      if (s.grid[k] !== BURN) continue;
      s.grid[k] = EMPTY;
      if (this.hidden[k]) { this.addPowerup(b.x, b.y, this.hidden[k]); delete this.hidden[k]; }
      else if (s.mode === 'battle' && Math.random() < 0.32) this.addPowerup(b.x, b.y, weighted(BATTLE_DROPS));
    }
    s.burning = s.burning.filter(b => b.t > 0);
  }

  addPowerup(x, y, type, age = 0) { this.s.powerups.push({ id: this.uid++, x, y, type, age }); }

  updateFlames(dt) {
    const s = this.s;
    for (const f of s.flames) f.t -= dt;
    s.flames = s.flames.filter(f => f.t > 0);
    if (!s.flames.length) return;
    const fmap = new Map();
    for (const f of s.flames) fmap.set(idx(f.x, f.y), f);
    for (const p of s.players) {
      if (!p.alive) continue;
      const f = fmap.get(idx(Math.floor(p.x), Math.floor(p.y)));
      if (f && p.invuln <= 0) {
        if (p.frozen > 0) p.frozen = 0;
        const shielded = p.shield;
        this.damagePlayer(p, DMG.bomb, f.owner);
        if (p.alive && !shielded) this.elementHit(p, f, true);
      }
    }
    for (const e of s.enemies) {
      if (e.dying || e.spawnT > 0) continue;
      const f = fmap.get(idx(Math.floor(e.x), Math.floor(e.y)));
      if (f && e.invuln <= 0) { this.hurtEnemy(e, f.owner); if (!e.dying) this.elementHit(e, f, false); }
    }
    const before = s.powerups.length;
    s.powerups = s.powerups.filter(pu => !(pu.age > 0.6 && fmap.has(idx(pu.x, pu.y))));
    if (s.powerups.length < before) this.ev('fizz');
    for (const b of s.bombs) if (fmap.has(idx(Math.floor(b.px), Math.floor(b.py)))) b.timer = 0;
  }

  // ---------- inimigos ----------
  hurtEnemy(e, owner, pierce) {
    if (e.dying || (e.invuln > 0 && !pierce)) return;
    e.hp--;
    if (e.hp <= 0) {
      e.dying = 0.7; this.ev('pop');
      const p = this.s.players[owner];
      if (p) { const pts = ENEMY_TYPES[e.type].points; p.score += pts; p.coins += Math.round(pts / 10); }
    } else { e.invuln = 1.0; this.ev('hit'); }
  }

  updateEnemies(dt) {
    const s = this.s;
    for (const e of s.enemies) {
      if (e.dying > 0) { e.dying -= dt; if (e.dying <= 0) e.gone = true; continue; }
      if (e.invuln > 0) e.invuln -= dt;
      if (e.spawnT > 0) { e.spawnT -= dt; continue; }
      const T = ENEMY_TYPES[e.type];
      if (e.burning > 0) {
        e.burning -= dt;
        if (e.burning <= 0) { e.burning = 0; this.hurtEnemy(e, e.burnBy, true); if (e.dying) continue; }
      }
      if (e.frozen > 0) { e.frozen -= dt; continue; }
      if (T.boss) {
        e.timer -= dt;
        if (e.timer <= 0) {
          e.timer = rnd(5, 8);
          const minions = s.enemies.filter(o => o.type === 'gota' && !o.dying).length;
          if (minions < 5) { this.addEnemy('gota', Math.floor(e.x), Math.floor(e.y), 0.9); this.ev('spawn'); }
        }
      }
      if (T.caster) {
        e.cast -= dt;
        if (e.cast <= 0) {
          const dir = this.lineDir(Math.floor(e.x), Math.floor(e.y), s.players.filter(p => p.alive), 6);
          if (dir) {
            s.shots.push({ id: this.uid++, x: e.x, y: e.y, dx: dir[0], dy: dir[1], type: T.caster, owner: -1, fromEnemy: true, d: 0 });
            e.cast = rnd(3, 5); this.ev('cast');
          } else e.cast = 0.4;
        }
      }
      if (e.rooted > 0) { e.rooted -= dt; continue; }
      const cx = Math.floor(e.x), cy = Math.floor(e.y);
      if ((e.tx !== cx || e.ty !== cy) && !this.canPass(e.tx, e.ty, T.pass)) {
        const ox = e.tx, oy = e.ty;
        e.tx = e.fx; e.ty = e.fy; e.fx = ox; e.fy = oy; e.dx = -e.dx; e.dy = -e.dy;
      }
      let dist = T.speed * dt, guard = 0;
      while (dist > 1e-6 && guard++ < 4) {
        const gx = e.tx + 0.5, gy = e.ty + 0.5;
        const rx = gx - e.x, ry = gy - e.y, rem = Math.abs(rx) + Math.abs(ry);
        if (rem <= dist) {
          e.x = gx; e.y = gy; dist -= rem;
          this.chooseDir(e, T);
          if (e.tx === Math.floor(e.x) && e.ty === Math.floor(e.y)) break;
        } else { const k = dist / rem; e.x += rx * k; e.y += ry * k; dist = 0; }
      }
    }
    s.enemies = s.enemies.filter(e => !e.gone);
  }

  chooseDir(e, T) {
    const cx = e.tx, cy = e.ty;
    const opts = DIRS.filter(([dx, dy]) => this.canPass(cx + dx, cy + dy, T.pass));
    if (!opts.length) { e.fx = cx; e.fy = cy; return; }
    let d = null;
    if (T.ai === 'chase' || (T.ai === 'drift' && Math.random() < 0.5)) {
      const step = this.chaseStep(cx, cy, T.pass, T.ai === 'chase' ? 12 : 16);
      if (step && Math.random() < 0.85) d = step;
    }
    if (!d) {
      const fwd = opts.find(o => o[0] === e.dx && o[1] === e.dy);
      const turn = T.ai === 'erratic' ? 0.45 : 0.2;
      if (fwd && Math.random() > turn) d = fwd;
      else {
        const nonRev = opts.filter(o => !(o[0] === -e.dx && o[1] === -e.dy));
        d = pick(nonRev.length ? nonRev : opts);
      }
    }
    e.dx = d[0]; e.dy = d[1]; e.fx = cx; e.fy = cy; e.tx = cx + d[0]; e.ty = cy + d[1];
  }

  chaseStep(sx, sy, pass, maxD) {
    const targets = new Set();
    for (const p of this.s.players) if (p.alive) targets.add(idx(Math.floor(p.x), Math.floor(p.y)));
    if (!targets.size) return null;
    const N = COLS * ROWS, prev = new Int16Array(N).fill(-1), dist = new Int16Array(N).fill(-1);
    const start = idx(sx, sy); dist[start] = 0;
    const q = [start];
    for (let h = 0; h < q.length; h++) {
      const cur = q[h]; const x = cur % COLS, y = (cur / COLS) | 0;
      if (dist[cur] >= maxD) continue;
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy, ni = idx(nx, ny);
        if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || dist[ni] >= 0) continue;
        if (targets.has(ni) && this.tile(nx, ny) !== WALL) {
          prev[ni] = cur;
          let c = ni; while (prev[c] !== start) c = prev[c];
          return [c % COLS - sx, ((c / COLS) | 0) - sy];
        }
        if (!this.canPass(nx, ny, pass)) continue;
        dist[ni] = dist[cur] + 1; prev[ni] = cur; q.push(ni);
      }
    }
    return null;
  }

  contact() {
    const s = this.s;
    for (const e of s.enemies) {
      if (e.dying || e.spawnT > 0 || e.frozen > 0) continue;
      const T = ENEMY_TYPES[e.type];
      const r = T.boss ? 0.85 : 0.62;
      for (const p of s.players) {
        if (p.alive && Math.abs(p.x - e.x) < r && Math.abs(p.y - e.y) < r) this.damagePlayer(p, (T.damage || 1) * DMG.touch, -1);
      }
    }
    // o fogo passa para quem encostar
    for (const p of s.players) {
      if (!p.alive || p.burning <= 0) continue;
      for (const o of s.players) {
        if (o === p || !o.alive || o.burning > 0 || isImmune(o, 'fogo')) continue;
        if (Math.abs(p.x - o.x) < 0.7 && Math.abs(p.y - o.y) < 0.7) {
          o.burning = SPELLS.fogo.dur * 0.75; o.burnBy = p.burnBy; o.burnDmg = p.burnDmg || SPELL_DMG; o.frozen = 0; this.ev('spell_fogo');
        }
      }
    }
  }

  // ---------- morte súbita ----------
  updateSudden(dt) {
    const s = this.s;
    s.suddenT -= dt;
    while (s.suddenT <= 0 && s.suddenIdx < SPIRAL.length) {
      const [x, y] = SPIRAL[s.suddenIdx++];
      const k = idx(x, y);
      if (s.grid[k] === WALL) continue;
      s.grid[k] = WALL;
      s.suddenT += 0.12;
      const at = o => Math.floor(o.px ?? o.x) === x && Math.floor(o.py ?? o.y) === y;
      s.bombs = s.bombs.filter(b => !at(b));
      s.powerups = s.powerups.filter(p => !(p.x === x && p.y === y));
      s.burning = s.burning.filter(b => !(b.x === x && b.y === y));
      s.flames = s.flames.filter(f => !(f.x === x && f.y === y));
      for (const p of s.players) if (p.alive && Math.floor(p.x) === x && Math.floor(p.y) === y) this.damagePlayer(p, 99, -1, 'kill');
      this.ev('thud');
    }
  }
}
