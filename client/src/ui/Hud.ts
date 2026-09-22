// Affichage fixe à l'écran (ne bouge pas avec la caméra) : version, indication, lieu.

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_VERSION } from '../config/constants';

const STYLE = { fontFamily: 'sans-serif', fontSize: '10px', color: '#ffffff' } as const;

export class Hud {
  private info: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, hint: string) {
    const isTouch = scene.sys.game.device.input.touch;
    scene.add.text(4, 4, GAME_VERSION, STYLE).setScrollFactor(0).setDepth(10000);
    scene.add.text(GAME_WIDTH / 2, 4, isTouch ? hint : `${hint} — flèches ou ZQSD`, STYLE)
      .setOrigin(0.5, 0).setScrollFactor(0).setDepth(10000);
    this.info = scene.add.text(GAME_WIDTH - 4, 4, '', STYLE)
      .setOrigin(1, 0).setScrollFactor(0).setDepth(10000);
  }

  setInfo(text: string): void {
    this.info.setText(text);
  }
}
