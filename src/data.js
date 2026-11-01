// All numbers of the project live here. Hypothesis values are flagged in PROJECT.status.
// Axes: +X east, -Z north (sea), +Y up, 1 unit = 1 m.

export const PROJECT = {
  name: 'Centre International des Neurosciences',
  location: 'Algérie — littoral (commune à confirmer)',
  landArea: 11500,
  footprintMax: 1500,
  gfaMax: 7500,
  status: 'Hypothèse de travail — à valider',
  date: '01/11/2026',
  index: 'A',
};

export const GRID = { bay: 7.5, bays: 8, width: 60, depth: 24, bz: [0, 10.5, 13.5, 24] };
export const ORIGIN = { x: -30, z: -38 }; // building local (bx, bz) = (0, 0) in world metres

export const LAYERS = {
  '0-STRUCTURE':     { aci: 7,  hex: 0x4a5058, desc: 'Dalles, poteaux, limite de parcelle' },
  'A-MURS':          { aci: 8,  hex: 0x8a929c, desc: 'Murs, façade sud' },
  'A-VITRAGE':       { aci: 4,  hex: 0x7fb4d9, desc: 'Façade vitrée nord (mer)' },
  'A-BRISE-SOLEIL':  { aci: 2,  hex: 0x9aa0a8, desc: 'Brise-soleil horizontaux et verticaux' },
  'ZONES':           { aci: 0,  hex: 0x0058a3, desc: 'Zones fonctionnelles (couleur par famille)' },
  'NOYAUX':          { aci: 6,  hex: 0x6e7680, desc: 'Ascenseurs, escaliers, noyaux' },
  'TECHNIQUE':       { aci: 30, hex: 0x9aa0a8, desc: 'Locaux techniques, gaines, groupes' },
  'ENERGIE':         { aci: 3,  hex: 0x1f9d8a, desc: 'Photovoltaïque, solaire thermique, soleil' },
  'VOIRIE':          { aci: 1,  hex: 0xb4bac2, desc: 'Voies' },
  'SECURITE':        { aci: 1,  hex: 0xd9453a, desc: 'Voie pompiers, accès ambulances' },
  'PARKING':         { aci: 9,  hex: 0xb4bac2, desc: 'Stationnement' },
  'PAYSAGE':         { aci: 94, hex: 0x8fb77f, desc: 'Jardins, arbres' },
  'BUNGALOW':        { aci: 5,  hex: 0x0058a3, desc: 'Bungalows thérapeutiques' },
  'COTATION':        { aci: 2,  hex: 0x0058a3, desc: 'Cotes et repères' },
  'VOISINAGE':       { aci: 252, hex: 0xc9ced4, desc: 'Bâtiments voisins' },
};

// four colour families keep the model readable
export const GROUPS = [
  { label: 'Soins et hospitalisation', color: 0x0058a3, types: ['soin', 'bloc', 'imagerie', 'hospit'] },
  { label: 'Réadaptation et psychiatrie', color: 0xe0a000, types: ['reeduc', 'psy'] },
  { label: 'Recherche et accueil', color: 0x1f9d8a, types: ['recherche', 'public'] },
  { label: 'Support et technique', color: 0x9aa0a8, types: ['logistique', 'technique'] },
];
export const TYPE_COLORS = {
  ...Object.fromEntries(GROUPS.flatMap(g => g.types.map(t => [t, g.color]))),
  circulation: 0xc9ced4, noyau: 0x6e7680,
};
export const TYPE_LABELS = {
  public: 'Accueil / public', soin: 'Soins', bloc: 'Bloc / stérilisation', imagerie: 'Imagerie',
  hospit: 'Hospitalisation', reeduc: 'Rééducation', psy: 'Psychiatrie / gériatrie',
  recherche: 'Recherche / enseignement', logistique: 'Logistique / support',
  technique: 'Technique', circulation: 'Circulation', noyau: 'Noyau vertical',
};
export const TYPE_FLOWS = {
  public: 'Flux public et patients externes',
  soin: 'Flux patients, personnel soignant',
  bloc: 'Flux propre / sale séparés, accès restreint',
  imagerie: 'Flux patients ambulatoires et brancards',
  hospit: 'Flux patients hospitalisés, visiteurs, personnel',
  reeduc: 'Flux patients internes et externes, accès jardin',
  psy: 'Flux patients, accès sécurisé',
  recherche: 'Flux chercheurs, étudiants, public conférences',
  logistique: 'Flux logistique et personnel',
  technique: 'Accès maintenance uniquement',
  circulation: 'Circulation horizontale commune',
  noyau: 'Circulation verticale (public, brancards, personnel, logistique)',
};
export const TYPE_ENERGY = {
  public: 'CVC zoné, éclairage LED à détection de présence',
  soin: 'CVC zoné, sous-comptage par secteur',
  bloc: 'Surpression, 100 % air neuf filtré, CTA dédiée, secours onduleur : ne pas réduire',
  imagerie: 'Refroidissement dédié IRM/scanner, alimentation secourue : ne pas réduire',
  hospit: 'Chambres : confort thermique, brise-soleil, ECS solaire',
  reeduc: 'CVC zoné, apports solaires maîtrisés',
  psy: 'CVC zoné, éclairage LED à commande',
  recherche: 'Hottes et laboratoires : ventilation spécifique, sous-comptage',
  logistique: 'Éclairage LED, ventilation de base',
  technique: 'Pilotage GTC, maintenance préventive',
  circulation: 'Éclairage LED à détection de présence',
  noyau: 'Ascenseurs à récupération d’énergie, désenfumage',
};

// ---------------------------------------------------------------- levels
const Z = (id, name, type, bx0, bx1, bz0, bz1, o = {}) => ({ id, name, type, bx0, bx1, bz0, bz1, ...o });

export const LEVELS = [
  { id: 'RDC', label: 'Rez-de-chaussée', elev: 0, h: 5.0, zones: [
    Z('rdc-consult', 'Consultations spécialisées (8 box)', 'soin', 3, 22.5, 0, 10.5, { note: '8 box de consultation vue mer' }),
    Z('rdc-explor', 'Explorations fonctionnelles EEG / EMG / PE', 'soin', 22.5, 37.5, 0, 10.5),
    Z('rdc-imagerie', 'Imagerie : IRM 1,5 T + scanner', 'imagerie', 37.5, 57, 0, 10.5, { note: 'IRM 7×9 m en cage de Faraday, scanner 6×7 m plombé, dalle renforcée' }),
    Z('rdc-logis', 'Logistique, quai, vestiaires', 'logistique', 0, 7.5, 13.5, 24),
    Z('rdc-hall', 'Hall, accueil, admissions', 'public', 15, 30, 13.5, 24),
    Z('rdc-urg', 'Urgences neuro + box + déchocage', 'soin', 37.5, 60, 13.5, 24, { note: 'Accès ambulances côté est, distinct de l’entrée publique' }),
  ] },
  { id: 'R+1', label: 'Niveau 1', elev: 5.0, h: 4.8, zones: [
    Z('r1-rea', 'Réanimation / soins intensifs', 'soin', 3, 22.5, 0, 10.5, { beds: 8, note: '8 lits de soins intensifs' }),
    Z('r1-bloc', 'Bloc opératoire (2 salles) + couloir propre', 'bloc', 22.5, 45, 0, 10.5, { note: '2 salles d’environ 45 m², ISO 7, surpression' }),
    Z('r1-sspi', 'SSPI', 'bloc', 45, 57, 0, 10.5, { posts: 6, note: '6 postes de surveillance post-interventionnelle' }),
    Z('r1-pers', 'Locaux personnel', 'logistique', 0, 7.5, 13.5, 24),
    Z('r1-steri', 'Stérilisation centrale (sale vers propre)', 'bloc', 15, 30, 13.5, 24),
    Z('r1-arsenal', 'Arsenal / pharmacie bloc', 'logistique', 37.5, 48, 13.5, 24),
    Z('r1-cta', 'Local CTA bloc (traitement d’air)', 'technique', 48, 60, 13.5, 24),
  ] },
  { id: 'R+2', label: 'Niveau 2', elev: 9.8, h: 4.0, zones: [
    Z('r2-nchir', 'Chambres neurochirurgie vue mer', 'hospit', 3, 30, 0, 10.5, { rooms: 8, perRoom: 1 }),
    Z('r2-neuro', 'Chambres neurologie vue mer', 'hospit', 30, 57, 0, 10.5, { rooms: 8, perRoom: 1 }),
    Z('r2-poste', 'Poste de soins + office', 'soin', 0, 7.5, 13.5, 24),
    Z('r2-ville1', 'Chambres côté ville (4)', 'hospit', 15, 30, 13.5, 24, { rooms: 4, perRoom: 2 }),
    Z('r2-ville2', 'Chambres côté ville (6)', 'hospit', 37.5, 60, 13.5, 24, { rooms: 6, perRoom: 2 }),
  ] },
  { id: 'R+3', label: 'Niveau 3', elev: 13.8, h: 4.0, zones: [
    Z('r3-reeduc', 'Plateau de rééducation neurologique', 'reeduc', 3, 22.5, 0, 10.5, { note: 'Accès direct au jardin par l’extérieur (escalier et rampe)' }),
    Z('r3-ergo', 'Ergothérapie + appartement thérapeutique', 'reeduc', 22.5, 37.5, 0, 10.5),
    Z('r3-neuropsy', 'Neuropsychologie + rééducation cognitive', 'psy', 37.5, 57, 0, 10.5),
    Z('r3-vest', 'Vestiaires patients', 'logistique', 0, 7.5, 13.5, 24),
    Z('r3-hdj', 'Hôpital de jour neuro / psycho-gériatrie', 'psy', 15, 30, 13.5, 24),
    Z('r3-psy', 'Psychiatrie (consultations + activités)', 'psy', 37.5, 60, 13.5, 24),
  ] },
  { id: 'R+4', label: 'Niveau 4', elev: 17.8, h: 4.0, zones: [
    Z('r4-audit', 'Auditorium 150 places, panoramique', 'recherche', 3, 22.5, 0, 10.5, { seats: 150 }),
    Z('r4-labo', 'Laboratoires de recherche clinique', 'recherche', 22.5, 45, 0, 10.5),
    Z('r4-dir', 'Direction scientifique', 'recherche', 45, 57, 0, 10.5),
    Z('r4-tech', 'Locaux techniques laboratoires', 'technique', 0, 7.5, 13.5, 24),
    Z('r4-ens', 'Salles d’enseignement + simulation', 'recherche', 15, 30, 13.5, 24),
    Z('r4-biblio', 'Bibliothèque / coworking', 'recherche', 37.5, 52.5, 13.5, 24),
    Z('r4-terrasse', 'Terrasse accessible', 'public', 52.5, 60, 13.5, 24),
  ] },
];

// guided tour stations: a camera view or a level to isolate
export const TOUR = [
  { title: 'Le site', text: 'Un terrain de 11 500 m². La mer est au nord, la voie d’accès au sud.', view: 'iso' },
  { title: 'Accès et stationnement', text: 'Entrée publique au centre, ambulances à l’est, livraisons à l’ouest.', view: 'parking' },
  { title: 'Bungalows thérapeutiques', text: 'Six unités de 64 m² dans le jardin ouest.', view: 'bungalows' },
  { title: 'Rez-de-chaussée', text: 'Accueil, consultations, urgences et imagerie IRM et scanner.', level: 0 },
  { title: 'Niveau 1', text: 'Bloc opératoire, soins intensifs et stérilisation.', level: 1 },
  { title: 'Niveau 2', text: 'Trente-six lits dans des chambres tournées vers la mer.', level: 2 },
  { title: 'Niveau 3', text: 'Rééducation, ergothérapie, psychiatrie et gériatrie.', level: 3 },
  { title: 'Niveau 4', text: 'Recherche, auditorium de 150 places et terrasse panoramique.', level: 4 },
  { title: 'Toiture', text: 'Panneaux photovoltaïques, solaire thermique et locaux techniques.', level: 5 },
];

export const ROOF_ELEV = LEVELS.reduce((s, l) => s + l.h, 0); // 21.8

// Cores: vertical through all levels
export const CORES = [
  { id: 'noyau-ouest', name: 'Noyau ouest — public', bx0: 7.5, bx1: 15, bz0: 13.5, bz1: 24, lifts: [[8.3, 2.1], [10.6, 2.1]], stairs: [[8.3, 6.2]] },
  { id: 'noyau-est', name: 'Noyau est — lits, personnel, logistique', bx0: 30, bx1: 37.5, bz0: 13.5, bz1: 24, lifts: [[30.4, 2.1], [32.7, 2.1], [35.0, 2.4]], stairs: [[30.4, 6.2]] },
];

// zones common to every level: corridor, cores, escape stairs
export function commonZones(lv) {
  const p = lv.id;
  return [
    Z(`${p}-couloir`, 'Couloir central', 'circulation', 0, 60, 10.5, 13.5),
    ...CORES.map(c => Z(`${p}-${c.id}`, c.name, 'noyau', c.bx0, c.bx1, c.bz0, c.bz1, { core: c })),
    Z(`${p}-esc-o`, 'Escalier de secours ouest', 'noyau', 0, 3, 0, 10.5, { escape: true }),
    Z(`${p}-esc-e`, 'Escalier de secours est', 'noyau', 57, 60, 0, 10.5, { escape: true }),
  ];
}
export const allZones = lv => [...lv.zones, ...commonZones(lv)];
export const zoneArea = z => (z.bx1 - z.bx0) * (z.bz1 - z.bz0);
export const zoneRooms = z => (z.rooms ? { rooms: z.rooms, beds: z.rooms * (z.perRoom || 1) } : null);

// ---------------------------------------------------------------- site
function scaledPlot(raw, target) {
  let a = 0;
  raw.forEach((p, i) => { const q = raw[(i + 1) % raw.length]; a += p[0] * q[1] - q[0] * p[1]; });
  const s = Math.sqrt(target / (Math.abs(a) / 2));
  return raw.map(([x, z]) => [x * s, z * s]);
}
export const polyArea = pts => Math.abs(pts.reduce((a, p, i) => { const q = pts[(i + 1) % pts.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;

const POLYGON = scaledPlot([[-57, -48], [56, -50], [57.5, 48], [-45, 50], [-52, 10]], PROJECT.landArea);

export const SITE = {
  polygon: POLYGON,
  road: { x0: -85, x1: 85, sw0: 52, sw1: 54, z0: 54, z1: 66 },
  seaZ: -132,
  lanes: [
    { id: 'voie-publique', name: 'Entrée publique + dépose-minute', layer: 'VOIRIE', rects: [[-10.5, -14, -4.5, 54], [-15, -14, 0, -10.5]] },
    { id: 'voie-ambulance', name: 'Accès ambulances (distinct)', layer: 'SECURITE', rects: [[48, -22, 54, 54], [38, -22, 54, -16]] },
    { id: 'voie-logistique', name: 'Accès logistique (livraisons, déchets)', layer: 'VOIRIE', rects: [[-37, -8, -31, 54], [-37, -14, -22, -8]] },
  ],
  fireLoop: { x0: -36, z0: -44, x1: 36, z1: -8, width: 4 },
  parking: [
    { id: 'pk-a', name: 'Parking visiteurs A', kind: 'visiteurs', x0: -27, x1: -11.5, z0: 6, z1: 46, pmr: 'right' },
    { id: 'pk-b', name: 'Parking visiteurs B', kind: 'visiteurs', x0: -3, x1: 12.5, z0: 6, z1: 46, pmr: 'left' },
    { id: 'pk-c', name: 'Parking visiteurs C', kind: 'visiteurs', x0: 14, x1: 29.5, z0: 6, z1: 46 },
    { id: 'pk-d', name: 'Parking personnel', kind: 'personnel', x0: 31, x1: 46.5, z0: 6, z1: 38 },
  ],
  garden: { x0: -32, x1: 34, z0: -48.5, z1: -39.5 },
  ergoOut: { x0: 34, x1: 54, z0: -46, z1: -28 },
  bungalows: { cols: [-56, -46], rows: [-46, -35, -24], size: 8, terrace: 2.5, area: 64 },
  techYard: { x0: 33, x1: 46, z0: 40, z1: 47 },
  dropOff: { x0: -15, x1: 0, z0: -14, z1: -10.5 },
  ambCanopy: { x0: 30, x1: 38, z0: -24, z1: -14 },
  latitude: 36.7,
};

// ---------------------------------------------------------------- energy (order of magnitude, to validate)
export const ENERGY = {
  warning: 'Ordres de grandeur d’avant-projet. À valider par une étude thermique et énergétique.',
  climate: 'Méditerranéen littoral (Csa) : été chaud et sec, hiver doux et humide, embruns salins. Façade en aluminium anodisé, fixations inox.',
  envelope: [
    'Façade nord vitrée (mer) : double vitrage bas-émissif, Uw ≈ 1,4 W/m²·K',
    'Murs opaques est, ouest, sud isolés : U ≈ 0,35 W/m²·K',
    'Toiture : U ≈ 0,25 W/m²·K',
    'Brise-soleil horizontaux (nord et sud), verticaux (est et ouest)',
  ],
  baselineKwhM2: 320,
  targetKwhM2: 220,
  breakdown: [
    { id: 'cvc', label: 'CVC (chaud, froid, ventilation)', pct: 45, types: ['bloc', 'hospit', 'technique', 'soin'] },
    { id: 'med', label: 'Équipements médicaux (IRM, scanner, bloc)', pct: 18, types: ['imagerie', 'bloc'] },
    { id: 'led', label: 'Éclairage LED + GTC', pct: 10, types: ['public', 'circulation', 'reeduc', 'psy', 'recherche'] },
    { id: 'ecs', label: 'Eau chaude sanitaire', pct: 8, types: ['hospit'] },
    { id: 'lift', label: 'Ascenseurs + divers', pct: 7, types: ['noyau'] },
    { id: 'it', label: 'Informatique + serveurs PACS', pct: 7, types: ['technique', 'recherche'] },
    { id: 'cuis', label: 'Cuisine / office', pct: 5, types: ['logistique'] },
  ],
  pv: { roofKwc: 90, parkingKwc: 300, yield: 1600 },
  solarThermal: { area: 60, share: 50 },
  rain: { roof: 1440, mm: 600, coef: 0.8 },
  critical: [
    'Transformateur 1 250 kVA',
    '2 groupes électrogènes de 800 kVA (redondance N+1)',
    'Onduleurs pour bloc, soins intensifs, imagerie et serveurs',
    'Gaz médicaux (O₂, air, vide) avec secours',
    'Bloc ISO 5/7 en surpression ; chambre d’isolement en dépression possible',
  ],
  submeters: ['Par niveau', 'Bloc', 'Imagerie', 'Hospitalisation', 'Recherche'],
};

// ---------------------------------------------------------------- derived figures
export const footprintArea = () => GRID.width * GRID.depth;
export const gfa = () => footprintArea() * LEVELS.length;
export const sumArea = (zones, pred = () => true) => zones.filter(pred).reduce((s, z) => s + zoneArea(z), 0);
export const levelById = id => LEVELS.find(l => l.id === id);

export const TYPOLOGIES = [
  { id: 'monobloc', name: 'Hôpital monobloc R+4', need: 'Béton armé, trame 7,5 m, plancher-dalle', focus: { level: null },
    calc: () => ({ count: `${LEVELS.length} niveaux`, area: gfa() }) },
  { id: 'plateau', name: 'Plateau technique : bloc, SSPI, réanimation, stérilisation', need: 'CTA dédiée, surpression, redondance électrique', focus: { level: 1 },
    calc: () => ({ count: '2 salles, 8 lits USI', area: sumArea(levelById('R+1').zones, z => ['bloc', 'soin'].includes(z.type)) }) },
  { id: 'imagerie', name: 'Plateau imagerie : IRM et scanner', need: 'Cage de Faraday, plomb, dalle renforcée, faibles vibrations', focus: { level: 0 },
    calc: () => ({ count: 'IRM 1,5 T + scanner', area: sumArea(levelById('RDC').zones, z => z.type === 'imagerie') }) },
  { id: 'hospit', name: 'Hospitalisation neurochirurgie et neurologie', need: 'Chambres vue mer, vestiaires infirmiers, désenfumage', focus: { level: 2 },
    calc: () => {
      const zs = levelById('R+2').zones.filter(z => z.rooms);
      return { count: `${zs.reduce((s, z) => s + z.rooms, 0)} chambres, ${zs.reduce((s, z) => s + z.rooms * z.perRoom, 0)} lits`, area: sumArea(zs) };
    } },
  { id: 'reeduc', name: 'Rééducation, psychiatrie, gériatrie', need: 'Accès jardin, sécurité des patients, ergonomie', focus: { level: 3 },
    calc: () => ({ count: '6 secteurs', area: sumArea(levelById('R+3').zones, z => z.type !== 'logistique') }) },
  { id: 'recherche', name: 'Recherche, enseignement, auditorium', need: 'Ventilation labo, acoustique, panorama', focus: { level: 4 },
    calc: () => ({ count: 'Auditorium 150 places', area: sumArea(levelById('R+4').zones, z => z.type === 'recherche') }) },
  { id: 'bungalow', name: 'Bungalows thérapeutiques', need: 'Plain-pied, ossature légère, terrasse, accès PMR', focus: { view: 'bungalows' },
    calc: () => ({ count: `${SITE.bungalows.cols.length * SITE.bungalows.rows.length} unités`, area: SITE.bungalows.cols.length * SITE.bungalows.rows.length * SITE.bungalows.area }) },
  { id: 'exterieur', name: 'Ouvrages extérieurs : parkings, ombrières PV, zone technique, voies', need: 'Voie pompiers, groupes électrogènes, drainage', focus: { view: 'parking' },
    calc: () => ({ count: 'Voies + 4 parkings', area: PROJECT.landArea - footprintArea() }) },
];

// ---------------------------------------------------------------- self check (dev)
export function validate() {
  const bad = [];
  const ok = (c, msg) => { console.assert(c, msg); if (!c) bad.push(msg); };
  ok(footprintArea() <= PROJECT.footprintMax, 'emprise > 1500 m²');
  ok(gfa() <= PROJECT.gfaMax, 'SHON > 7500 m²');
  ok(LEVELS.length === 5, '5 niveaux attendus');
  ok(Math.abs(polyArea(SITE.polygon) - PROJECT.landArea) < 1, 'surface parcelle ≠ 11 500');
  LEVELS.forEach(lv => {
    const zs = allZones(lv);
    ok(Math.abs(zs.reduce((s, z) => s + zoneArea(z), 0) - footprintArea()) < 0.01, `${lv.id} : zones ≠ emprise`);
    zs.forEach(z => ok(z.bx0 >= 0 && z.bx1 <= GRID.width && z.bz0 >= 0 && z.bz1 <= GRID.depth, `${z.id} hors emprise`));
    zs.forEach((a, i) => zs.slice(i + 1).forEach(b =>
      ok(!(a.bx0 < b.bx1 && b.bx0 < a.bx1 && a.bz0 < b.bz1 && b.bz0 < a.bz1), `chevauchement ${a.id} / ${b.id}`)));
  });
  return bad;
}
