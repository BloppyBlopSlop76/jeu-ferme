// Point d'entrée du jeu : crée l'instance Phaser et déclare les scènes.

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './config/constants';
import { BootScene } from './scenes/BootScene';
import { WorldScene } from './scenes/WorldScene';
import { HouseScene } from './scenes/HouseScene';
import { UIScene } from './scenes/UIScene';
import { CreateScene } from './scenes/CreateScene';
import { AppearanceScene } from './scenes/AppearanceScene';
import { VillageScene } from './scenes/VillageScene';
import { gameState } from './state/GameState';
import { uiState } from './ui/uiState';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,            // WebGL si disponible, sinon Canvas
  parent: 'game',               // id de la <div> dans index.html
  dom: { createContainer: true }, // permet un vrai champ de saisie HTML (prénom) par-dessus le jeu
  backgroundColor: '#2f4f2f',
  pixelArt: true,               // pas de flou sur les sprites pixel art
  scale: {
    mode: Phaser.Scale.FIT,     // le jeu garde ses proportions et remplit l'écran au mieux
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  physics: {
    default: 'arcade',          // physique simple (vitesse, collisions rectangulaires), suffisante pour un jeu 2D vu de dessus
    arcade: { debug: false },
  },
  scene: [BootScene, CreateScene, AppearanceScene, WorldScene, VillageScene, HouseScene, UIScene],
};

new Phaser.Game(config);

// Accès à l'état depuis la console du navigateur (débogage et tests automatiques). Aucun effet sur le jeu.
(window as unknown as { __gameState: unknown }).__gameState = gameState;
(window as unknown as { __uiState: unknown }).__uiState = uiState;
