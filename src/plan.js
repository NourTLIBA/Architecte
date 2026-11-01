// 2D architectural sheets (A3 landscape) drawn from the project data.
// Everything is a list of vector primitives in millimetres on paper, rendered to SVG for the screen
// and to a hand-written PDF (Helvetica, vector) for download. No external library.
import { PROJECT, LEVELS, GRID, CORES, SITE, ROOF_ELEV, allZones, zoneArea } from './data.js';

const INK = '#1d1d1f', GREY = '#8a929c', PAPER = '#ffffff', BLUE = '#0058a3', RED = '#d9453a';
const TINT = { care: '#e4edf6', amber: '#faf0cf', teal: '#dcefec', grey: '#eceef1', circ: '#f5f6f8', core: '#d5d9de' };
const TYPE_TINT = { soin: TINT.care, bloc: TINT.care, imagerie: TINT.care, hospit: TINT.care, reeduc: TINT.amber, psy: TINT.amber, recherche: TINT.teal, public: TINT.teal, logistique: TINT.grey, technique: TINT.grey, circulation: TINT.circ, noyau: TINT.core };
const PT = 25.4 / 72; // mm per point

// ---------------------------------------------------------------- text metrics (Helvetica)
const HW = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
const EXTRA = { '²': 333, '×': 584, '°': 400, '—': 1000, '–': 556, '’': 222, '·': 278, '±': 584, '«': 556, '»': 556, '…': 1000, ' ': 278 };
function cw(ch) {
  const c = ch.charCodeAt(0);
  if (c >= 32 && c <= 126) return HW[c - 32];
  if (EXTRA[ch]) return EXTRA[ch];
  const b = ch.normalize('NFD').charCodeAt(0);
  return b >= 32 && b <= 126 ? HW[b - 32] : 556;
}
const tw = (s, size, bold = false) => [...s].reduce((a, ch) => a + cw(ch), 0) / 1000 * size * PT * (bold ? 1.06 : 1);
function wrap(str, maxW, size, bold) {
  const lines = []; let cur = '';
  str.split(' ').forEach(w => {
    const t = cur ? cur + ' ' + w : w;
    if (cur && tw(t, size, bold) > maxW) { lines.push(cur); cur = w; } else cur = t;
  });
  if (cur) lines.push(cur);
  return lines;
}
const fr = (n, d = 1) => { const [i, f] = Number(n).toFixed(d).split('.'); return i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (f ? ',' + f : ''); };
const sgn = v => (v >= 0 ? '+' : '−') + fr(Math.abs(v), 2);

// ---------------------------------------------------------------- sheet model
class Sheet {
  constructor(id, label, title, sub, scale) { Object.assign(this, { id, label, title, sub, scale }); this.items = []; }
  line(x1, y1, x2, y2, w = 0.25, c = INK, dash = null) { this.items.push({ t: 'l', x1, y1, x2, y2, w, c, dash }); }
  poly(pts, { fill = null, stroke = INK, w = 0.25, close = true, dash = null } = {}) { this.items.push({ t: 'p', pts, fill, stroke, w, close, dash }); }
  rect(x, y, w, h, o) { this.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], o); }
  circle(cx, cy, r, o) { this.poly(arc(cx, cy, r, 0, Math.PI * 2, 32), o); }
  text(x, y, str, { size = 6, anchor = 'start', bold = false, rot = 0, c = INK } = {}) { this.items.push({ t: 't', x, y, str, size, anchor, bold, rot, c }); }
  stack(cx, cy, lines) { // centred block of text lines [{t,size,bold,c}]
    const hs = lines.map(l => (l.size || 5.5) * PT * 1.3), tot = hs.reduce((a, b) => a + b, 0);
    let y = cy - tot / 2;
    lines.forEach((l, i) => { y += hs[i]; this.text(cx, y - hs[i] * 0.25, l.t, { size: l.size || 5.5, bold: l.bold, c: l.c || INK, anchor: 'middle' }); });
  }
}
function arc(cx, cy, r, a0, a1, n = 14) {
  return Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; });
}
function hatch(s, x, y, w, h, gap = 2, c = '#9aa0a8', wt = 0.15) {
  for (let t = gap; t < w + h; t += gap) {
    const u1 = Math.min(w, t), u0 = Math.max(0, t - h);
    s.line(x + u1, y + t - u1, x + u0, y + t - u0, wt, c);
  }
}
const tick = (s, x, y) => s.line(x - 1, y + 1, x + 1, y - 1, 0.5);
function dimH(s, x1, x2, y, txt, ext) {
  const d = y < ext ? -1 : 1;
  [x1, x2].forEach(x => s.line(x, ext + d * 1, x, y + d * 1.6, 0.18));
  s.line(x1 - 1.5, y, x2 + 1.5, y, 0.25); tick(s, x1, y); tick(s, x2, y);
  s.text((x1 + x2) / 2, y - 0.9, txt, { size: 6, anchor: 'middle' });
}
function dimV(s, x, y1, y2, txt, ext) {
  const d = x < ext ? -1 : 1;
  [y1, y2].forEach(y => s.line(ext + d * 1, y, x + d * 1.6, y, 0.18));
  s.line(x, y1 - 1.5, x, y2 + 1.5, 0.25); tick(s, x, y1); tick(s, x, y2);
  s.text(x - 0.9, (y1 + y2) / 2, txt, { size: 6, anchor: 'middle', rot: -90 });
}
function arrow(s, x1, y1, x2, y2, w = 0.3) {
  s.line(x1, y1, x2, y2, w);
  const a = Math.atan2(y2 - y1, x2 - x1), L = 2.2;
  s.poly([[x2, y2], [x2 - L * Math.cos(a - 0.35), y2 - L * Math.sin(a - 0.35)], [x2 - L * Math.cos(a + 0.35), y2 - L * Math.sin(a + 0.35)]], { fill: INK, stroke: null });
}
function northArrow(s, x, y) {
  s.circle(x, y, 7, { w: 0.3 });
  s.poly([[x, y - 6], [x + 3, y + 5], [x, y + 3], [x - 3, y + 5]], { fill: INK, stroke: null });
  s.text(x, y - 9, 'N', { size: 9, bold: true, anchor: 'middle' });
}
function scaleBar(s, x, y, mmPerM, meters) {
  s.text(x, y - 3, `Échelle ${s.scale}`, { size: 7, bold: true });
  let acc = 0;
  meters.forEach((m, i) => {
    s.rect(x + acc * mmPerM, y, (m - acc) * mmPerM, 2, { fill: i % 2 ? PAPER : INK, w: 0.2 });
    s.text(x + acc * mmPerM, y + 5.5, String(acc), { size: 5.5, anchor: 'middle' });
    acc = m;
  });
  s.text(x + acc * mmPerM, y + 5.5, `${acc} m`, { size: 5.5, anchor: 'middle' });
}

// ---------------------------------------------------------------- sheet frame, title block, legend
function frame(s, no, total) {
  s.rect(10, 10, 400, 277, { w: 0.7 });
  s.text(14, 21, s.title, { size: 16, bold: true });
  s.text(14, 28, s.sub, { size: 8, c: '#4a5058' });
  const x = 230, y = 245, w = 180, h = 42;
  s.rect(x, y, w, h, { w: 0.5 });
  s.line(x, y + 14, x + w, y + 14, 0.25); s.line(x, y + 28, x + w, y + 28, 0.25);
  s.text(x + 2, y + 4, 'Projet', { size: 5, c: GREY });
  s.text(x + 2, y + 10, PROJECT.name, { size: 8.5, bold: true });
  s.text(x + w - 2, y + 10, PROJECT.status, { size: 5.5, anchor: 'end', c: '#8a6a00' });
  s.text(x + 2, y + 18, 'Plan', { size: 5, c: GREY });
  s.text(x + 2, y + 25, s.title, { size: 8.5, bold: true });
  const cells = [['Échelle', s.scale], ['Format', 'A3'], ['Date', PROJECT.date], ['Indice', PROJECT.index], ['Planche', `${no} / ${total}`]];
  const cwid = w / cells.length;
  cells.forEach(([k, v], i) => {
    if (i) s.line(x + i * cwid, y + 28, x + i * cwid, y + h, 0.25);
    s.text(x + i * cwid + 2, y + 32, k, { size: 5, c: GREY });
    s.text(x + i * cwid + 2, y + 38.5, v, { size: 8, bold: true });
  });
}

function legend(s, items) {
  s.text(14, 250, 'Légende', { size: 7, bold: true });
  items.forEach((it, i) => {
    const col = Math.floor(i / 5), row = i % 5, x = 14 + col * 72, y = 255 + row * 6.4;
    it.draw(s, x, y);
    s.text(x + 11, y + 2.1, it.label, { size: 5.8 });
  });
}
const swatch = (fill, hatched) => (s, x, y) => { s.rect(x, y, 8, 3.2, { fill, w: 0.2 }); if (hatched) hatch(s, x, y, 8, 3.2, 1.3, INK, 0.12); };
const L_BUILDING = [
  { label: 'Soins et hospitalisation', draw: swatch(TINT.care) },
  { label: 'Réadaptation et psychiatrie', draw: swatch(TINT.amber) },
  { label: 'Recherche et accueil', draw: swatch(TINT.teal) },
  { label: 'Support et technique', draw: swatch(TINT.grey) },
  { label: 'Circulation', draw: swatch(TINT.circ) },
  { label: 'Mur porteur, poteau', draw: (s, x, y) => s.rect(x, y, 8, 2, { fill: INK, stroke: null }) },
  { label: 'Façade vitrée', draw: (s, x, y) => [0, 0.9, 1.8].forEach(d => s.line(x, y + d, x + 8, y + d, 0.18)) },
  { label: 'Porte (débattement)', draw: (s, x, y) => { s.line(x, y + 3, x, y, 0.3); s.poly(arc(x, y + 3, 3, 0, -Math.PI / 2, 8), { close: false, w: 0.18, stroke: INK }); } },
  { label: 'Escalier (monte)', draw: (s, x, y) => { s.rect(x, y, 8, 3.2, { w: 0.2 }); for (let i = 1; i < 8; i++) s.line(x + i, y, x + i, y + 3.2, 0.12); } },
  { label: 'Ascenseur', draw: (s, x, y) => { s.rect(x + 2, y, 4, 3.2, { w: 0.25 }); s.line(x + 2, y, x + 6, y + 3.2, 0.2); s.line(x + 6, y, x + 2, y + 3.2, 0.2); } },
  { label: 'Axe de trame', draw: (s, x, y) => s.line(x, y + 1.6, x + 8, y + 1.6, 0.18, GREY, [4, 1, 1, 1]) },
];

// ---------------------------------------------------------------- building helpers
const K = 5, OX = 60, OY = 68; // 1:200 -> 5 mm per metre
const X = bx => OX + bx * K, Y = bz => OY + bz * K;
const BAYS = Array.from({ length: GRID.bays + 1 }, (_, i) => i * GRID.bay);

function axesAndDims(s) {
  BAYS.forEach((bx, i) => {
    s.line(X(bx), OY - 16, X(bx), OY + GRID.depth * K + 8, 0.18, GREY, [6, 1.4, 1, 1.4]);
    s.circle(X(bx), OY - 21, 4, { w: 0.3, fill: PAPER });
    s.text(X(bx), OY - 19.4, String.fromCharCode(65 + i), { size: 8, bold: true, anchor: 'middle' });
  });
  GRID.bz.forEach((bz, i) => {
    s.line(OX - 17, Y(bz), OX + GRID.width * K + 8, Y(bz), 0.18, GREY, [6, 1.4, 1, 1.4]);
    s.circle(OX - 21, Y(bz), 4, { w: 0.3, fill: PAPER });
    s.text(OX - 21, Y(bz) + 1.6, String(i + 1), { size: 8, bold: true, anchor: 'middle' });
  });
  for (let i = 0; i < BAYS.length - 1; i++) dimH(s, X(BAYS[i]), X(BAYS[i + 1]), OY - 7, fr(GRID.bay, 2), OY - 1);
  dimH(s, X(0), X(GRID.width), OY - 13, fr(GRID.width, 2), OY - 1);
  for (let i = 0; i < GRID.bz.length - 1; i++) dimV(s, OX - 7, Y(GRID.bz[i]), Y(GRID.bz[i + 1]), fr(GRID.bz[i + 1] - GRID.bz[i], 2), OX - 1);
  dimV(s, OX - 13, Y(0), Y(GRID.depth), fr(GRID.depth, 2), OX - 1);
}

function levelMark(s, x, y, elev) {
  s.poly([[x - 2.2, y - 3.6], [x + 2.2, y - 3.6], [x, y]], { fill: INK, stroke: null });
  s.line(x - 2.2, y - 3.6, x + 12, y - 3.6, 0.25);
  s.text(x + 3.5, y - 4.4, sgn(elev), { size: 7, bold: true });
}

function door(s, bx, bz, w, dir, hinge = 'L') {
  const r = w * K, hx = hinge === 'L' ? X(bx) : X(bx) + r, hy = Y(bz);
  s.rect(X(bx) + 0.2, hy - 0.5, r - 0.4, 1, { fill: PAPER, stroke: null });
  const a0 = hinge === 'L' ? 0 : Math.PI, a1 = a0 + (hinge === 'L' ? dir : -dir) * Math.PI / 2;
  s.line(hx, hy, hx + r * Math.cos(a1), hy + r * Math.sin(a1), 0.3);
  s.poly(arc(hx, hy, r, a0, a1, 10), { close: false, w: 0.18, fill: null });
}

function stairs(s, bx0, bx1, bz0, bz1, alongX) {
  s.rect(X(bx0), Y(bz0), (bx1 - bx0) * K, (bz1 - bz0) * K, { w: 0.3, fill: PAPER });
  if (alongX) for (let x = bx0 + 0.3; x < bx1 - 0.01; x += 0.3) s.line(X(x), Y(bz0), X(x), Y(bz1), 0.12);
  else for (let z = bz0 + 0.3; z < bz1 - 0.01; z += 0.3) s.line(X(bx0), Y(z), X(bx1), Y(z), 0.12);
  if (alongX) { arrow(s, X(bx0) + 2, Y((bz0 + bz1) / 2), X(bx1) - 2, Y((bz0 + bz1) / 2)); s.text(X(bx0) + 2, Y(bz0) - 1, 'MONTE', { size: 5 }); }
  else { arrow(s, X((bx0 + bx1) / 2), Y(bz1) - 2, X((bx0 + bx1) / 2), Y(bz0) + 2); s.text(X(bx1) + 1.4, Y(bz1) - 1, 'MONTE', { size: 5, rot: -90 }); }
}

function lift(s, bx, w, bz, d) {
  s.rect(X(bx), Y(bz), w * K, d * K, { w: 0.3 });
  s.line(X(bx), Y(bz), X(bx + w), Y(bz + d), 0.2); s.line(X(bx + w), Y(bz), X(bx), Y(bz + d), 0.2);
}

function envelope(s, lv) {
  const t = 0.3;
  // east and west walls (poché), east opening at ground level for ambulances
  s.rect(X(-t), Y(-t), t * K, (GRID.depth + 2 * t) * K, { fill: INK, stroke: null });
  const eastGaps = lv.id === 'RDC' ? [[16, 19]] : [];
  let z0 = -t;
  eastGaps.forEach(([a, b]) => { s.rect(X(GRID.width), Y(z0), t * K, (a - z0) * K, { fill: INK, stroke: null }); z0 = b; });
  s.rect(X(GRID.width), Y(z0), t * K, (GRID.depth + t - z0) * K, { fill: INK, stroke: null });
  eastGaps.forEach(([a, b]) => {
    const r = (b - a) * K, hx = X(GRID.width), hy = Y(a);
    s.rect(hx - 0.2, hy + 0.2, t * K + 0.4, r - 0.4, { fill: PAPER, stroke: null });
    s.line(hx, hy, hx - r, hy, 0.3);
    s.poly(arc(hx, hy, r, Math.PI, Math.PI / 2, 10), { close: false, w: 0.18, fill: null });
  });
  // north glass façade: three thin lines + mullion ticks
  [-t, -t / 2, 0].forEach(d => s.line(X(-t), Y(d), X(GRID.width + t), Y(d), 0.18));
  for (let b = 0; b <= GRID.width + 0.01; b += 1.875) s.line(X(b), Y(-t), X(b), Y(0), 0.12);
  // south wall with window openings, entrance on the ground level
  let x = 0;
  for (let k = 0; k < GRID.bays; k++) {
    const g0 = k * GRID.bay + 1.25, g1 = k * GRID.bay + 6.25;
    const solid = [[x, g0]];
    if (!(lv.id === 'RDC' && k === 2)) solid.push([g1, (k + 1) * GRID.bay + (k === GRID.bays - 1 ? 0 : 1.25)]);
    solid.forEach(([a, b]) => s.rect(X(a), Y(GRID.depth), (b - a) * K, t * K, { fill: INK, stroke: null }));
    [0, 0.15, 0.3].forEach(d => s.line(X(g0), Y(GRID.depth + d), X(g1), Y(GRID.depth + d), 0.18));
    x = g1;
  }
  if (lv.id === 'RDC') {
    // entrance: solid piece between bays C-D replaced by a double door
    s.rect(X(21.25), Y(GRID.depth), 2.5 * K, t * K, { fill: PAPER, stroke: null });
    [['L', 21.25], ['R', 22.5]].forEach(([h, b]) => {
      const r = 1.25 * K, hx = h === 'L' ? X(b) : X(b) + r, hy = Y(GRID.depth);
      const a0 = h === 'L' ? 0 : Math.PI, a1 = a0 + (h === 'L' ? -1 : 1) * Math.PI / 2;
      s.line(hx, hy, hx + r * Math.cos(a1), hy + r * Math.sin(a1), 0.3);
      s.poly(arc(hx, hy, r, a0, a1, 10), { close: false, w: 0.18, fill: null });
    });
  }
  // columns
  BAYS.forEach(bx => GRID.bz.forEach(bz => s.rect(X(bx) - 1.25, Y(bz) - 1.25, 2.5, 2.5, { fill: INK, stroke: null })));
}

// ---------------------------------------------------------------- level sheet
const TAG_AT = { 'rdc-imagerie': null, 'r1-bloc': [33.75, 9.4], 'r4-audit': [12.75, 1.5], 'r1-steri': [26.4, 17.9], 'r2-nchir': null, 'r2-neuro': null, 'r2-ville1': null, 'r2-ville2': null };

function levelSheet(lv, i, total) {
  const s = new Sheet(lv.id, lv.id, `Plan du niveau ${lv.id}`, `${lv.label} · cote ${sgn(lv.elev)} m · ${PROJECT.name}`, '1:200');
  const zones = allZones(lv);

  zones.forEach(z => {
    const t = z.type, w = (z.bx1 - z.bx0) * K, h = (z.bz1 - z.bz0) * K;
    s.rect(X(z.bx0), Y(z.bz0), w, h, { fill: TYPE_TINT[t], stroke: null });
    if (z.id === 'r4-terrasse') hatch(s, X(z.bx0), Y(z.bz0), w, h, 2.2, '#9aa0a8');
  });
  zones.forEach(z => {
    const core = z.type === 'noyau';
    s.rect(X(z.bx0), Y(z.bz0), (z.bx1 - z.bx0) * K, (z.bz1 - z.bz0) * K, { w: core ? 0.8 : 0.3, fill: null });
  });

  // cores
  CORES.forEach(c => {
    c.lifts.forEach(([bx, w]) => lift(s, bx, w, c.bz0 + 1.0, 2.7));
    c.stairs.forEach(([bx, w]) => stairs(s, bx, bx + w, c.bz0 + 5.8, c.bz0 + 8.3, true));
  });
  stairs(s, 0.4, 2.6, 0.5, 10.0, false);
  stairs(s, 57.4, 59.6, 0.5, 10.0, false);

  // patient rooms
  zones.filter(z => z.rooms).forEach(z => {
    const north = z.bz0 === 0, w = (z.bx1 - z.bx0) / z.rooms, rArea = zoneArea(z) / z.rooms;
    for (let k = 0; k < z.rooms; k++) {
      const rx = z.bx0 + k * w;
      if (k) s.line(X(rx), Y(z.bz0), X(rx), Y(z.bz1), 0.3);
      const bz = north ? z.bz1 - 2 : z.bz0;
      s.rect(X(rx + 0.15), Y(bz), 2 * K, 2 * K, { w: 0.2, fill: PAPER });
      for (let b = 0; b < z.perRoom; b++) { const by = north ? 3 : 18.5; s.rect(X(rx + 0.7 + b * 1.2), Y(by), 0.9 * K, 2 * K, { w: 0.18, fill: PAPER }); }
      door(s, rx + 2.4, north ? z.bz1 : z.bz0, 0.9, north ? -1 : 1);
      s.stack(X(rx + w / 2), Y(north ? 6.6 : 16.6), [{ t: `Ch. ${k + 1}`, bold: true, size: 5 }, { t: `${fr(rArea)} m²`, size: 4.6 }, { t: z.perRoom > 1 ? '2 lits' : '1 lit', size: 4.6, c: '#4a5058' }]);
    }
    s.text(X((z.bx0 + z.bx1) / 2), Y(north ? 11.55 : 12.95), `${z.name.replace(/\s*\(.*?\)/, '')} · ${z.rooms} ch. · ${z.rooms * z.perRoom} lits`, { size: 4.8, anchor: 'middle', c: '#4a5058' });
  });

  // special rooms
  if (lv.id === 'RDC') {
    s.rect(X(39), Y(0.75), 7 * K, 9 * K, { w: 0.5, dash: [3, 1] });
    s.stack(X(42.5), Y(5.25), [{ t: 'IRM 1,5 T', bold: true, size: 5.5 }, { t: 'cage de Faraday', size: 4.6 }, { t: '63,0 m²', size: 4.6 }]);
    s.rect(X(48), Y(1.5), 6 * K, 7 * K, { w: 0.5, fill: PAPER });
    hatch(s, X(48), Y(1.5), 6 * K, 7 * K, 1.4, INK, 0.12);
    s.rect(X(49.4), Y(3.4), 3.2 * K, 2.4 * K, { w: 0, stroke: null, fill: PAPER });
    s.stack(X(51), Y(4.6), [{ t: 'Scanner', bold: true, size: 5.5 }, { t: 'murs plombés', size: 4.6 }]);
    s.poly([[X(60), Y(14)], [X(68), Y(14)], [X(68), Y(24)], [X(60), Y(24)]], { close: false, dash: [2, 1.2], w: 0.25, fill: null });
    s.text(X(64), Y(19), 'Auvent ambulances', { size: 5.5, anchor: 'middle' });
    s.text(X(64), Y(20.3), '(en projection)', { size: 4.6, anchor: 'middle', c: GREY });
  }
  if (lv.id === 'R+1') {
    [[23.5, 'Salle 1'], [35, 'Salle 2']].forEach(([bx, name]) => {
      s.rect(X(bx), Y(0.5), 8 * K, 5.6 * K, { w: 0.5, fill: PAPER });
      s.circle(X(bx + 4), Y(3.1), 0.9 * K, { w: 0.25 });
      s.line(X(bx + 4) - 6, Y(3.1), X(bx + 4) + 6, Y(3.1), 0.2); s.line(X(bx + 4), Y(3.1) - 6, X(bx + 4), Y(3.1) + 6, 0.2);
      s.rect(X(bx + 3.6), Y(2.1), 0.8 * K, 2 * K, { w: 0.2, fill: PAPER });
      s.stack(X(bx + 4), Y(5.3), [{ t: `${name} · 44,8 m²`, size: 4.8, bold: true }]);
    });
    s.line(X(23), Y(8.2), X(44), Y(8.2), 0.2, INK, [3, 1.2]);
    s.text(X(44), Y(8.0), 'couloir propre', { size: 4.6, anchor: 'end', c: '#4a5058' });
    s.rect(X(22.2), Y(14.5), 0.6 * K, 8.5 * K, { fill: INK, stroke: null });
    arrow(s, X(16), Y(15.8), X(22), Y(15.8)); s.text(X(16), Y(15.2), 'SALE', { size: 5, bold: true });
    arrow(s, X(23), Y(21.6), X(29), Y(21.6)); s.text(X(23), Y(21), 'PROPRE', { size: 5, bold: true });
  }
  if (lv.id === 'R+4') {
    s.rect(X(3.5), Y(0.4), 18.5 * K, 2.2 * K, { w: 0.3, fill: TINT.core });
    for (let k = 0; k < 8; k++) s.line(X(3.5), Y(3 + k * 0.94), X(22), Y(3 + k * 0.94), 0.15);
    s.rect(X(3.5), Y(3), 18.5 * K, 7.5 * K, { w: 0.3, fill: null });
    s.line(X(52.7), Y(13.7), X(59.8), Y(13.7), 0.25); s.line(X(52.7), Y(23.8), X(59.8), Y(23.8), 0.25); s.line(X(59.8), Y(13.7), X(59.8), Y(23.8), 0.25);
  }

  // doors for the other zones, opening from the corridor
  zones.forEach(z => {
    if (z.rooms || ['circulation', 'noyau'].includes(z.type) || z.id === 'r4-terrasse') return;
    if (z.bz1 === 10.5) door(s, z.bx0 + 1.2, 10.5, 0.9, -1);
    else if (z.bz0 === 13.5) door(s, z.bx0 + 1.2, 13.5, 0.9, 1);
  });

  envelope(s, lv);

  // tags
  zones.forEach(z => {
    if (z.rooms || ['circulation'].includes(z.type) || z.escape) return;
    if (z.id in TAG_AT && TAG_AT[z.id] === null) return;
    const at = TAG_AT[z.id] || [(z.bx0 + z.bx1) / 2, (z.bz0 + z.bz1) / 2];
    const maxW = (z.bx1 - z.bx0) * K - 4;
    const name = z.core ? z.name.split(' — ')[0] : z.name.replace(/\s*\(.*?\)/g, '');
    const lines = wrap(name, maxW, 5.6, true).map(t => ({ t, size: 5.6, bold: true }));
    lines.push({ t: `${fr(zoneArea(z))} m²`, size: 4.8, c: '#4a5058' });
    const cy = z.core ? Y(z.bz0 + 4.85) : Y(at[1]);
    s.stack(X(at[0]), cy, lines);
  });

  axesAndDims(s);
  levelMark(s, OX - 40, Y(17), lv.elev);
  northArrow(s, 396, 44);
  scaleBar(s, OX, 214, K, [5, 10, 15, 20]);
  frame(s, i + 1, total);
  legend(s, L_BUILDING);
  return s;
}

// ---------------------------------------------------------------- roof sheet
function roofSheet(i, total) {
  const s = new Sheet('TOIT', 'Toiture', 'Plan de toiture', `Cote ${sgn(ROOF_ELEV)} m · ${PROJECT.name}`, '1:200');
  const t = 0.3;
  // roof slab outline (terrace of the top level stays open)
  s.poly([[X(0), Y(0)], [X(60), Y(0)], [X(60), Y(13.5)], [X(52.5), Y(13.5)], [X(52.5), Y(24)], [X(0), Y(24)]], { fill: '#f7f8f9', w: 0.8 });
  s.poly([[X(t), Y(t)], [X(60 - t), Y(t)], [X(60 - t), Y(13.5 - t)], [X(52.5 - t), Y(13.5 - t)], [X(52.5 - t), Y(24 - t)], [X(t), Y(24 - t)]], { w: 0.25 });
  hatch(s, X(52.5), Y(13.5), 7.5 * K, 10.5 * K, 2.2, '#b4bac2');
  s.rect(X(52.5), Y(13.5), 7.5 * K, 10.5 * K, { fill: null, dash: [2, 1.2], w: 0.25 });
  s.text(X(56.25), Y(18.6), 'Terrasse R+4', { size: 5.2, anchor: 'middle', bold: true });
  s.text(X(56.25), Y(19.8), '(hors toiture)', { size: 4.6, anchor: 'middle', c: GREY });
  // photovoltaic rows
  for (let k = 0; k < 4; k++) {
    const z = 1.2 + k * 2.5;
    s.rect(X(3), Y(z), 37 * K, 2 * K * 0.98, { fill: TINT.teal, w: 0.3 });
    for (let b = 3; b < 40; b += 1.7) s.line(X(b), Y(z), X(b), Y(z) + 2 * K * 0.98, 0.1);
  }
  s.stack(X(21.5), Y(12.3), [{ t: 'Champ photovoltaïque · environ 90 kWc', size: 5.4, bold: true }, { t: 'inclinaison 10°, orientation sud', size: 4.6, c: '#4a5058' }]);
  // plant zone with acoustic screen
  s.poly([[X(40), Y(0.3)], [X(59.7), Y(0.3)], [X(59.7), Y(13.2)], [X(40), Y(13.2)]], { close: false, w: 0.9, fill: null });
  [[42, 2], [42, 6]].forEach(([bx, bz]) => s.rect(X(bx), Y(bz), 5 * K, 2.5 * K, { fill: TINT.grey, w: 0.3 }));
  [1.5, 4.8, 8.1].forEach(bz => s.rect(X(49), Y(bz), 5 * K, 2.4 * K, { fill: TINT.grey, w: 0.3 }));
  s.circle(X(57), Y(10.5), 1.3 * K, { fill: TINT.grey, w: 0.3 });
  s.text(X(44.5), Y(5.55), 'Groupes froid', { size: 4.6, anchor: 'middle' });
  s.text(X(51.5), Y(2.8), 'CTA', { size: 4.6, anchor: 'middle' }); s.text(X(51.5), Y(6.1), 'CTA', { size: 4.6, anchor: 'middle' }); s.text(X(51.5), Y(9.4), 'CTA', { size: 4.6, anchor: 'middle' });
  s.text(X(57), Y(12.4), 'Tour', { size: 4.6, anchor: 'middle' });
  s.text(X(50), Y(11.7), 'Local technique, écran acoustique h = 3 m', { size: 4.8, anchor: 'middle', c: '#4a5058' });
  // solar thermal
  [16, 22, 38.5, 44.5].forEach(bx => { s.rect(X(bx), Y(14.8), 5 * K, 3 * K, { fill: TINT.amber, w: 0.3 }); for (let b = bx + 1; b < bx + 5; b += 1) s.line(X(b), Y(14.8), X(b), Y(17.8), 0.1); });
  s.stack(X(44.2), Y(19.8), [{ t: 'Solaire thermique · 4 × 15 m² = 60 m²', size: 5.4, bold: true }, { t: 'inclinaison 30°', size: 4.6, c: '#4a5058' }]);
  // lift overruns
  CORES.forEach(c => { s.rect(X(c.bx0), Y(c.bz0), (c.bx1 - c.bx0) * K, (c.bz1 - c.bz0) * K, { fill: TINT.core, w: 0.6 }); s.line(X(c.bx0), Y(c.bz0), X(c.bx1), Y(c.bz1), 0.2); s.line(X(c.bx1), Y(c.bz0), X(c.bx0), Y(c.bz1), 0.2); s.text(X((c.bx0 + c.bx1) / 2), Y(c.bz0) - 1, 'Surélévation ascenseurs', { size: 4.4, anchor: 'middle' }); });
  axesAndDims(s);
  levelMark(s, OX - 40, Y(17), ROOF_ELEV);
  northArrow(s, 396, 44);
  scaleBar(s, OX, 214, K, [5, 10, 15, 20]);
  frame(s, i + 1, total);
  legend(s, [
    { label: 'Panneaux photovoltaïques', draw: swatch(TINT.teal) },
    { label: 'Solaire thermique', draw: swatch(TINT.amber) },
    { label: 'Équipements techniques', draw: swatch(TINT.grey) },
    { label: 'Terrasse accessible (R+4)', draw: swatch(PAPER, true) },
    { label: 'Axe de trame', draw: (s2, x, y) => s2.line(x, y + 1.6, x + 8, y + 1.6, 0.18, GREY, [4, 1, 1, 1]) },
  ]);
  return s;
}

// ---------------------------------------------------------------- site plan 1:500
const SK = 2, SX = 210, SY = 120;
const S = (x, z) => [SX + x * SK, SY + z * SK];

function edgeAt(a, b, v, axis) { // interpolate along an edge of the plot polygon
  const [p, q] = [SITE.polygon[a], SITE.polygon[b]];
  const t = axis === 'x' ? (v - p[0]) / (q[0] - p[0]) : (v - p[1]) / (q[1] - p[1]);
  return axis === 'x' ? p[1] + t * (q[1] - p[1]) : p[0] + t * (q[0] - p[0]);
}

function siteSheet(i, total, data) {
  const s = new Sheet('masse', 'Plan masse', 'Plan masse', PROJECT.name, '1:500');
  const R = SITE.road, zMax = 61;
  const rect = (x0, z0, x1, z1, o) => { const [a, b] = S(x0, z0), [c, d] = S(x1, z1); s.rect(a, b, c - a, d - b, o); };

  // neighbours
  (data.houses || []).forEach(h => {
    if (h.z + h.d / 2 > R.sw0 - 1 || h.z - h.d / 2 < -60 || Math.abs(h.x) > 92) return;
    rect(h.x - h.w / 2, h.z - h.d / 2, h.x + h.w / 2, h.z + h.d / 2, { fill: '#eceef1', stroke: '#b4b9c0', w: 0.15 });
  });
  // road
  rect(R.x0 + 0, R.sw0, R.x1, R.sw1, { fill: '#eceef1', stroke: '#b4b9c0', w: 0.15 });
  rect(-92, R.z0, 92, zMax, { fill: '#dfe2e6', stroke: '#b4b9c0', w: 0.15 });
  s.text(S(-60, 58.2)[0], S(-60, 58.2)[1], 'Voie d’accès', { size: 6, c: '#4a5058' });
  // plot
  s.poly(SITE.polygon.map(([x, z]) => S(x, z)), { fill: '#f6f8f4', w: 0.7, dash: [8, 1.6, 1, 1.6] });
  s.text(...S(-45, 24), `Parcelle ${fr(PROJECT.landArea, 0)} m²`, { size: 7, bold: true, anchor: 'middle' });
  SITE.polygon.forEach((p, k) => {
    const q = SITE.polygon[(k + 1) % SITE.polygon.length], m = S((p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    s.text(m[0], m[1] - 1.2, fr(Math.hypot(q[0] - p[0], q[1] - p[1])), { size: 5, anchor: 'middle', c: BLUE });
  });
  // lanes
  SITE.lanes.forEach(l => l.rects.forEach(r => rect(r[0], r[1], r[2], r[3], { fill: l.id === 'voie-ambulance' ? '#f6dcd9' : '#e8eaed', w: 0.2, stroke: '#8a929c' })));
  // garden, ergotherapy yard
  const g = SITE.garden, e = SITE.ergoOut;
  rect(g.x0, g.z0, g.x1, g.z1, { fill: '#e6f0e0', w: 0.2, stroke: '#6a9a58' });
  const loop = Array.from({ length: 81 }, (_, k) => { const t = (k / 80) * Math.PI * 2; return S(1 + Math.cos(t) * 26, -43.8 + Math.sin(t) * 2.8 + Math.sin(t * 5) * 0.5); });
  s.poly(loop, { w: 0.4, stroke: '#6a9a58', fill: null });
  s.text(...S(1, -47.7), 'Jardin thérapeutique', { size: 5.5, anchor: 'middle', bold: true });
  rect(e.x0, e.z0, e.x1, e.z1, { fill: TINT.amber, w: 0.2 });
  s.stack(...S((e.x0 + e.x1) / 2, (e.z0 + e.z1) / 2), [{ t: 'Ergothérapie extérieure', bold: true, size: 5.5 }, { t: 'marches, rampe, sols variés', size: 4.6 }]);
  // parking
  SITE.parking.forEach(b => {
    const n = Math.floor((b.z1 - b.z0) / 2.5);
    [[b.x0, b.x0 + 5, 'left'], [b.x0 + 10.5, b.x0 + 15.5, 'right']].forEach(([xa, xb, side]) => {
      if (b.pmr === side) rect(xa, b.z0, xb, b.z0 + 5, { fill: '#cfe0f1', stroke: null });
      for (let k = 0; k <= n; k++) s.line(...S(xa, b.z0 + k * 2.5), ...S(xb, b.z0 + k * 2.5), 0.12, '#8a929c');
      s.line(...S(xa, b.z0), ...S(xa, b.z0 + n * 2.5), 0.12, '#8a929c'); s.line(...S(xb, b.z0), ...S(xb, b.z0 + n * 2.5), 0.12, '#8a929c');
    });
    rect(b.x0, b.z0, b.x1, b.z0 + n * 2.5, { fill: null, w: 0.25, dash: [2, 1], stroke: '#1f9d8a' });
    s.text(...S(b.x0 + 7.75, b.z0 + n * 1.25 + 1), b.kind === 'visiteurs' ? 'Visiteurs' : 'Personnel', { size: 5, anchor: 'middle', c: '#4a5058' });
  });
  // fire lane
  const f = SITE.fireLoop;
  s.poly([S(f.x0, f.z0), S(f.x1, f.z0), S(f.x1, f.z1), S(f.x0, f.z1)], { w: 0.5, stroke: RED, dash: [4, 1.6], fill: null });
  // bungalows
  const B = SITE.bungalows; let n = 1;
  B.rows.forEach(z0 => B.cols.forEach(x0 => {
    rect(x0, z0 + B.size, x0 + B.size, z0 + B.size + B.terrace, { fill: PAPER, w: 0.2 });
    rect(x0, z0, x0 + B.size, z0 + B.size, { fill: TINT.core, w: 0.5 });
    s.text(...S(x0 + B.size / 2, z0 + B.size / 2 + 0.8), `B${n++}`, { size: 5.5, bold: true, anchor: 'middle' });
  }));
  s.stack(...S(-47, -10.6), [{ t: `Bungalows thérapeutiques · ${B.cols.length * B.rows.length} × ${B.area} m²`, size: 5, bold: true }]);
  // technical yard
  const t = SITE.techYard;
  rect(t.x0, t.z0, t.x1, t.z1, { fill: TINT.grey, w: 0.3 }); hatch(s, S(t.x0, t.z0)[0], S(t.x0, t.z0)[1], (t.x1 - t.x0) * SK, (t.z1 - t.z0) * SK, 2, '#b4bac2');
  s.text(...S((t.x0 + t.x1) / 2, t.z0 - 1), 'Zone technique', { size: 5, anchor: 'middle', bold: true });
  // trees
  (data.treePts || []).forEach(([x, z]) => { const [a, b] = S(x, z); s.circle(a, b, 1.3, { fill: '#cfe3c4', stroke: '#6a9a58', w: 0.15 }); });
  // building footprint
  const bx0 = -30, bz0 = -38;
  rect(bx0, bz0, bx0 + GRID.width, bz0 + GRID.depth, { fill: TINT.core, w: 0.9 });
  rect(bx0 + 0.4, bz0 + 0.4, bx0 + GRID.width - 0.4, bz0 + GRID.depth - 0.4, { fill: null, w: 0.2 });
  s.stack(...S(0, -26), [{ t: 'Centre International des Neurosciences', bold: true, size: 6.5 }, { t: `Hôpital R+4 · emprise ${fr(GRID.width * GRID.depth, 0)} m²`, size: 5.4 }]);
  // setbacks
  const zd = -3, dy = S(0, zd)[1];
  const north = edgeAt(0, 1, 13.25, 'x'), west = edgeAt(4, 0, zd, 'z'), east = edgeAt(1, 2, zd, 'z'), south = edgeAt(3, 2, 13.25, 'x');
  const dx = S(13.25, 0)[0];
  dimV(s, dx, S(0, north)[1], S(0, bz0)[1], fr(bz0 - north, 2), dx - 5);
  dimV(s, dx, S(0, bz0 + GRID.depth)[1], S(0, south)[1], fr(south - (bz0 + GRID.depth), 2), dx - 5);
  dimH(s, S(west, 0)[0], S(bx0, 0)[0], dy, fr(bx0 - west, 2), dy + 5);
  dimH(s, S(bx0 + GRID.width, 0)[0], S(east, 0)[0], dy, fr(east - (bx0 + GRID.width), 2), dy + 5);
  northArrow(s, 392, 40);
  s.text(392, 56, 'Mer au nord', { size: 5.5, anchor: 'middle', c: BLUE });
  scaleBar(s, 338, 100, SK, [10, 20, 30]);
  frame(s, i + 1, total);
  legend(s, [
    { label: 'Limite de parcelle', draw: (s2, x, y) => s2.line(x, y + 1.6, x + 8, y + 1.6, 0.5, INK, [4, 1, 1, 1]) },
    { label: 'Hôpital (emprise)', draw: swatch(TINT.core) },
    { label: 'Bungalow', draw: swatch(TINT.core) },
    { label: 'Voie pompiers', draw: (s2, x, y) => s2.line(x, y + 1.6, x + 8, y + 1.6, 0.5, RED, [3, 1]) },
    { label: 'Accès ambulances', draw: swatch('#f6dcd9') },
    { label: 'Voie, accès public', draw: swatch('#e8eaed') },
    { label: 'Stationnement', draw: (s2, x, y) => { s2.rect(x, y, 8, 3.2, { w: 0.2, dash: [2, 1], stroke: '#1f9d8a', fill: null }); } },
    { label: 'Place PMR', draw: swatch('#cfe0f1') },
    { label: 'Jardin, arbre', draw: swatch('#e6f0e0') },
    { label: 'Ergothérapie extérieure', draw: swatch(TINT.amber) },
  ]);
  return s;
}

// ---------------------------------------------------------------- public API
export const SHEETS = [
  { id: 'masse', label: 'Plan masse' },
  ...LEVELS.map(l => ({ id: l.id, label: l.id })),
  { id: 'TOIT', label: 'Toiture' },
];
const cache = new Map();
export function getSheet(id, data) {
  if (!cache.has(id)) {
    const total = SHEETS.length, i = SHEETS.findIndex(s => s.id === id);
    cache.set(id, id === 'masse' ? siteSheet(i, total, data) : id === 'TOIT' ? roofSheet(i, total) : levelSheet(LEVELS.find(l => l.id === id), i, total));
  }
  return cache.get(id);
}

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const n2 = v => +v.toFixed(2);
export function toSVG(sheet) {
  const out = sheet.items.map(it => {
    if (it.t === 'l') return `<line x1="${n2(it.x1)}" y1="${n2(it.y1)}" x2="${n2(it.x2)}" y2="${n2(it.y2)}" stroke="${it.c}" stroke-width="${it.w}"${it.dash ? ` stroke-dasharray="${it.dash.join(' ')}"` : ''}/>`;
    if (it.t === 'p') {
      const pts = it.pts.map(p => `${n2(p[0])},${n2(p[1])}`).join(' ');
      return `<${it.close ? 'polygon' : 'polyline'} points="${pts}" fill="${it.fill || 'none'}" stroke="${it.stroke || 'none'}" stroke-width="${it.w}"${it.dash ? ` stroke-dasharray="${it.dash.join(' ')}"` : ''}/>`;
    }
    const anchor = { start: 'start', middle: 'middle', end: 'end' }[it.anchor];
    return `<text transform="translate(${n2(it.x)} ${n2(it.y)}) rotate(${it.rot})" font-size="${n2(it.size * PT)}" text-anchor="${anchor}" fill="${it.c}"${it.bold ? ' font-weight="700"' : ''}>${esc(it.str)}</text>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 297" role="img" aria-label="${esc(sheet.title)}" font-family="Helvetica, Arial, sans-serif" stroke-linejoin="miter"><rect width="420" height="297" fill="#fff"/>${out}</svg>`;
}

// ---------------------------------------------------------------- PDF writer (vector, Helvetica)
const MM = 72 / 25.4, PH = 297 * MM;
const rgb = h => [1, 3, 5].map(i => (parseInt(h.slice(i, i + 2), 16) / 255).toFixed(3)).join(' ');
const px = v => (v * MM).toFixed(2), py = v => (PH - v * MM).toFixed(2);
const WIN = { '—': 0x97, '–': 0x96, '’': 0x92, '…': 0x85, '−': 0x2d, ' ': 0x20, ' ': 0x20 };
const hexStr = str => [...str].map(ch => { const c = WIN[ch] ?? (ch.charCodeAt(0) < 256 ? ch.charCodeAt(0) : 0x3f); return c.toString(16).padStart(2, '0'); }).join('');

function content(sheet) {
  const o = [];
  sheet.items.forEach(it => {
    if (it.t === 'l') {
      o.push(`${(it.w * MM).toFixed(2)} w ${it.dash ? `[${it.dash.map(d => (d * MM).toFixed(1)).join(' ')}] 0 d` : '[] 0 d'} ${rgb(it.c)} RG ${px(it.x1)} ${py(it.y1)} m ${px(it.x2)} ${py(it.y2)} l S`);
    } else if (it.t === 'p') {
      const path = it.pts.map((p, i) => `${px(p[0])} ${py(p[1])} ${i ? 'l' : 'm'}`).join(' ') + (it.close ? ' h' : '');
      const op = it.fill && it.stroke && it.w > 0 ? 'B' : it.fill ? 'f' : it.stroke ? 'S' : 'n';
      o.push(`${(it.w * MM).toFixed(2)} w ${it.dash ? `[${it.dash.map(d => (d * MM).toFixed(1)).join(' ')}] 0 d` : '[] 0 d'} ${it.fill ? rgb(it.fill) + ' rg ' : ''}${it.stroke ? rgb(it.stroke) + ' RG ' : ''}${path} ${op}`);
    } else {
      const th = (it.rot * Math.PI) / 180, w = tw(it.str, it.size, it.bold);
      const off = it.anchor === 'middle' ? -w / 2 : it.anchor === 'end' ? -w : 0;
      const x0 = it.x + off * Math.cos(th), y0 = it.y + off * Math.sin(th);
      const a = Math.cos(th).toFixed(4), b = (-Math.sin(th)).toFixed(4), c = Math.sin(th).toFixed(4);
      o.push(`BT /${it.bold ? 'F2' : 'F1'} ${it.size} Tf ${rgb(it.c)} rg ${a} ${b} ${c} ${a} ${px(x0)} ${py(y0)} Tm <${hexStr(it.str)}> Tj ET`);
    }
  });
  return o.join('\n');
}

export function toPDF(sheets) {
  const objs = [];
  const n = sheets.length;
  objs[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objs[2] = `<< /Type /Pages /Kids [${sheets.map((_, i) => `${5 + i * 2} 0 R`).join(' ')}] /Count ${n} >>`;
  objs[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  objs[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
  sheets.forEach((sh, i) => {
    const stream = content(sh);
    objs[5 + i * 2] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${(420 * MM).toFixed(2)} ${PH.toFixed(2)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${6 + i * 2} 0 R >>`;
    objs[6 + i * 2] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });
  let pdf = '%PDF-1.4\n';
  const offs = [];
  for (let i = 1; i < objs.length; i++) { offs[i] = pdf.length; pdf += `${i} 0 obj\n${objs[i]}\nendobj\n`; }
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length}\n0000000000 65535 f \n` + offs.slice(1).map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('');
  pdf += `trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: 'application/pdf' });
}
