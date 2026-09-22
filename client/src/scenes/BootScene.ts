// Scène de démarrage. En phase 1, elle sert uniquement à vérifier que Phaser tourne
// sur ordinateur et sur téléphone : un message, la version, et un cercle qui suit le clic / le doigt.

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, GAME_VERSION } from '../config/constants';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    this.add.text(centerX, centerY - 30, 'Jeu Ferme', {
      fontFamily: 'sans-serif',
      fontSize: '32px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.add.text(centerX, centerY + 10, 'Phaser fonctionne ! Touchez l\'écran.', {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      color: '#f0f0f0',
    }).setOrigin(0.5);

    this.add.text(4, GAME_HEIGHT - 14, GAME_VERSION, {
      fontFamily: 'sans-serif',
      fontSize: '10px',
      color: '#d0e8d0',
    });

    // Un cercle qui se déplace là où on clique ou on touche : premier test des entrées.
    const marker = this.add.circle(centerX, centerY + 60, 10, 0xffd700);
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      marker.setPosition(pointer.worldX, pointer.worldY);
    });
  }
}
