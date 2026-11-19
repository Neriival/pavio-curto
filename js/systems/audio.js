'use strict';
// Efeitos sonoros sintetizados com Web Audio (sem arquivos de áudio).

const Sfx = {
  ctx: null, master: null, noiseBuf: null, lastBoom: 0,
  muted: (() => { try { return localStorage.getItem('pc_muted') === '1'; } catch { return false; } })(),
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.gain.value = 0.32;
    this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    try { this.muted = localStorage.getItem('pc_muted') === '1'; } catch { }
  },
  toggle() {
    this.muted = !this.muted;
    try { localStorage.setItem('pc_muted', this.muted ? '1' : '0'); } catch { }
    return this.muted;
  },
  tone(f, dur, type = 'square', vol = 0.25, to = null, delay = 0) {
    const c = this.ctx, t0 = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(this.master); o.start(t0); o.stop(t0 + dur + 0.02);
  },
  noise(dur, vol, freq, delay = 0) {
    const c = this.ctx, t0 = c.currentTime + delay;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.setValueAtTime(freq, t0); f.frequency.exponentialRampToValueAtTime(80, t0 + dur);
    const g = c.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t0); s.stop(t0 + dur + 0.02);
  },
  play(name) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    switch (name) {
      case 'place': this.tone(420, 0.08, 'triangle', 0.25, 220); break;
      case 'boom':
        if (now - this.lastBoom < 0.05) return; this.lastBoom = now;
        this.noise(0.6, 0.7, 2400); this.tone(110, 0.4, 'sine', 0.5, 35); break;
      case 'kick': this.tone(180, 0.1, 'square', 0.18, 90); break;
      case 'power': [660, 880, 1320].forEach((f, i) => this.tone(f, 0.09, 'square', 0.12, null, i * 0.06)); break;
      case 'die': this.tone(700, 0.7, 'sawtooth', 0.18, 60); break;
      case 'hurt': this.tone(520, 0.18, 'sawtooth', 0.18, 180); break;
      case 'cast': this.tone(900, 0.18, 'sine', 0.15, 1600); break;
      case 'spell_gelo': this.tone(1800, 0.3, 'sine', 0.15, 900); this.noise(0.25, 0.08, 7000); break;
      case 'spell_mato': this.tone(160, 0.25, 'triangle', 0.25, 260); break;
      case 'spell_fogo': this.noise(0.4, 0.25, 1800); break;
      case 'spell_raio': this.noise(0.35, 0.4, 6000); this.tone(1400, 0.2, 'sawtooth', 0.15, 200); break;
      case 'spell_agua': this.noise(0.45, 0.22, 900); this.tone(500, 0.25, 'sine', 0.15, 250); break;
      case 'aim': this.tone(1100, 0.06, 'square', 0.08); break;
      case 'jump': this.tone(300, 0.2, 'square', 0.12, 700); break;
      case 'dismount': this.tone(400, 0.3, 'triangle', 0.2, 120); break;
      case 'heal': [660, 990].forEach((f, i) => this.tone(f, 0.12, 'sine', 0.15, null, i * 0.08)); break;
      case 'buy': [784, 988, 1319].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.18, null, i * 0.07)); break;
      case 'error': this.tone(180, 0.2, 'square', 0.12); break;
      case 'pop': this.tone(900, 0.12, 'sine', 0.25, 200); this.noise(0.12, 0.15, 3000); break;
      case 'hit': this.tone(300, 0.1, 'square', 0.2, 150); break;
      case 'shield': this.tone(1200, 0.25, 'sine', 0.2, 400); break;
      case 'fizz': this.noise(0.2, 0.15, 5000); break;
      case 'tick': this.tone(520, 0.12, 'square', 0.15); break;
      case 'go': this.tone(880, 0.25, 'square', 0.18); break;
      case 'open': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.15, 'triangle', 0.2, null, i * 0.08)); break;
      case 'spawn': this.tone(200, 0.3, 'sine', 0.2, 500); break;
      case 'thud': this.noise(0.12, 0.12, 600); break;
      case 'hurry': [0, 0.2, 0.4, 0.6].forEach((d, i) => this.tone(i % 2 ? 740 : 988, 0.16, 'square', 0.15, null, d)); break;
      case 'roundwin': case 'clear': [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.14, 'square', 0.13, null, i * 0.1)); break;
      case 'win': [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.2, 'triangle', 0.2, null, i * 0.13)); break;
      case 'draw': case 'lose': [440, 392, 349, 262].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.2, null, i * 0.18)); break;
    }
  },
};
addEventListener('pointerdown', () => Sfx.init());
addEventListener('keydown', () => Sfx.init());
