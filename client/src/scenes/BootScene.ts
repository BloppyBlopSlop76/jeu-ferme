// Scène de démarrage. Elle chargera plus tard les images et les sons ;
// pour l'instant elle lance directement la scène du monde.

import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.scene.start('World');
  }
}
