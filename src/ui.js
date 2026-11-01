import {
  PROJECT, LEVELS, SITE, ENERGY, LAYERS, TYPE_COLORS, TYPE_LABELS, TYPE_FLOWS, TYPE_ENERGY, TYPOLOGIES,
  allZones, zoneArea, footprintArea, gfa,
} from './data.js';

const $ = s => document.querySelector(s);
const fr = (n, d = 0) => Number(n).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
const hex = n => '#' + n.toString(16).padStart(6, '0');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------------------------------------------------------------- command line
const history = [];
export function cmd(text) {
  history.push(`Commande: ${text}`);
  if (history.length > 50) history.shift();
  $('#cmdline').innerHTML = history.slice(-3).map(l => `<div>${esc(l)}</div>`).join('') + '<div><span class="prompt">Commande:</span> _</div>';
}

// ---------------------------------------------------------------- status bar
export function setCoords(x, y, z) { $('#coords').textContent = `X: ${x.toFixed(3)}  Y: ${y.toFixed(3)}  Z: ${z.toFixed(3)}`; }
export function setStatusLevel(t) { $('#status-level').textContent = t; }

// ---------------------------------------------------------------- level bar
export function buildLevelBar(onPick) {
  const bar = $('#levels');
  const items = [['TOITURE', LEVELS.length], ...[...LEVELS].reverse().map(l => [l.id, LEVELS.indexOf(l)]), ['SITE', null]];
  bar.innerHTML = items.map(([name, idx]) => `<button data-idx="${idx ?? ''}" aria-pressed="${idx === null}">${name}</button>`).join('');
  bar.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (b) onPick(b.dataset.idx === '' ? null : Number(b.dataset.idx));
  });
}
export function markLevel(idx) {
  document.querySelectorAll('#levels button').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.idx === '' ? null : Number(b.dataset.idx)) === idx)));
}

// ---------------------------------------------------------------- panels
function legend() {
  return `<h3>Légende des zones</h3><ul style="list-style:none;padding:0;columns:2;font-size:12.5px">${
    Object.keys(TYPE_COLORS).map(t => `<li><span class="sw" style="background:${hex(TYPE_COLORS[t])}"></span>${TYPE_LABELS[t]}</li>`).join('')}</ul>`;
}

export function renderHome() {
  return `<h2>${PROJECT.name}</h2>
  <p>${PROJECT.location}. Hôpital monobloc, vue mer au nord, accès par la voie sud.</p>
  <div class="note">${PROJECT.status}</div>
  <div class="kpi">
    <div><b>${fr(PROJECT.landArea)} m²</b><span>Terrain</span></div>
    <div><b>${fr(footprintArea())} m²</b><span>Emprise bâtie (max ${fr(PROJECT.footprintMax)})</span></div>
    <div><b>${fr(gfa())} m²</b><span>Surface brute (max ${fr(PROJECT.gfaMax)})</span></div>
    <div><b>R+4</b><span>${LEVELS.length} niveaux · 21,80 m</span></div>
  </div>
  <p>Cliquez une zone du bâtiment pour lire ses propriétés. Choisissez un niveau dans la barre de gauche pour le isoler.</p>
  ${legend()}`;
}

export function renderProps(z, lv) {
  const layer = z.type === 'noyau' ? 'NOYAUX' : z.type === 'technique' ? 'TECHNIQUE' : 'ZONES';
  const w = z.bx1 - z.bx0, d = z.bz1 - z.bz0;
  const rows = [
    ['Type', `<span class="sw" style="background:${hex(TYPE_COLORS[z.type])}"></span>${TYPE_LABELS[z.type]}`],
    ['Niveau', `${lv.id} — ${lv.label} (+${fr(lv.elev, 2)} m)`],
    ['Surface', `${fr(zoneArea(z), 1)} m²`],
    ['Dimensions', `${fr(w, 2)} × ${fr(d, 2)} m`],
    ['Hauteur', `${fr(lv.h - 0.3, 2)} m sous dalle`],
    ['Calque', `${layer} <span class="sw" style="margin:0 0 0 6px;background:${hex(LAYERS[layer].hex)}"></span>`],
    ['Flux', TYPE_FLOWS[z.type]],
    ['Énergie', TYPE_ENERGY[z.type]],
  ];
  if (z.rooms) rows.push(['Chambres', `${z.rooms} (${z.rooms * z.perRoom} lits)`]);
  if (z.beds) rows.push(['Lits', z.beds]);
  if (z.posts) rows.push(['Postes', z.posts]);
  if (z.seats) rows.push(['Places', z.seats]);
  if (z.core) rows.push(['Équipement', `${z.core.lifts.length} ascenseurs, ${z.core.stairs.length} escalier protégé`]);
  if (z.note) rows.push(['Note', z.note]);
  return `<h2>${esc(z.name)}</h2><dl class="props">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
  <p style="margin-top:14px"><button data-act="clear">Désélectionner</button></p>`;
}

export function renderEnergy() {
  const E = ENERGY, g = gfa();
  const target = (g * E.targetKwhM2) / 1000, base = (g * E.baselineKwhM2) / 1000;
  const pvMwh = ((E.pv.roofKwc + E.pv.parkingKwc) * E.pv.yield) / 1000;
  const rain = E.rain.roof * (E.rain.mm / 1000) * E.rain.coef;
  const max = Math.max(...E.breakdown.map(b => b.pct));
  return `<h2>Énergie</h2>
  <div class="note">${E.warning}</div>
  <h3>Climat et enveloppe</h3>
  <p>${E.climate}</p>
  <ul>${E.envelope.map(s => `<li>${s}</li>`).join('')}</ul>
  <h3>Consommation visée</h3>
  <div class="kpi">
    <div><b>${fr(E.baselineKwhM2)} → ${fr(E.targetKwhM2)}</b><span>kWh/m²·an, référence puis cible</span></div>
    <div><b>${fr(Math.round(target / 10) * 10)} MWh</b><span>par an à la cible (réf. ${fr(Math.round(base / 10) * 10)})</span></div>
  </div>
  <p>Cliquez une ligne pour repérer les zones concernées dans la maquette.</p>
  <div class="bars" role="list">${E.breakdown.map(b => `
    <button class="bar" role="listitem" data-energy="${b.id}">
      <span class="top"><span>${b.label}</span><span>${b.pct} % · ${fr((target * b.pct) / 100)} MWh</span></span>
      <span class="track"><span class="fill" style="display:block;width:${(b.pct / max) * 100}%;border-radius:0 4px 4px 0"></span></span>
    </button>`).join('')}</div>
  <h3>Production photovoltaïque</h3>
  <div class="kpi">
    <div><b>${E.pv.roofKwc} kWc</b><span>Toiture, ≈ ${fr((E.pv.roofKwc * E.pv.yield) / 1000)} MWh/an</span></div>
    <div><b>${E.pv.parkingKwc} kWc</b><span>Ombrières, ≈ ${fr((E.pv.parkingKwc * E.pv.yield) / 1000)} MWh/an</span></div>
  </div>
  <p>Total ≈ ${fr(pvMwh)} MWh/an, soit environ ${fr((pvMwh / target) * 100)} % de la cible (rendement ${fr(E.pv.yield)} kWh/kWc·an).</p>
  <h3>Eau chaude et eau de pluie</h3>
  <ul>
    <li>Solaire thermique : ${E.solarThermal.area} m², environ ${E.solarThermal.share} % des besoins d’eau chaude.</li>
    <li>Eau de pluie : toiture ${fr(E.rain.roof)} m² × ${E.rain.mm} mm × ${E.rain.coef} ≈ ${fr(rain)} m³/an pour arrosage et WC, si la réglementation le permet.</li>
  </ul>
  <h3>Secours et fonctions critiques (à ne jamais réduire)</h3>
  <ul>${E.critical.map(s => `<li>${s}</li>`).join('')}</ul>
  <h3>Sous-comptage</h3>
  <p>${E.submeters.join(' · ')}</p>
  <p>La maquette affiche la course du soleil aux solstices (latitude ${SITE.latitude}° N) et fait pulser les panneaux photovoltaïques.</p>`;
}

export function renderTypes() {
  return `<h2>Typologies</h2><p>Cliquez un élément pour le voir dans la maquette.</p>${TYPOLOGIES.map(t => {
    const c = t.calc();
    return `<button class="typ" data-type="${t.id}"><b>${t.name}</b><span class="m">${c.count} · ${fr(c.area)} m²</span><small>${t.need}</small></button>`;
  }).join('')}`;
}

export function renderSurfaces(stats) {
  let html = '<h2>Surfaces</h2><p>Zones de chaque niveau, calculées depuis les données du projet.</p>';
  LEVELS.forEach(lv => {
    const zs = allZones(lv);
    html += `<h3>${lv.id} — ${lv.label}</h3><table class="tbl"><thead><tr><th>Zone</th><th>Type</th><th class="n">m²</th></tr></thead><tbody>${
      zs.map(z => `<tr><td>${esc(z.name)}</td><td>${TYPE_LABELS[z.type]}</td><td class="n">${fr(zoneArea(z), 1)}</td></tr>`).join('')
    }<tr class="sub"><td colspan="2">Total niveau</td><td class="n">${fr(zs.reduce((s, z) => s + zoneArea(z), 0), 1)}</td></tr></tbody></table>`;
  });
  const bung = SITE.bungalows.cols.length * SITE.bungalows.rows.length;
  html += `<h3>Totaux</h3><table class="tbl"><tbody>
    <tr><td>Parcelle</td><td class="n">${fr(PROJECT.landArea)} m²</td></tr>
    <tr><td>Emprise bâtie</td><td class="n">${fr(footprintArea())} m²</td></tr>
    <tr><td>Surface brute (${LEVELS.length} niveaux)</td><td class="n">${fr(gfa())} m²</td></tr>
    <tr><td>Espaces extérieurs</td><td class="n">${fr(PROJECT.landArea - footprintArea())} m²</td></tr>
    <tr><td>Bungalows (${bung} × ${SITE.bungalows.area} m²)</td><td class="n">${fr(bung * SITE.bungalows.area)} m²</td></tr>
    <tr><td>Stationnement visiteurs</td><td class="n">${stats.visitors} places</td></tr>
    <tr><td>Stationnement personnel</td><td class="n">${stats.staff} places</td></tr>
    <tr><td>dont places PMR</td><td class="n">${stats.pmr}</td></tr>
  </tbody></table>`;
  return html;
}

// ---------------------------------------------------------------- view cube (CSS 3D, mirrors the camera)
const FACES = [
  ['HAUT', 'rotateX(90deg)', 'plan'], ['NORD · MER', 'rotateY(180deg)', 'sea'], ['SUD', '', 'south'],
  ['EST', 'rotateY(90deg)', 'east'], ['OUEST', 'rotateY(-90deg)', 'west'], ['BAS', 'rotateX(-90deg)', null],
];
export function buildViewCube(onFace) {
  const cube = $('#viewcube .cube');
  cube.innerHTML = FACES.map(([t, tr, v]) => `<div class="face${v === 'sea' ? ' sea' : ''}" data-view="${v}" style="transform:${tr} translateZ(30px)" role="button" aria-label="Vue ${t}">${t}</div>`).join('');
  cube.addEventListener('click', e => { const f = e.target.closest('.face'); if (f && f.dataset.view) onFace(f.dataset.view); });
  return m => {
    const e = m.elements; // view matrix, column-major
    cube.style.transform = `matrix3d(${e[0]},${-e[1]},${e[2]},0,${-e[4]},${e[5]},${-e[6]},0,${e[8]},${-e[9]},${e[10]},0,0,0,0,1)`;
  };
}

export function drawUCS(m) {
  const c = $('#ucs'), x = c.getContext('2d'), e = m.elements;
  x.clearRect(0, 0, 96, 96);
  const axes = [['X', [1, 0, 0], '#ff4040'], ['Y', [0, 1, 0], '#40ff40'], ['Z', [0, 0, 1], '#5a8cff']];
  const proj = ([a, b, d]) => [e[0] * a + e[4] * b + e[8] * d, e[1] * a + e[5] * b + e[9] * d, e[2] * a + e[6] * b + e[10] * d];
  axes.map(([n, v, col]) => [n, proj(v), col]).sort((p, q) => p[1][2] - q[1][2]).forEach(([n, p, col]) => {
    const ex = 48 + p[0] * 32, ey = 56 - p[1] * 32;
    x.strokeStyle = col; x.fillStyle = col; x.lineWidth = 2;
    x.beginPath(); x.moveTo(48, 56); x.lineTo(ex, ey); x.stroke();
    x.font = '600 11px "JetBrains Mono", monospace';
    x.fillText(n, ex + (ex >= 48 ? 3 : -10), ey + (ey >= 56 ? 10 : -2));
  });
}

// ---------------------------------------------------------------- crosshair overlay
export function initCrosshair(viewport) {
  const c = $('#cross'), fine = matchMedia('(pointer: fine)');
  let mx = -1, my = -1;
  const draw = () => {
    const w = viewport.clientWidth, h = viewport.clientHeight, dpr = devicePixelRatio || 1;
    if (c.width !== w * dpr || c.height !== h * dpr) { c.width = w * dpr; c.height = h * dpr; }
    const x = c.getContext('2d');
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.clearRect(0, 0, w, h);
    if (mx < 0) return;
    x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineWidth = 1;
    x.beginPath(); x.moveTo(0, my + .5); x.lineTo(w, my + .5); x.moveTo(mx + .5, 0); x.lineTo(mx + .5, h); x.stroke();
    x.strokeStyle = '#212830'; x.fillStyle = '#212830'; x.fillRect(mx - 5, my - 5, 11, 11);
    x.strokeStyle = '#fff'; x.strokeRect(mx - 4.5, my - 4.5, 9, 9);
  };
  viewport.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch' || !fine.matches) return;
    const r = viewport.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; draw();
  });
  viewport.addEventListener('pointerleave', () => { mx = my = -1; draw(); });
  new ResizeObserver(draw).observe(viewport);
}
