'use strict';
// Coração desenhado (centro x, y; s = raio aproximado)
function heartShape(ctx, x, y, s, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y + s * 1.05);
  ctx.bezierCurveTo(x - s * 1.6, y - s * 0.1, x - s * 0.9, y - s * 1.35, x, y - s * 0.45);
  ctx.bezierCurveTo(x + s * 0.9, y - s * 1.35, x + s * 1.6, y - s * 0.1, x, y + s * 1.05);
  ctx.fill();
}
// Formas básicas reutilizadas por todos os desenhos.

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}
function ell(ctx, x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), 0, 0, Math.PI * 2); ctx.fill(); }
function circ(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); ctx.fill(); }
// Polígono com pontos em "unidades" (multiplicados por u)
function poly(ctx, pts, u) { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x * u, y * u) : ctx.moveTo(x * u, y * u)); ctx.closePath(); }
// Labareda (gota de fogo apontando para cima)
function tongue(ctx, x, y, w, h) {
  ctx.beginPath(); ctx.moveTo(x - w, y);
  ctx.quadraticCurveTo(x - w, y - h * 0.6, x, y - h);
  ctx.quadraticCurveTo(x + w, y - h * 0.6, x + w, y);
  ctx.quadraticCurveTo(x, y + w * 0.6, x - w, y); ctx.fill();
}
function emojiFont(px) { return `${Math.round(px)}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`; }
