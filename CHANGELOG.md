# Changelog

Toutes les modifications notables de Retouchly sont documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).

## [0.1.0-beta] - 2026-08-20

Première version beta de Retouchly, éditeur d'images open source inspiré de Paint.NET, construit avec Angular 19 et Rust (Tauri 2).

### Ajouté

- **Outils de dessin**
  - Crayon — dessin pixel par pixel
  - Pinceau — dessin avec taille et dureté configurables
  - Gomme — effacement avec taille et dureté
  - Pipette — prélèvement couleur (clic gauche = primaire, clic droit = secondaire)

- **Sélection**
  - Sélection rectangle / ellipse avec modes Ajouter, Soustraire, Intersection, Xor
  - Lasso — sélection à main levée
  - Baguette magique — sélection par couleur avec tolérance configurable
  - Déplacer la sélection / l'objet
  - Copier, couper, coller une sélection

- **Formes vectorielles**
  - Rectangle, ellipse, ligne, polygone
  - Styles : plein, tirets, pointillé
  - Épaisseur configurable, option de remplissage

- **Texte**
  - Polices système dynamiques (détection via commande Tauri)
  - Gras, italique, souligné
  - Alignement gauche / centre / droite
  - Remplissage + contour

- **Calques**
  - CRUD complet (ajouter, dupliquer, supprimer, monter, descendre)
  - Fusionner vers le bas, aplatir l'image
  - Opacité, rotation, zoom par calque
  - 16 modes de fusion (Normal, Multiply, Screen, Overlay, Soft Light, etc.)
  - Import d'image comme calque

- **Ajustements**
  - Luminosité / Contraste
  - Teinte / Saturation / Luminosité
  - Inverser les couleurs, Noir et blanc, Sépia
  - Postériser, Seuil
  - Preview en direct

- **Effets**
  - Flou gaussien, Flou de mouvement
  - Pixelate / Mosaïque
  - Netteté, Relief, Détection de contours
  - Bruit / Grain, Vignette
  - Preview en direct

- **Transformations**
  - Rotation 90° / 180° / 270°
  - Symétrie horizontale / verticale
  - Redimensionner l'image (avec ratio)
  - Redimensionner le canevas (avec ancrage 9 points)
  - Rogner selon la sélection

- **Navigation et affichage**
  - Zoom (molette Ctrl, Ctrl+=, Ctrl+-, Ctrl+0 ajuster)
  - Pan (Espace+glisser, clic milieu)
  - Règles avec graduations adaptatives
  - Grille superposable
  - Navigator (mini-vue)

- **Interface**
  - Barre de menus (9 menus)
  - Barre d'outils (nouveau, ouvrir, sauver, undo/redo)
  - Palette d'outils contextuelle avec options
  - Panneau calques
  - Panneau couleurs (RVB/TSV)
  - Barre d'état
  - Barre de titre Tauri avec boutons minimiser / agrandir / fermer
  - Dialog nouveau document

- **Internationalisation**
  - Français et Anglais
  - Détection automatique de la langue système
  - Changement de langue via menu Fenêtre > Langue

- **Projets**
  - Format de projet Retouchly (.rtly) : enregistrement et réouverture de tous les calques (pixels, noms, visibilité, opacité, modes de fusion, transformations)
  - Enregistrer / Enregistrer sous via le menu Fichier ou Ctrl+S / Ctrl+Maj+S
  - Export image PNG/JPG conservé via « Exporter comme image… »
  - Garde de fermeture : si le document contient des modifications non enregistrées, la fermeture de la fenêtre demande Enregistrer / Ne pas enregistrer / Annuler
  - Même garde avant de créer un nouveau document ou d'en ouvrir un

- **CI/CD**
  - Workflow GitHub Actions de build multiplateforme

### Corrigé

- Correction du bug de tracé
- Correction du zoom / dézoom
- Correction des outils non affichés
- Correction du recadrage sur la sélection : l'image était effacée et remplacée par un fond blanc après le recadrage

### Technique

- Frontend : Angular 19 (signals, standalone components)
- Backend : Rust (Tauri 2)
- Canvas 2D natif avec `globalAlpha` + `globalCompositeOperation`
- Services dédiés : calques, outils, ajustements, effets, couleurs, documents, i18n
