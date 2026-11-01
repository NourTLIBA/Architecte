import {
  PROJECT, LEVELS, SITE, ENERGY, GROUPS, TYPE_COLORS, TYPE_LABELS, TYPE_FLOWS, TYPE_ENERGY, TYPOLOGIES,
  allZones, zoneArea, footprintArea, gfa,
} from './data.js';

const $ = s => document.querySelector(s);
const fr = (n, d = 0) => {
  const [i, f] = Number(n).toFixed(d).split('.');
  return i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (f ? ',' + f : '');
};
export const hex = n => '#' + n.toString(16).padStart(6, '0');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const plain = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const short = n => n.replace(/\s*\(.*?\)/g, '').split(' + ')[0];

// ---------------------------------------------------------------- level selector
export function buildLevelBar(onPick) {
  const bar = $('#levels');
  const items = [['Toit', LEVELS.length], ...[...LEVELS].reverse().map(l => [l.id, LEVELS.indexOf(l)]), ['Tout', null]];
  bar.innerHTML = items.map(([name, idx]) => `<button data-idx="${idx ?? ''}" aria-pressed="${idx === null}">${name}</button>`).join('');
  bar.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (b) onPick(b.dataset.idx === '' ? null : Number(b.dataset.idx));
  });
}
export function markLevel(idx) {
  document.querySelectorAll('#levels button').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.idx === '' ? null : Number(b.dataset.idx)) === idx)));
}

export function renderLegend() {
  $('#legend-list').innerHTML = [...GROUPS.map(g => [g.color, g.label]), [TYPE_COLORS.noyau, 'Noyaux et circulations']]
    .map(([c, l]) => `<li><span class="sw" style="background:${hex(c)}"></span>${l}</li>`).join('');
}

// ---------------------------------------------------------------- zone card (inside the sim)
export function renderZoneCard(z, lv) {
  const layer = z.type === 'noyau' ? 'NOYAUX' : z.type === 'technique' ? 'TECHNIQUE' : 'ZONES';
  const w = z.bx1 - z.bx0, d = z.bz1 - z.bz0;
  const rows = [['Surface', `${fr(zoneArea(z), 1)} m²`], ['Dimensions', `${fr(w, 1)} × ${fr(d, 1)} m`], ['Hauteur libre', `${fr(lv.h - 0.3, 1)} m`]];
  if (z.rooms) rows.push(['Chambres', `${z.rooms} (${z.rooms * z.perRoom} lits)`]);
  if (z.beds) rows.push(['Lits', z.beds]);
  if (z.posts) rows.push(['Postes', z.posts]);
  if (z.seats) rows.push(['Places', z.seats]);
  if (z.core) rows.push(['Équipement', `${z.core.lifts.length} ascenseurs, 1 escalier`]);
  return `<button class="x" data-act="close" aria-label="Fermer">×</button>
  <p class="kick"><span class="sw" style="background:${hex(TYPE_COLORS[z.type])}"></span>${TYPE_LABELS[z.type]} · ${lv.id}</p>
  <h2>${esc(z.name)}</h2>
  <dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
  <p class="muted">${z.note ? esc(z.note) + '. ' : ''}${TYPE_FLOWS[z.type]}. ${TYPE_ENERGY[z.type]}.</p>`;
}

// ---------------------------------------------------------------- search
export function buildSearch(onPick) {
  const items = [];
  LEVELS.forEach((lv, i) => {
    items.push({ name: `${lv.id} — ${lv.label}`, meta: 'Niveau', level: i });
    allZones(lv).filter(z => z.type !== 'circulation' && !z.escape).forEach(z => items.push({ name: short(z.name), meta: lv.id, level: i, zone: z }));
  });
  items.push({ name: 'Toiture', meta: 'Niveau', level: LEVELS.length });
  const input = $('#search'), list = $('#results');
  let shown = [], active = -1;
  const close = () => { list.hidden = true; active = -1; };
  const paint = () => [...list.children].forEach((li, i) => li.setAttribute('aria-selected', String(i === active)));
  const pick = i => { const it = shown[i]; if (!it) return; close(); input.value = ''; input.blur(); onPick(it); };
  input.addEventListener('input', () => {
    const q = plain(input.value.trim());
    if (!q) return close();
    shown = items.filter(it => plain(it.name).includes(q) || plain(it.meta).includes(q)).slice(0, 7);
    list.innerHTML = shown.map((it, i) => `<li role="option" data-i="${i}">${esc(it.name)}<small>${it.meta}</small></li>`).join('') || '<li>Aucun résultat</li>';
    list.hidden = false; active = -1;
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { active = Math.min(shown.length - 1, active + 1); paint(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { active = Math.max(0, active - 1); paint(); e.preventDefault(); }
    else if (e.key === 'Enter') pick(active >= 0 ? active : 0);
    else if (e.key === 'Escape') { close(); input.blur(); }
    e.stopPropagation();
  });
  list.addEventListener('pointerdown', e => { const li = e.target.closest('li[data-i]'); if (li) { e.preventDefault(); pick(Number(li.dataset.i)); } });
  input.addEventListener('blur', close);
}

// ---------------------------------------------------------------- page sections
function levelSummary(lv) {
  return allZones(lv).filter(z => !['logistique', 'technique', 'circulation', 'noyau'].includes(z.type))
    .sort((a, b) => zoneArea(b) - zoneArea(a)).slice(0, 3).map(z => short(z.name)).join(', ');
}

export function renderPage(stats) {
  const E = ENERGY, g = gfa();
  $('#projet-kpis').innerHTML = [
    [`${fr(PROJECT.landArea)} m²`, 'de terrain'],
    [`${fr(footprintArea())} m²`, `d’emprise bâtie, pour ${fr(PROJECT.footprintMax)} autorisés`],
    [`${fr(g)} m²`, `de surface brute sur ${LEVELS.length} niveaux`],
    ['R+4', 'soit 21,80 m de hauteur'],
  ].map(([b, s]) => `<div><b>${b}</b><span>${s}</span></div>`).join('');

  $('#niveaux-cards').innerHTML = [
    ...LEVELS.map((lv, i) => `<button class="card2" data-level="${i}"><span class="tag">${lv.id}</span><h3>${lv.label}</h3><p>${levelSummary(lv)}.</p><span class="m">Voir dans la maquette</span></button>`),
    `<button class="card2" data-level="${LEVELS.length}"><span class="tag">Toit</span><h3>Toiture</h3><p>Panneaux photovoltaïques, solaire thermique et locaux techniques.</p><span class="m">Voir dans la maquette</span></button>`,
  ].join('');

  // energy
  const target = (g * E.targetKwhM2) / 1000, base = (g * E.baselineKwhM2) / 1000;
  const pvMwh = ((E.pv.roofKwc + E.pv.parkingKwc) * E.pv.yield) / 1000;
  const rain = E.rain.roof * (E.rain.mm / 1000) * E.rain.coef;
  const max = Math.max(...E.breakdown.map(b => b.pct));
  $('#energie-body').innerHTML = `
    <h2>Énergie</h2>
    <p class="lead">${E.climate}</p>
    <div class="kpis">
      <div><b>${E.baselineKwhM2} → ${E.targetKwhM2}</b><span>kWh/m²·an : référence puis cible</span></div>
      <div><b>${fr(Math.round(target / 10) * 10)} MWh</b><span>par an à la cible (référence ${fr(Math.round(base / 10) * 10)})</span></div>
      <div><b>${E.pv.roofKwc + E.pv.parkingKwc} kWc</b><span>de photovoltaïque, toiture et ombrières</span></div>
      <div><b>≈ ${fr((pvMwh / target) * 100)} %</b><span>de la cible couverts par le solaire</span></div>
    </div>
    <div class="two">
      <div>
        <h3>Où va l’énergie</h3>
        <p style="margin:0;color:var(--ink-2);font-size:14px">Choisissez un poste pour repérer les zones concernées dans la maquette.</p>
        <div class="bars" role="list">${E.breakdown.map(b => `
          <button class="bar" role="listitem" data-energy="${b.id}">
            <span class="top"><span>${b.label}</span><span>${b.pct} % · ${fr((target * b.pct) / 100)} MWh</span></span>
            <span class="track"><span class="fill" style="width:${(b.pct / max) * 100}%"></span></span>
          </button>`).join('')}</div>
        <button class="btn solid link-btn" data-act="sun">Voir le soleil et les panneaux</button>
      </div>
      <div>
        <h3>Enveloppe</h3>
        <ul>${E.envelope.map(s => `<li>${s}</li>`).join('')}</ul>
        <h3 style="margin-top:20px">Eau</h3>
        <ul>
          <li>Solaire thermique : ${E.solarThermal.area} m², environ ${E.solarThermal.share} % de l’eau chaude.</li>
          <li>Eau de pluie : environ ${fr(rain)} m³ par an récupérables pour l’arrosage et les WC, si la réglementation le permet.</li>
        </ul>
        <h3 style="margin-top:20px">À ne jamais réduire</h3>
        <ul>${E.critical.map(s => `<li>${s}</li>`).join('')}</ul>
        <h3 style="margin-top:20px">Sous-comptage</h3>
        <p style="margin:0;color:var(--ink-2)">${E.submeters.join(', ')}.</p>
      </div>
    </div>
    <p class="note">${E.warning}</p>`;

  // typologies
  $('#types-body').innerHTML = TYPOLOGIES.map(t => {
    const c = t.calc();
    return `<button class="card2" data-type="${t.id}"><span class="tag">${c.count}</span><h3>${t.name}</h3><p>${t.need}.</p><span class="m">${fr(c.area)} m²</span></button>`;
  }).join('');

  // surfaces
  const bung = SITE.bungalows.cols.length * SITE.bungalows.rows.length;
  $('#surf-body').innerHTML = `<h2>Surfaces</h2><p class="lead">Chaque niveau, zone par zone, calculé depuis les données du projet.</p>${
    LEVELS.map((lv, i) => {
      const zs = allZones(lv);
      return `<details class="lv"${i === 0 ? ' open' : ''}><summary><span>${lv.id} — ${lv.label}</span><span>${fr(zs.reduce((s, z) => s + zoneArea(z), 0))} m²</span></summary>
      <table class="tbl"><thead><tr><th>Zone</th><th>Type</th><th class="n">m²</th></tr></thead><tbody>${
        zs.map(z => `<tr><td>${esc(z.name)}</td><td>${TYPE_LABELS[z.type]}</td><td class="n">${fr(zoneArea(z), 1)}</td></tr>`).join('')}</tbody></table></details>`;
    }).join('')}
    <table class="tbl totals"><tbody>
      <tr><td>Parcelle</td><td>${fr(PROJECT.landArea)} m²</td></tr>
      <tr><td>Emprise bâtie</td><td>${fr(footprintArea())} m²</td></tr>
      <tr><td>Surface brute (${LEVELS.length} niveaux)</td><td>${fr(g)} m²</td></tr>
      <tr><td>Espaces extérieurs</td><td>${fr(PROJECT.landArea - footprintArea())} m²</td></tr>
      <tr><td>Bungalows (${bung} × ${SITE.bungalows.area} m²)</td><td>${fr(bung * SITE.bungalows.area)} m²</td></tr>
      <tr><td>Stationnement visiteurs</td><td>${stats.visitors} places</td></tr>
      <tr><td>Stationnement personnel</td><td>${stats.staff} places</td></tr>
      <tr><td>dont places PMR</td><td>${stats.pmr}</td></tr>
    </tbody></table>`;
}

export function renderTour(i, n, s) {
  return `<p class="step">Étape ${i + 1} sur ${n}</p><h3>${s.title}</h3><p class="txt">${s.text}</p>
  <div class="acts"><button class="btn" data-tour="prev"${i === 0 ? ' disabled' : ''}>Précédent</button>
  <button class="btn solid" data-tour="next">${i === n - 1 ? 'Terminer' : 'Suivant'}</button>
  <button class="btn quiet" data-tour="stop">Quitter</button></div>`;
}
