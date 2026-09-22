// Affichage fixe à l'écran (ne bouge pas avec la caméra) : version, indication, lieu.

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, GAME_VERSION } from '../config/constants';

const STYLE = { fontFamily: 'sans-serif', fontSize: '10px', color: '#ffffff' } as const;

export class Hud {
  private info: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, hint: string) {
    scene.add.text(4, GAME_HEIGHT - 12, GAME_VERSION, { ...STYLE, fontSize: '8px' }).setAlpha(0.7).setScrollFactor(0).setDepth(10000);
    // Le bandeau ne montre que le lieu ; les commandes sont dans l'onglet « Commandes » du sac.
    scene.add.text(GAME_WIDTH / 2, 4, hint, STYLE).setOrigin(0.5, 0).setScrollFactor(0).setDepth(10000);
    this.info = scene.add.text(GAME_WIDTH - 4, 4, '', STYLE)
      .setOrigin(1, 0).setScrollFactor(0).setDepth(10000);
  }

  setInfo(text: string): void {
    this.info.setText(text);
  }
}
