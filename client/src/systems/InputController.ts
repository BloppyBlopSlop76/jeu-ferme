// Réunit toutes les sources d'entrée (flèches, ZQSD, WASD, joystick tactile) en une seule
// direction (dx, dy) entre -1 et 1. Le reste du jeu ne sait pas d'où vient l'ordre de bouger.

import Phaser from 'phaser';
import { VirtualJoystick } from '../ui/VirtualJoystick';

export class InputController {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined;
  private keys: Record<'Z' | 'Q' | 'S' | 'D' | 'W' | 'A', Phaser.Input.Keyboard.Key> | undefined;
  private joystick: VirtualJoystick | null;

  constructor(scene: Phaser.Scene, joystick: VirtualJoystick | null) {
    this.joystick = joystick;
    const keyboard = scene.input.keyboard;
    if (keyboard) {
      this.cursors = keyboard.createCursorKeys();
      // ZQSD pour les claviers français (AZERTY), WASD pour les claviers QWERTY.
      this.keys = keyboard.addKeys('Z,Q,S,D,W,A') as InputController['keys'];
    }
  }

  /** Direction demandée par le joueur. Longueur ≤ 1, pour ne pas aller plus vite en diagonale. */
  getDirection(): { x: number; y: number } {
    let x = 0;
    let y = 0;

    if (this.cursors && this.keys) {
      const left = this.cursors.left.isDown || this.keys.Q.isDown || this.keys.A.isDown;
      const right = this.cursors.right.isDown || this.keys.D.isDown;
      const up = this.cursors.up.isDown || this.keys.Z.isDown || this.keys.W.isDown;
      const down = this.cursors.down.isDown || this.keys.S.isDown;
      x = (right ? 1 : 0) - (left ? 1 : 0);
      y = (down ? 1 : 0) - (up ? 1 : 0);
    }

    // Le joystick prend le relais si le clavier est inactif.
    if (x === 0 && y === 0 && this.joystick) {
      x = this.joystick.x;
      y = this.joystick.y;
    }

    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    return { x, y };
  }
}
