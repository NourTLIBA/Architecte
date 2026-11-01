# Architecte

Maquette 3D minimaliste du **Centre International des Neurosciences** (Algérie, littoral) : hôpital monobloc R+4, plan masse, énergie et typologies. Une seule page, three.js via importmap, sans build.

> Maquette d'intention. Ce n'est ni un plan coté, ni un document cadastral, ni un plan réglementaire. Les valeurs non fixées par la synthèse du projet sont des hypothèses de travail, à valider.

## Lancer

```bash
python -m http.server 5173
```

Puis ouvrir <http://localhost:5173>. Le serveur est nécessaire (importmap et modules ES).

## Utilisation

- Simulation en haut de page, présentation du projet, niveaux, énergie, typologies et surfaces en dessous.
- Glisser pour tourner. Cliquer dans la scène active la molette pour zoomer (la page reste défilable sinon).
- Barre de gauche : isoler un niveau (Toit à RDC) ou tout afficher.
- Barre du bas : vues Ensemble, Plan, Mer, Sud, Est, Ouest, et Visite guidée en 9 étapes.
- Boutons à droite : zoom, recentrer, rotation automatique, plein écran, affichage (étiquettes, cotes, soleil, voisinage, végétation, vue éclatée).
- Plans 2D : section sous la simulation, 7 planches A3 (plan masse 1/500, cinq niveaux et toiture 1/200) avec trame, cotes, cartouche, échelle graphique et légende ; téléchargement en PDF vectoriel, par planche ou en lot. Le bouton « Plan 2D » de la simulation ouvre le niveau isolé.
- Recherche : aller directement à une zone ou à un niveau.
- Clic sur une zone : fiche avec surface, dimensions, flux et énergie.
- Clavier : `1`–`6` niveaux, `0` tout, `E` éclaté, `Échap` fermer, flèches pendant la visite.

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Page, importmap three.js 0.170.0 |
| `src/data.js` | Toutes les données (niveaux, zones, site, énergie) et `validate()` |
| `src/cad.js` | Helpers « remplissage + arêtes », lignes épaisses, étiquettes |
| `src/site.js` | Parcelle, voirie, parkings, bungalows, jardins, voisinage, soleil |
| `src/plan.js` | Planches 2D : primitives vectorielles, rendu SVG et écriture PDF |
| `src/building.js` | 5 niveaux, façades, noyaux, toiture, cotes |
| `src/ui.js`, `src/main.js` | Sections de la page, fiche de zone, recherche, visite, interactions |
| `PLAN_3D_SIMULATION.md` | Plan de construction |

Orientation : mer au nord (haut de `terrain.jpeg`), voie d'accès au sud. 1 unité = 1 m, +X est, −Z nord.
