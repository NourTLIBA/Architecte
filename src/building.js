import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { LEVELS, ROOF_ELEV, GRID, ORIGIN, CORES, LAYERS, TYPE_COLORS, allZones, zoneArea } from './data.js';
import { cad, box, boxGeo, rect, wallXY, segs, poly, label, arrow, circlePts } from './cad.js';
import { northLimitAt } from './site.js';

const col = id => LAYERS[id].hex;
const X0 = ORIGIN.x, Z0 = ORIGIN.z, X1 = X0 + GRID.width, Z1 = Z0 + GRID.depth;
const wx = bx => X0 + bx, wz = bz => Z0 + bz;
const ringPairs = pts => pts.slice(1).flatMap((p, i) => [pts[i], p]);

function stairTreads(bx0, bx1, bz0, bz1, y, alongX, hex) {
  const lines = [[wx(bx0), y, wz(bz0)], [wx(bx1), y, wz(bz0)], [wx(bx1), y, wz(bz0)], [wx(bx1), y, wz(bz1)],
    [wx(bx1), y, wz(bz1)], [wx(bx0), y, wz(bz1)], [wx(bx0), y, wz(bz1)], [wx(bx0), y, wz(bz0)]];
  if (alongX) for (let x = bx0 + 0.3; x < bx1; x += 0.3) lines.push([wx(x), y, wz(bz0)], [wx(x), y, wz(bz1)]);
  else for (let z = bz0 + 0.3; z < bz1; z += 0.3) lines.push([wx(bx0), y, wz(z)], [wx(bx1), y, wz(z)]);
  return segs(lines, hex, 0.8);
}

function liftSymbol(bx, w, bz0, d, y) {
  const a = [wx(bx), y, wz(bz0)], b = [wx(bx + w), y, wz(bz0)], c = [wx(bx + w), y, wz(bz0 + d)], e = [wx(bx), y, wz(bz0 + d)];
  return segs([a, b, b, c, c, e, e, a, a, c, b, e], col('NOYAUX'), 0.9);
}

function buildLevel(lv, index) {
  const g = new THREE.Group();
  g.position.y = lv.elev;
  const h = lv.h, top = h - 0.02;
  const pick = [], labels = new THREE.Group();
  labels.visible = false;
  g.add(labels);

  const slab = box(X0, 0, Z0, X1, 0.3, Z1, col('0-STRUCTURE'), 0.1, 1);
  g.add(slab);

  // zones
  allZones(lv).forEach(z => {
    const x0 = wx(z.bx0), x1 = wx(z.bx1), z0 = wz(z.bz0), z1 = wz(z.bz1);
    const m = z.type === 'circulation'
      ? rect(x0, z0, x1, z1, 0.33, TYPE_COLORS.circulation, 0.35, 0.6)
      : box(x0, 0.3, z0, x1, top, z1, TYPE_COLORS[z.type], z.type === 'noyau' ? 0.16 : 0.2, 1);
    m.userData.fill.userData.zone = z;
    m.userData.fill.userData.level = lv;
    g.add(m);
    pick.push(m.userData.fill);
    if (z.type !== 'circulation' && !z.escape) {
      const name = z.core ? z.name.split(' — ')[0] : z.name;
      labels.add(label([name, `${zoneArea(z).toFixed(0)} m²`], (x0 + x1) / 2, h * 0.45, (z0 + z1) / 2));
    }
  });

  // columns on the 7.5 m grid
  const cols = [];
  for (let k = 0; k <= GRID.bays; k++) GRID.bz.forEach(bz => cols.push(boxGeo(wx(k * GRID.bay) - 0.25, 0.3, wz(bz) - 0.25, wx(k * GRID.bay) + 0.25, top, wz(bz) + 0.25)));
  g.add(cad(mergeGeometries(cols), col('0-STRUCTURE'), 0.35, 0.55));

  // north glass façade (sea) + mullions + sun fins
  g.add(wallXY(X0, X1, 0.3, top, Z0, col('A-VITRAGE'), 0.1, 0.6));
  const mull = [];
  for (let x = X0; x <= X1 + 0.01; x += 1.875) mull.push([x, 0.3, Z0], [x, top, Z0]);
  g.add(segs(mull, col('A-VITRAGE'), 0.7));
  g.add(box(X0, h - 0.5, Z0 - 1.2, X1, h - 0.4, Z0, col('A-BRISE-SOLEIL'), 0.3, 1));
  // east / west vertical fins (merged)
  const fins = [];
  for (let z = Z0; z <= Z1 + 0.01; z += 3) { fins.push(boxGeo(X1, 0.3, z - 0.04, X1 + 0.9, top, z + 0.04), boxGeo(X0 - 0.9, 0.3, z - 0.04, X0, top, z + 0.04)); }
  g.add(cad(mergeGeometries(fins), col('A-BRISE-SOLEIL'), 0.25, 0.9));
  // south wall + window bands
  g.add(wallXY(X0, X1, 0.3, top, Z1, col('A-MURS'), 0.1, 0.7));
  const win = [];
  for (let k = 0; k < GRID.bays; k++) {
    const a = wx(k * GRID.bay + 1.25), b = wx(k * GRID.bay + 6.25), y0 = 1.0, y1 = Math.min(2.8, top - 0.4);
    win.push([a, y0, Z1], [b, y0, Z1], [b, y0, Z1], [b, y1, Z1], [b, y1, Z1], [a, y1, Z1], [a, y1, Z1], [a, y0, Z1]);
  }
  g.add(segs(win, col('A-VITRAGE'), 0.7));

  // cores: lift cabs, stairs
  CORES.forEach(c => {
    c.lifts.forEach(([bx, w]) => g.add(liftSymbol(bx, w, c.bz0 + 1.0, 2.7, 0.36)));
    c.stairs.forEach(([bx, w]) => g.add(stairTreads(bx, bx + w, c.bz0 + 5.8, c.bz0 + 8.3, 0.36, true, col('NOYAUX'))));
  });
  g.add(stairTreads(0.3, 2.7, 0.4, 10.1, 0.36, false, col('NOYAUX')));
  g.add(stairTreads(57.3, 59.7, 0.4, 10.1, 0.36, false, col('NOYAUX')));

  // patient rooms
  allZones(lv).filter(z => z.rooms).forEach(z => {
    const north = z.bz0 === 0, w = (z.bx1 - z.bx0) / z.rooms;
    const walls = [], doors = [];
    for (let k = 0; k < z.rooms; k++) {
      const rx = z.bx0 + k * w;
      if (k > 0) walls.push([wx(rx), 0.3, wz(z.bz0)], [wx(rx), top, wz(z.bz0)], [wx(rx), 0.3, wz(z.bz1)], [wx(rx), top, wz(z.bz1)],
        [wx(rx), top, wz(z.bz0)], [wx(rx), top, wz(z.bz1)]);
      const bz = north ? z.bz1 - 2 : z.bz0;
      g.add(box(wx(rx + 0.15), 0.3, wz(bz), wx(rx + 2.15), 2.6, wz(bz + 2), TYPE_COLORS.hospit, 0.3, 0.9));
      const dz = north ? z.bz1 : z.bz0;
      doors.push([wx(rx + 2.4), 0.35, wz(dz)], [wx(rx + 3.1), 0.35, wz(dz) + (north ? -0.7 : 0.7)]);
      for (let b = 0; b < z.perRoom; b++) {
        const bzz = north ? 3 : 18.5, bxx = rx + 0.7 + b * 1.2;
        g.add(rect(wx(bxx), wz(bzz), wx(bxx + 0.9), wz(bzz + 2), 0.36, 0x4a5058, 0.12, 0.7));
      }
    }
    g.add(segs(walls, TYPE_COLORS.hospit, 0.8));
    g.add(segs(doors, col('A-VITRAGE'), 0.9));
  });

  specials(lv, g, h, labels);

  return { id: lv.id, label: lv.label, index, elev: lv.elev, h, group: g, slab, labels, pick, lv };
}

function specials(lv, g, h, labels) {
  if (lv.id === 'RDC') {
    // MRI in a Faraday cage, CT with lead lining
    g.add(box(wx(39), 0.3, wz(0.75), wx(46), 4.6, wz(9.75), col('NOYAUX'), 0.05, 0.9));
    labels.add(label(['IRM 1,5 T', 'cage de Faraday'], wx(42.5), 2.4, wz(5.25), 'lbl'));
    g.add(box(wx(48), 0.3, wz(1.5), wx(54), 3.4, wz(8.5), 0xe0a000, 0.05, 0.9));
    const hatch = [];
    for (let k = -7; k <= 6; k += 0.8) {
      const u0 = Math.max(0, k), u1 = Math.min(6, 7 + k);
      hatch.push([wx(48 + u0), 0.36, wz(1.5 + u0 - k)], [wx(48 + u1), 0.36, wz(1.5 + u1 - k)]);
    }
    g.add(segs(hatch, 0xe0a000, 0.45));
    labels.add(label(['Scanner', 'murs plombés'], wx(51), 2.0, wz(5), 'lbl'));
    // ambulance canopy on the east face
    g.add(rect(wx(60), wz(14), wx(68), wz(24), 4.2, 0xd9453a, 0.15, 1));
    g.add(segs([[wx(68), 0.3, wz(14)], [wx(68), 4.2, wz(14)], [wx(68), 0.3, wz(24)], [wx(68), 4.2, wz(24)]], 0xd9453a, 0.8));
    labels.add(label('ACCÈS AMBULANCES', wx(64), 4.8, wz(19), 'sitelbl'));
  }
  if (lv.id === 'R+1') {
    [[23.5, 'Salle 1'], [35, 'Salle 2']].forEach(([bx, name]) => {
      g.add(box(wx(bx), 0.3, wz(0.5), wx(bx + 8), h - 0.3, wz(6.1), 0xd9453a, 0.06, 0.9));
      g.add(segs(ringPairs(circlePts(wx(bx + 4), 0.36, wz(3.3), 0.9)), 0x4a5058, 0.9));
      g.add(segs([[wx(bx + 4) - 1.2, 0.36, wz(3.3)], [wx(bx + 4) + 1.2, 0.36, wz(3.3)], [wx(bx + 4), 0.36, wz(3.3) - 1.2], [wx(bx + 4), 0.36, wz(3.3) + 1.2]], 0x4a5058, 0.9));
      g.add(rect(wx(bx + 3.6), wz(2.3), wx(bx + 4.4), wz(4.3), 0.4, 0x4a5058, 0.2, 0.9));
      labels.add(label(name, wx(bx + 4), 2.2, wz(3.3), 'lbl'));
    });
    g.add(poly([[wx(23), 0.38, wz(8.2)], [wx(44), 0.38, wz(8.2)]], col('A-VITRAGE'), { width: 1.5, dashed: true }));
    g.add(arrow([wx(16), 0.4, wz(16.5)], [wx(22), 0.4, wz(16.5)], 0xe8742a));
    g.add(arrow([wx(23), 0.4, wz(20.5)], [wx(29), 0.4, wz(20.5)], 0x2f9fd8));
    g.add(box(wx(22.2), 0.3, wz(14.5), wx(22.8), 2.4, wz(23), 0x4a5058, 0.2, 0.8));
    labels.add(label('SALE', wx(18.5), 1.6, wz(16.5), 'lbl'));
    labels.add(label('PROPRE', wx(26), 1.6, wz(20.5), 'lbl'));
  }
  if (lv.id === 'R+4') {
    // auditorium: stage on the sea side, raked seating
    g.add(box(wx(3.5), 0.3, wz(0.4), wx(22), 0.6, wz(2.6), 0x2f9fd8, 0.3, 1));
    for (let k = 0; k < 8; k++) g.add(box(wx(3.5), 0.3, wz(3 + k * 0.94), wx(22), 0.3 + 0.2 * (k + 1), wz(3 + (k + 1) * 0.94), 0x2f9fd8, 0.18, 0.8));
    // railing around the accessible terrace
    const y = 1.1, r = [[52.5, 13.5], [60, 13.5], [60, 24], [52.5, 24], [52.5, 13.5]].map(([bx, bz]) => [wx(bx), y, wz(bz)]);
    g.add(poly(r, 0x4a5058, { width: 1.5 }));
    const posts = [];
    for (let k = 0; k < r.length - 1; k++) {
      const a = r[k], b = r[k + 1], n = Math.ceil(Math.hypot(b[0] - a[0], b[2] - a[2]) / 1.5);
      for (let i = 0; i <= n; i++) { const t = i / n, px = a[0] + (b[0] - a[0]) * t, pz = a[2] + (b[2] - a[2]) * t; posts.push([px, 0.3, pz], [px, y, pz]); }
    }
    g.add(segs(posts, 0x4a5058, 0.6));
  }
}

function buildRoof() {
  const g = new THREE.Group();
  g.position.y = ROOF_ELEV;
  const labels = new THREE.Group();
  labels.visible = false;
  g.add(labels);
  const pv = new THREE.Group();
  g.add(pv);

  const slab = new THREE.Group();
  slab.add(box(X0, 0, Z0, X1, 0.3, wz(13.5), col('0-STRUCTURE'), 0.1, 1));
  slab.add(box(X0, 0, wz(13.5), wx(52.5), 0.3, Z1, col('0-STRUCTURE'), 0.1, 1));
  g.add(slab);

  // parapet 1.2 m
  const wall = (a, b, c, d) => g.add(box(a, 0.3, b, c, 1.5, d, col('A-MURS'), 0.2, 0.9));
  wall(X0, Z0, X1, Z0 + 0.2); wall(X0, Z0, X0 + 0.2, Z1); wall(X0, Z1 - 0.2, wx(52.5), Z1);
  wall(X1 - 0.2, Z0, X1, wz(13.5)); wall(wx(52.5) - 0.2, wz(13.5), wx(52.5), Z1); wall(wx(52.5), wz(13.5) - 0.2, X1, wz(13.5));

  // PV field: tilted 10°, facing south
  for (let k = 0; k < 4; k++) {
    const geo = new THREE.PlaneGeometry(37, 2);
    geo.rotateX(-Math.PI / 2); geo.rotateX(0.17);
    geo.translate(wx(3 + 18.5), 0.9, wz(2 + k * 2.5));
    pv.add(cad(geo, col('ENERGIE'), 0.3, 1));
  }
  labels.add(label(['PHOTOVOLTAÏQUE', '≈ 90 kWc'], wx(21), 2.6, wz(6), 'lbl'));

  // plant zone with 3 m acoustic screen
  const ph = 3.3, screen = (a, b, c, d) => g.add(box(a, 0.3, b, c, ph, d, col('TECHNIQUE'), 0.12, 0.8));
  screen(wx(40), Z0, X1, Z0 + 0.2); screen(wx(40), Z0, wx(40) + 0.2, wz(13.5)); screen(wx(40), wz(13.5) - 0.2, X1, wz(13.5)); screen(X1 - 0.2, Z0, X1, wz(13.5));
  [2, 6].forEach(bz => g.add(box(wx(42), 0.3, wz(bz), wx(47), 2.5, wz(bz + 2.5), col('TECHNIQUE'), 0.3, 1)));
  [1.5, 4.8, 8.1].forEach(bz => g.add(box(wx(49), 0.3, wz(bz), wx(54), 2.8, wz(bz + 2.4), col('TECHNIQUE'), 0.3, 1)));
  const ct = new THREE.CylinderGeometry(1.3, 1.3, 2.8, 16); ct.translate(wx(57), 1.7, wz(10.5));
  g.add(cad(ct, col('TECHNIQUE'), 0.3, 1));
  labels.add(label(['LOCAL TECHNIQUE', '2 groupes froid, 3 CTA'], wx(50), 4.2, wz(6.5), 'lbl'));

  // solar thermal collectors 4 × 15 m² = 60 m², tilted 30°
  [[16, 14.8], [22, 14.8], [28, 14.8], [34, 14.8]].forEach(([bx, bz]) => {
    const geo = new THREE.PlaneGeometry(5, 3);
    geo.rotateX(-Math.PI / 2); geo.rotateX(0.52);
    geo.translate(wx(bx + 2.5), 0.9, wz(bz + 1.5));
    pv.add(cad(geo, col('ENERGIE'), 0.3, 1, 0xe0a000));
  });
  labels.add(label(['SOLAIRE THERMIQUE', '60 m²'], wx(26), 2.8, wz(19.5), 'lbl'));

  // lift overruns
  CORES.forEach(c => g.add(box(wx(c.bx0), 0.3, wz(c.bz0), wx(c.bx1), 2.8, wz(c.bz1), col('NOYAUX'), 0.18, 1)));

  return { id: 'TOIT', label: 'Toiture', index: LEVELS.length, elev: ROOF_ELEV, h: 0, group: g, slab, labels, pick: [], pv, lv: null };
}

function dimLine(a, b, off, text) {
  const g = new THREE.Group();
  const a2 = a.map((v, i) => v + off[i]), b2 = b.map((v, i) => v + off[i]);
  const len = Math.hypot(...off) || 1, over = off.map(v => (v / len) * 0.6);
  g.add(segs([a, a2.map((v, i) => v + over[i]), b, b2.map((v, i) => v + over[i])], col('COTATION'), 0.8));
  g.add(poly([a2, b2], col('COTATION'), { width: 1.5 }));
  g.add(label(text, (a2[0] + b2[0]) / 2, (a2[1] + b2[1]) / 2, (a2[2] + b2[2]) / 2, 'dimtxt'));
  return g;
}

function buildAnnotations() {
  const g = new THREE.Group();
  const nl = northLimitAt(0);
  g.add(dimLine([X0, 0.05, Z0], [X1, 0.05, Z0], [0, 0, -7], GRID.width.toFixed(2)));
  g.add(dimLine([X0, 0.05, Z0], [X0, 0.05, Z1], [-7, 0, 0], GRID.depth.toFixed(2)));
  g.add(dimLine([X1, 0.05, Z0], [X1, ROOF_ELEV, Z0], [3, 0, -3], ROOF_ELEV.toFixed(2)));
  g.add(dimLine([0, 0.05, Z0], [0, 0.05, nl], [4, 0, 0], (Z0 - nl).toFixed(2)));

  // grid axes: letters A–I (north), numbers 1–4 (west)
  const lines = [];
  for (let k = 0; k <= GRID.bays; k++) {
    const x = wx(k * GRID.bay);
    lines.push([x, 0.04, Z0 - 1.3], [x, 0.04, Z1 + 1.5]);
    g.add(label(String.fromCharCode(65 + k), x, 0.3, Z0 - 3.6, 'bubble'));
  }
  GRID.bz.forEach((bz, i) => {
    lines.push([X0 - 1.3, 0.04, wz(bz)], [X1 + 1.5, 0.04, wz(bz)]);
    g.add(label(String(i + 1), X0 - 3.6, 0.3, wz(bz), 'bubble'));
  });
  g.add(segs(lines, 0x4a5058, 0.25));
  return g;
}

export function buildBuilding() {
  const levels = LEVELS.map(buildLevel);
  levels.push(buildRoof());
  const annot = buildAnnotations();
  const root = new THREE.Group();
  levels.forEach(l => root.add(l.group));
  root.add(annot);
  return { root, levels, annot, roofPV: levels[levels.length - 1].pv };
}
