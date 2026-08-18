# Retouchly

Éditeur d'images open source inspiré de Paint.NET, construit avec Angular 19 et Rust (Tauri 2).

## Fonctionnalités

### Outils de dessin
- **Crayon** — dessin pixel par pixel
- **Pinceau** — dessin avec taille et dureté configurables
- **Gomme** — effacement avec taille et dureté
- **Pipette** — prélèvement couleur (clic gauche = primaire, clic droit = secondaire)

### Sélection
- **Sélection rectangle / ellipse** — avec modes Ajouter, Soustraire, Intersection, Xor
- **Lasso** — sélection à main levée
- **Baguette magique** — sélection par couleur avec tolérance configurable
- **Déplacer la sélection / l'objet**

### Formes vectorielles
- Rectangle, ellipse, ligne, polygone
- Styles : plein, tirets, pointillé
- Épaisseur configurable, option de remplissage

### Texte
- Polices système dynamiques (détection via commande Tauri)
- Gras, italique, souligné
- Alignement gauche / centre / droite
- Remplissage + contour

### Calques
- CRUD complet (ajouter, dupliquer, supprimer, monter, descendre)
- Fusionner vers le bas, aplatir l'image
- Opacité, rotation, zoom par calque
- 16 modes de fusion (Normal, Multiply, Screen, Overlay, Soft Light, etc.)
- Import d'image comme calque

### Ajustements
- Luminosité / Contraste
- Teinte / Saturation / Luminosité
- Inverser les couleurs, Noir et blanc, Sépia
- Postériser, Seuil

### Effets
- Flou gaussien, Flou de mouvement
- Pixelate / Mosaïque
- Netteté, Relief, Détection de contours
- Bruit / Grain, Vignette

### Transformations
- Rotation 90° / 180° / 270°
- Symétrie horizontale / verticale
- Redimensionner l'image (avec ratio)
- Redimensionner le canevas (avec ancrage 9 points)
- Recadrer sur la sélection

### Navigation et affichage
- Zoom (molette Ctrl, Ctrl+=, Ctrl+-, Ctrl+0 ajuster)
- Pan (Espace+glisser, clic milieu)
- Règles avec graduations adaptatives
- Grille superposable
- Navigator (mini-vue)

### Internationalisation
- Français et Anglais
- Détection automatique de la langue système
- Changement de langue via menu Fenêtre > Langue

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | Angular 19 (signals, standalone components) |
| Backend | Rust (Tauri 2) |
| Canvas | Canvas 2D natif |
| Compositing | `globalAlpha` + `globalCompositeOperation` |
| Build | `npm run build` → `dist/retouchly` |

## Développement

```bash
# Installer les dépendances
npm install

# Mode développement (hot reload)
npm run dev

# Build production
npm run build

# Lancer l'app Tauri (nécessite Rust toolchain)
cargo tauri dev
```

## Structure du projet

```
src/
├── app/
│   ├── components/
│   │   ├── canvas/              # Canvas principal + zoom/pan/règles/grille
│   │   ├── menu-bar/            # Barre de menus (9 menus)
│   │   ├── tool-bar/            # Barre d'outils (nouveau, ouvrir, sauver, undo/redo)
│   │   ├── tools-palette/       # Palette d'outils (latéral gauche)
│   │   ├── tool-options/        # Options contextuelles de l'outil actif
│   │   ├── layers-panel/        # Panneau calques
│   │   ├── colors-panel/        # Panneau couleurs (RVB/TSV)
│   │   ├── status-bar/          # Barre d'état
│   │   ├── title-bar/           # Barre de titre Tauri
│   │   ├── window-controls/     # Boutons minimiser/agrandir/fermer
│   │   ├── new-image-dialog/    # Dialog nouveau document
│   │   ├── adjustment-dialog/   # Dialog ajustements (preview live)
│   │   ├── effects-dialog/      # Dialog effets (preview live)
│   │   ├── resize-image-dialog/ # Dialog redimensionner image
│   │   └── resize-canvas-dialog/# Dialog redimensionner canevas
│   ├── services/
│   │   ├── layer.service.ts     # Gestion des calques + compositing
│   │   ├── tool.service.ts      # Outils + labels traduits
│   │   ├── adjustments.service.ts # Filtres d'ajustement
│   │   ├── effects.service.ts   # Filtres d'effets (convolution générique)
│   │   ├── colors.service.ts    # Couleurs RVB/TSV
│   │   ├── document.service.ts  # Ouverture/sauvegarde fichiers
│   │   └── i18n.service.ts      # Service de traduction (signals)
│   ├── types.ts                 # Types partagés (Tool, BlendMode, etc.)
│   └── app.{ts,html,css}        # Composant racine + dialogs
└── assets/
    └── i18n/
        ├── en.json              # Traductions anglaises
        └── fr.json              # Traductions françaises
```

## Auteur

Codé par [Martzcode](https://github.com/Martzcode)
