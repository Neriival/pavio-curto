'use strict';
// Tela "Configurações": trocar as teclas dos dois esquemas de teclado e ligar/desligar o som.

const SettingsUI = { listening: null };     // { scheme, action } enquanto espera uma tecla

function renderSettings() {
  for (const card of $$('.keys-card')) {
    const id = card.dataset.scheme, sc = SCHEMES[id];
    const wait = a => SettingsUI.listening && SettingsUI.listening.scheme === id && SettingsUI.listening.action === a;
    card.innerHTML = `<h3>⌨️ Teclado ${id === 'kbA' ? 'A' : 'B'} <span class="muted small">(${id === 'kbA' ? 'jogador 1' : 'segundo jogador'})</span></h3>
      ${ACTIONS.map(a => {
        const keys = keyList(sc[a.id]);
        return `<div class="key-row"><span>${a.icon} ${a.name}</span>
          <button class="keycap${wait(a.id) ? ' wait' : ''}" data-scheme="${id}" data-action="${a.id}">
            ${wait(a.id) ? 'Aperte uma tecla…' : esc(keyName(keys[0]))}${!wait(a.id) && keys.length > 1 ? `<small> +${keys.length - 1}</small>` : ''}
          </button></div>`;
      }).join('')}
      <button class="btn small ghost" data-reset="${id}">↺ Restaurar padrão</button>`;
  }
  $('#setSound').textContent = Sfx.muted ? '🔇 Som desligado (clique para ligar)' : '🔊 Som ligado (clique para desligar)';
}

function setMsg(m, bad) { const el = $('#setMsg'); el.textContent = m || ''; el.classList.toggle('err', !!bad); }

function initSettings() {
  App.onShow.settings = () => { SettingsUI.listening = null; setMsg(''); renderSettings(); };
  $('#settings').addEventListener('click', e => {
    const k = e.target.closest('.keycap');
    if (k) { SettingsUI.listening = { scheme: k.dataset.scheme, action: k.dataset.action }; setMsg(''); renderSettings(); return; }
    const r = e.target.closest('[data-reset]');
    if (r) { Controls.reset(r.dataset.reset); SettingsUI.listening = null; setMsg('Teclas restauradas.'); renderSettings(); initHelp(); }
  });
  $('#setSound').onclick = () => { toggleMute(); renderSettings(); };
  // captura a próxima tecla apertada (antes de qualquer outro atalho)
  addEventListener('keydown', e => {
    const L = SettingsUI.listening;
    if (!L || App.screen !== 'settings') return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (e.code === 'Escape') { SettingsUI.listening = null; setMsg(''); renderSettings(); return; }
    const a = ACTIONS.find(x => x.id === L.action);
    if (!Controls.set(L.scheme, L.action, e.code)) { setMsg(`A tecla ${keyName(e.code)} é reservada (pausa/som). Escolha outra.`, true); return; }
    SettingsUI.listening = null;
    setMsg(`${a.name}: agora é ${keyName(e.code)}.`);
    renderSettings(); initHelp();
  }, true);
}
