'use strict';
// Tela "Equipamento": o boneco com os 5 espaços (capacete, armadura, calça, botas, escudo),
// a soma dos atributos e a lista de peças de cada espaço para comprar e equipar.

const Equip = { slot: 'helmet' };
// posição de cada espaço na grade 2x4 ao lado do boneco (coluna, linha): corpo no meio, escudo na mão
const EQ_LAYOUT = { helmet: [1, 1], armor: [1, 2], shield: [2, 2], legs: [1, 3], boots: [1, 4] };

function eqMsg(m, bad) { const el = $('#eqMsg'); el.textContent = m || ''; el.classList.toggle('err', !!bad); }

function gearCanvas(slot, tier, size) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  if (tier != null) drawGearIcon(cv.getContext('2d'), slot, tier, size / 2, size / 2, size * 0.8);
  return cv;
}

function renderEquip() {
  const p = Profiles.current(), c = CHARACTERS[p.char] || CHARACTERS[0];
  const L = levelFromXp(p.xp);
  $('#eqLevel').innerHTML = `<b>Nível ${L.lv}</b><span class="xpbar"><i style="width:${(L.into / L.need * 100).toFixed(1)}%"></i></span><small>${L.into}/${L.need} XP</small>`;
  $('#eqCoins').textContent = `💰 ${p.coins}`;
  // boneco
  const cv = $('#eqCv');
  cv.dataset.char = c.id; cv.dataset.outfit = JSON.stringify(Profiles.outfitOf(p)); cv.dataset.gear = JSON.stringify(p.gear);
  $('#eqName').textContent = c.name;
  // espaços
  const box = $('#eqSlots'); box.innerHTML = '';
  for (const S of GEAR_SLOTS) {
    const tier = p.gear[S.id], [col, row] = EQ_LAYOUT[S.id];
    const cell = document.createElement('button');
    cell.className = 'eq-slot' + (tier != null ? ' filled' : '') + (Equip.slot === S.id ? ' sel' : '');
    cell.style.gridColumn = col; cell.style.gridRow = row;
    cell.title = tier != null ? `${gearName(S.id, tier)} — ${gearStatsText(S.id, tier)}` : `${S.name}: vazio`;
    if (tier != null) cell.appendChild(gearCanvas(S.id, tier, 56));
    else { const e = document.createElement('span'); e.className = 'empty'; e.textContent = S.icon; cell.appendChild(e); }
    const lab = document.createElement('small'); lab.textContent = S.name; cell.appendChild(lab);
    cell.onclick = () => { Equip.slot = S.id; renderEquip(); };
    box.appendChild(cell);
  }
  // totais
  const cs = Profiles.combatStats(p, c);
  $('#eqTotals').innerHTML = `
    <div><span>❤ Vida</span><b>${cs.hp}</b></div>
    <div><span>🛡 Defesa</span><b>${Math.round(cs.def * 100)}%</b></div>
    <div><span>✋ Bloqueio</span><b>${Math.round(cs.block * 100)}%</b></div>
    <div><span>👟 Velocidade</span><b>${cs.speed.toFixed(2)}</b></div>
    <p class="muted small">Defesa diminui todo dano recebido. Bloqueio é a chance do escudo segurar o golpe inteiro.</p>`;
  // abas e peças
  $('#eqTabs').innerHTML = GEAR_SLOTS.map(S => `<button class="tab${S.id === Equip.slot ? ' on' : ''}" data-slot="${S.id}">${S.icon} ${S.name}</button>`).join('');
  const list = $('#eqItems'); list.innerHTML = '';
  GEAR_TIERS.forEach((T, tier) => {
    const key = Profiles.gearKey(Equip.slot, tier), owned = Profiles.owns(p, key), on = p.gear[Equip.slot] === tier;
    const locked = L.lv < T.lvl, price = gearPrice(tier);
    const card = document.createElement('div');
    card.className = 'eq-item' + (on ? ' on' : '') + (owned ? ' owned' : '') + (locked ? ' locked' : '');
    card.appendChild(gearCanvas(Equip.slot, tier, 64));
    const btn = on ? `<button class="btn small ghost" data-act="off">✔ Equipado</button>`
      : owned ? `<button class="btn small" data-act="on" data-tier="${tier}">Equipar</button>`
      : locked ? `<button class="btn small ghost" disabled>🔒 Nível ${T.lvl}</button>`
      : `<button class="btn small" data-act="buy" data-tier="${tier}"${p.coins < price ? ' disabled' : ''}>Comprar 💰 ${price}</button>`;
    const info = document.createElement('div'); info.className = 'eq-info';
    info.innerHTML = `<b style="color:${T.glow || T.shine}">${esc(gearName(Equip.slot, tier))}</b>
      <span class="tier">Material ${tier + 1}/${GEAR_TIERS.length} · nível ${T.lvl}</span>
      <span class="stats">${gearStatsText(Equip.slot, tier)}</span>${btn}`;
    card.appendChild(info);
    list.appendChild(card);
  });
}

function initEquip() {
  App.onShow.equip = () => { eqMsg(''); renderEquip(); };
  $('#eqTabs').onclick = e => { const b = e.target.closest('[data-slot]'); if (b) { Equip.slot = b.dataset.slot; renderEquip(); } };
  $('#eqItems').onclick = e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const p = Profiles.current(), tier = b.dataset.tier != null ? +b.dataset.tier : null;
    if (b.dataset.act === 'buy') {
      const r = Profiles.buyGear(p, Equip.slot, tier);
      if (r === 'ok') { Sfx.init(); Sfx.play('buy'); eqMsg(`Você comprou ${gearName(Equip.slot, tier)}! Já está equipado.`); }
      else { Sfx.play('error'); eqMsg(r === 'nivel' ? `Precisa do nível ${GEAR_TIERS[tier].lvl}. Jogue partidas para ganhar experiência!` : 'Moedas insuficientes.', true); }
    } else if (b.dataset.act === 'on') { Profiles.equipGear(p, Equip.slot, tier); eqMsg(''); }
    else if (b.dataset.act === 'off') { Profiles.equipGear(p, Equip.slot, null); eqMsg(''); }
    renderEquip(); refreshProfileBadge();
  };
  const step = d => { const p = Profiles.current(); p.char = (p.char + d + CHARACTERS.length) % CHARACTERS.length; Profiles.save(); renderEquip(); };
  $('#eqPrev').onclick = () => step(-1);
  $('#eqNext').onclick = () => step(1);
}
