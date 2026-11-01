import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { SITE, PROJECT, LAYERS, GRID, ORIGIN, polyArea } from './data.js';
import { cad, box, boxGeo, rect, segs, poly, label, arrow } from './cad.js';

const col = id => LAYERS[id].hex;
const mulberry32 = a => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

export function inPoly(x, z, pts = SITE.polygon) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, zi] = pts[i], [xj, zj] = pts[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}

// z of the plot's north limit at a given x
export function northLimitAt(x) {
  const [a, b] = [SITE.polygon[0], SITE.polygon[1]];
  return a[1] + ((x - a[0]) / (b[0] - a[0])) * (b[1] - a[1]);
}

const inRect = (x, z, [x0, z0, x1, z1], m = 0) => x > x0 - m && x < x1 + m && z > z0 - m && z < z1 + m;

export function buildSite() {
  const root = new THREE.Group();
  const add = g => (root.add(g), g);
  const stats = { visitors: 0, staff: 0, pmr: 0 };
  const pv = new THREE.Group(); // parking shade structures (energy layer)
  root.add(pv);

  // ---- plot
  const poly3 = SITE.polygon.map(([x, z]) => [x, 0.03, z]);
  add(poly([...poly3, poly3[0]], col('0-STRUCTURE'), { width: 2, dashed: true, dash: 3, gap: 1.5 }));
  const shape = new THREE.Shape(SITE.polygon.map(([x, z]) => new THREE.Vector2(x, -z)));
  const plotGeo = new THREE.ShapeGeometry(shape);
  plotGeo.rotateX(-Math.PI / 2);
  plotGeo.translate(0, 0.01, 0);
  const plot = cad(plotGeo, 0xcfe3c4, 0.5, 0);
  add(plot);
  const cx = SITE.polygon.reduce((s, p) => s + p[0], 0) / SITE.polygon.length;
  const cz = SITE.polygon.reduce((s, p) => s + p[1], 0) / SITE.polygon.length;
  add(label(['LIMITE PARCELLE', `${polyArea(SITE.polygon).toFixed(0)} m²`], cx, 0.2, cz + 10, 'lbl site'));
  SITE.polygon.forEach((p, i) => {
    const q = SITE.polygon[(i + 1) % SITE.polygon.length];
    add(label(`${Math.hypot(q[0] - p[0], q[1] - p[1]).toFixed(1)}`, (p[0] + q[0]) / 2, 0.3, (p[1] + q[1]) / 2, 'dimtxt'));
  });

  // ---- road
  const R = SITE.road;
  add(rect(R.x0, R.sw0, R.x1, R.sw1, 0.02, 0xc9ced4, 0.5, 0.6));
  add(rect(R.x0, R.z0, R.x1, R.z1, 0.02, 0xb4bac2, 0.55, 0.7));
  add(poly([[R.x0, 0.03, (R.z0 + R.z1) / 2], [R.x1, 0.03, (R.z0 + R.z1) / 2]], 0xffffff, { width: 1, dashed: true, opacity: 0.6 }));
  add(label('VOIE D’ACCÈS — SUD', -60, 0.3, (R.z0 + R.z1) / 2 + 0.2, 'sitelbl'));

  // ---- sea
  const seaFront = SITE.seaZ;
  add(rect(-320, seaFront - 220, 320, seaFront, 0.0, 0x1f6fb5, 0.22, 0.4));
  const hatch = [];
  for (let z = seaFront - 4; z > seaFront - 220; z -= 8) hatch.push([-320, 0.01, z], [320, 0.01, z]);
  add(segs(hatch, 0x5aa5e0, 0.35));
  add(rect(-320, seaFront, 320, seaFront + 14, 0.0, 0xd8c27a, 0.1, 0.5));
  add(label('MER MÉDITERRANÉE', 0, 0.3, seaFront - 24, 'sealbl'));

  // ---- lanes
  const rectsAll = [];
  SITE.lanes.forEach(l => {
    l.rects.forEach(r => { rectsAll.push(r); add(rect(r[0], r[1], r[2], r[3], 0.04, col(l.layer), 0.16, 0.9)); });
  });
  add(arrow([-7.5, 0.06, 40], [-7.5, 0.06, -9], 0x4a5058, 0.8));
  add(arrow([51, 0.06, 40], [51, 0.06, -19], 0xff0000));
  add(arrow([51, 0.06, -19], [39, 0.06, -19], 0xff0000));
  add(arrow([-34, 0.06, 40], [-34, 0.06, -8], 0x4a5058, 0.6));
  add(label('ENTRÉE PUBLIQUE', -7.5, 0.3, 52, 'sitelbl'));
  add(label('AMBULANCES', 51, 0.3, 52, 'sitelbl'));
  add(label('LOGISTIQUE', -34, 0.3, 52, 'sitelbl'));

  // dépose-minute canopy
  const d = SITE.dropOff;
  add(rect(d.x0, d.z0, d.x1, d.z1, 4.0, col('VOIRIE'), 0.2, 1));
  add(segs([[d.x0, 0, d.z1], [d.x0, 4, d.z1], [d.x1, 0, d.z1], [d.x1, 4, d.z1]], col('VOIRIE'), 0.8));

  // fire lane (dashed) around the building
  const f = SITE.fireLoop;
  add(poly([[f.x0, 0.05, f.z0], [f.x1, 0.05, f.z0], [f.x1, 0.05, f.z1], [f.x0, 0.05, f.z1], [f.x0, 0.05, f.z0]], col('SECURITE'), { width: 3, dashed: true, dash: 3, gap: 2 }));
  add(label('VOIE POMPIERS 4 m', f.x0 + 4, 0.3, f.z0 - 2.4, 'sitelbl'));

  // ---- parking
  const stallLines = [], pmrRects = [];
  SITE.parking.forEach(b => {
    const n = Math.floor((b.z1 - b.z0) / 2.5);
    const cols = [[b.x0, b.x0 + 5, 'left'], [b.x0 + 10.5, b.x0 + 15.5, 'right']];
    cols.forEach(([xa, xb, side]) => {
      for (let i = 0; i <= n; i++) stallLines.push([xa, 0.05, b.z0 + i * 2.5], [xb, 0.05, b.z0 + i * 2.5]);
      stallLines.push([xa, 0.05, b.z0], [xa, 0.05, b.z0 + n * 2.5], [xb, 0.05, b.z0], [xb, 0.05, b.z0 + n * 2.5]);
      const isPmr = b.pmr === side;
      if (isPmr) { pmrRects.push([xa, b.z0, xb, b.z0 + 5]); stats.pmr += 2; }
      stats[b.kind === 'visiteurs' ? 'visitors' : 'staff'] += n;
    });
    const len = n * 2.5;
    // PV shade structure
    pv.add(rect(b.x0, b.z0, b.x1, b.z0 + len, 3.3, col('ENERGIE'), 0.1, 0.8));
    const posts = [];
    for (let z = b.z0; z <= b.z0 + len + 0.1; z += 10) [b.x0, b.x1].forEach(x => posts.push([x, 0, z], [x, 3.3, z]));
    pv.add(segs(posts, col('ENERGIE'), 0.7));
    const cells = [];
    for (let x = b.x0; x <= b.x1 + 0.01; x += 2.6) cells.push([x, 3.3, b.z0], [x, 3.3, b.z0 + len]);
    for (let z = b.z0; z <= b.z0 + len + 0.01; z += 2) cells.push([b.x0, 3.3, z], [b.x1, 3.3, z]);
    pv.add(segs(cells, col('ENERGIE'), 0.3));
  });
  add(segs(stallLines, col('PARKING'), 0.8));
  pmrRects.forEach(r => add(rect(r[0], r[1], r[2], r[3], 0.06, 0x2a6bff, 0.45, 1)));

  // ---- garden + sensory loop
  const g = SITE.garden;
  add(rect(g.x0, g.z0, g.x1, g.z1, 0.03, col('PAYSAGE'), 0.1, 0.8));
  const loop = [];
  for (let i = 0; i <= 80; i++) {
    const t = (i / 80) * Math.PI * 2;
    loop.push([1 + Math.cos(t) * 26, 0.06, -43.8 + Math.sin(t) * 2.8 + Math.sin(t * 5) * 0.5]);
  }
  add(poly(loop, col('PAYSAGE'), { width: 2.5 }));
  add(label(['JARDIN THÉRAPEUTIQUE', 'parcours sensoriel'], 1, 0.3, -43.8, 'lbl site'));

  // ---- outdoor ergotherapy
  const e = SITE.ergoOut;
  add(rect(e.x0, e.z0, e.x1, e.z1, 0.03, 0xf0a030, 0.08, 0.8));
  [0, 1, 2].forEach(i => add(box(e.x0 + 1, 0, e.z0 + 1 + i * 0.9, e.x0 + 4, 0.18 * (i + 1), e.z0 + 1.9 + i * 0.9, 0xf0a030, 0.3, 1)));
  const ramp = new THREE.BoxGeometry(8, 0.1, 2);
  ramp.rotateZ(0.09); ramp.translate(e.x0 + 10, 0.4, e.z0 + 2);
  add(cad(ramp, 0xf0a030, 0.3, 1));
  [0xe8665f, 0x3fae6a, 0x4a9de0, 0x8b5cc6].forEach((c, i) => add(rect(e.x0 + 2 + i * 4, e.z0 + 7, e.x0 + 5.5 + i * 4, e.z0 + 10.5, 0.05, c, 0.4, 1)));
  add(label(['ERGOTHÉRAPIE EXTÉRIEURE', 'marches, rampe, sols variés'], (e.x0 + e.x1) / 2, 0.3, e.z0 + 14, 'lbl site'));

  // ---- bungalows
  const B = SITE.bungalows;
  const bungs = [];
  let n = 1;
  B.rows.forEach(z0 => B.cols.forEach(x0 => {
    add(box(x0, 0, z0, x0 + B.size, 3.0, z0 + B.size, col('BUNGALOW'), 0.25, 1));
    add(box(x0 - 0.3, 3.0, z0 - 0.3, x0 + B.size + 0.3, 3.2, z0 + B.size + 0.3, col('BUNGALOW'), 0.35, 1));
    add(rect(x0, z0 + B.size, x0 + B.size, z0 + B.size + B.terrace, 0.1, col('BUNGALOW'), 0.15, 0.9));
    bungs.push({ n, x0, z0 }); n++;
  }));
  add(label(['BUNGALOWS THÉRAPEUTIQUES', `${bungs.length} × ${B.area} m²`], -47, 6, -50.6, 'lbl site'));
  add(poly([[-47, 0.07, -46], [-47, 0.07, -13.2], [-30, 0.07, -13.2]], col('PAYSAGE'), { width: 2, dashed: true }));

  // ---- technical yard
  const t = SITE.techYard;
  add(rect(t.x0, t.z0, t.x1, t.z1, 0.03, col('TECHNIQUE'), 0.1, 0.8));
  [t.x0 + 0.5, t.x0 + 7].forEach(x => add(box(x, 0, t.z0 + 0.6, x + 5.5, 2.6, t.z0 + 3.0, col('TECHNIQUE'), 0.3, 1)));
  add(box(t.x0 + 0.5, 0, t.z0 + 4.2, t.x0 + 2.7, 2.5, t.z0 + 6.4, col('TECHNIQUE'), 0.3, 1));
  const tank = (x, z, r, h) => { const geo = new THREE.CylinderGeometry(r, r, h, 14); geo.translate(x, h / 2, z); return add(cad(geo, col('TECHNIQUE'), 0.3, 1)); };
  tank(t.x0 + 5, t.z0 + 5.4, 0.9, 3);
  tank(t.x0 + 8, t.z0 + 5.4, 0.9, 3);
  add(box(t.x1 - 0.1, 0, t.z0, t.x1, 3, t.z1, col('TECHNIQUE'), 0.2, 1));
  add(box(t.x0, 0, t.z1 - 0.1, t.x1, 3, t.z1, col('TECHNIQUE'), 0.2, 1));
  add(label(['ZONE TECHNIQUE', 'groupes, transfo, gaz médicaux'], (t.x0 + t.x1) / 2, 4, t.z0 - 1.5, 'lbl site'));

  // ---- trees (seeded; kept low north of the façade so the sea view stays open)
  const rnd = mulberry32(7);
  const bld = [ORIGIN.x - 2, ORIGIN.z - 2, ORIGIN.x + GRID.width + 8, ORIGIN.z + GRID.depth + 2];
  const blocked = (x, z) =>
    inRect(x, z, bld) || rectsAll.some(r => inRect(x, z, r, 1.5)) ||
    SITE.parking.some(p => inRect(x, z, [p.x0, p.z0, p.x1, p.z1], 1)) ||
    inRect(x, z, [B.cols[0] - 2, B.rows[0] - 2, B.cols[1] + B.size + 2, B.rows[2] + B.size + B.terrace + 2]) ||
    inRect(x, z, [t.x0 - 1, t.z0 - 1, t.x1 + 1, t.z1 + 1]) ||
    inRect(x, z, [SITE.ambCanopy.x0 - 2, SITE.ambCanopy.z0 - 2, SITE.ambCanopy.x1 + 2, SITE.ambCanopy.z1 + 2]) ||
    (Math.abs(Math.abs(x) - 36) < 3.2 && z > f.z0 - 3 && z < f.z1 + 3) ||
    ((Math.abs(z - f.z0) < 3.2 || Math.abs(z - f.z1) < 3.2) && x > f.x0 - 3 && x < f.x1 + 3);
  const cones = [], trunks = [];
  for (let tries = 0, placed = 0; tries < 4000 && placed < 55; tries++) {
    const x = -62 + rnd() * 124, z = -52 + rnd() * 104;
    if (!inPoly(x, z) || blocked(x, z)) continue;
    const north = z < ORIGIN.z && x > -45 && x < 45;
    const h = north ? 2.4 + rnd() * 1.2 : 3.5 + rnd() * 2.5;
    const geo = new THREE.ConeGeometry(0.9 + h * 0.14, h, 6);
    geo.translate(x, h / 2 + 0.8, z);
    cones.push(geo.toNonIndexed());
    trunks.push([x, 0, z], [x, 0.9, z]);
    placed++;
  }
  const trees = new THREE.Group();
  trees.add(cad(mergeGeometries(cones), col('PAYSAGE'), 0.3, 0.6), segs(trunks, col('PAYSAGE'), 0.9));
  root.add(trees);

  // ---- neighbours (seeded boxes outside the plot and off the road)
  const houses = [];
  const nrnd = mulberry32(42);
  for (let tries = 0; tries < 6000 && houses.length < 140; tries++) {
    const x = -130 + nrnd() * 260, z = -110 + nrnd() * 230;
    const w = 7 + nrnd() * 10, dd = 7 + nrnd() * 10, h = 6 + nrnd() * 6;
    if (z > R.sw0 - 4 && z < R.z1 + 4) continue;
    const corners = [[x - w / 2, z - dd / 2], [x + w / 2, z - dd / 2], [x - w / 2, z + dd / 2], [x + w / 2, z + dd / 2], [x, z]];
    if (corners.some(([a, b]) => inPoly(a, b) || [[-1, 0], [1, 0], [0, -1], [0, 1]].some(([dx, dz]) => inPoly(a + dx * 5, b + dz * 5)))) continue;
    if (houses.some(o => Math.abs(o.x - x) < (o.w + w) / 2 + 2 && Math.abs(o.z - z) < (o.d + dd) / 2 + 2)) continue;
    houses.push({ x, z, w, d: dd, h });
  }
  const neighbours = add(cad(mergeGeometries(houses.map(o => boxGeo(o.x - o.w / 2, 0, o.z - o.d / 2, o.x + o.w / 2, o.h, o.z + o.d / 2))), col('VOISINAGE'), 0.22, 0.4));

  // ---- sun path (energy view)
  const sun = new THREE.Group();
  const lat = (SITE.latitude * Math.PI) / 180, R0 = 88, c0 = [0, 0, ORIGIN.z + GRID.depth / 2];
  const arc = decl => {
    const dec = (decl * Math.PI) / 180, pts = [];
    for (let h = -110; h <= 110; h += 4) {
      const H = (h * Math.PI) / 180;
      const up = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H);
      const north = Math.sin(dec) * Math.cos(lat) - Math.cos(dec) * Math.sin(lat) * Math.cos(H);
      const east = -Math.cos(dec) * Math.sin(H);
      if (up > 0) pts.push([c0[0] + east * R0, up * R0, c0[2] - north * R0]);
    }
    return pts;
  };
  const summer = arc(23.44), winter = arc(-23.44), equinox = arc(0);
  sun.add(poly(summer, col('ENERGIE'), { width: 2 }), poly(winter, col('ENERGIE'), { width: 2, dashed: true }), poly(equinox, col('ENERGIE'), { width: 1, dashed: true, opacity: 0.5 }));
  sun.add(label('SOLSTICE D’ÉTÉ', ...summer[Math.floor(summer.length / 2)], 'sitelbl'));
  sun.add(label('SOLSTICE D’HIVER', ...winter[Math.floor(winter.length / 2)], 'sitelbl'));
  sun.visible = false;
  root.add(sun);

  return { root, pv, sun, stats, neighbours, trees, bungalows: bungs };
}
