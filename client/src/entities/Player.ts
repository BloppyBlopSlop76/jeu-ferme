// Le personnage du joueur : quatre couches d'images (peau, t-shirt, visage, cheveux) qui bougent
// ensemble, avec un petit corps physique au niveau des pieds. Seul ce fichier connaît les images :
// remplacer les dessins (tools/chibi.py) ne touche rien d'autre.

import Phaser from 'phaser';
import { PLAYER_SPEED } from '../config/constants';
import type { PlayerState } from '../state/GameState';
import { gameState } from '../state/GameState';
import { appearanceTextures, DEFAULT_APPEARANCE, type Appearance } from '../data/appearance';

type Facing = PlayerState['facing'];

/** Une rangée de 4 cases par direction dans chaque feuille : 0 = bas, 1 = haut, 2 = gauche, 3 = droite. */
const ROWS: Record<Facing, number> = { down: 0, up: 1, left: 2, right: 3 };

export class Player {
  public readonly sprite: Phaser.Physics.Arcade.Sprite;
  private layers: Phaser.GameObjects.Sprite[] = [];
  private facing: Facing;

  /** Crée les animations d'une feuille une seule fois pour tout le jeu (partagées entre les scènes). */
  static createAnimations(scene: Phaser.Scene, texture: string): void {
    const anims = scene.anims;
    if (anims.exists(`walk-down@${texture}`)) return;
    for (const [dir, row] of Object.entries(ROWS)) {
      anims.create({ key: `walk-${dir}@${texture}`, frames: anims.generateFrameNumbers(texture, { start: row * 4, end: row * 4 + 3 }), frameRate: 8, repeat: -1 });
      anims.create({ key: `idle-${dir}@${texture}`, frames: anims.generateFrameNumbers(texture, { start: row * 4, end: row * 4 }), frameRate: 2, repeat: -1 });
    }
  }

  constructor(scene: Phaser.Scene, x: number, y: number, facing: Facing = 'down', appearance?: Appearance) {
    const look = appearance ?? gameState.character.appearance ?? DEFAULT_APPEARANCE;
    const [base, ...others] = appearanceTextures(look);
    Player.createAnimations(scene, base);
    this.facing = facing;
    this.sprite = scene.physics.add.sprite(x, y, base, 0);
    // Origine au niveau des pieds : la position (x, y) = là où le personnage touche le sol.
    this.sprite.setOrigin(0.5, 0.8);
    // Corps physique réduit aux pieds (10x8 px) pour passer devant les arbres sans se cogner la tête.
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(10, 8);
    body.setOffset(19, 32);
    body.setCollideWorldBounds(true);
    // Les autres couches suivent la base (même case d'animation, même position).
    this.layers = others.map((key) => scene.add.sprite(x, y, key, 0).setOrigin(0.5, 0.8));
    this.sprite.play(`idle-${facing}@${base}`);
    this.sync();
  }

  /** Applique une direction (composantes entre -1 et 1) et un facteur de vitesse (fatigue). Appelé à chaque image. */
  move(dir: { x: number; y: number }, speedFactor = 1): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(dir.x * PLAYER_SPEED * speedFactor, dir.y * PLAYER_SPEED * speedFactor);
    const base = this.sprite.texture.key;
    if (dir.x !== 0 || dir.y !== 0) {
      // La direction dominante décide de l'animation.
      if (Math.abs(dir.x) > Math.abs(dir.y)) this.facing = dir.x > 0 ? 'right' : 'left';
      else this.facing = dir.y > 0 ? 'down' : 'up';
      this.sprite.play(`walk-${this.facing}@${base}`, true);
    } else {
      this.sprite.play(`idle-${this.facing}@${base}`, true);
    }
    // Tri en profondeur : plus on est bas sur l'écran, plus on passe devant.
    this.sprite.setDepth(this.sprite.y);
    this.sync();
  }

  /** Aligne les couches sur la base (position, case d'animation, profondeur). */
  sync(): void {
    const frame = Number(this.sprite.frame.name);
    this.layers.forEach((layer, i) => {
      layer.setPosition(this.sprite.x, this.sprite.y).setFrame(frame).setDepth(this.sprite.depth + (i + 1) * 0.01);
      layer.setVisible(this.sprite.visible).setAlpha(this.sprite.alpha).setScale(this.sprite.scaleX, this.sprite.scaleY);
    });
  }

  /** Change l'apparence à chaud (écran « Ton apparence »). */
  setAppearance(a: Appearance): void {
    const [base, ...others] = appearanceTextures(a);
    Player.createAnimations(this.sprite.scene, base);
    const frame = Number(this.sprite.frame.name);
    this.sprite.setTexture(base, frame);
    this.layers.forEach((layer, i) => layer.setTexture(others[i], frame));
    this.sprite.play(`idle-${this.facing}@${base}`, true);
    this.sync();
  }

  /** Oriente le personnage sans le déplacer (aperçu). */
  face(dir: Facing): void {
    this.facing = dir;
    this.sprite.play(`idle-${dir}@${this.sprite.texture.key}`, true);
    this.sync();
  }

  /** Fait marcher sur place (aperçu). */
  walkInPlace(on: boolean): void {
    const base = this.sprite.texture.key;
    this.sprite.play(`${on ? 'walk' : 'idle'}-${this.facing}@${base}`, true);
    this.sync();
  }

  destroy(): void {
    this.layers.forEach((l) => l.destroy());
    this.sprite.destroy();
  }

  get x(): number { return this.sprite.x; }
  get y(): number { return this.sprite.y; }
  get direction(): Facing { return this.facing; }
}
