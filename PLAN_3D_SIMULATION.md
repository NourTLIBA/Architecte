# PLAN — Centre International des Neurosciences, 3D AutoCAD-look sim

Me caveman planner. You Sonnet builder. You read whole file first. Then you do step one by one. Step small. Each step = one commit-size change. No skip. No invent big feature. When step say **[SKILL]**, you call that Claude skill with Skill tool. Skill do boring work, you no do by hand.

---

## 0. What tribe have (repo cave content)

| File | What inside |
|---|---|
| `README.md` | 2 line. "simple 3JS simulation of a real estate project". |
| `synthese_projet_centre_international_neurosciences (1).md` | Big French brief. Hospital for brain. Algeria, coast. All numbers below come from here. |
| `terrain.jpeg` | Satellite photo of land. Today = big dirt car park. Sea = TOP of photo (north). Road = BOTTOM (south). Houses all around. Plot look like fat trapezoid, left-top corner have rubble pile, left side lean a bit. |

No code exist. You make all.

### Hard facts from brief (no change these)

- Name: **Centre International des Neurosciences**. Algeria, coast, sea to north.
- Land: **11 500 m²**.
- Building: **one block (monobloc)**, footprint **max 1 500 m²**.
- Height: **5 level = RDC + 4** (ground + 4).
- Max gross area theory: 7 500 m².
- Big glass panoramic face **toward sea (north)** with sun shading.
- Regular repeat structure grid (cheap).
- Separate flows: public / patient / stretcher / staff / logistic / clean / dirty.
- Level use:
  - **RDC**: welcome, admission, consultation, emergency, imaging (MRI + CT scanner), functional exploration, ambulance access.
  - **R+1**: operating block (2 rooms hypothesis), SSPI (recovery), ICU/réanimation, sterilisation.
  - **R+2**: inpatient beds neurosurgery + neurology.
  - **R+3**: ergotherapy, rehab, neuropsychology, psychiatry, neuro-geriatric, psycho-geriatric.
  - **R+4**: research, labs, teaching, conference, scientific direction, panoramic spaces.
- Outside: therapeutic garden, outdoor ergotherapy, **6 bungalows (60–70 m²)**, parking visitor + staff, ambulance access separate, logistic access, fire lane, green, technical yard (generators, medical gas).
- Energy wish list: insulation + sun shading, PV, LED + smart control, BMS (GTC), zoned AC, water reuse, sub-metering per sector. NEVER cut ventilation / filtration / pressure / backup power for bloc, ICU, special rooms.

### Hypothesis me add (brief leave open — show them in site as "hypothèse")

Brief say many thing not fixed. Model need numbers. Me pick these. Site must label them **"Hypothèse de travail — à valider"**.

- Plot ≈ **115 m (E-W) × 100 m (N-S)**, polygon slightly irregular (see §2).
- Footprint **60 m × 24 m = 1 440 m²** (≤ 1 500 OK). Grid **7.5 m in X (8 bays)**, **3 bays in Z: 10.5 / 3.0 / 10.5** (rooms / corridor / rooms).
- GFA 5 × 1 440 = **7 200 m²** (≤ 7 500 cap OK).
- Floor heights: RDC 5.0 m, R+1 4.8 m (big plenum for bloc HVAC), R+2/R+3/R+4 4.0 m. Top slab +21.8 m. Parapet 1.2 m. Roof plant screen 3.0 m.
- Beds R+2: **36 beds** (brief open: 40/60/80). ICU R+1: **8 beds**.

---

## 1. Tech choice (no argue)

- **One page**: `index.html` + `src/main.js` + `src/data.js` + `src/style.css`. No bundler. No npm. No React.
- three.js by importmap, pinned version:
  ```html
  <script type="importmap">
  { "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"
  } }
  </script>
  ```
- Addons use: `OrbitControls`, `CSS2DRenderer` (labels + dimension text), `Line2`/`LineMaterial`/`LineGeometry` (thick CAD lines), `EdgesGeometry` (outline).
- Fonts (Google Fonts): `JetBrains Mono` for command line + coords, `Archivo Narrow` for UI panels. Look like CAD software, not like marketing page.
- Local serve: `python -m http.server 5173` in repo root (importmap need http, not file://).
- Language of site text: **French** (brief is French). Code + comment: English.

---

## 2. World coordinate rule

- 1 three.js unit = **1 metre**.
- **+X = East**, **−Z = North (sea)**, **+Y = up**. Never break this.
- Site origin (0,0,0) = plot centre, ground level.
- Plot polygon (x, z), clockwise from NW:
  ```
  NW (-57,-48)  NE (56,-50)  SE (57.5,48)  SW (-45,50)  W-kink (-52,10)
  ```
  On load, compute polygon area (shoelace). Uniform scale polygon so area = 11 500 m² exactly. Print area in status bar.
- Road (outside plot): strip z = 50 → 62, x = -70 → 70. Sidewalk 2 m.
- Sea: big plane far north z < -120, flat blue-cyan hatch, label "MER MÉDITERRANÉE".
- Neighbour houses: low grey boxes (6–12 m tall) random-but-seeded around plot, outside polygon. Layer `VOISINAGE`.
- **Building local frame**: building box x = -30 → +30, z = -38 → -14 (north face at z = -38 look at sea, 12 m garden between face and north limit). Building local coords in data use `bx` 0→60 (west→east), `bz` 0→24 (north→south). Convert: `worldX = bx - 30`, `worldZ = bz - 38`.

---

## 3. Data model (`src/data.js`) — all numbers live here, nothing hard-coded in main.js

```js
export const PROJECT = { name, location, landArea: 11500, footprint: 1440, gfa: 7200, levels: 5, status: 'Hypothèse de travail — à valider' };
export const LEVELS = [ { id:'RDC', elev:0, h:5.0, label:'Rez-de-chaussée', zones:[...] }, ... ];
// zone = { id, name, type, bx0, bx1, bz0, bz1, layer, area (computed), notes, energy }
export const CORES = [...];      // stair + lift cores, vertical through all levels
export const SITE = { polygon, road, parking:[...], bungalows:[...], lanes:[...], garden:[...], techYard };
export const ENERGY = {...};     // §6
export const LAYERS = {...};     // §4
```

Zone `type` set (used for colour + filter + legend): `public`, `soin`, `bloc`, `imagerie`, `hospit`, `reeduc`, `psy`, `recherche`, `logistique`, `technique`, `circulation`, `noyau`.

### 3.1 Common to all levels

- Corridor: bx 0→60, bz 10.5→13.5. type `circulation`.
- **Core W (public)**: bx 7.5→15, bz 13.5→24. 2 public lifts + 1 protected stair. type `noyau`.
- **Core E (bed/staff/logistic)**: bx 30→37.5, bz 13.5→24. 2 bed lifts (2.2×2.7 cab) + 1 goods lift + 1 protected stair. type `noyau`.
- 2 escape stairs at ends: bx 0→3, bz 0→6 and bx 57→60, bz 0→6 (inside N band, cut from zone). type `noyau`.
- Shafts (gaines) 1.5×2.0 next to each core. type `technique`.

### 3.2 Zones per level (N band = bz 0→10.5 sea side; S band = bz 13.5→24)

**RDC — elev 0, h 5.0**
| zone | bx | bz | type |
|---|---|---|---|
| Consultations spécialisées (8 box) | 3→22.5 | 0→10.5 | soin |
| Explorations fonctionnelles EEG/EMG/PE | 22.5→37.5 | 0→10.5 | soin |
| Imagerie IRM 1.5T + scanner + commande | 37.5→57 | 0→10.5 | imagerie |
| Logistique / quai / vestiaires | 0→7.5 | 13.5→24 | logistique |
| Hall, accueil, admissions | 15→30 | 13.5→24 | public |
| Urgences neuro + box + déchocage | 37.5→60 | 13.5→24 | soin |
Note: MRI room 7×9 m with Faraday cage (draw cage as magenta wire box), CT 6×7 m lead lining (yellow hatch walls). Ambulance bay canopy outside east face bx 60→68, bz 14→24.

**R+1 — elev 5.0, h 4.8**
| zone | bx | bz | type |
|---|---|---|---|
| Réanimation / USI 8 lits | 3→22.5 | 0→10.5 | soin |
| Bloc opératoire 2 salles (≈ 45 m² each) + couloir propre | 22.5→45 | 0→10.5 | bloc |
| SSPI 6 postes | 45→57 | 0→10.5 | bloc |
| Locaux personnel | 0→7.5 | 13.5→24 | logistique |
| Stérilisation centrale (sale → propre) | 15→30 | 13.5→24 | bloc |
| Arsenal / pharmacie bloc | 37.5→48 | 13.5→24 | logistique |
| Local CTA bloc (traitement d'air) | 48→60 | 13.5→24 | technique |

**R+2 — elev 9.8, h 4.0**
| zone | bx | bz | type |
|---|---|---|---|
| Chambres neurochirurgie vue mer (8 × 3.75 m) | 3→30 | 0→10.5 | hospit |
| Chambres neurologie vue mer (8 × 3.75 m) | 30→57 | 0→10.5 | hospit |
| Poste de soins + office | 0→7.5 | 13.5→24 | soin |
| Chambres côté ville (4) | 15→30 | 13.5→24 | hospit |
| Chambres côté ville (6) | 37.5→60 | 13.5→24 | hospit |
Total 26 rooms, 10 of them double → 36 beds. Draw each room as own cell with door gap + bathroom 2×2 box.

**R+3 — elev 13.8, h 4.0**
| zone | bx | bz | type |
|---|---|---|---|
| Plateau rééducation neuro | 3→22.5 | 0→10.5 | reeduc |
| Ergothérapie + appartement thérapeutique | 22.5→37.5 | 0→10.5 | reeduc |
| Neuropsychologie + rééducation cognitive | 37.5→57 | 0→10.5 | psy |
| Vestiaires patients | 0→7.5 | 13.5→24 | logistique |
| Hôpital de jour neuro/psycho-gériatrie | 15→30 | 13.5→24 | psy |
| Psychiatrie (consult + activités) | 37.5→60 | 13.5→24 | psy |

**R+4 — elev 17.8, h 4.0**
| zone | bx | bz | type |
|---|---|---|---|
| Auditorium 150 places, panoramique | 3→22.5 | 0→10.5 | recherche |
| Laboratoires recherche clinique | 22.5→45 | 0→10.5 | recherche |
| Direction scientifique | 45→57 | 0→10.5 | recherche |
| Locaux techniques labos | 0→7.5 | 13.5→24 | technique |
| Salles enseignement + simulation | 15→30 | 13.5→24 | recherche |
| Bibliothèque / coworking | 37.5→52.5 | 13.5→24 | recherche |
| Terrasse accessible | 52.5→60 | 13.5→24 | public |

**TOITURE — elev 21.8**
- PV field: bx 3→40, bz 1→12 (rows tilted 10°, facing south, row pitch 2.5 m). Layer `ENERGIE`.
- Plant zone with acoustic screen 3 m: bx 40→60, bz 0→24 → 2 chillers, 3 CTA (AHU), cooling tower small, solar-thermal collectors 60 m². Layer `TECHNIQUE`.
- Lift overruns on both cores (+2.5 m).

### 3.3 Site items (world coords, metres)

| item | where | size | layer |
|---|---|---|---|
| Entrée publique + dépose-minute | road → hall, axis x = -7.5 | lane 6 m | `VOIRIE` |
| Accès ambulances | from road east, x = 34→40, run north to bay | lane 6 m | `VOIRIE` (red dash) |
| Accès logistique | from road west, x = -40→-34 to west face | lane 6 m | `VOIRIE` |
| Voie pompiers | loop around building, 4 m wide, 6 m off façade | — | `SECURITE` |
| Parking visiteurs | x -30→20, z 5→40 | 2.5×5 stalls, 6 m aisles, ~90 places, 4 PMR | `PARKING` |
| Parking personnel | x 22→52, z 5→40 | ~45 places | `PARKING` |
| Ombrières PV parking | over both parkings | steel frame + PV plane at 3 m | `ENERGIE` |
| Jardin thérapeutique | north strip between façade and plot limit + west part | sensory loop path 2 m | `PAYSAGE` |
| Ergothérapie extérieure | x -50→-36, z -30→-10 (steps, ramp, slope, surfaces) | — | `PAYSAGE` |
| 6 bungalows | west zone, x -54→-34, z -8→30, 2 columns × 3, each 8×8 m + terrace 3 m | 64 m² | `BUNGALOW` |
| Zone technique ext. | SE corner x 42→54, z 40→47: 2 genset containers, transformer, medical-gas tank, fuel tank, acoustic wall | — | `TECHNIQUE` |
| Trees | seeded random in garden + parking islands, NEVER north of façade higher than 4 m (keep sea view) | — | `PAYSAGE` |

---

## 4. AutoCAD look (the skin)

Goal: look like AutoCAD model space, "Shaded with Edges" visual style. Not game. Not glossy.

- Background: AutoCAD dark model space `#212830`.
- Ground grid: `GridHelper`, major 10 m `#3b4452`, minor 1 m `#2b323c` (fade with distance).
- Every mesh = semi-transparent flat fill (`MeshBasicMaterial`, opacity 0.18–0.35, `depthWrite:false`) + crisp outline (`EdgesGeometry` + `LineSegments`, ACI colour, full opacity).
- Layers with AutoCAD Color Index colours:
  | layer | ACI | hex | content |
  |---|---|---|---|
  | `0-STRUCTURE` | 7 white | `#ffffff` | slabs, columns 0.5×0.5 on 7.5 grid |
  | `A-MURS` | 8 grey | `#9ea7b3` | walls |
  | `A-VITRAGE` | 4 cyan | `#00ffff` | glass façade north, mullions every 1.875 m |
  | `A-BRISE-SOLEIL` | 2 yellow | `#ffff00` | horizontal fins north (sun), vertical fins east/west |
  | `ZONES` | per type | see below | room fills |
  | `NOYAUX` | 6 magenta | `#ff00ff` | cores, stairs, lifts |
  | `TECHNIQUE` | 30 orange | `#ff7f00` | plant, shafts, genset |
  | `ENERGIE` | 3 green | `#00ff00` | PV, solar thermal |
  | `VOIRIE` | 1 red | `#ff0000` | lanes, ambulance |
  | `SECURITE` | 1 red dashed | `#ff0000` | fire lane |
  | `PARKING` | 9 light grey | `#c0c0c0` | stalls |
  | `PAYSAGE` | 94 dark green | `#3f7f00` | garden, trees (simple cone+cylinder, wire) |
  | `BUNGALOW` | 5 blue | `#0000ff` → use `#4d7cff` for contrast | bungalows |
  | `COTATION` | 2 yellow | `#ffff00` | dimension lines + text |
  | `VOISINAGE` | 252 | `#5a5a5a` | neighbour houses |
- Zone type fill colours: `public #7fbfff`, `soin #ff7f7f`, `bloc #ff3f3f`, `imagerie #bf7fff`, `hospit #7fff7f`, `reeduc #ffbf3f`, `psy #ff7fdf`, `recherche #3fbfff`, `logistique #bfbf7f`, `technique #ff9f3f`, `circulation #606a78`, `noyau #ff00ff`.
- Cursor: CAD crosshair (two thin lines full screen + small pickbox square) drawn in a 2D overlay canvas, follow mouse. Hide OS cursor over viewport.
- UCS icon bottom-left (X red, Y green, Z blue arrows) — small second scene rendered in corner viewport.
- ViewCube top-right: small cube with faces "HAUT / NORD / SUD / EST / OUEST", click face = animate camera to that view. Plus "MER" tag on north face.
- Status bar bottom: live cursor coords `X: 12.345  Y: -3.210  Z: 0.000` (raycast on ground plane), current level, `ÉCHELLE 1:200`, toggles shown as AutoCAD-like flat buttons (GRILLE, ORTHO, OSNAP — decorative state only, no settings).
- Command line above status bar: 3 lines history + prompt `Commande:`. Each user action append fake CAD command, e.g. `Commande: _3DORBIT`, `Commande: _VIEW _TOP`, `Commande: _LAYISO R+2`, `Commande: _LIST` (when zone clicked → print its data). Read-only text, no typing input.
- Title block (cartouche) bottom-right corner overlay: project name, "Plan masse & maquette 3D", "Ind. A — 01/11/2026", "Hypothèse de travail — à valider", north arrow.
- Dimension lines (cotes) on layer `COTATION`: footprint 60.00 / 24.00, total height 21.80 (+ parapet), grid bubbles A–I on X, 1–4 on Z (circle + letter, like real architectural grid), plot limit lengths, setback 12.00 to north limit. Text via CSS2DRenderer, font JetBrains Mono, yellow.
- Labels: each zone gets CSS2D label (name + m²) only when its level is isolated (else too much clutter).

**NO personalisation.** No theme switch, no colour picker, no material editor, no "customise building" slider. Only navigation + reading info.

---

## 5. Interaction allowed (read-only)

1. Orbit / pan / zoom (OrbitControls; middle mouse pan like CAD, wheel zoom to cursor).
2. View presets: ViewCube faces + 3 buttons `ISO SE`, `PLAN (HAUT)`, `FAÇADE MER`.
3. Level bar (left): `TOITURE, R+4, R+3, R+2, R+1, RDC, SITE`. Click level = isolate: other levels go ghost (opacity 0.04, edges 0.15), chosen level lose slab above so you see inside. Command line print `_LAYISO`.
4. `ÉCLATÉ` button: explode levels vertically (+6 m gap each), animated 600 ms. Click again = collapse.
5. Click zone = right panel "Propriétés" (like AutoCAD Properties palette): name, type, level, area m², dims, flows, energy notes, layer. Command line print `_LIST`.
6. Right panel tab 2 **"Énergie"** (§6). Tab 3 **"Typologies"** (§7). Tab 4 **"Surfaces"** (table all zones grouped by level + totals).
7. Respect `prefers-reduced-motion`: no camera animation, jump instead.

---

## 6. Energy panel content (put in `ENERGY` in data.js)

All values = **order of magnitude estimate, to validate by thermal study**. Show this warning on top of panel.

- Climate: Mediterranean coast (Köppen Csa), hot dry summer, mild wet winter, salt spray → corrosion-resistant façade (anodised alu, stainless fixings).
- Envelope: north glass façade low-e double glazing, Uw ≈ 1.4; south/east/west opaque wall insulated, U ≈ 0.35; roof U ≈ 0.25. Horizontal fins north + south, vertical fins east/west.
- Hospital typical intensity 300–400 kWh/m²·an. Target with measures: **≈ 220 kWh/m²·an** → on 7 200 m²:
  - Baseline ≈ 2 300 MWh/an (320 kWh/m²).
  - Target ≈ 1 580 MWh/an.
- Target breakdown (show as horizontal bar chart in panel — plain divs, no chart lib):
  | poste | % | MWh/an |
  |---|---|---|
  | CVC (chaud/froid/ventilation) | 45 | 711 |
  | Équipements médicaux (IRM, scanner, bloc) | 18 | 284 |
  | Éclairage LED + GTC | 10 | 158 |
  | ECS (eau chaude) | 8 | 126 |
  | Ascenseurs + divers | 7 | 111 |
  | Informatique + serveurs PACS | 7 | 111 |
  | Cuisine / office | 5 | 79 |
- Production PV:
  - Roof ≈ 90 kWc → ≈ 145 MWh/an (≈ 1 600 kWh/kWc·an coast Algeria).
  - Parking shade ≈ 300 kWc → ≈ 480 MWh/an.
  - Total ≈ 625 MWh/an ≈ **40 %** of target.
- Solar thermal ECS: 60 m² → ≈ 50 % of hot water need.
- Rainwater: roof 1 440 m² × ≈ 600 mm/an × 0.8 ≈ **690 m³/an** → garden watering + WC (if regulation allow).
- Backup / critical (never reduce): transfo 1 250 kVA, 2 × 800 kVA gensets (N+1), UPS for bloc + ICU + imaging + servers, medical gas (O₂, air, vacuum) with backup, bloc in ISO 5/7 overpressure, ICU isolation room in negative pressure option.
- Zoning: sub-meter per level + per sector (bloc, imagerie, hospit, recherche). Click energy row = highlight matching zones in 3D (green outline flash).
- 3D link: in "Énergie" tab, a toggle-free view mode: PV panels pulse green once, sun path arc drawn over site (summer + winter solstice arcs, latitude ≈ 36.7° N) on layer `ENERGIE`.

---

## 7. Building types panel ("Typologies")

List each type with: count, area, where, key technical need. Built from data, not hand text.

- Hôpital monobloc R+4 — 7 200 m² GFA, structure béton armé, trame 7.5 m, plancher-dalle.
- Plateau technique (bloc + SSPI + réa + stérilisation) — R+1.
- Plateau imagerie (IRM cage Faraday, scanner plombé, dalle renforcée, low vibration) — RDC.
- Hospitalisation (26 chambres / 36 lits) — R+2.
- Rééducation / psy / gériatrie — R+3.
- Recherche / enseignement / auditorium — R+4.
- Bungalows thérapeutiques ×6 — 64 m² each, plain-pied, ossature légère, terrasse, PMR.
- Ouvrages extérieurs: parkings + ombrières PV, zone technique, voies.

---

## 8. Page layout

```
+--------------------------------------------------------------------------+
| [ribbon] Accueil | Vue | Énergie | Typologies | Surfaces      (flat tabs) |
+-----+------------------------------------------------------+-------------+
| LVL |                                                      | Propriétés  |
| bar |              three.js viewport                       |  / Énergie  |
|     |                                     [ViewCube]       |  / Typolog. |
|     |  [UCS]                              [cartouche]      |  / Surfaces |
+-----+------------------------------------------------------+-------------+
| Commande: _3DORBIT                                                       |
| X: 12.345  Y: -3.210  Z: 0.000 | RDC | 1:200 | GRILLE ORTHO OSNAP         |
+--------------------------------------------------------------------------+
```
- Panels: AutoCAD dark UI `#2b2f36` / borders `#3c424b` / text `#d6dbe1`, no rounded corners >2 px, no shadows.
- Mobile (<768 px): right panel become bottom sheet (collapsed 40 px tab), level bar become horizontal scroller on top, no crosshair (touch). 16 px side gutter, no horizontal scroll.

---

## 9. ATOMIC STEPS (do in order)

Rule: after each **phase** run check. If check fail, fix before next phase.

### Phase A — Setup
1. **[SKILL] `anthropic-skills:frontend-design`** → load it. Read §4 + §8 of this plan as the design brief. Brief already pick AutoCAD look, so brief win; skill help you with typography scale, spacing, focus states, a11y. Write nothing yet.
2. Create `index.html`: doctype, `lang="fr"`, title `Centre International des Neurosciences — Maquette 3D`, meta viewport, Google Fonts link (JetBrains Mono 400/600, Archivo Narrow 400/600), importmap (§1), `<link src/style.css>`, `<script type="module" src="src/main.js">`.
3. Create empty layout skeleton in HTML: `#ribbon`, `#levels`, `#viewport`, `#panel`, `#cmdline`, `#statusbar`, `#cartouche`, `#viewcube`. No logic.
4. Create `src/style.css` with CSS tokens on `:root` (all colours §4 + §8), grid layout §8, mobile media query.
5. Create `.claude/launch.json` with config `{"name":"site","runtimeExecutable":"python","runtimeArgs":["-m","http.server","5173"],"port":5173}`.
6. **[SKILL] `run`** → launch site, screenshot. Expect: dark CAD layout empty, no console error.

### Phase B — Data
7. Create `src/data.js` with `PROJECT`, `LAYERS` (§4 table), zone-type colours.
8. Add `LEVELS` with all zones §3.2 (bx/bz numbers exact). Add helper `area(z)` computed, not typed.
9. Add `CORES` §3.1.
10. Add `SITE` §3.3 + plot polygon §2.
11. Add `ENERGY` §6 and `TYPOLOGIES` §7.
12. Add self-check function `validate()` run at load in dev: footprint sum ≤ 1500, GFA ≤ 7500, no zone overlap on same level (rect intersection test), every zone inside 0→60 × 0→24, 5 levels. `console.assert` each. Fix data until zero assert fail.

### Phase C — Scene base
13. `src/main.js`: renderer (antialias, pixelRatio min(dpr,2)), scene bg `#212830`, PerspectiveCamera fov 40, start ISO SE view at (120, 90, 120) looking at (0,8,0).
14. OrbitControls: damping on, pan mouse middle, zoomToCursor true, maxPolarAngle 89°.
15. Grid helper major/minor §4. Ambient-free: MeshBasic everywhere, so no light needed (CAD flat look).
16. CSS2DRenderer overlay synced on resize.
17. Resize handler (ResizeObserver on `#viewport`).
18. Helper `cadMesh(geometry, layer, fillHex, opacity)` → returns Group(fill mesh + edges). Use for EVERYTHING.
19. Helper `cadLine(points, layer, dashed?)` with Line2 thick 1.5 px.
20. **[SKILL] `run`** → screenshot: grid on dark bg, orbit work.

### Phase D — Site
21. Plot polygon scaled to 11 500 m² (shoelace), outline on layer `0-STRUCTURE`, dashed white, label "LIMITE PARCELLE". Show computed area label at centroid.
22. Road + sidewalk.
23. Sea plane + label.
24. Neighbour boxes seeded (mulberry32 seed 42), outside polygon only (point-in-polygon test).
25. Lanes: public, ambulance (red dash + arrow), logistic, fire loop (red dashed).
26. Parkings: draw every stall line, PMR stalls blue with symbol, count stalls and store count in data for Surfaces tab.
27. PV shade structures over parkings.
28. Garden: sensory loop path (CatmullRom curve tube flat), trees seeded, height rule §3.3.
29. Outdoor ergotherapy area: ramp, 3-step stair, slope, 4 floor-texture squares.
30. 6 bungalows with terraces + path to building.
31. Tech yard: gensets, transformer, tanks, acoustic wall.
32. **[SKILL] `run`** → screenshot top view. Compare against `terrain.jpeg` orientation: sea top, road bottom. Fix if flipped.

### Phase E — Building
33. Function `buildLevel(level)` → Group at y = elev: slab 0.3 m, columns on grid, zones as extruded boxes (height h − 0.3, fill by type), walls outline per zone.
34. Cores through all levels (magenta), stairs drawn as stepped lines inside, lift shafts as X-crossed rectangles (CAD symbol).
35. North glass curtain wall (cyan) with mullions every 1.875 m + horizontal fins every level (yellow).
36. East/west vertical fins, south façade opaque with window bands.
37. R+2 room subdivision: each room cell + bathroom box + door gap.
38. RDC special: MRI Faraday cage wire box (magenta), CT lead walls (yellow hatch), ambulance canopy.
39. R+1 special: 2 OR rooms with operating light symbol (circle + cross), clean/dirty corridor arrows on stérilisation.
40. R+4 auditorium raked steps + terrace railing.
41. Roof: parapet, PV rows tilted, plant zone + acoustic screen, chillers, AHUs, solar thermal, lift overruns.
42. Grid bubbles A–I / 1–4 + main dimensions (§4 COTATION).
43. **[SKILL] `run`** → screenshots ISO SE, FAÇADE MER, PLAN. Check: 5 levels, glass faces north/sea, 60×24 dims label right.

### Phase F — UI behaviour
44. Ribbon tabs switch right panel content.
45. Level bar isolate logic (§5.3) + remove slab above isolated level.
46. ÉCLATÉ explode animation (§5.4), reduced-motion fallback.
47. ViewCube (mini scene, raycast faces) + preset buttons with camera tween (400 ms ease).
48. UCS icon corner viewport.
49. Crosshair overlay canvas + pickbox, hidden on touch.
50. Status bar live coords (raycast ground plane), current level, decorative GRILLE/ORTHO/OSNAP state.
51. Command line history (max 3 visible, keep 50), helper `cmd(text)`; wire every action to it.
52. Zone click (raycast fill meshes) → highlight (edge colour white, thicker) + Propriétés panel + `_LIST`.
53. Zone CSS2D labels only on isolated level.
54. Cartouche overlay content §4.

### Phase G — Info panels
55. Énergie tab: warning banner, climate + envelope block, breakdown bars, PV block, ECS, rainwater, critical systems list. **[SKILL] `dataviz`** → load before coding the bars, follow its colour + bar rules (dark theme).
56. Energy row click → flash matching zones (sector mapping in data).
57. Sun path arcs (summer/winter solstice, lat 36.7° N) on layer `ENERGIE`, shown when Énergie tab active.
58. Typologies tab from `TYPOLOGIES`, click item = isolate related level/site item + fly camera.
59. Surfaces tab: table per level (zone, type, m²), subtotal per level, totals: footprint, GFA, outdoor area (11 500 − 1 440), parking count, bungalow area. All computed from data.

### Phase H — Polish + check
60. Keyboard: Tab focus visible on all buttons, `1–6` keys = level isolate, `0` = site, `E` = éclaté, `Esc` = clear selection. Print each in command line.
61. Mobile layout pass (§8). **[SKILL] `run`** → screenshot at 375×812 via Browser pane `resize_window` preset mobile. Fix overflow.
62. Perf: merge static site geometry per layer (`BufferGeometryUtils.mergeGeometries`), target 60 fps on laptop. Render on demand (only when controls change / animation run).
63. **[SKILL] `simplify`** → clean code, remove duplicate helpers.
64. **[SKILL] `code-review`** (level `high`) → fix every confirmed finding.
65. Update `README.md`: what it is, how to run (`python -m http.server 5173`), controls list, warning "maquette d'intention, pas un plan réglementaire".
66. **[SKILL] `run`** → final screenshots ISO, PLAN, FAÇADE MER, R+2 isolated, Énergie tab, mobile. Zero console error.
67. Optional if user ask share link: **[SKILL] `artifact-design`** then publish with Artifact tool (all files inline or via `files`). Do not publish without user say yes.

---

## 10. Done = all true

- [ ] Open `http://localhost:5173`, see full site + 5-level hospital, AutoCAD look.
- [ ] Sea north, road south, matches `terrain.jpeg`.
- [ ] Footprint 1 440 m², GFA 7 200 m², land 11 500 m² shown and computed.
- [ ] Every level isolatable, every zone clickable with properties.
- [ ] Énergie, Typologies, Surfaces tabs filled from `data.js`.
- [ ] Hypothesis warning visible (cartouche + Énergie panel).
- [ ] No personalisation control anywhere.
- [ ] Works on mobile width, no console error, `validate()` all green.

## 11. No do

- No npm, no build tool, no framework.
- No textures/PBR/shadows/HDRI — CAD flat only.
- No unpinned CDN versions.
- No invent new program (no helipad, no PET-CT, no Gamma Knife — brief say defer).
- No change numbers of §0 hard facts. Hypothesis numbers live only in `data.js`, labelled.
