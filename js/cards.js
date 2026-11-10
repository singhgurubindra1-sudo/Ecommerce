// Draws the product cards (placeholder garment illustrations) onto canvases.

const W = 640, H = 880;

function mix(hex, target, t) {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(v + (target - v) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
const lum = hex => { const n = parseInt(hex.slice(1), 16); return ((n >> 16) * .3 + ((n >> 8) & 255) * .59 + (n & 255) * .11) / 255; };

// Garment outlines in a 100 x 124 box. Each returns { body, details(ctx) }.
const SHAPES = {
  tee: () => ({
    body: 'M36 18 Q50 27 64 18 L87 30 L79 50 L68 44 L68 106 L32 106 L32 44 L21 50 L13 30 Z',
    lines: ['M36 18 Q50 30 64 18', 'M32 101 L68 101'],
  }),
  knit: () => ({
    body: 'M37 18 Q50 26 63 18 L82 27 L93 90 L81 93 L71 50 L71 106 L29 106 L29 50 L19 93 L7 90 L18 27 Z',
    lines: ['M37 18 Q50 29 63 18', 'M29 99 L71 99', 'M8.5 85 L20.5 88', 'M91.5 85 L79.5 88',
      ...[34, 39, 44, 50, 56, 61, 66].map(x => `M${x} 99 L${x} 106`)],
  }),
  shirt: () => ({
    body: 'M38 15 L50 21 L62 15 L82 25 L92 90 L81 93 L71 50 L72 110 L28 110 L29 50 L19 93 L8 90 L18 25 Z',
    lines: ['M50 21 L50 110', 'M38 15 L43 27 L50 21 L57 27 L62 15', 'M9 85 L20 88', 'M91 85 L80 88', 'M56 46 L64 46 L64 55 L56 55 Z'],
    dots: [[50, 32], [50, 46], [50, 60], [50, 74], [50, 88]],
  }),
  dress: () => ({
    body: 'M39 8 L42 8 L43 24 Q50 34 57 24 L58 8 L61 8 L64 30 Q61 42 63 50 L84 114 Q50 122 16 114 L37 50 Q39 42 36 30 Z',
    lines: ['M37 50 Q50 54 63 50'],
    folds: ['M44 58 Q40 90 30 116', 'M50 58 L50 118', 'M56 58 Q60 90 70 116'],
  }),
  trousers: () => ({
    body: 'M30 8 L70 8 L79 116 L56 116 L50 42 L44 116 L21 116 Z',
    lines: ['M30 15 L70 15', 'M50 15 L50 42', 'M36 15 Q37 26 31 30', 'M64 15 Q63 26 69 30'],
    folds: ['M38 20 L33 114', 'M62 20 L67 114'],
    dots: [[50, 11.5]],
  }),
  skirt: () => ({
    body: 'M33 22 L67 22 L86 108 Q50 118 14 108 Z',
    lines: ['M32 29 L68 29'],
    folds: ['M40 29 L27 111', 'M45 29 L39 113', 'M50 29 L50 114', 'M55 29 L61 113', 'M60 29 L73 111'],
  }),
  coat: () => ({
    body: 'M38 9 L50 16 L62 9 L83 20 L93 94 L81 97 L72 46 L76 120 L24 120 L28 46 L19 97 L7 94 L17 20 Z',
    lines: ['M38 9 L33 30 L48 52 L48 120', 'M62 9 L67 30 L48 52', 'M33 30 L40 31', 'M67 30 L60 31', 'M30 78 L42 78', 'M70 78 L58 78'],
    dots: [[52, 60], [52, 74], [52, 88]],
  }),
  blazer: () => ({
    body: 'M38 12 L50 19 L62 12 L83 23 L92 88 L80 91 L72 48 L75 102 L25 102 L28 48 L20 91 L8 88 L17 23 Z',
    lines: ['M38 12 L32 34 L49 62 L49 102', 'M62 12 L68 34 L49 62', 'M32 34 L39 35', 'M68 34 L61 35', 'M30 80 L43 80', 'M70 80 L57 80', 'M58 48 L66 47'],
    dots: [[53, 68]],
  }),
};

function star(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x + r * .12, y - r * .12, x + r * .72, y);
  ctx.quadraticCurveTo(x + r * .12, y + r * .12, x, y + r);
  ctx.quadraticCurveTo(x - r * .12, y + r * .12, x - r * .72, y);
  ctx.quadraticCurveTo(x - r * .12, y - r * .12, x, y - r);
  ctx.fill();
}

export function drawCard(p, index) {
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');

  // ground
  const g = ctx.createLinearGradient(0, 0, W * .3, H);
  g.addColorStop(0, p.bg[0]); g.addColorStop(1, p.bg[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const light = lum(p.bg[0]) > .6;
  const ink = light ? '#170b3d' : '#fff6ec';

  // soft diagonal light, echoing the logo backdrop
  ctx.save();
  ctx.globalAlpha = .16;
  const d = ctx.createLinearGradient(0, 0, W, H * .7);
  d.addColorStop(0, 'rgba(255,255,255,0)'); d.addColorStop(.45, 'rgba(255,255,255,.9)'); d.addColorStop(.62, 'rgba(255,255,255,0)');
  ctx.fillStyle = d; ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // garment
  const s = SHAPES[p.type]();
  const k = 4.9, ox = (W - 100 * k) / 2, oy = 130;
  const body = new Path2D(s.body);
  ctx.save();
  ctx.translate(ox, oy); ctx.scale(k, k);
  ctx.save();
  ctx.shadowColor = 'rgba(15,5,45,.38)'; ctx.shadowBlur = 46; ctx.shadowOffsetY = 26; ctx.shadowOffsetX = 8;
  const fg = ctx.createLinearGradient(8, 0, 92, 0);
  fg.addColorStop(0, mix(p.color, 0, .22)); fg.addColorStop(.3, p.color);
  fg.addColorStop(.62, mix(p.color, 255, .1)); fg.addColorStop(1, mix(p.color, 0, .26));
  ctx.fillStyle = fg; ctx.fill(body);
  ctx.restore();

  ctx.save(); ctx.clip(body);
  const darkGarment = lum(p.color) < .45;
  const lineCol = darkGarment ? mix(p.color, 255, .28) : mix(p.color, 0, .3);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = lineCol; ctx.globalAlpha = .28; ctx.lineWidth = 1.6;
  (s.folds || []).forEach(f => ctx.stroke(new Path2D(f)));
  // vertical sheen
  const sh = ctx.createLinearGradient(0, 0, 0, 124);
  sh.addColorStop(0, 'rgba(255,255,255,.10)'); sh.addColorStop(1, 'rgba(0,0,0,.16)');
  ctx.globalAlpha = 1; ctx.fillStyle = sh; ctx.fillRect(0, 0, 100, 124);
  ctx.restore();

  ctx.strokeStyle = lineCol; ctx.fillStyle = lineCol; ctx.lineWidth = .55; ctx.globalAlpha = .85;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  (s.lines || []).forEach(l => ctx.stroke(new Path2D(l)));
  (s.dots || []).forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 1, 0, 7); ctx.fill(); });
  ctx.restore();

  // labels
  ctx.fillStyle = ink;
  ctx.font = '400 19px Jost, sans-serif';
  ctx.textBaseline = 'middle';
  if ('letterSpacing' in ctx) ctx.letterSpacing = '5px';
  ctx.fillText(`FM · ${String(index + 1).padStart(2, '0')}`, 40, 52);
  ctx.textAlign = 'right';
  ctx.fillText(p.cat.toUpperCase(), W - 40, H - 46);
  ctx.textAlign = 'left';
  ctx.font = 'italic 400 30px "Cormorant Garamond", serif';
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  ctx.fillText(p.tone, 40, H - 48);
  star(ctx, W - 54, 52, 17);

  // hairline frame
  ctx.globalAlpha = .3; ctx.strokeStyle = ink; ctx.lineWidth = 1.5;
  ctx.strokeRect(18, 18, W - 36, H - 36);
  return cv;
}

// Draw a real product photo (cover-fit) instead of the illustration.
export function drawPhotoCard(img) {
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const r = Math.max(W / img.width, H / img.height);
  ctx.drawImage(img, (W - img.width * r) / 2, (H - img.height * r) / 2, img.width * r, img.height * r);
  return cv;
}

export function starSprite() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#fff';
  star(ctx, 32, 32, 30);
  return cv;
}
