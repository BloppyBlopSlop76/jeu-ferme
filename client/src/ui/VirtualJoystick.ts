// Joystick virtuel pour le tactile : un grand cercle fixe (la base) et un petit cercle (le pouce)
// que le joueur déplace avec le doigt. Il renvoie une direction entre -1 et 1 sur chaque axe.
// Il est fixé à l'écran (scrollFactor 0) : il ne bouge pas quand la caméra suit le personnage.

import Phaser from 'phaser';

export class VirtualJoystick {
  private base: Phaser.GameObjects.Arc;
  private thumb: Phaser.GameObjects.Arc;
  private pointerId: number | null = null;   // identifiant du doigt qui tient le joystick
  private centerX: number;
  private centerY: number;
  private radius: number;

  /** Direction courante, chaque composante entre -1 et 1. (0, 0) = immobile. */
  public x = 0;
  public y = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, radius = 32) {
    this.centerX = x;
    this.centerY = y;
    this.radius = radius;

    this.base = scene.add.circle(x, y, radius, 0x000000, 0.25)
      .setStrokeStyle(2, 0xffffff, 0.5)
      .setScrollFactor(0)
      .setDepth(1000);
    this.thumb = scene.add.circle(x, y, radius * 0.45, 0xffffff, 0.6)
      .setScrollFactor(0)
      .setDepth(1001);

    scene.input.on('pointerdown', this.onDown, this);
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);

    scene.events.once('shutdown', () => {
      scene.input.off('pointerdown', this.onDown, this);
      scene.input.off('pointermove', this.onMove, this);
      scene.input.off('pointerup', this.onUp, this);
    });
  }

  private onDown(pointer: Phaser.Input.Pointer): void {
    if (this.pointerId !== null) return; // un doigt tient déjà le joystick
    // pointer.x / pointer.y = position à l'écran (pas dans le monde), ce qu'il faut pour un élément fixe.
    const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, this.centerX, this.centerY);
    if (dist <= this.radius * 1.5) {
      this.pointerId = pointer.id;
      this.update(pointer);
    }
  }

  private onMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id === this.pointerId) this.update(pointer);
  }

  private onUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.pointerId) return;
    this.pointerId = null;
    this.x = 0;
    this.y = 0;
    this.thumb.setPosition(this.centerX, this.centerY);
  }

  /** Calcule la direction à partir de la position du doigt, en limitant le pouce au rayon de la base. */
  private update(pointer: Phaser.Input.Pointer): void {
    let dx = pointer.x - this.centerX;
    let dy = pointer.y - this.centerY;
    const dist = Math.hypot(dx, dy);
    if (dist > this.radius) {
      dx = (dx / dist) * this.radius;
      dy = (dy / dist) * this.radius;
    }
    this.thumb.setPosition(this.centerX + dx, this.centerY + dy);
    this.x = dx / this.radius;
    this.y = dy / this.radius;
  }

  setVisible(visible: boolean): void {
    this.base.setVisible(visible);
    this.thumb.setVisible(visible);
  }
}
