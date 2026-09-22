// Réunit toutes les sources d'entrée (flèches, ZQSD, WASD, joystick tactile, touche/bouton d'action)
// en une seule direction (dx, dy) entre -1 et 1 et un signal « action ».
// Le reste du jeu ne sait pas d'où vient l'ordre.

import Phaser from 'phaser';
import { VirtualJoystick } from '../ui/VirtualJoystick';
import { ActionButton } from '../ui/ActionButton';

export class InputController {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined;
  private keys: Record<'Z' | 'Q' | 'S' | 'D' | 'W' | 'A' | 'E' | 'SPACE', Phaser.Input.Keyboard.Key> | undefined;
  private joystick: VirtualJoystick | null;
  private button: ActionButton | null;

  constructor(scene: Phaser.Scene, joystick: VirtualJoystick | null, button: ActionButton | null) {
    this.joystick = joystick;
    this.button = button;
    const keyboard = scene.input.keyboard;
    if (keyboard) {
      this.cursors = keyboard.createCursorKeys();
      // ZQSD pour les claviers français (AZERTY), WASD pour les claviers QWERTY. E ou Espace = action.
      this.keys = keyboard.addKeys('Z,Q,S,D,W,A,E,SPACE') as InputController['keys'];
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

  /** Vrai une seule fois par appui sur E / Espace / le bouton tactile. */
  actionJustPressed(): boolean {
    let pressed = false;
    if (this.keys) {
      pressed = Phaser.Input.Keyboard.JustDown(this.keys.E) || Phaser.Input.Keyboard.JustDown(this.keys.SPACE);
    }
    if (this.button?.consume()) pressed = true;
    return pressed;
  }

  /** Affiche sur le bouton tactile ce que l'action ferait (sans effet sur clavier). */
  setActionLabel(text: string): void {
    this.button?.setLabel(text);
  }
}
