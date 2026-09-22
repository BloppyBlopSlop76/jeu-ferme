// Intérieur de la maison : une pièce simple, un tas de paille pour dormir (mal), une sortie en bas,
// et le lit (phase 9) : acheté chez le marchand, posé où l'on veut, rangeable dans le sac (Animal Crossing).

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, TILE_SIZE } from '../config/constants';
import { Player } from '../entities/Player';
import { createControls } from '../systems/createControls';
import { InputController } from '../systems/InputController';
import { Hud } from '../ui/Hud';
import { gameState } from '../state/GameState';
import { SaveSystem } from '../systems/SaveSystem';
import { DayCycle } from '../systems/DayCycle';
import { Energy } from '../systems/EnergySystem';
import { uiState } from '../ui/uiState';
import { Inventory } from '../systems/InventorySystem';
import { ENERGY_MAX } from '../state/GameState';

const ROOM_W = 12 * TILE_SIZE;  // 192 px
const ROOM_H = 8 * TILE_SIZE;   // 128 px

/** Le tas de paille remplit mal la fonction d'un lit : peu d'énergie rendue (décision d'Anthony). */
const STRAW_ENERGY = 30;

export class HouseScene extends Phaser.Scene {
  private player!: Player;
  private controls!: InputController;
  private leaving = false;
  private sleeping = false;
  private straw!: Phaser.GameObjects.Container;
  private strawLabel!: Phaser.GameObjects.Text;
  private left = 0;
  private top = 0;
  private bed: Phaser.GameObjects.Image | null = null;
  private cursor!: Phaser.GameObjects.Rectangle;
  private cursorLabel!: Phaser.GameObjects.Text;

  constructor() {
    super('House');
  }

  create(): void {
    this.leaving = false; // la scène est réutilisée à chaque visite
    this.sleeping = false;

    // La pièce est centrée dans l'écran ; la caméra ne bouge pas.
    const left = Math.floor((GAME_WIDTH - ROOM_W) / 2);
    const top = Math.floor((GAME_HEIGHT - ROOM_H) / 2);
    this.left = left; this.top = top;

    // Sol en planches (couleurs de la palette Sprout Lands) et mur du fond en texture bois.
    const g = this.add.graphics();
    g.fillStyle(0xd9b078, 1).fillRect(left, top, ROOM_W, ROOM_H);
    g.lineStyle(1, 0xb08a55, 1);
    for (let y = top + TILE_SIZE; y < top + ROOM_H; y += TILE_SIZE) g.lineBetween(left, y, left + ROOM_W, y);
    this.add.tileSprite(left, top - 32, ROOM_W, 32, 'walls', 'wall_plain').setOrigin(0, 0);
    g.lineStyle(3, 0x5a3a2a, 1).strokeRect(left - 1, top - 33, ROOM_W + 2, ROOM_H + 34);
    // Paillasson devant la sortie.
    g.fillStyle(0x8b5a3c, 1).fillRect(left + ROOM_W / 2 - 20, top + ROOM_H - 6, 40, 6);

    // Tas de paille dans le coin haut gauche.
    this.straw = this.makeStraw(left + 28, top + 22);
    this.strawLabel = this.add.text(this.straw.x, this.straw.y - 18, 'Dormir', {
      fontFamily: 'sans-serif', fontSize: '9px', color: '#ffffff', backgroundColor: '#00000088', padding: { x: 2, y: 1 },
    }).setOrigin(0.5, 1).setVisible(false).setDepth(9001);

    // Murs invisibles : le joueur reste dans la pièce.
    this.physics.world.setBounds(left, top - 8, ROOM_W, ROOM_H + 8);

    // Zone de sortie : bas centre. On sort en marchant dessus.
    const exit = this.add.zone(left + ROOM_W / 2, top + ROOM_H - 2, 48, 6);
    this.physics.add.existing(exit, true);

    this.player = new Player(this, left + ROOM_W / 2, top + ROOM_H - 14, 'up');
    this.physics.add.overlap(this.player.sprite, exit, () => this.leave());
    (window as unknown as { __house: unknown }).__house = this; // pour les tests automatiques

    // Case visée (pour poser le lit) et le lit s'il est posé.
    this.cursor = this.add.rectangle(0, 0, TILE_SIZE, TILE_SIZE, 0xffffff, 0.15).setOrigin(0, 0).setStrokeStyle(1, 0xfff2a0, 1).setDepth(9000).setVisible(false);
    this.cursorLabel = this.add.text(0, 0, '', {
      fontFamily: 'sans-serif', fontSize: '9px', color: '#ffffff', backgroundColor: '#00000088', padding: { x: 2, y: 1 },
    }).setOrigin(0.5, 1).setDepth(9001).setVisible(false);
    this.bed = null;
    if (gameState.house.bed) this.showBed(gameState.house.bed.tx, gameState.house.bed.ty);
    const onPickup = () => this.pickupBed();
    this.game.events.on('pickup-bed', onPickup);
    this.events.once('shutdown', () => this.game.events.off('pickup-bed', onPickup));

    this.cameras.main.setBackgroundColor('#1e1a17');
    this.cameras.main.fadeIn(300);
    this.controls = createControls(this);
    new Hud(this, 'Ta maison — sors par le bas');
    if (!this.scene.isActive('UI')) this.scene.launch('UI');
    this.scene.bringToTop('UI');
  }

  update(): void {
    if (this.leaving || this.sleeping) return;
    DayCycle.update(); // l'horloge tourne aussi à l'intérieur

    if (uiState.panelOpen) {
      this.player.move({ x: 0, y: 0 });
      this.controls.actionJustPressed(); // consommé (voir MapScene)
      return;
    }
    this.player.move(this.controls.getDirection(), Energy.speedFactor());

    // Devant le lit : dormir (énergie pleine). Devant une case libre avec un lit dans le sac : le poser.
    const { tx, ty } = this.targetTile();
    const bed = gameState.house.bed;
    const onBed = bed !== null && tx === bed.tx && (ty === bed.ty || ty === bed.ty + 1);
    const nearStraw = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.straw.x, this.straw.y + 8) < 32;
    // Ordre de priorité : dormir dans le lit, dormir sur la paille, poser le lit (jamais poser le lit à côté de la paille par erreur).
    const canPlace = !onBed && !nearStraw && bed === null && Inventory.count('lit') > 0 && this.isFreeFloor(tx, ty) && this.isFreeFloor(tx, ty + 1);
    this.cursor.setPosition(this.left + tx * TILE_SIZE, this.top + ty * TILE_SIZE).setVisible(canPlace);
    this.cursorLabel.setPosition(this.left + tx * TILE_SIZE + TILE_SIZE / 2, this.top + ty * TILE_SIZE - 2).setText('Poser le lit').setVisible(canPlace);
    this.strawLabel.setVisible(nearStraw && !onBed);
    if (onBed) {
      this.controls.setActionLabel('Dormir');
      if (this.controls.actionJustPressed()) this.sleep(true);
      return;
    }
    if (nearStraw) {
      this.controls.setActionLabel('Dormir');
      if (this.controls.actionJustPressed()) this.sleep(false);
      return;
    }
    this.controls.setActionLabel(canPlace ? 'Poser le lit' : '');
    if (canPlace && this.controls.actionJustPressed()) this.placeBed(tx, ty);
  }

  /** Case de la pièce devant les pieds du joueur (0..11 × 0..7). */
  private targetTile(): { tx: number; ty: number } {
    const fx = Math.floor((this.player.x - this.left) / TILE_SIZE);
    const fy = Math.floor((this.player.y - 2 - this.top) / TILE_SIZE);
    const d = this.player.direction;
    return { tx: fx + (d === 'left' ? -1 : d === 'right' ? 1 : 0), ty: fy + (d === 'up' ? -1 : d === 'down' ? 1 : 0) };
  }

  /** Sol libre : dans la pièce, pas sur la paille (coin haut gauche), pas sur la rangée de sortie. */
  private isFreeFloor(tx: number, ty: number): boolean {
    if (tx < 0 || ty < 0 || tx >= 12 || ty >= 7) return false;
    if (tx <= 2 && ty <= 1) return false;
    return true;
  }

  private showBed(tx: number, ty: number): void {
    const x = this.left + tx * TILE_SIZE, y = this.top + ty * TILE_SIZE;
    this.bed = this.add.image(x, y + 4, 'furniture', 'bed').setOrigin(0, 0).setDepth(y + 28);
  }

  private placeBed(tx: number, ty: number): void {
    if (!Inventory.remove('lit', 1)) return;
    gameState.house.bed = { tx, ty };
    this.showBed(tx, ty);
    this.game.events.emit('inventory-changed');
    SaveSystem.autosave();
  }

  /** Sac → « Ranger le lit » : le lit revient dans le sac. */
  private pickupBed(): void {
    if (!gameState.house.bed || !Inventory.canAdd('lit', 1)) return;
    Inventory.add('lit', 1);
    gameState.house.bed = null;
    this.bed?.destroy();
    this.bed = null;
    this.game.events.emit('inventory-changed');
    SaveSystem.autosave();
  }

  /** Un tas de paille dessiné par le code : trois bosses jaunes et quelques brins. */
  private makeStraw(x: number, y: number): Phaser.GameObjects.Container {
    const g = this.add.graphics();
    g.fillStyle(0xd9b24a, 1);
    g.fillEllipse(0, 6, 34, 14);
    g.fillEllipse(-7, 0, 20, 12);
    g.fillEllipse(8, 1, 20, 12);
    g.lineStyle(1, 0xb8902e, 1);
    for (let i = -14; i <= 14; i += 5) g.lineBetween(i, 10, i + 3, 2);
    g.lineStyle(1, 0xf1d67a, 1);
    for (let i = -12; i <= 12; i += 6) g.lineBetween(i, 8, i + 2, 1);
    const c = this.add.container(x, y, [g]).setDepth(y);
    return c;
  }

  /** Dormir : fondu, on saute au lendemain 6 h, de l'énergie (peu sur la paille, tout dans le lit), sauvegarde. */
  private sleep(inBed: boolean): void {
    this.sleeping = true;
    this.player.move({ x: 0, y: 0 });
    this.cameras.main.fadeOut(400);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      const result = DayCycle.sleep(inBed ? ENERGY_MAX : STRAW_ENERGY);
      SaveSystem.autosave();
      this.cameras.main.fadeIn(600);
      let msg = result.daysPassed > 0
        ? (inBed ? `Jour ${gameState.time.day} — bien dormi, énergie pleine !` : `Jour ${gameState.time.day} — mal dormi sur la paille (+${STRAW_ENERGY} énergie)`)
        : (inBed ? 'Bonne sieste, énergie pleine' : `Petite sieste (+${STRAW_ENERGY} énergie)`);
      if (result.shippingPaid > 0) msg += `\nExpédition : +${result.shippingPaid} pièces`;
      const t = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, msg, {
        fontFamily: 'sans-serif', fontSize: '11px', color: '#fff2a0', stroke: '#000000', strokeThickness: 3, align: 'center',
      }).setOrigin(0.5).setDepth(9500);
      this.tweens.add({ targets: t, alpha: 0, delay: 1800, duration: 500, onComplete: () => t.destroy() });
      this.time.delayedCall(700, () => { this.sleeping = false; });
    });
  }

  private leave(): void {
    if (this.leaving) return;
    this.leaving = true;
    gameState.location = 'world';
    SaveSystem.autosave();
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('World'));
  }
}
