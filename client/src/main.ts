// Point d'entrée du jeu : crée l'instance Phaser et déclare les scènes.
// Phase 1 : une seule scène de test qui affiche un message et réagit au clic / toucher.

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './config/constants';
import { BootScene } from './scenes/BootScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,            // WebGL si disponible, sinon Canvas
  parent: 'game',               // id de la <div> dans index.html
  backgroundColor: '#5aa05a',
  pixelArt: true,               // pas de flou sur les sprites pixel art
  scale: {
    mode: Phaser.Scale.FIT,     // le jeu garde ses proportions et remplit l'écran au mieux
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  scene: [BootScene],
};

new Phaser.Game(config);
