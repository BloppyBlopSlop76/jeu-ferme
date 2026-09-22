// Génère la carte du village (village.json) : plus petite et plus urbaine que le terrain (phase 10).
// Un passage en bas ramène au terrain. Un vieux musée, une place avec fontaine, des espaces libres pour de futurs bâtiments.
// Lancer : node tools/generate-village.mjs (depuis client/)

import { TILE, GRASS_PLAIN, GRASS_LIGHT, DECO, makeRand, dirtTile, writeMap, objectBuilder } from './maplib.mjs';

const W = 32, H = 22;
const { rand, pick } = makeRand(7);

const sol = new Array(W * H).fill(0);
const chemin = new Array(W * H).fill(0);
const deco = new Array(W * H).fill(0);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = y * W + x;
  sol[i] = rand() < 0.12 ? pick(GRASS_LIGHT) : pick(GRASS_PLAIN);
  if (rand() < 0.05) deco[i] = pick(DECO);
}

// --- Terre battue : la place (10×7), la rue vers le sud (2 de large) et l'allée du musée ---
const dirt = new Set();
const rect = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) dirt.add(`${x},${y}`); };
rect(11, 9, 20, 15);          // la place
rect(15, 16, 16, H - 1);      // rue vers le passage sud
rect(11, 6, 11, 8);           // allée du musée
rect(21, 11, 27, 12);         // amorce de rue vers les terrains à bâtir (est)
for (const key of dirt) { const [x, y] = key.split(',').map(Number); chemin[y * W + x] = dirtTile(dirt, x, y); deco[y * W + x] = 0; }

// --- Objets ---
const { objects, add, tree, npc, exit, spawn } = objectBuilder();
const MUSEUM_X = 9 * TILE, MUSEUM_Y = 1 * TILE;   // 80×80 : tuiles 9..13 × 1..5, porte à la tuile 11
add({ name: 'musee', type: 'museum', x: MUSEUM_X, y: MUSEUM_Y + 80, width: 80, height: 80 });
add({ name: 'fontaine', type: 'fountain', x: 15 * TILE, y: 13 * TILE, width: 32, height: 32 });
npc('conservateur', 12, 7, 'conservateur');
npc('villageoise', 18, 13, 'villageoise');
// Passage vers le terrain : en bas de la rue. L'arrivée depuis le terrain se fait juste au-dessus.
exit('vers_terrain', 15, H - 1, 2, 1, 'world');
spawn('arrivee_terrain', 16, H - 3);
// Espaces libres pour de futurs bâtiments : à l'est (tuiles 22..30 × 2..9) et à l'ouest (1..7 × 2..8), juste bordés d'arbres.
const trees = [
  [1, 0, 'big'], [5, 0, 'small'], [16, 0, 'big'], [22, 0, 'small'], [29, 0, 'big'],
  [0, 5, 'small'], [0, 12, 'big'], [0, 18, 'small'], [30, 6, 'small'], [30, 14, 'big'], [30, 19, 'small'],
  [3, 19, 'big'], [9, 19, 'small'], [22, 19, 'big'], [27, 18, 'small'], [6, 11, 'small'], [24, 15, 'small'],
];
for (const [tx, ty, size] of trees) tree(tx, ty, size);

writeMap('public/assets/maps/village.json', W, H, [
  { name: 'sol', data: sol }, { name: 'chemin', data: chemin }, { name: 'deco', data: deco },
], objects);
console.log(`Carte du village : ${W}x${H} tuiles, ${objects.length} objets.`);
