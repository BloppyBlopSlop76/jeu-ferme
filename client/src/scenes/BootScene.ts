// Scène de démarrage : charge toutes les images et la carte, puis lance le monde.
// Crédit obligatoire : les graphismes viennent du pack « Sprout Lands » de Cup Nooble
// (voir public/assets/SPROUT_LANDS_LICENSE.txt).

import Phaser from 'phaser';
import { ASSETS_URL, GAME_WIDTH, GAME_HEIGHT } from '../config/constants';
import { SaveSystem } from '../systems/SaveSystem';
import { gameState } from '../state/GameState';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    // Petit texte de chargement, utile sur mobile où le réseau peut être lent.
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Chargement…', {
      fontFamily: 'sans-serif', fontSize: '14px', color: '#ffffff',
    }).setOrigin(0.5);

    this.load.setBaseURL(ASSETS_URL);
    this.load.image('grass', 'grass.png');
    this.load.image('water', 'water.png');
    this.load.image('house', 'house.png');
    this.load.image('bridge', 'bridge.png');
    this.load.image('things', 'things.png');
    this.load.image('walls', 'walls.png');
    this.load.image('dirt', 'dirt.png');
    this.load.spritesheet('plants', 'plants.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('fish', 'fish.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('character', 'character.png', { frameWidth: 48, frameHeight: 48 });
    this.load.tilemapTiledJSON('ferme', 'maps/ferme.json');
  }

  create(): void {
    // Découpe nommée dans la feuille « things » : arbres (les autres objets viendront plus tard).
    const things = this.textures.get('things');
    things.add('tree_big', 0, 16, 0, 32, 32);
    things.add('tree_small', 0, 0, 0, 16, 32);
    // Bande de mur plein (pour l'intérieur de la maison).
    this.textures.get('walls').add('wall_plain', 0, 16, 32, 16, 16);

    // Reprise de la partie sauvegardée sur cet appareil, s'il y en a une.
    SaveSystem.load();
    // Pas encore de trait choisi (nouvelle partie, ou ancienne partie convertie) : écran de création d'abord.
    if (gameState.character.trait === null) { this.scene.start('Create'); return; }
    this.scene.start(gameState.location === 'house' ? 'House' : 'World');
  }
}
