// Génère la carte du terrain (ferme.json) au format Tiled. Lancer : node tools/generate-map.mjs (depuis client/)
// Pourquoi un script ? Pour que la carte soit reproductible et modifiable par le code tant qu'elle est simple.

import { TILE, WATER, GRASS_PLAIN, GRASS_LIGHT, DECO, makeRand, dirtTile, writeMap, objectBuilder, G } from './maplib.mjs';

const W = 50, H = 38;
const { rand, pick } = makeRand(42);
const EDGE_RIGHT = G(2, 1);   // herbe à gauche, eau à droite
const EDGE_LEFT = G(0, 1);    // eau à gauche, herbe à droite

// --- Rivière : colonnes 40..42 sur toute la hauteur. Pont sur 2 rangées. ---
const RIVER_X0 = 40, RIVER_X1 = 42;
const BRIDGE_Y0 = 18, BRIDGE_Y1 = 19;

const sol = new Array(W * H).fill(0);
const eau = new Array(W * H).fill(0);
const eauLibre = new Array(W * H).fill(0);  // eau sans collision : sous le pont et sous les tuiles de rive
const deco = new Array(W * H).fill(0);
const chemin = new Array(W * H).fill(0);

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = y * W + x;
    const inRiver = x >= RIVER_X0 && x <= RIVER_X1;
    const underBridge = inRiver && y >= BRIDGE_Y0 && y <= BRIDGE_Y1;
    if (inRiver) {
      (underBridge ? eauLibre : eau)[i] = WATER;
    } else if (x === RIVER_X0 - 1) {
      eauLibre[i] = WATER; sol[i] = EDGE_RIGHT;
    } else if (x === RIVER_X1 + 1) {
      eauLibre[i] = WATER; sol[i] = EDGE_LEFT;
    } else {
      sol[i] = rand() < 0.15 ? pick(GRASS_LIGHT) : pick(GRASS_PLAIN);
      if (rand() < 0.04) deco[i] = pick(DECO);
    }
  }
}

// --- Chemin de terre vers le village : en haut de la carte, colonnes 24..25, rangées 0..3 (phase 10) ---
const ROAD_X0 = 24, ROAD_X1 = 25, ROAD_Y1 = 3;
const road = new Set();
for (let y = 0; y <= ROAD_Y1; y++) for (let x = ROAD_X0; x <= ROAD_X1; x++) road.add(`${x},${y}`);
for (const key of road) { const [x, y] = key.split(',').map(Number); chemin[y * W + x] = dirtTile(road, x, y); deco[y * W + x] = 0; }

// --- Objets ---
const { objects, add, tree, npc, exit, spawn } = objectBuilder();
const HOUSE_X = 6 * TILE, HOUSE_Y = 4 * TILE;            // coin haut-gauche de la maison (80x80)
add({ name: 'maison', type: 'house', x: HOUSE_X, y: HOUSE_Y + 80, width: 80, height: 80 });
add({ name: 'porte_maison', type: 'door', x: HOUSE_X + 32, y: HOUSE_Y + 80, width: 16, height: 8,
  properties: [{ name: 'target', type: 'string', value: 'house' }] });
add({ name: 'depart', type: 'spawn', x: HOUSE_X + 40, y: HOUSE_Y + 100, width: 0, height: 0, point: true });
// Boîte d'expédition (16x16) collée au mur droit de la maison.
add({ name: 'boite_expedition', type: 'shipping', x: HOUSE_X + 80, y: HOUSE_Y + 80, width: 16, height: 16 });
// Boutique (80x80) de l'autre côté de la rivière, et le marchand devant sa porte.
const SHOP_X = 44 * TILE, SHOP_Y = 10 * TILE;
add({ name: 'boutique', type: 'shop', x: SHOP_X, y: SHOP_Y + 80, width: 80, height: 80 });
npc('marchand', 46, 15, 'marchand');
// Pont (48x32) sur la rivière.
add({ name: 'pont', type: 'bridge', x: RIVER_X0 * TILE, y: (BRIDGE_Y1 + 1) * TILE, width: 48, height: 32 });
// Passage vers le village : tout en haut du chemin. Le retour du village dépose le joueur en bas du chemin.
exit('vers_village', ROAD_X0, 0, 2, 1, 'village');
spawn('arrivee_village', ROAD_X0 + 1, ROAD_Y1 + 1);

// Arbres : jamais sur la rivière, la maison ni le chemin.
const trees = [
  [3, 12, 'big'], [14, 3, 'big'], [20, 16, 'small'], [26, 5, 'big'], [30, 14, 'small'],
  [5, 22, 'big'], [12, 27, 'small'], [22, 24, 'big'], [33, 28, 'big'], [45, 8, 'big'],
  [47, 20, 'small'], [46, 30, 'big'], [17, 33, 'big'], [36, 34, 'small'], [9, 34, 'small'],
  [28, 31, 'small'], [38, 4, 'small'], [2, 3, 'small'], [21, 1, 'small'], [28, 1, 'small'],
];
for (const [tx, ty, size] of trees) tree(tx, ty, size);

writeMap('public/assets/maps/ferme.json', W, H, [
  { name: 'eau', data: eau }, { name: 'eau_libre', data: eauLibre }, { name: 'sol', data: sol },
  { name: 'chemin', data: chemin }, { name: 'deco', data: deco }, { name: 'champ', data: new Array(W * H).fill(0) },
], objects);
console.log(`Carte du terrain : ${W}x${H} tuiles, ${objects.length} objets.`);
