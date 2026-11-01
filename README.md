# Architecte

Maquette 3D en style AutoCAD du **Centre International des Neurosciences** (Algérie, littoral) : hôpital monobloc R+4, plan masse, énergie et typologies. Une seule page, three.js via importmap, sans build.

> Maquette d'intention. Ce n'est ni un plan coté, ni un document cadastral, ni un plan réglementaire. Les valeurs non fixées par la synthèse du projet sont des hypothèses de travail, à valider.

## Lancer

```bash
python -m http.server 5173
```

Puis ouvrir <http://localhost:5173>. Le serveur est nécessaire (importmap et modules ES).

## Commandes

- Souris : clic gauche orbite, molette zoom au curseur, clic milieu ou droit déplacement.
- Barre de niveaux : isole TOITURE, R+4 à RDC ; SITE affiche tout.
- Vues : ISO SE, PLAN (HAUT), FAÇADE MER, ViewCube en haut à droite ; ÉCLATÉ écarte les niveaux.
- Clic sur une zone : propriétés (type, surface, dimensions, flux, énergie).
- Onglets : Accueil, Énergie (barres cliquables, course du soleil), Typologies, Surfaces.
- Clavier : `1`–`6` niveaux, `0` site, `E` éclaté, `Échap` désélectionner.

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Page, importmap three.js 0.170.0 |
| `src/data.js` | Toutes les données (niveaux, zones, site, énergie) et `validate()` |
| `src/cad.js` | Helpers « remplissage + arêtes », lignes épaisses, étiquettes |
| `src/site.js` | Parcelle, voirie, parkings, bungalows, jardins, voisinage, soleil |
| `src/building.js` | 5 niveaux, façades, noyaux, toiture, cotes |
| `src/ui.js`, `src/main.js` | Panneaux, ViewCube, ligne de commande, interactions |
| `PLAN_3D_SIMULATION.md` | Plan de construction |

Orientation : mer au nord (haut de `terrain.jpeg`), voie d'accès au sud. 1 unité = 1 m, +X est, −Z nord.
