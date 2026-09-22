// Le personnage du joueur. Phase 2 : un simple rectangle avec un corps physique,
// qui se déplace selon la direction reçue. Le sprite animé viendra plus tard.

import Phaser from 'phaser';
import { PLAYER_SPEED, TILE_SIZE } from '../config/constants';

export class Player {
  /** L'objet affiché et déplacé par la physique. */
  public readonly gameObject: Phaser.GameObjects.Rectangle;
  private body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    // Un rectangle d'une tuile de large et 1,5 tuile de haut, couleur chaude pour le repérer.
    this.gameObject = scene.add.rectangle(x, y, TILE_SIZE, TILE_SIZE * 1.5, 0xe8a04c)
      .setStrokeStyle(1, 0x5a3a1a);
    scene.physics.add.existing(this.gameObject);
    this.body = this.gameObject.body as Phaser.Physics.Arcade.Body;
    this.body.setCollideWorldBounds(true); // ne sort pas du monde
  }

  /** Applique une direction (composantes entre -1 et 1). Appelé à chaque image. */
  move(dir: { x: number; y: number }): void {
    this.body.setVelocity(dir.x * PLAYER_SPEED, dir.y * PLAYER_SPEED);
  }

  get x(): number { return this.gameObject.x; }
  get y(): number { return this.gameObject.y; }
}
