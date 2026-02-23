# GLTF Model Viewer

**/!\ Outils complétement développer par `Claude.ai`**

Outil de visualisation de modèles `.gltf` — dark theme industriel.

## Structure

```
gltf-viewer/
├── public/
│   └── models/          ← Déposez vos fichiers .glb ici
├── src/
│   ├── viewer.ts        ← Classe Three.js (renderer, caméra, lights…)
│   └── main.ts          ← UI, sidebar, toolbar
├── index.html
├── vite.config.ts
└── package.json
```

## Installation

```bash
npm install
npm run dev
```

## Ajouter un modèle

Il suffit de déposer votre fichier `.glb` **ou** `.gltf` dans `public/models/`.  
Le nom affiché est généré automatiquement depuis le nom du fichier :

- `building_A.glb` → **Building A**
- `building_A.gltf` → **Building A**
- `my-cool-car.gltf` → **My Cool Car**

**Aucune modification de code requise.**

## Fonctionnalités

| Bouton | Action |
|--------|--------|
| ⌖ | Reset caméra (recentre sur le modèle) |
| ◫ | Toggle wireframe |
| ⊞ | Toggle grille |
| ◑ | Toggle fond sombre / moins sombre |

- **Recherche** : filtre en temps réel par nom ou nom de fichier
- **Infos modèle** : meshes, matériaux, triangles, dimensions
- **Centrage automatique** : chaque modèle est centré et mis à l'échelle
- **Contrôles caméra** : orbit + zoom + pan (OrbitControls)