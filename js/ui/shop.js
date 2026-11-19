'use strict';
// Loja: gerenciar perfis, comprar e equipar magias, montarias e roupinhas.

const SHOP_TABS = [
  { id: 'spell', label: '✨ Magias' },
  { id: 'life', label: '❤️ Vida' },
  { id: 'gear', label: '🛡️ Equipamentos' },
  { id: 'hat', label: '🎩 Chapéus' },
  { id: 'face', label: '🕶️ Rosto' },
  { id: 'skin', label: '🎨 Pinturas' },
];
const Shop = { tab: 'spell' };

// Lista de itens de uma aba no formato { id, name, desc, price, icon }
function shopItems(tab) {
  if (tab === 'spell') return SHOP_SPELLS.map(id => [id, SPELLS[id]]).map(([id, s]) => ({ id, name: s.name, desc: s.desc, price: s.price, icon: s.icon }));
  return COSMETICS[tab].map(c => ({ id: c.id, name: c.name, desc: COSMETIC_SLOTS[tab].replace(/s$/, ''), price: c.price }));
}

function shopMsg(m, bad) { const el = $('#shopMsg'); el.textContent = m || ''; el.classList.toggle('err', !!bad); }

function renderShop() {
  const p = Profiles.current();
  $('#shopProfile').innerHTML = Profiles.list().map(o => `<option value="${o.id}"${o.id === p.id ? ' selected' : ''}>👤 ${esc(o.name)}</option>`).join('');
  $('#shopCoins').textContent = `💰 ${p.coins}`;
  $('#btnDelProfile').disabled = Profiles.list().length <= 1;
  // provador
  const c = CHARACTERS[p.char] || CHARACTERS[0], lo = Profiles.loadout(p);
  const fit = $('#fitCv');
  fit.dataset.char = c.id; fit.dataset.outfit = JSON.stringify(lo.outfit); fit.dataset.gear = JSON.stringify(lo.gear);
  $('#fitName').textContent = c.name;
  $('#fitInfo').innerHTML = charInfoHTML(c) + loadoutHTML(lo);
  // abas
  $('#shopTabs').innerHTML = SHOP_TABS.map(t => `<button class="tab${t.id === Shop.tab ? ' on' : ''}" data-tab="${t.id}">${t.label}</button>`).join('');
  // itens
  const slot = Shop.tab;
  if (slot === 'spell') { $('#shopItems').innerHTML = shopSpellCards(p, c); return; }
  if (slot === 'life') { $('#shopItems').innerHTML = shopLifeCard(p, c); return; }
  if (slot === 'gear') { Shop.tab = 'spell'; show('equip'); return; }
  $('#shopItems').innerHTML = shopItems(slot).map(it => {
    const key = slot + ':' + it.id, owned = Profiles.owns(p, key), equipped = p.equip[slot] === it.id;
    const pv = slot === 'spell' ? `<div class="big-icon">${it.icon}</div>`
      : `<canvas class="preview" width="110" height="110" data-char="${c.id}"
          data-outfit="${esc(JSON.stringify({ ...lo.outfit, [slot]: it.id }))}"></canvas>`;
    const btn = equipped ? `<button class="btn small ghost" data-act="unequip" data-id="${it.id}">✔ Equipado</button>`
      : owned ? `<button class="btn small" data-act="equip" data-id="${it.id}">Equipar</button>`
      : `<button class="btn small" data-act="buy" data-id="${it.id}"${p.coins < it.price ? ' disabled' : ''}>Comprar 💰 ${it.price}</button>`;
    return `<div class="item${owned ? ' owned' : ''}${equipped ? ' equipped' : ''}">${pv}
      <b>${it.icon ? it.icon + ' ' : ''}${esc(it.name)}</b><p>${esc(it.desc)}</p>${btn}</div>`;
  }).join('');
}

// Aba Vida: treino que aumenta a vida máxima (vale para todos os personagens do perfil)
function shopLifeCard(p, c) {
  const lv = p.lifeLv, cost = lifeUpgradeCost(lv), total = Profiles.combatStats(p, c).hp;
  const pips = Array.from({ length: LIFE_MAX_LV }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('');
  return `<div class="item spell-item life-item">
      <div class="big-icon">❤️</div>
      <b>Treino de vida <span class="lv">Nv. ${lv}</span></b>
      <div class="lv-pips">${pips}</div>
      <p>Cada nível dá <b>+${LIFE_STEP} de vida máxima</b> para qualquer personagem deste perfil.</p>
      <div class="now">Bônus atual: +${lv * LIFE_STEP} de vida · ${esc(c.name)} fica com ❤ ${total}</div>
      ${lv < LIFE_MAX_LV ? `<div class="next">Próximo nível: +${(lv + 1) * LIFE_STEP} de vida</div>
        <button class="btn small alt" data-act="life"${p.coins < cost ? ' disabled' : ''}>⬆ Nível ${lv + 1} · 💰 ${cost}</button>`
        : '<div class="next max">Nível máximo! 🌟</div>'}
    </div>
    <p class="muted small spell-note">A vida também cresce com os pontos de Status (Desafio do Chefe) e com as armaduras.</p>`;
}

// Cartões das magias: nível (1 a 10), valores atuais, próximo nível, comprar/equipar/melhorar
function shopSpellCards(p, c) {
  return SHOP_SPELLS.map(id => {
    const S = SPELLS[id], lv = p.spellLv[id], owned = Profiles.owns(p, 'spell:' + id);
    const equipped = p.equip.spell === id, natural = c.spell === id;
    const owner = CHARACTERS.find(ch => ch.spell === id);
    const using = equipped || (natural && !p.equip.spell);
    const pips = Array.from({ length: SPELL_MAX_LV }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('');
    const next = lv < SPELL_MAX_LV ? `<div class="next">Nível ${lv + 1}: ${spellStatsText(id, lv + 1)}</div>` : '<div class="next max">Nível máximo! 🌟</div>';
    let btn;
    if (equipped) btn = `<button class="btn small ghost" data-act="unequip" data-id="${id}">✔ Equipada</button>`;
    else if (natural) btn = `<button class="btn small ghost" ${p.equip.spell ? `data-act="unequip" data-id="${id}"` : 'disabled'}>${p.equip.spell ? 'Usar a natural' : '🌟 Natural (em uso)'}</button>`;
    else if (owned) btn = `<button class="btn small" data-act="equip" data-id="${id}">Equipar</button>`;
    else btn = `<button class="btn small" data-act="buy" data-id="${id}"${p.coins < S.price ? ' disabled' : ''}>Comprar 💰 ${S.price}</button>`;
    const up = lv < SPELL_MAX_LV
      ? `<button class="btn small alt" data-act="upgrade" data-id="${id}"${p.coins < spellUpgradeCost(lv) ? ' disabled' : ''}>⬆ Nível ${lv + 1} · 💰 ${spellUpgradeCost(lv)}</button>` : '';
    return `<div class="item spell-item${owned ? ' owned' : ''}${using ? ' equipped' : ''}">
      <div class="big-icon">${S.icon}</div>
      <b>${S.icon} ${esc(S.name)} <span class="lv">Nv. ${lv}</span></b>
      <div class="lv-pips">${pips}</div>
      <p>${esc(S.desc)}</p>
      <div class="now">${spellStatsText(id, lv)}</div>${next}
      <div class="who muted">Natural de ${owner ? owner.icon + ' ' + owner.name : '—'}</div>
      ${btn}${up}</div>`;
  }).join('') + `<p class="muted small spell-note">O nível vale para a magia natural e para a comprada. Quem não equipar nenhuma usa a magia natural do personagem.</p>`;
}

function initShop() {
  App.onShow.shop = () => { shopMsg(''); renderShop(); };
  $('#shopTabs').onclick = e => { const b = e.target.closest('[data-tab]'); if (b) { Shop.tab = b.dataset.tab; renderShop(); } };
  $('#shopItems').onclick = e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const p = Profiles.current(), slot = Shop.tab, id = b.dataset.id;
    if (b.dataset.act === 'life') {
      if (Profiles.buyLife(p)) { Sfx.init(); Sfx.play('buy'); shopMsg(`Treino de vida nível ${p.lifeLv}: +${p.lifeLv * LIFE_STEP} de vida!`); }
      else { Sfx.play('error'); shopMsg('Moedas insuficientes.', true); }
      renderShop(); refreshProfileBadge(); return;
    }
    const it = shopItems(slot).find(i => i.id === id);
    if (b.dataset.act === 'upgrade') {
      if (Profiles.upgradeSpell(p, id)) { Sfx.init(); Sfx.play('buy'); shopMsg(`${it.name} subiu para o nível ${p.spellLv[id]}!`); }
      else { Sfx.play('error'); shopMsg('Moedas insuficientes para melhorar.', true); }
    } else if (b.dataset.act === 'buy') {
      if (Profiles.buy(p, slot + ':' + id, it.price)) {
        Profiles.equip(p, slot, id); Sfx.init(); Sfx.play('buy');
        shopMsg(`Você comprou ${it.name}! Já está equipado.`);
      } else { Sfx.play('error'); shopMsg('Moedas insuficientes. Jogue mais partidas para ganhar 💰!', true); }
    } else if (b.dataset.act === 'equip') { Profiles.equip(p, slot, id); shopMsg(''); }
    else if (b.dataset.act === 'unequip') { Profiles.equip(p, slot, null); shopMsg(''); }
    renderShop(); refreshProfileBadge();
  };
  $('#shopProfile').onchange = e => { Profiles.setCurrent(e.target.value); shopMsg(''); renderShop(); refreshProfileBadge(); };
  $('#btnNewProfile').onclick = () => {
    const n = $('#profileName').value.trim();
    if (!n) return shopMsg('Digite um nome para o novo perfil.', true);
    Profiles.create(n); $('#profileName').value = '';
    shopMsg(`Perfil criado com 💰 ${START_COINS} de presente!`); renderShop(); refreshProfileBadge();
  };
  $('#btnRenameProfile').onclick = () => {
    const n = $('#profileName').value.trim();
    if (!n) return shopMsg('Digite o novo nome no campo ao lado.', true);
    Profiles.rename(Profiles.current(), n); $('#profileName').value = ''; renderShop(); refreshProfileBadge();
  };
  $('#btnDelProfile').onclick = () => {
    const p = Profiles.current();
    const b = $('#btnDelProfile');
    if (b.dataset.confirm !== p.id) { b.dataset.confirm = p.id; b.textContent = 'Confirmar exclusão?'; return; }
    b.dataset.confirm = ''; b.textContent = 'Excluir perfil';
    Profiles.remove(p); shopMsg('Perfil excluído.'); renderShop(); refreshProfileBadge();
  };
  $('#fitPrev').onclick = () => { const p = Profiles.current(); p.char = (p.char + CHARACTERS.length - 1) % CHARACTERS.length; Profiles.save(); renderShop(); };
  $('#fitNext').onclick = () => { const p = Profiles.current(); p.char = (p.char + 1) % CHARACTERS.length; Profiles.save(); renderShop(); };
}
