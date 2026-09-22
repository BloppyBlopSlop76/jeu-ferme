# jeu-ferme

Jeu Web 2D de simulation de vie / farming (nom de travail). Phaser 4, TypeScript, Vite.

Jouer : https://bloppyblopslop76.github.io/jeu-ferme/

## Crédits

Graphismes : **Sprout Lands** par **Cup Nooble** — https://cupnooble.itch.io/sprout-lands-asset-pack
Pack de base utilisé sous sa licence non commerciale (voir `client/public/assets/SPROUT_LANDS_LICENSE.txt`).
Certains sprites (maison, pont) sont des compositions de tuiles de ce pack.

## Développement

Le code est dans `client/`. La carte du terrain est générée par `client/tools/generate-map.mjs`
(format Tiled JSON, lisible par l'éditeur Tiled).
