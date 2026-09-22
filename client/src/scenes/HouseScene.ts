// Intérieur de la maison (phase 3) : une pièce simple, des murs, une sortie en bas.
// La décoration et les meubles viendront dans la phase « maison ».

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, TILE_SIZE } from '../config/constants';
import { Player } from '../entities/Player';
import { createControls } from '../systems/createControls';
import { InputController } from '../systems/InputController';
import { Hud } from '../ui/Hud';
import { gameState } from '../state/GameState';

const ROOM_W = 12 * TILE_SIZE;  // 192 px
const ROOM_H = 8 * TILE_SIZE;   // 128 px

export class HouseScene extends Phaser.Scene {
  private player!: Player;
  private controls!: InputController;
  private leaving = false;

  constructor() {
    super('House');
  }

  create(): void {
    this.leaving = false; // la scène est réutilisée à chaque visite

    // La pièce est centrée dans l'écran ; la caméra ne bouge pas.
    const left = Math.floor((GAME_WIDTH - ROOM_W) / 2);
    const top = Math.floor((GAME_HEIGHT - ROOM_H) / 2);

    // Sol en planches (couleurs de la palette Sprout Lands) et mur du fond en texture bois.
    const g = this.add.graphics();
    g.fillStyle(0xd9b078, 1).fillRect(left, top, ROOM_W, ROOM_H);
    g.lineStyle(1, 0xb08a55, 1);
    for (let y = top + TILE_SIZE; y < top + ROOM_H; y += TILE_SIZE) g.lineBetween(left, y, left + ROOM_W, y);
    this.add.tileSprite(left, top - 32, ROOM_W, 32, 'walls', 'wall_plain').setOrigin(0, 0);
    g.lineStyle(3, 0x5a3a2a, 1).strokeRect(left - 1, top - 33, ROOM_W + 2, ROOM_H + 34);
    // Paillasson devant la sortie.
    g.fillStyle(0x8b5a3c, 1).fillRect(left + ROOM_W / 2 - 20, top + ROOM_H - 6, 40, 6);

    // Murs invisibles : le joueur reste dans la pièce.
    this.physics.world.setBounds(left, top - 8, ROOM_W, ROOM_H + 8);

    // Zone de sortie : bas centre. On sort en marchant dessus.
    const exit = this.add.zone(left + ROOM_W / 2, top + ROOM_H - 2, 48, 6);
    this.physics.add.existing(exit, true);

    this.player = new Player(this, left + ROOM_W / 2, top + ROOM_H - 14, 'up');
    this.physics.add.overlap(this.player.sprite, exit, () => this.leave());

    this.cameras.main.setBackgroundColor('#1e1a17');
    this.cameras.main.fadeIn(300);
    this.controls = createControls(this);
    new Hud(this, 'Ta maison — sors par le bas');
  }

  update(): void {
    if (this.leaving) return;
    this.player.move(this.controls.getDirection());
  }

  private leave(): void {
    if (this.leaving) return;
    this.leaving = true;
    gameState.location = 'world';
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('World'));
  }
}
