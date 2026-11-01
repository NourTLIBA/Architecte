import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { ENERGY, TYPOLOGIES, TOUR, ORIGIN, LEVELS, validate } from './data.js';
import { SHEETS, getSheet, toSVG, toPDF } from './plan.js';
import { buildSite } from './site.js';
import { buildBuilding } from './building.js';
import { setGhost, setLineResolution } from './cad.js';
import * as ui from './ui.js';

validate();

const $ = s => document.querySelector(s);
const viewport = $('#viewport');
const sim = $('#sim');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;

// ---------------------------------------------------------------- scene
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.domElement.className = 'gl';
viewport.prepend(renderer.domElement);
const labelRenderer = new CSS2DRenderer();
labelRenderer.domElement.className = 'label-layer';
viewport.insertBefore(labelRenderer.domElement, viewport.children[1]);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xeef0f3);
const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 2000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.zoomToCursor = true;
controls.enableZoom = false; // wheel zoom wakes up on first click, so the page still scrolls
controls.minDistance = 12;
controls.maxDistance = 600;
controls.maxPolarAngle = THREE.MathUtils.degToRad(89.5);
controls.autoRotateSpeed = 1.2;

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
if (innerWidth / innerHeight < 1) VIEWS.iso[0] = VIEWS.iso[0].map(v => v * 1.7); // portrait screens need more distance
camera.position.set(...VIEWS.iso[0]);
controls.target.set(...VIEWS.iso[1]);
controls.update();

const grid = (size, div, color, op) => {
  const gr = new THREE.GridHelper(size, div, color, color);
  gr.material.transparent = true; gr.material.opacity = op; gr.material.depthWrite = false; gr.position.y = -0.02;
  return gr;
};
scene.add(grid(300, 30, 0xc9ced4, 0.9), grid(300, 300, 0xdde0e4, 0.6));

const site = buildSite();
const building = buildBuilding();
scene.add(site.root, building.root);
building.annot.visible = false; // dimensions and grid bubbles are opt-in
site.dims.visible = false;
const levels = building.levels; // 5 levels + roof

// ---------------------------------------------------------------- render loop (on demand, only while visible)
let dirty = true, inView = true;
const anims = new Set();
const ease = t => 1 - Math.pow(1 - t, 3);
function animate(ms, step, done) {
  if (reduced || ms === 0) { step(1); done?.(); dirty = true; return; }
  const t0 = performance.now();
  anims.add(now => { const t = Math.min(1, (now - t0) / ms); step(ease(t)); if (t >= 1) { done?.(); return false; } });
}
new IntersectionObserver(([e]) => { inView = e.isIntersecting; if (inView) dirty = true; }, { threshold: 0.01 }).observe(viewport);

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
  const moved = controls.update();
  if (inView && (moved || dirty || busy)) {
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
    dirty = false;
  }
}
requestAnimationFrame(frame);
controls.addEventListener('change', () => { dirty = true; });

// ---------------------------------------------------------------- camera moves
function flyTo(p, t, ms = 500) {
  const p0 = camera.position.clone(), t0 = controls.target.clone();
  animate(ms, k => { camera.position.lerpVectors(p0, p, k); controls.target.lerpVectors(t0, t, k); camera.lookAt(controls.target); }, () => controls.update());
}
const flyView = name => flyTo(new THREE.Vector3(...VIEWS[name][0]), new THREE.Vector3(...VIEWS[name][1]));

let exploded = false;
const DIR = new THREE.Vector3(62, 50, 60);
function focusLevel(i, scale = 1) {
  if (i === null) return flyView('iso');
  const l = levels[i];
  const t = new THREE.Vector3(0, l.elev + (exploded ? i * 6 : 0) + (l.h || 0) / 2, -26);
  flyTo(t.clone().addScaledVector(DIR, scale), t);
}
function dolly(f) {
  const t = controls.target, p = camera.position;
  const to = t.clone().add(p.clone().sub(t).multiplyScalar(f));
  const dist = to.distanceTo(t);
  if (dist < controls.minDistance || dist > controls.maxDistance) return;
  flyTo(to, t.clone(), 250);
}

const toSim = () => sim.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });

// ---------------------------------------------------------------- level isolation, explode
let iso = null, explodeK = 0, selected = null;

let xray = false; // shows every zone at once (used to flag zones from the energy list)
function sync() {
  levels.forEach(l => {
    const zones = xray || iso === l.index;
    l.zonesG.visible = zones;
    l.detail.visible = iso === l.index;
    if (l.shell) l.shell.visible = !zones;
    l.labels.visible = iso === l.index;
  });
  dirty = true;
}

function applyIso(i) {
  clearSelection();
  iso = i;
  levels.forEach(l => {
    setGhost(l.group, i !== null && l.index !== i);
    if (l.slab) l.slab.visible = !(i !== null && l.index === i + 1);
  });
  sync();
  ui.markLevel(i);
}

function setExplode(on) {
  exploded = on;
  const from = explodeK, to = on ? 1 : 0;
  animate(600, k => {
    explodeK = from + (to - from) * k;
    levels.forEach(l => { l.group.position.y = l.elev + explodeK * l.index * 6; });
  });
  $('[data-toggle=explode]').checked = on;
}

ui.buildLevelBar(i => { applyIso(i); focusLevel(i); });

// ---------------------------------------------------------------- selection + zone card
const card = $('#zone-card');

function paint(fill, on, edgeHex = 0x0058a3, op = 0.5) {
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
  card.hidden = true;
}

function select(fill) {
  if (selected) paint(selected, false);
  selected = fill;
  paint(fill, true);
  card.innerHTML = ui.renderZoneCard(fill.userData.zone, fill.userData.level);
  card.hidden = false;
}

function flyToZone(it) {
  applyIso(it.level);
  if (!it.zone) return focusLevel(it.level);
  const z = it.zone, l = levels[it.level];
  const t = new THREE.Vector3(ORIGIN.x + (z.bx0 + z.bx1) / 2, l.elev + (exploded ? it.level * 6 : 0) + l.h / 2, ORIGIN.z + (z.bz0 + z.bz1) / 2);
  flyTo(t.clone().addScaledVector(DIR, 0.55), t);
  const fill = l.pick.find(f => f.userData.zone.id === z.id);
  if (fill) select(fill);
}
ui.buildSearch(flyToZone);

card.addEventListener('click', e => { if (e.target.closest('[data-act="close"]')) clearSelection(); });

// ---------------------------------------------------------------- display toggles
function pulsePV() {
  const mats = [];
  [site.pv, building.roofPV].forEach(g => g.traverse(o => { if (o.material?.userData.kind === 'fill') mats.push(o.material); }));
  animate(1500, k => mats.forEach(m => { m.opacity = m.userData.base + Math.sin(k * Math.PI) * 0.45; }), () => mats.forEach(m => { m.opacity = m.userData.base; }));
}
const TOGGLES = {
  labels: on => viewport.classList.toggle('no-labels', !on),
  dims: on => { building.annot.visible = on; site.dims.visible = on; },
  sun: on => { site.sun.visible = on; if (on) pulsePV(); },
  neighbours: on => { site.neighbours.visible = on; },
  trees: on => { site.trees.visible = on; },
  explode: on => setExplode(on),
};
$('#display').addEventListener('change', e => {
  const name = e.target.dataset.toggle;
  if (name) { TOGGLES[name](e.target.checked); dirty = true; }
});
function setToggle(name, on) { $(`[data-toggle=${name}]`).checked = on; TOGGLES[name](on); dirty = true; }
document.addEventListener('pointerdown', e => { if (!e.target.closest('#display')) $('#display').open = false; });

// ---------------------------------------------------------------- tools + views
document.querySelectorAll('.dock [data-view]').forEach(b => b.addEventListener('click', () => flyView(b.dataset.view)));
$('#zoom-in').addEventListener('click', () => dolly(0.7));
$('#zoom-out').addEventListener('click', () => dolly(1.4));
$('#recenter').addEventListener('click', () => { applyIso(null); flyView('iso'); });
const spin = $('#spin');
function setSpin(on) { controls.autoRotate = on; spin.setAttribute('aria-pressed', String(on)); dirty = true; }
spin.addEventListener('click', () => setSpin(!controls.autoRotate));
const fs = $('#fullscreen');
if (!document.fullscreenEnabled) fs.hidden = true;
fs.addEventListener('click', () => (document.fullscreenElement ? document.exitFullscreen() : sim.requestFullscreen()));

// ---------------------------------------------------------------- guided tour
const tourCard = $('#tour-card');
let tour = null;
function tourGo(i) {
  tour = i;
  const s = TOUR[i];
  tourCard.innerHTML = ui.renderTour(i, TOUR.length, s);
  tourCard.hidden = false;
  if (s.view) { applyIso(null); flyView(s.view); } else { applyIso(s.level); focusLevel(s.level); }
}
function tourStop() { tour = null; tourCard.hidden = true; }
$('#tour-btn').addEventListener('click', () => tourGo(0));
tourCard.addEventListener('click', e => {
  const b = e.target.closest('[data-tour]');
  if (!b) return;
  if (b.dataset.tour === 'prev') tourGo(Math.max(0, tour - 1));
  else if (b.dataset.tour === 'next') tour + 1 < TOUR.length ? tourGo(tour + 1) : (tourStop(), applyIso(null), flyView('iso'));
  else tourStop();
});

// ---------------------------------------------------------------- page sections -> simulation
ui.renderLegend();
ui.renderPage(site.stats);
document.addEventListener('click', e => {
  const lv = e.target.closest('[data-level]');
  if (lv) { const i = Number(lv.dataset.level); toSim(); applyIso(i); focusLevel(i); return; }
  const ty = e.target.closest('[data-type]');
  if (ty) {
    const t = TYPOLOGIES.find(x => x.id === ty.dataset.type);
    toSim();
    if (t.focus.view) { applyIso(null); flyView(t.focus.view); } else { applyIso(t.focus.level); focusLevel(t.focus.level); }
    return;
  }
  const en = e.target.closest('[data-energy]');
  if (en) {
    const types = ENERGY.breakdown.find(b => b.id === en.dataset.energy).types;
    toSim(); applyIso(null); flyView('iso');
    setTimeout(() => {
      xray = true; sync();
      const hit = levels.flatMap(l => l.pick).filter(f => types.includes(f.userData.zone.type));
      hit.forEach(f => paint(f, true, 0x1f9d8a, 0.55));
      setTimeout(() => { hit.forEach(f => paint(f, false)); xray = false; sync(); }, 2400);
    }, reduced ? 0 : 600);
    return;
  }
  if (e.target.closest('[data-act="sun"]')) { toSim(); applyIso(null); flyView('iso'); setToggle('sun', true); }
});

// ---------------------------------------------------------------- 2D plans
const planData = { houses: site.houses, treePts: site.treePts };
const planTabs = $('#plan-tabs'), planView = $('#plan-view');
let planId = 'masse';
planTabs.innerHTML = SHEETS.map(sh => `<button role="tab" data-plan="${sh.id}">${sh.label}</button>`).join('');
function showPlan(id) {
  planId = id;
  planTabs.querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.plan === id)));
  planView.innerHTML = toSVG(getSheet(id, planData));
}
planTabs.addEventListener('click', e => { const b = e.target.closest('[data-plan]'); if (b) showPlan(b.dataset.plan); });
function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const slug = id => (id === 'masse' ? 'plan-masse' : id === 'TOIT' ? 'toiture' : `niveau-${id.replace('+', '').toLowerCase()}`);
$('#pdf-one').addEventListener('click', () => download(toPDF([getSheet(planId, planData)]), `neurosciences-${slug(planId)}.pdf`));
$('#pdf-all').addEventListener('click', () => download(toPDF(SHEETS.map(sh => getSheet(sh.id, planData))), 'neurosciences-plans-complets.pdf'));
$('#plan2d-btn').addEventListener('click', () => {
  showPlan(iso === null ? 'masse' : iso < LEVELS.length ? LEVELS[iso].id : 'TOIT');
  $('#plans').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
});
showPlan('masse');

// ---------------------------------------------------------------- pointer: pick
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let down = null;
const hint = $('#hint');
hint.textContent = coarse ? 'Glissez pour tourner · pincez pour zoomer' : 'Glissez pour tourner · cliquez pour activer la molette';
setTimeout(() => hint.classList.add('off'), 6000);

renderer.domElement.addEventListener('pointerdown', e => {
  down = [e.clientX, e.clientY];
  controls.enableZoom = true;
  hint.classList.add('off');
  if (controls.autoRotate) setSpin(false);
});
viewport.addEventListener('pointerleave', () => { controls.enableZoom = false; });
renderer.domElement.addEventListener('pointerup', e => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5 || e.button !== 0) return;
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  if (iso === null) { // overview: a click on the building isolates that level
    const hit = ray.intersectObjects(levels.filter(l => l.shellFill).map(l => l.shellFill), false)[0];
    if (hit) { const i = hit.object.userData.levelIdx; applyIso(i); focusLevel(i); } else clearSelection();
    return;
  }
  const hit = ray.intersectObjects(levels[iso].pick, false)[0];
  hit ? select(hit.object) : clearSelection();
});

// ---------------------------------------------------------------- keyboard
addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest?.('input, textarea')) return;
  if (e.key >= '1' && e.key <= '6') { const i = Number(e.key) - 1; applyIso(i); focusLevel(i); }
  else if (e.key === '0') { applyIso(null); focusLevel(null); }
  else if (e.key === 'e' || e.key === 'E') setExplode(!exploded);
  else if (e.key === 'Escape') { clearSelection(); tourStop(); }
  else if (tour !== null && e.key === 'ArrowRight') tourGo(Math.min(TOUR.length - 1, tour + 1));
  else if (tour !== null && e.key === 'ArrowLeft') tourGo(Math.max(0, tour - 1));
});

window.__app = { camera, controls, levels, applyIso, flyView };
