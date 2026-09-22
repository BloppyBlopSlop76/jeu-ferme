// Le personnage du joueur : sprite animé (4 directions) avec un petit corps physique au niveau des pieds.
// Images : « Basic Charakter Spritesheet » du pack Sprout Lands (Cup Nooble), cases de 48x48.

import Phaser from 'phaser';
import { PLAYER_SPEED } from '../config/constants';
import type { PlayerState } from '../state/GameState';

type Facing = PlayerState['facing'];

export class Player {
  public readonly sprite: Phaser.Physics.Arcade.Sprite;
  private facing: Facing;

  /** Crée les animations une seule fois pour tout le jeu (elles sont partagées entre les scènes). */
  static createAnimations(scene: Phaser.Scene): void {
    const anims = scene.anims;
    if (anims.exists('walk-down')) return;
    // Une rangée de 4 cases par direction : 0 = bas, 1 = haut, 2 = gauche, 3 = droite.
    const rows: Record<Facing, number> = { down: 0, up: 1, left: 2, right: 3 };
    for (const [dir, row] of Object.entries(rows)) {
      anims.create({
        key: `walk-${dir}`,
        frames: anims.generateFrameNumbers('character', { start: row * 4, end: row * 4 + 3 }),
        frameRate: 8,
        repeat: -1,
      });
      anims.create({
        key: `idle-${dir}`,
        frames: anims.generateFrameNumbers('character', { start: row * 4, end: row * 4 + 1 }),
        frameRate: 2,
        repeat: -1,
      });
    }
  }

  constructor(scene: Phaser.Scene, x: number, y: number, facing: Facing = 'down') {
    Player.createAnimations(scene);
    this.facing = facing;
    this.sprite = scene.physics.add.sprite(x, y, 'character', 0);
    // Origine au niveau des pieds : la position (x, y) = là où le personnage touche le sol.
    this.sprite.setOrigin(0.5, 0.8);
    // Corps physique réduit aux pieds (10x8 px) pour passer devant les arbres sans se cogner la tête.
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(10, 8);
    body.setOffset(19, 30);
    body.setCollideWorldBounds(true);
    this.sprite.play(`idle-${facing}`);
  }

  /** Applique une direction (composantes entre -1 et 1) et un facteur de vitesse (fatigue). Appelé à chaque image. */
  move(dir: { x: number; y: number }, speedFactor = 1): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(dir.x * PLAYER_SPEED * speedFactor, dir.y * PLAYER_SPEED * speedFactor);

    if (dir.x !== 0 || dir.y !== 0) {
      // La direction dominante décide de l'animation.
      if (Math.abs(dir.x) > Math.abs(dir.y)) this.facing = dir.x > 0 ? 'right' : 'left';
      else this.facing = dir.y > 0 ? 'down' : 'up';
      this.sprite.play(`walk-${this.facing}`, true);
    } else {
      this.sprite.play(`idle-${this.facing}`, true);
    }
    // Tri en profondeur : plus on est bas sur l'écran, plus on passe devant.
    this.sprite.setDepth(this.sprite.y);
  }

  get x(): number { return this.sprite.x; }
  get y(): number { return this.sprite.y; }
  get direction(): Facing { return this.facing; }
}
