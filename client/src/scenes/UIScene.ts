// Scène d'interface, lancée en parallèle des scènes de jeu : sa caméra ne bouge jamais.
// Elle porte le bouton « Sac », le panneau Sac/Options, la sauvegarde automatique.

import Phaser from 'phaser';
import { GAME_WIDTH } from '../config/constants';
import { InventoryPanel } from '../ui/InventoryPanel';
import { SaveSystem } from '../systems/SaveSystem';
import { gameState } from '../state/GameState';

const AUTOSAVE_EVERY_MS = 10_000;

export class UIScene extends Phaser.Scene {
  private panel!: InventoryPanel;

  constructor() {
    super({ key: 'UI', active: false });
  }

  create(): void {
    this.panel = new InventoryPanel(this, () => this.resetGame());

    // Bouton « Sac » en haut à droite (souris et tactile).
    const bx = GAME_WIDTH - 22, by = 30;
    const btn = this.add.rectangle(bx, by, 36, 16, 0xf3e4c4, 0.9).setStrokeStyle(1, 0x6b4a2b).setInteractive().setDepth(15000);
    this.add.text(bx, by, 'Sac', { fontFamily: 'sans-serif', fontSize: '9px', color: '#2b2118' }).setOrigin(0.5).setDepth(15001);
    btn.on('pointerdown', () => this.panel.toggle());

    // Clavier : I ouvre/ferme, Échap ferme.
    this.input.keyboard?.on('keydown-I', () => this.panel.toggle());
    this.input.keyboard?.on('keydown-ESC', () => { if (this.panel.isOpen) this.panel.close(); });

    // Sauvegarde automatique : à intervalle régulier, et quand la page se cache (changement d'appli, écran éteint).
    this.time.addEvent({ delay: AUTOSAVE_EVERY_MS, loop: true, callback: () => SaveSystem.autosave() });
    const onHide = () => { if (document.visibilityState === 'hidden') SaveSystem.autosave(); };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', () => SaveSystem.autosave());
    this.events.once('shutdown', () => document.removeEventListener('visibilitychange', onHide));

    // Les scènes de jeu préviennent quand l'inventaire change (pour rafraîchir la grille si elle est ouverte).
    this.game.events.on('inventory-changed', () => { if (this.panel.isOpen) this.panel.refreshSac(); });
  }

  /** Nouvelle partie : efface la sauvegarde, remet l'état à zéro et relance le terrain. */
  private resetGame(): void {
    SaveSystem.reset();
    gameState.location = 'world';
    this.scene.stop('House');
    this.scene.stop('World');
    this.scene.launch('World');
    this.scene.bringToTop('UI');
  }
}
