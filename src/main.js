import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { ENERGY, TYPOLOGIES, validate } from './data.js';
import { buildSite } from './site.js';
import { buildBuilding } from './building.js';
import { setGhost, setLineResolution } from './cad.js';
import * as ui from './ui.js';

validate();

const $ = s => document.querySelector(s);
const viewport = $('#viewport');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------------------------------------------------------------- scene
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.domElement.className = 'gl';
viewport.prepend(renderer.domElement);
const labelRenderer = new CSS2DRenderer();
labelRenderer.domElement.className = 'label-layer';
viewport.insertBefore(labelRenderer.domElement, $('#cross'));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x212830);
const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 2000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.zoomToCursor = true;
controls.maxPolarAngle = THREE.MathUtils.degToRad(89.5);
controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.PAN };
controls.maxDistance = 600;

const VIEWS = {
  iso: [[110, 85, 105], [0, 8, -8]],
  plan: [[0, 250, 0.5], [0, 0, -8]],
  sea: [[0, 20, -138], [0, 10, -26]],
  south: [[0, 20, 100], [0, 10, -26]],
  east: [[125, 20, -26], [0, 10, -26]],
  west: [[-125, 20, -26], [0, 10, -26]],
  bungalows: [[-100, 42, -12], [-47, 0, -30]],
  parking: [[0, 105, 100], [8, 0, 26]],
};
const setView = ([p, t]) => { camera.position.set(...p); controls.target.set(...t); controls.update(); };
if (innerWidth / innerHeight < 1) VIEWS.iso[0] = VIEWS.iso[0].map(v => v * 1.7); // portrait screens need more distance
setView(VIEWS.iso);

// grid: 1 m minor, 10 m major
const grid = (size, div, color, op) => {
  const gr = new THREE.GridHelper(size, div, color, color);
  gr.material.transparent = true; gr.material.opacity = op; gr.material.depthWrite = false; gr.position.y = -0.02;
  return gr;
};
scene.add(grid(300, 30, 0x3b4452, 0.9), grid(300, 300, 0x2b323c, 0.5));

const site = buildSite();
const building = buildBuilding();
scene.add(site.root, building.root);
const levels = building.levels; // 5 levels + roof

// ---------------------------------------------------------------- render loop
let dirty = true;
const anims = new Set();
const ease = t => 1 - Math.pow(1 - t, 3);
function animate(ms, step, done) {
  if (reduced || ms === 0) { step(1); done?.(); dirty = true; return; }
  const t0 = performance.now();
  const fn = now => { const t = Math.min(1, (now - t0) / ms); step(ease(t)); if (t >= 1) { done?.(); return false; } };
  anims.add(fn);
}

const updateCube = ui.buildViewCube(v => flyView(v));

function resize() {
  const w = viewport.clientWidth, h = viewport.clientHeight;
  renderer.setSize(w, h, false);
  labelRenderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  setLineResolution(w, h);
  dirty = true;
}
new ResizeObserver(resize).observe(viewport);
resize();

function frame(now) {
  requestAnimationFrame(frame);
  let busy = false;
  anims.forEach(fn => { busy = true; if (fn(now) === false) anims.delete(fn); });
  if (controls.update() || dirty || busy) {
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
    camera.updateMatrixWorld();
    updateCube(camera.matrixWorldInverse);
    ui.drawUCS(camera.matrixWorldInverse);
    dirty = false;
  }
}
requestAnimationFrame(frame);
controls.addEventListener('change', () => { dirty = true; });

function flyView(name) {
  const [p, t] = VIEWS[name];
  const p0 = camera.position.clone(), t0 = controls.target.clone();
  const p1 = new THREE.Vector3(...p), t1 = new THREE.Vector3(...t);
  animate(400, k => { camera.position.lerpVectors(p0, p1, k); controls.target.lerpVectors(t0, t1, k); camera.lookAt(controls.target); }, () => controls.update());
  ui.cmd({ iso: '_VIEW _SEISO', plan: '_VIEW _TOP', sea: '_VIEW _NORTH', south: '_VIEW _SOUTH', east: '_VIEW _EAST', west: '_VIEW _WEST', bungalows: '_ZOOM _OBJET', parking: '_ZOOM _OBJET' }[name]);
}

// ---------------------------------------------------------------- level isolation + explode
let iso = null, exploded = false, explodeK = 0, selected = null;

function applyIso(i) {
  clearSelection();
  iso = i;
  levels.forEach(l => {
    const ghost = i !== null && l.index !== i;
    setGhost(l.group, ghost);
    l.labels.visible = i !== null && l.index === i;
    if (l.slab) l.slab.visible = !(i !== null && l.index === i + 1);
  });
  ui.markLevel(i);
  const name = i === null ? 'SITE' : levels[i].id;
  ui.setStatusLevel(name);
  ui.cmd(i === null ? '_LAYUNISO' : `_LAYISO ${name}`);
  dirty = true;
}

function setExplode(on) {
  exploded = on;
  const from = explodeK, to = on ? 1 : 0;
  animate(600, k => {
    explodeK = from + (to - from) * k;
    levels.forEach(l => { l.group.position.y = l.elev + explodeK * l.index * 6; });
  });
  $('#explode').setAttribute('aria-pressed', String(on));
  ui.cmd(on ? '_EXPLODE' : '_REGEN');
}

ui.buildLevelBar(applyIso);

// ---------------------------------------------------------------- selection + panel
const stats = site.stats;
let tab = 'props';

function paint(fill, on, edgeHex = 0xffffff, op = 0.5) {
  const fm = fill.material, em = fill.parent.children[1].material;
  if (on) {
    fill.userData.saved = [fm.userData.base, em.color.getHex()];
    fm.userData.base = op; fm.opacity = op; em.color.set(edgeHex);
  } else if (fill.userData.saved) {
    const [b, c] = fill.userData.saved;
    fm.userData.base = b; fm.opacity = b; em.color.set(c);
    fill.userData.saved = null;
  }
  dirty = true;
}

function clearSelection() {
  if (selected) paint(selected, false);
  selected = null;
  if (tab === 'props') renderPanel();
}

function select(fill) {
  if (selected) paint(selected, false);
  selected = fill;
  paint(fill, true);
  const z = fill.userData.zone;
  ui.cmd(`_LIST ${z.id}`);
  setTab('props');
}

const names = { props: 'Propriétés', energy: 'Énergie', types: 'Typologies', surf: 'Surfaces' };
function renderPanel() {
  const body = $('#panel-body');
  if (tab === 'props') body.innerHTML = selected ? ui.renderProps(selected.userData.zone, selected.userData.level) : ui.renderHome();
  if (tab === 'energy') body.innerHTML = ui.renderEnergy();
  if (tab === 'types') body.innerHTML = ui.renderTypes();
  if (tab === 'surf') body.innerHTML = ui.renderSurfaces(stats);
  $('#sheet-toggle').textContent = names[tab];
}

function setTab(t) {
  tab = t;
  document.querySelectorAll('#tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === t)));
  renderPanel();
  site.sun.visible = t === 'energy';
  if (t === 'energy') { pulsePV(); ui.cmd('_ENERGIE'); }
  dirty = true;
}

function pulsePV() {
  const mats = [];
  [site.pv, building.roofPV].forEach(g => g.traverse(o => { if (o.material?.userData.kind === 'fill') mats.push(o.material); }));
  animate(1500, k => { mats.forEach(m => { m.opacity = m.userData.base + Math.sin(k * Math.PI) * 0.5; }); }, () => mats.forEach(m => { m.opacity = m.userData.base; }));
}

function flashTypes(types) {
  const hit = [];
  levels.forEach(l => l.pick.forEach(f => { if (types.includes(f.userData.zone.type) && f !== selected) hit.push(f); }));
  hit.forEach(f => paint(f, true, 0x00ff00, 0.45));
  setTimeout(() => hit.forEach(f => paint(f, false)), 1600);
}

$('#tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setTab(b.dataset.tab); });
$('#panel-body').addEventListener('click', e => {
  if (e.target.closest('[data-act="clear"]')) return clearSelection();
  const en = e.target.closest('[data-energy]');
  if (en) {
    const row = ENERGY.breakdown.find(b => b.id === en.dataset.energy);
    ui.cmd(`_ENERGIE ${row.id.toUpperCase()}`);
    flashTypes(row.types);
    return;
  }
  const ty = e.target.closest('[data-type]');
  if (ty) {
    const t = TYPOLOGIES.find(x => x.id === ty.dataset.type);
    if (t.focus.view) { flyView(t.focus.view); applyIso(null); } else applyIso(t.focus.level);
  }
});
$('#sheet-toggle').addEventListener('click', () => {
  const open = $('#panel').classList.toggle('open');
  $('#sheet-toggle').setAttribute('aria-expanded', String(open));
});
document.querySelectorAll('#tools [data-view]').forEach(b => b.addEventListener('click', () => flyView(b.dataset.view)));
$('#explode').addEventListener('click', () => setExplode(!exploded));

// ---------------------------------------------------------------- pointer: coords + pick
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const hitPt = new THREE.Vector3();
function setRay(e) {
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
}
renderer.domElement.addEventListener('pointermove', e => {
  setRay(e);
  if (ray.ray.intersectPlane(ground, hitPt)) ui.setCoords(hitPt.x, -hitPt.z, 0);
});
let down = null;
renderer.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', e => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5 || e.button !== 0) return;
  setRay(e);
  const list = iso === null ? levels.flatMap(l => l.pick) : levels[iso].pick;
  const hit = ray.intersectObjects(list, false)[0];
  hit ? select(hit.object) : clearSelection();
});

// ---------------------------------------------------------------- keyboard
addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest?.('input, textarea')) return;
  if (e.key >= '1' && e.key <= '6') applyIso(Number(e.key) - 1);
  else if (e.key === '0') applyIso(null);
  else if (e.key === 'e' || e.key === 'E') setExplode(!exploded);
  else if (e.key === 'Escape') clearSelection();
});

ui.initCrosshair(viewport);
renderPanel();
ui.cmd('_3DORBIT');
window.__app = { camera, controls, levels, applyIso, setView, VIEWS, scene };
