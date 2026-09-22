// Scène du terrain : la carte de la ferme (rivière, maison, boîte d'expédition, boutique), l'agriculture et la pêche.
// Tout ce qui est commun aux cartes (objets, personnage, passages, PNJ) est dans MapScene.

import Phaser from 'phaser';
import { TILE_SIZE } from '../config/constants';
import { FarmView } from '../entities/FarmView';
import { FarmSystem, ACTION_LABELS, currentSeed } from '../systems/FarmSystem';
import { ITEMS } from '../data/items';
import { gameState } from '../state/GameState';
import { SaveSystem } from '../systems/SaveSystem';
import { FishingSystem } from '../systems/FishingSystem';
import { SKILLS } from '../data/skills';
import { DayCycle } from '../systems/DayCycle';
import { MapScene } from './MapScene';

export class WorldScene extends MapScene {
  private farm!: FarmSystem;
  private farmView!: FarmView;
  private fishing = new FishingSystem();
  private biteMark!: Phaser.GameObjects.Text;      // le « ! » au-dessus du joueur quand ça mord
  private rod!: Phaser.GameObjects.Graphics;       // canne + fil, redessinés pendant la pêche
  private bobber!: Phaser.GameObjects.Arc;         // le bouchon qui flotte
  private fishSpot = { x: 0, y: 0 };               // centre de la case d'eau visée

  constructor() {
    super('World', 'ferme', 'world');
  }

  create(): void {
    this.fishing.reset();
    (window as unknown as { __fishing: unknown }).__fishing = this.fishing; // pour les tests automatiques
    this.buildMap(gameState.character.name ? `Ferme de ${gameState.character.name}` : 'Ton terrain');

    // --- Champ : règles (FarmSystem) et affichage (FarmView). Sol libre = dans la carte et pas bloqué. ---
    const champ = this.map.createLayer('champ', [this.map.getTileset('dirt')!]) as Phaser.Tilemaps.TilemapLayer;
    this.farm = new FarmSystem((tx, ty) =>
      tx >= 0 && ty >= 0 && tx < this.map.width && ty < this.map.height && !this.blocked.has(`${tx},${ty}`));
    this.farmView = new FarmView(this, champ);

    this.rod = this.add.graphics().setDepth(9550).setVisible(false);
    this.bobber = this.add.circle(0, 0, 2.5, 0xe0563f).setStrokeStyle(1, 0xffffff, 0.9).setDepth(9551).setVisible(false);
    this.biteMark = this.add.text(0, 0, '!', {
      fontFamily: 'sans-serif', fontSize: '16px', color: '#fff2a0', stroke: '#000000', strokeThickness: 3, fontStyle: 'bold',
    }).setOrigin(0.5, 1).setDepth(9600).setVisible(false);
  }

  /** Pêche en cours : bouger annule ; sinon on attend la touche et on n'avance pas le reste. */
  protected beforeMove(dir: { x: number; y: number }): boolean {
    if (!this.fishing.isActive) return true;
    if (dir.x !== 0 || dir.y !== 0) {
      this.fishing.reset();
      this.biteMark.setVisible(false);
      this.showRod(false);
      return true;
    }
    this.player.move({ x: 0, y: 0 });
    this.updateFishing();
    return false;
  }

  protected onDayCycle(cycle: ReturnType<typeof DayCycle.update>): void {
    for (const plot of cycle.grown) this.farmView.refresh(plot);
  }

  /** Sur la case visée : pêcher devant l'eau, sinon planter / arroser / récolter. */
  protected updateActions(tx: number, ty: number): void {
    if (this.water.has(`${tx},${ty}`)) {
      this.showCursor(tx, ty, 'Pêcher', 0x9ad4ff);
      if (this.controls.actionJustPressed()) {
        this.fishing.cast(Date.now());
        this.fishSpot = { x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + TILE_SIZE / 2 };
        this.showRod(true);
      }
      return;
    }
    const action = this.farm.getAction(tx, ty);
    let label = action ? ACTION_LABELS[action] : (this.farm.getBlockReason(tx, ty) ?? '');
    if (action === 'plant') { const seed = currentSeed(); if (seed) label += ` (${ITEMS[seed].nom.replace('Graine de ', '')})`; }
    this.cursor.setPosition(tx * TILE_SIZE, ty * TILE_SIZE).setVisible(!!label || !!this.farm.getPlot(tx, ty));
    this.cursor.setStrokeStyle(1, action ? 0xfff2a0 : 0xffffff, action ? 1 : 0.5);
    this.cursorLabel.setPosition(tx * TILE_SIZE + TILE_SIZE / 2, ty * TILE_SIZE - 2).setText(label).setVisible(!!label);
    this.controls.setActionLabel(action ? ACTION_LABELS[action] : ''); // sur le bouton rond : le mot seul (la graine est dans la barre rapide)

    if (this.controls.actionJustPressed() && action) {
      const result = this.farm.act(tx, ty);
      if (!result) return;
      if (result.plot) this.farmView.refresh(result.plot);
      if (result.action === 'harvest') {
        this.farmView.clear(tx, ty);
        if (result.gained) this.floatText(result.gained.map((g) => `+${g.qty} ${ITEMS[g.item].nom}`).join('  '), tx, ty);
      }
      if (result.levelUp) this.levelUpText('agriculture', result.levelUp);
      this.game.events.emit('inventory-changed');
      SaveSystem.autosave();
    }
  }

  /** Annonce un nouveau niveau au-dessus du joueur. */
  private levelUpText(skill: keyof typeof SKILLS, level: number): void {
    const tx = Math.floor(this.player.x / TILE_SIZE), ty = Math.floor(this.player.y / TILE_SIZE) - 3;
    this.floatText(`${SKILLS[skill].nom} niveau ${level} !`, tx, ty);
  }

  /** Pendant la pêche : attente, touche, capture ou raté. */
  private updateFishing(): void {
    const event = this.fishing.update(Date.now());
    const px = this.player.x, py = this.player.y - 36;
    if (event === 'bite') {
      this.biteMark.setPosition(px, py).setVisible(true);
      this.tweens.add({ targets: this.biteMark, y: py - 6, yoyo: true, duration: 120, repeat: 3 });
    } else if (event === 'miss') {
      this.biteMark.setVisible(false);
      this.floatText('Raté, il est parti…', Math.floor(px / TILE_SIZE), Math.floor(py / TILE_SIZE));
    }
    const phase = this.fishing.phase;
    const stateLabel = phase === 'bite' ? 'Ferrer !' : 'Attendre…';
    // Sur ordinateur il n'y a pas de bouton rond : l'état s'affiche au-dessus de la case d'eau.
    this.cursorLabel.setPosition(this.fishSpot.x, this.fishSpot.y + 20).setText(stateLabel).setVisible(true); // sous le bouchon, pour ne pas cacher la canne
    this.cursor.setVisible(false);
    this.controls.setActionLabel(stateLabel);
    this.drawRod(phase === 'bite');
    if (phase === 'idle') { this.showRod(false); return; } // raté : la ligne est déjà remontée
    if (this.controls.actionJustPressed()) {
      if (phase === 'bite') {
        const result = this.fishing.reel();
        this.biteMark.setVisible(false);
        this.showRod(false);
        if (result) {
          this.floatText(result.stored ? `+${result.qty} ${result.fish.nom}` : 'Sac plein !', Math.floor(px / TILE_SIZE), Math.floor(py / TILE_SIZE));
          if (result.levelUp) this.levelUpText('peche', result.levelUp);
          this.game.events.emit('inventory-changed');
          SaveSystem.autosave();
        }
      } else {
        // Appuyer trop tôt effraie le poisson.
        this.fishing.reset();
        this.showRod(false);
        this.floatText('Trop tôt !', Math.floor(px / TILE_SIZE), Math.floor(py / TILE_SIZE));
      }
    }
  }

  private showRod(visible: boolean): void {
    this.rod.setVisible(visible);
    this.bobber.setVisible(visible);
    if (!visible) this.rod.clear();
  }

  /** Dessine la canne (un bâton depuis la main), le fil jusqu'au bouchon, et fait flotter le bouchon. */
  private drawRod(biting: boolean): void {
    const t = this.time.now / 1000;
    const d = this.player.direction;
    // Main du personnage : légèrement décalée selon la direction.
    const handX = this.player.x + (d === 'left' ? -5 : d === 'right' ? 5 : 3);
    const handY = this.player.y - 14;
    // Bout de la canne : vers la case d'eau, en hauteur.
    const dx = this.fishSpot.x - handX, dy = this.fishSpot.y - handY;
    const len = Math.hypot(dx, dy) || 1;
    const tipX = handX + (dx / len) * 14, tipY = handY + (dy / len) * 14 - 10;
    // Bouchon : flotte doucement, plonge quand ça mord.
    const bob = biting ? 3 + Math.sin(t * 30) * 2 : Math.sin(t * 3) * 1;
    this.bobber.setPosition(this.fishSpot.x, this.fishSpot.y + bob);
    const g = this.rod;
    g.clear();
    g.lineStyle(2, 0x8b5a3c, 1).lineBetween(handX, handY, tipX, tipY);      // canne
    g.lineStyle(1, 0xffffff, 0.8).lineBetween(tipX, tipY, this.bobber.x, this.bobber.y - 2); // fil
  }

}
