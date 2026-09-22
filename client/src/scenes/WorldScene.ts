// Scène du monde de test (phase 2) : un grand terrain quadrillé avec quelques repères,
// le personnage, la caméra qui le suit, et le joystick sur les appareils tactiles.

import Phaser from 'phaser';
import {
  GAME_WIDTH, GAME_HEIGHT, TILE_SIZE, WORLD_TILES_X, WORLD_TILES_Y, GAME_VERSION,
} from '../config/constants';
import { Player } from '../entities/Player';
import { VirtualJoystick } from '../ui/VirtualJoystick';
import { InputController } from '../systems/InputController';

export class WorldScene extends Phaser.Scene {
  private player!: Player;
  private inputController!: InputController;
  private positionText!: Phaser.GameObjects.Text;

  constructor() {
    super('World');
  }

  create(): void {
    const worldWidth = WORLD_TILES_X * TILE_SIZE;
    const worldHeight = WORLD_TILES_Y * TILE_SIZE;

    this.drawTestGround(worldWidth, worldHeight);

    // Limites du monde pour la physique et la caméra.
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);

    this.player = new Player(this, worldWidth / 2, worldHeight / 2);

    // La caméra suit le personnage. roundPixels évite les tremblements en pixel art.
    this.cameras.main.startFollow(this.player.gameObject, true, 0.12, 0.12);
    this.cameras.main.setRoundPixels(true);

    // Joystick uniquement si l'appareil est tactile ; deux doigts autorisés (joystick + futur bouton d'action).
    const isTouch = this.sys.game.device.input.touch;
    let joystick: VirtualJoystick | null = null;
    if (isTouch) {
      this.input.addPointer(1);
      joystick = new VirtualJoystick(this, 56, GAME_HEIGHT - 56);
    }
    this.inputController = new InputController(this, joystick);

    // Petit affichage fixe : version et position (utile pour vérifier que ça bouge).
    this.add.text(4, 4, GAME_VERSION, { fontFamily: 'sans-serif', fontSize: '10px', color: '#ffffff' })
      .setScrollFactor(0).setDepth(1000);
    this.positionText = this.add.text(GAME_WIDTH - 4, 4, '', { fontFamily: 'sans-serif', fontSize: '10px', color: '#ffffff' })
      .setOrigin(1, 0).setScrollFactor(0).setDepth(1000);
    this.add.text(GAME_WIDTH / 2, 4, isTouch ? 'Joystick en bas à gauche' : 'Flèches ou ZQSD pour bouger', {
      fontFamily: 'sans-serif', fontSize: '10px', color: '#ffffff',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(1000);
  }

  update(): void {
    this.player.move(this.inputController.getDirection());
    this.positionText.setText(`${Math.round(this.player.x)}, ${Math.round(this.player.y)}`);
  }

  /** Sol de test : damier vert clair/vert foncé, quelques « arbres » et une « rivière » comme repères. */
  private drawTestGround(worldWidth: number, worldHeight: number): void {
    const g = this.add.graphics();
    for (let ty = 0; ty < WORLD_TILES_Y; ty++) {
      for (let tx = 0; tx < WORLD_TILES_X; tx++) {
        g.fillStyle((tx + ty) % 2 === 0 ? 0x7cb86a : 0x74b062, 1);
        g.fillRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }
    // Rivière : une bande bleue verticale.
    g.fillStyle(0x4f8fd1, 1);
    g.fillRect(TILE_SIZE * 60, 0, TILE_SIZE * 4, worldHeight);
    // Arbres : cercles verts foncés placés de façon régulière.
    g.fillStyle(0x2f6b2f, 1);
    for (let i = 0; i < 25; i++) {
      const x = ((i * 137) % WORLD_TILES_X) * TILE_SIZE + TILE_SIZE / 2;
      const y = ((i * 71) % WORLD_TILES_Y) * TILE_SIZE + TILE_SIZE / 2;
      g.fillCircle(x, y, TILE_SIZE * 0.8);
    }
    // Bordure du monde.
    g.lineStyle(2, 0x3a2a1a, 1);
    g.strokeRect(0, 0, worldWidth, worldHeight);
  }
}
