// Génère la carte du terrain au format Tiled (JSON), lisible par Phaser et par l'éditeur Tiled.
// Lancer avec : node tools/generate-map.mjs   (depuis le dossier client)
// Pourquoi un script plutôt que l'éditeur ? Pour que la carte soit reproductible et modifiable
// par le code tant qu'elle est simple. Le jour où on dessine à la main, on ouvrira le JSON dans Tiled.

import { writeFileSync, mkdirSync } from 'node:fs';

const TILE = 16;
const W = 50;   // largeur en tuiles
const H = 38;   // hauteur en tuiles

// --- Tilesets (les images sont dans public/assets/) ---
// Chaque tileset a un "firstgid" : le numéro de sa première tuile dans la carte.
// gid 0 = case vide.
const tilesets = [
  { name: 'grass', image: 'grass.png', imagewidth: 176, imageheight: 112, columns: 11, tilecount: 77, firstgid: 1 },
  { name: 'water', image: 'water.png', imagewidth: 64, imageheight: 16, columns: 4, tilecount: 4, firstgid: 78 },
];
const G = (col, row) => 1 + row * 11 + col;      // gid d'une tuile de grass.png
const WATER = 78;                                 // première image de l'eau

// Tuiles d'herbe pleines (rangées du bas de grass.png) : herbe unie, touffes, taches claires.
const GRASS_PLAIN = [G(0, 5), G(1, 5), G(2, 5), G(0, 6), G(1, 6), G(2, 6)];
const GRASS_LIGHT = [G(3, 5), G(4, 5), G(3, 6), G(4, 6)];
// Bords du « blob » d'herbe (bloc 3x3 en haut à gauche de grass.png) pour les rives.
const EDGE_RIGHT = G(2, 1);   // herbe à gauche, eau à droite
const EDGE_LEFT = G(0, 1);    // eau à gauche, herbe à droite
// Petites fleurs / touffes décoratives (fond transparent).
const DECO = [G(6, 5), G(7, 5), G(8, 5), G(9, 5), G(6, 6), G(7, 6), G(8, 6)];

// Générateur pseudo-aléatoire déterministe : la carte est la même à chaque génération.
let seed = 42;
const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

// --- Rivière : colonnes RIVER_X0..RIVER_X1, sur toute la hauteur. Pont sur 2 rangées. ---
const RIVER_X0 = 40, RIVER_X1 = 42;
const BRIDGE_Y0 = 18, BRIDGE_Y1 = 19;

const sol = new Array(W * H).fill(0);
const eau = new Array(W * H).fill(0);
const eauLibre = new Array(W * H).fill(0);  // eau sans collision : sous le pont et sous les tuiles de rive
const deco = new Array(W * H).fill(0);

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = y * W + x;
    const inRiver = x >= RIVER_X0 && x <= RIVER_X1;
    const underBridge = inRiver && y >= BRIDGE_Y0 && y <= BRIDGE_Y1;
    if (inRiver) {
      (underBridge ? eauLibre : eau)[i] = WATER;
    } else if (x === RIVER_X0 - 1) {
      eauLibre[i] = WATER;     // l'eau dépasse sous la tuile de rive, mais on peut y marcher
      sol[i] = EDGE_RIGHT;
    } else if (x === RIVER_X1 + 1) {
      eauLibre[i] = WATER;
      sol[i] = EDGE_LEFT;
    } else {
      sol[i] = rand() < 0.15 ? pick(GRASS_LIGHT) : pick(GRASS_PLAIN);
      if (rand() < 0.04) deco[i] = pick(DECO);
    }
  }
}

// --- Objets : maison, arbres, pont, point de départ, porte ---
// Coordonnées en pixels. Pour les objets à image, Tiled place l'origine en BAS à gauche.
const objects = [];
let id = 1;
const add = (o) => objects.push({ id: id++, visible: true, rotation: 0, ...o });

const HOUSE_X = 6 * TILE, HOUSE_Y = 4 * TILE;            // coin haut-gauche de la maison (80x80)
add({ name: 'maison', type: 'house', x: HOUSE_X, y: HOUSE_Y + 80, width: 80, height: 80 });
// Zone de porte : devant la porte (bas centre de la maison), 16 px de large, 8 px de haut.
add({ name: 'porte_maison', type: 'door', x: HOUSE_X + 32, y: HOUSE_Y + 80, width: 16, height: 8,
  properties: [{ name: 'target', type: 'string', value: 'house' }] });
// Point de départ du joueur : devant la maison.
add({ name: 'depart', type: 'spawn', x: HOUSE_X + 40, y: HOUSE_Y + 100, width: 0, height: 0, point: true });
// Pont (48x32) sur la rivière.
add({ name: 'pont', type: 'bridge', x: RIVER_X0 * TILE, y: (BRIDGE_Y1 + 1) * TILE, width: 48, height: 32 });

// Arbres : quelques grands et petits, jamais sur la rivière ni sur la maison.
const trees = [
  [3, 12, 'big'], [14, 3, 'big'], [20, 10, 'small'], [26, 5, 'big'], [30, 14, 'small'],
  [5, 22, 'big'], [12, 27, 'small'], [22, 24, 'big'], [33, 28, 'big'], [45, 8, 'big'],
  [47, 20, 'small'], [46, 30, 'big'], [17, 33, 'big'], [36, 34, 'small'], [9, 34, 'small'],
  [28, 31, 'small'], [38, 4, 'small'], [2, 3, 'small'],
];
for (const [tx, ty, size] of trees) {
  const w = size === 'big' ? 32 : 16;
  add({ name: `arbre_${size}`, type: 'tree', x: tx * TILE, y: (ty + 2) * TILE, width: w, height: 32,
    properties: [{ name: 'size', type: 'string', value: size }] });
}

const map = {
  type: 'map', version: '1.10', tiledversion: '1.11.0', orientation: 'orthogonal', renderorder: 'right-down',
  width: W, height: H, tilewidth: TILE, tileheight: TILE, infinite: false, nextlayerid: 6, nextobjectid: id,
  tilesets: tilesets.map((t) => ({ ...t, tilewidth: TILE, tileheight: TILE, margin: 0, spacing: 0 })),
  layers: [
    { id: 1, name: 'eau', type: 'tilelayer', width: W, height: H, x: 0, y: 0, opacity: 1, visible: true, data: eau },
    { id: 2, name: 'eau_libre', type: 'tilelayer', width: W, height: H, x: 0, y: 0, opacity: 1, visible: true, data: eauLibre },
    { id: 3, name: 'sol', type: 'tilelayer', width: W, height: H, x: 0, y: 0, opacity: 1, visible: true, data: sol },
    { id: 4, name: 'deco', type: 'tilelayer', width: W, height: H, x: 0, y: 0, opacity: 1, visible: true, data: deco },
    { id: 5, name: 'objets', type: 'objectgroup', draworder: 'topdown', x: 0, y: 0, opacity: 1, visible: true, objects },
  ],
};

mkdirSync('public/assets/maps', { recursive: true });
writeFileSync('public/assets/maps/ferme.json', JSON.stringify(map));
console.log(`Carte générée : ${W}x${H} tuiles, ${objects.length} objets.`);
