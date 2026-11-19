'use strict';
// Multiplayer online ponto-a-ponto (WebRTC via PeerJS).
// O anfitrião roda a simulação; os convidados mandam comandos e recebem o estado ~20x por segundo.

const ROOM_PREFIX = 'pavio-curto-v1-';

const Net = {
  peer: null, isHost: false, conns: new Map(), hostConn: null,
  onMsg: () => { }, onJoin: () => { }, onLeave: () => { }, onError: () => { },

  available() { return typeof window.Peer === 'function'; },

  makeCode() {
    const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = ''; for (let i = 0; i < 5; i++) s += abc[Math.floor(Math.random() * abc.length)];
    return s;
  },

  host(cb) {
    this.close();
    this.isHost = true;
    const code = this.makeCode();
    const peer = this.peer = new Peer(ROOM_PREFIX + code);
    let opened = false;
    peer.on('open', () => { opened = true; cb(null, code); });
    peer.on('error', err => { if (!opened) cb(err); else this.onError(err); });
    peer.on('connection', conn => {
      conn.on('open', () => { this.conns.set(conn.peer, conn); this.onJoin(conn); });
      conn.on('data', d => this.onMsg(d, conn));
      conn.on('close', () => { if (this.conns.delete(conn.peer)) this.onLeave(conn); });
      conn.on('error', () => { if (this.conns.delete(conn.peer)) this.onLeave(conn); });
    });
  },

  join(code, cb) {
    this.close();
    this.isHost = false;
    const peer = this.peer = new Peer();
    let done = false;
    const finish = err => { if (!done) { done = true; cb(err); } };
    peer.on('open', () => {
      const conn = peer.connect(ROOM_PREFIX + code.toUpperCase().trim(), { reliable: true, serialization: 'json' });
      this.hostConn = conn;
      conn.on('open', () => finish(null));
      conn.on('data', d => this.onMsg(d, conn));
      conn.on('close', () => { if (done) this.onLeave(conn); });
      setTimeout(() => finish(new Error('timeout')), 12000);
    });
    peer.on('error', err => { if (!done) finish(err); else this.onError(err); });
  },

  send(msg) { if (this.hostConn && this.hostConn.open) this.hostConn.send(msg); },
  sendTo(conn, msg) { if (conn && conn.open) conn.send(msg); },
  broadcast(msg) { for (const c of this.conns.values()) if (c.open) c.send(msg); },

  close() {
    const p = this.peer;
    this.peer = null; this.hostConn = null; this.conns = new Map();
    if (p) { try { p.destroy(); } catch { } }
  },
};

function netErrorText(err) {
  const t = err && err.type;
  if (t === 'peer-unavailable') return 'Sala não encontrada. Confira o código.';
  if (t === 'unavailable-id') return 'Código em uso, tente criar de novo.';
  if (t === 'network' || t === 'server-error' || t === 'socket-error') return 'Sem conexão com o servidor de salas. Verifique a internet.';
  if (t === 'browser-incompatible') return 'Seu navegador não suporta WebRTC.';
  if (err && err.message === 'timeout') return 'Tempo esgotado ao conectar.';
  return 'Erro de conexão' + (t ? ` (${t})` : '') + '.';
}
