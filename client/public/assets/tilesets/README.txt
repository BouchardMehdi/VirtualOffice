# VirtualOffice starter tileset

Tileset de base pour démarrer le développement dans Tiled/Phaser.

- Taille d'une tuile : 32x32 px
- Feuille : 128x128 px
- 16 tuiles (4x4)
- Format : PNG RGBA
- Fichier Tiled : .tsx inclus

Index des tuiles (0-based):
0. Sol clair
1. Sol bois
2. Moquette bleue
3. Moquette verte
4. Mur horizontal
5. Mur vertical
6. Coin de mur
7. Porte fermée / visuelle
8. Porte ouverte / passage
9. Mur avec fenêtre
10. Transition mur/sol
11. Seuil de porte
12. Marqueur collision (DEBUG uniquement)
13. Marqueur spawn (DEBUG uniquement)
14. Marqueur zone (DEBUG uniquement)
15. Tuile vide transparente

Conseil Tiled:
- Floor : tuiles 0-3
- Walls : 4-6, 9-10
- Doors : 7-8, 11
- Collision : utilise des objets/rectangles plutôt que la tuile debug 12 en version finale
- Spawn : objet point nommé `spawn_lounge`
- Zones : objets rectangles nommés `lounge`, `open_space`, `meeting_room`, etc.

Ce pack est volontairement simple et sert de placeholder technique. Remplace progressivement ces tuiles par vos assets définitifs.
