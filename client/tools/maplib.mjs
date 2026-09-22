// Outils communs aux générateurs de cartes (terrain, village) : tilesets, autotile de terre, écriture Tiled JSON.

import { writeFileSync, mkdirSync } from 'node:fs';

export const TILE = 16;

// Chaque tileset a un "firstgid" : le numéro de sa première tuile dans la carte. gid 0 = case vide.
export const tilesets = [
  { name: 'grass', image: 'grass.png', imagewidth: 176, imageheight: 112, columns: 11, tilecount: 77, firstgid: 1 },
  { name: 'water', image: 'water.png', imagewidth: 64, imageheight: 16, columns: 4, tilecount: 4, firstgid: 78 },
  { name: 'dirt', image: 'dirt.png', imagewidth: 176, imageheight: 112, columns: 11, tilecount: 77, firstgid: 82 },
];
export const G = (col, row) => 1 + row * 11 + col;       // tuile de grass.png
export const D = (col, row) => 82 + row * 11 + col;      // tuile de dirt.png
export const WATER = 78;

export const GRASS_PLAIN = [G(0, 5), G(1, 5), G(2, 5), G(0, 6), G(1, 6), G(2, 6)];
export const GRASS_LIGHT = [G(3, 5), G(4, 5), G(3, 6), G(4, 6)];
export const DECO = [G(6, 5), G(7, 5), G(8, 5), G(9, 5), G(6, 6), G(7, 6), G(8, 6)];

/** Générateur pseudo-aléatoire déterministe : la carte est la même à chaque génération. */
export function makeRand(seed) {
  let s = seed;
  const rand = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  return { rand, pick };
}

/**
 * Autotile de terre battue : pour un ensemble de cases (Set "x,y"), choisit la tuile du bloc 3×3 / des bandes
 * de dirt.png selon les voisins présents (haut, bas, gauche, droite).
 */
export function dirtTile(cells, x, y) {
  const has = (dx, dy) => cells.has(`${x + dx},${y + dy}`);
  const u = has(0, -1), d = has(0, 1), l = has(-1, 0), r = has(1, 0);
  if (u && d && l && r) return D(1, 1);
  if (!l && !r) {                       // bande verticale
    if (u && d) return D(3, 1);
    if (d) return D(3, 0);
    if (u) return D(3, 2);
    return D(3, 3);
  }
  if (!u && !d) {                       // bande horizontale
    if (l && r) return D(1, 3);
    if (r) return D(0, 3);
    return D(2, 3);
  }
  if (!u && !l) return D(0, 0);
  if (!u && !r) return D(2, 0);
  if (!d && !l) return D(0, 2);
  if (!d && !r) return D(2, 2);
  if (!u) return D(1, 0);
  if (!d) return D(1, 2);
  if (!l) return D(0, 1);
  return D(2, 1);
}

/** Écrit une carte Tiled JSON. layers = [{name, data}] (tilelayers) ; objects = objets. */
export function writeMap(file, W, H, layers, objects) {
  let id = 1;
  const map = {
    type: 'map', version: '1.10', tiledversion: '1.11.0', orientation: 'orthogonal', renderorder: 'right-down',
    width: W, height: H, tilewidth: TILE, tileheight: TILE, infinite: false, nextlayerid: layers.length + 2, nextobjectid: objects.length + 1,
    tilesets: tilesets.map((t) => ({ ...t, tilewidth: TILE, tileheight: TILE, margin: 0, spacing: 0 })),
    layers: [
      ...layers.map((l) => ({ id: id++, name: l.name, type: 'tilelayer', width: W, height: H, x: 0, y: 0, opacity: 1, visible: true, data: l.data })),
      { id: id++, name: 'objets', type: 'objectgroup', draworder: 'topdown', x: 0, y: 0, opacity: 1, visible: true, objects },
    ],
  };
  mkdirSync('public/assets/maps', { recursive: true });
  writeFileSync(file, JSON.stringify(map));
}

/** Petit constructeur d'objets Tiled (origine en BAS à gauche pour les images). */
export function objectBuilder() {
  const objects = [];
  let id = 1;
  const add = (o) => { objects.push({ id: id++, visible: true, rotation: 0, ...o }); return objects[objects.length - 1]; };
  const tree = (tx, ty, size) => add({ name: `arbre_${size}`, type: 'tree', x: tx * TILE, y: (ty + 2) * TILE, width: size === 'big' ? 32 : 16, height: 32,
    properties: [{ name: 'size', type: 'string', value: size }] });
  const npc = (name, tx, ty, role) => add({ name, type: 'npc', x: tx * TILE, y: (ty + 1) * TILE, width: 16, height: 16,
    properties: [{ name: 'role', type: 'string', value: role }] });
  const exit = (name, tx, ty, w, h, target) => add({ name, type: 'exit', x: tx * TILE, y: ty * TILE, width: w * TILE, height: h * TILE,
    properties: [{ name: 'target', type: 'string', value: target }] });
  const spawn = (name, tx, ty) => add({ name, type: 'spawn', x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2, width: 0, height: 0, point: true });
  return { objects, add, tree, npc, exit, spawn };
}
