import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

const lineMats = new Set();
export const setLineResolution = (w, h) => lineMats.forEach(m => m.resolution.set(w, h));

const tag = (m, kind, base) => { m.userData.kind = kind; m.userData.base = base; return m; };
const INK = 0x1d1d1f;
export const mixHex = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t).getHex();
export const fillMat = (hex, op) => tag(new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide }), 'fill', op);
export const edgeMat = (hex, op = 1) => tag(new THREE.LineBasicMaterial({ color: hex, transparent: true, opacity: op }), 'edge', op);

// fill mesh + crisp edges: the base unit of the "shaded with edges" look
export function cad(geo, hex, fillOp = 0.24, edgeOp = 1, edgeHex = mixHex(hex, INK, 0.28)) {
  const g = new THREE.Group();
  const fill = new THREE.Mesh(geo, fillMat(hex, fillOp));
  fill.renderOrder = 1;
  g.add(fill, new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat(edgeHex, edgeOp)));
  g.userData.fill = fill;
  return g;
}

export function boxGeo(x0, y0, z0, x1, y1, z1) {
  const geo = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  geo.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return geo;
}
export const box = (x0, y0, z0, x1, y1, z1, hex, fillOp, edgeOp, edgeHex) => cad(boxGeo(x0, y0, z0, x1, y1, z1), hex, fillOp, edgeOp, edgeHex);

export function rect(x0, z0, x1, z1, y, hex, fillOp, edgeOp, edgeHex) {
  const geo = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
  geo.rotateX(-Math.PI / 2);
  geo.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
  return cad(geo, hex, fillOp, edgeOp, edgeHex);
}

// vertical rectangle in the XY plane at depth z
export function wallXY(x0, x1, y0, y1, z, hex, fillOp, edgeOp) {
  const geo = new THREE.PlaneGeometry(x1 - x0, y1 - y0);
  geo.translate((x0 + x1) / 2, (y0 + y1) / 2, z);
  return cad(geo, hex, fillOp, edgeOp);
}

// many independent line segments in one draw call; pairs = [[x,y,z],[x,y,z], ...]
export function segs(pairs, hex, op = 1) {
  const pos = new Float32Array(pairs.length * 3);
  pairs.forEach((p, i) => pos.set(p, i * 3));
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return new THREE.LineSegments(geo, edgeMat(hex, op));
}

// thick CAD polyline (Line2). pts = [[x,y,z], ...]
export function poly(pts, hex, { width = 1.5, dashed = false, opacity = 1, dash = 2, gap = 1.4 } = {}) {
  const geo = new LineGeometry();
  geo.setPositions(pts.flat());
  const mat = new LineMaterial({ color: hex, linewidth: width, transparent: true, opacity, dashed, dashSize: dash, gapSize: gap });
  mat.resolution.set(innerWidth, innerHeight);
  tag(mat, 'edge', opacity);
  lineMats.add(mat);
  const line = new Line2(geo, mat);
  if (dashed) line.computeLineDistances();
  return line;
}

export function label(text, x, y, z, cls = 'lbl') {
  const d = document.createElement('div');
  d.className = cls;
  if (Array.isArray(text)) { d.innerHTML = `<b>${text[0]}</b>${text[1]}`; } else { d.textContent = text; }
  const o = new CSS2DObject(d);
  o.position.set(x, y, z);
  return o;
}

export function arrow(a, b, hex, op = 1) {
  const dx = b[0] - a[0], dz = b[2] - a[2], len = Math.hypot(dx, dz) || 1;
  const ux = dx / len, uz = dz / len, s = 0.7;
  const wing = (sx) => [b[0] - ux * s + -uz * sx * s * 0.5, b[1], b[2] - uz * s + ux * sx * s * 0.5];
  return segs([a, b, b, wing(1), b, wing(-1)], hex, op);
}

// ghost an object tree: fill -> 0.03, edges -> 0.12 (or restore)
export function setGhost(root, on) {
  root.traverse(o => {
    const m = o.material;
    if (m && m.userData.kind) m.opacity = on ? (m.userData.kind === 'fill' ? 0.03 : 0.12) : m.userData.base;
  });
}

export function circlePts(cx, y, cz, r, n = 24) {
  return Array.from({ length: n + 1 }, (_, i) => [cx + Math.cos((i / n) * Math.PI * 2) * r, y, cz + Math.sin((i / n) * Math.PI * 2) * r]);
}
