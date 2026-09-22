// Affichage du champ : tuiles de terre bêchée (calque « champ ») et sprites des plantes.
// Ne contient aucune règle de jeu : il lit l'état et le dessine. Les règles sont dans systems/FarmSystem.ts.

import Phaser from 'phaser';
import { TILE_SIZE } from '../config/constants';
import { CROPS, cropFrame } from '../data/crops';
import { gameState, plotKey, type PlotState } from '../state/GameState';

/** Tuile « terre retournée isolée » dans dirt.png (colonne 3, rangée 3 de la feuille 11 colonnes). */
const DIRT_TILE_LOCAL = 3 * 11 + 3;
const WATERED_TINT = 0x9a7a5a; // assombrit la terre arrosée

export class FarmView {
  private plants = new Map<string, Phaser.GameObjects.Image>();
  /** Numéro global de la tuile de terre : premier numéro du tileset « dirt » + position dans la feuille. */
  private dirtGid: number;

  constructor(private scene: Phaser.Scene, private layer: Phaser.Tilemaps.TilemapLayer) {
    this.dirtGid = layer.tileset[0].firstgid + DIRT_TILE_LOCAL;
    // Redessine tout ce qui existe déjà (retour de la maison, ou plus tard chargement d'une sauvegarde).
    for (const plot of Object.values(gameState.farm)) this.refresh(plot);
  }

  /** Met la case à jour d'après son état : terre, teinte, plante. */
  refresh(plot: PlotState): void {
    const tile = this.layer.putTileAt(this.dirtGid, plot.tx, plot.ty);
    tile.tint = plot.watered ? WATERED_TINT : 0xffffff;

    const key = plotKey(plot.tx, plot.ty);
    let img = this.plants.get(key);
    if (plot.crop) {
      const frame = cropFrame(CROPS[plot.crop], plot.stage);
      const x = plot.tx * TILE_SIZE + TILE_SIZE / 2;
      const y = plot.ty * TILE_SIZE + TILE_SIZE;
      if (!img) {
        img = this.scene.add.image(x, y, 'plants', frame).setOrigin(0.5, 1);
        this.plants.set(key, img);
      }
      img.setFrame(frame).setDepth(y - 8); // derrière le joueur quand il est devant la plante
    } else if (img) {
      img.destroy();
      this.plants.delete(key);
    }
  }

  /** Efface une case (après récolte : la terre redevient de l'herbe). */
  clear(tx: number, ty: number): void {
    this.layer.removeTileAt(tx, ty);
    const key = plotKey(tx, ty);
    this.plants.get(key)?.destroy();
    this.plants.delete(key);
  }
}
