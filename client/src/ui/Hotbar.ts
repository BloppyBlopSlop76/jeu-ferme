// Barre rapide (demande d'Anthony, 23/09) : les 5 premières cases du sac, en haut à droite, toujours
// visibles. Toucher une case de graines choisit la graine plantée par le bouton d'action ; touches 1 à 5
// au clavier. Remplace l'ancien bandeau texte « Graines ×10 Navets ×0 … ».

import Phaser from 'phaser';
import { GAME_WIDTH } from '../config/constants';
import { ITEMS } from '../data/items';
import { gameState } from '../state/GameState';

const CELLS = 5;
const CELL = 20;
const FONT_SMALL = { fontFamily: 'sans-serif', fontSize: '8px', color: '#fff4d6', fontStyle: 'bold' } as const;

export class Hotbar {
  private cells: { bg: Phaser.GameObjects.Rectangle; icon: Phaser.GameObjects.Image; qty: Phaser.GameObjects.Text }[] = [];
  private label: Phaser.GameObjects.Text;
  private lastKey = '';

  constructor(private scene: Phaser.Scene, private onSelect: () => void) {
    const x0 = GAME_WIDTH - 4 - CELLS * (CELL + 2) - 40; // laisse la place au bouton « Sac »
    const y0 = 4;
    for (let i = 0; i < CELLS; i++) {
      const x = x0 + i * (CELL + 2);
      const bg = scene.add.rectangle(x, y0, CELL, CELL, 0x2b2118, 0.55).setOrigin(0, 0).setStrokeStyle(1, 0xf3e4c4, 0.35).setDepth(15000).setInteractive();
      const icon = scene.add.image(x + CELL / 2, y0 + CELL / 2, 'plants', 0).setDepth(15001).setVisible(false);
      const qty = scene.add.text(x + CELL - 1, y0 + CELL - 1, '', FONT_SMALL).setOrigin(1, 1).setDepth(15002);
      bg.on('pointerdown', () => this.select(i));
      this.cells.push({ bg, icon, qty });
    }
    this.label = scene.add.text(x0 + (CELLS * (CELL + 2)) / 2, y0 + CELL + 3, '', { fontFamily: 'sans-serif', fontSize: '8px', color: '#fff4d6' })
      .setOrigin(0.5, 0).setDepth(15001).setAlpha(0);
    // Touches 1 à 5.
    scene.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= CELLS) this.select(n - 1);
    });
    this.refresh(true);
  }

  /** Choisit la case : une graine devient la graine plantée ; sinon on montre juste le nom. */
  private select(i: number): void {
    const slot = gameState.inventory.slots[i];
    if (!slot) return;
    const def = ITEMS[slot.item];
    if (def.kind === 'seed') {
      gameState.selectedSeed = slot.item;
      this.flash(`Planter : ${def.nom.replace('Graine de ', '')}`);
      this.onSelect();
    } else {
      this.flash(def.nom);
    }
    this.refresh(true);
  }

  private flash(text: string): void {
    this.label.setText(text).setAlpha(1);
    this.scene.tweens.killTweensOf(this.label);
    this.scene.tweens.add({ targets: this.label, alpha: 0, delay: 1000, duration: 300 });
  }

  /** À appeler souvent : ne redessine que si le contenu a changé. */
  refresh(force = false): void {
    const key = gameState.inventory.slots.slice(0, CELLS).map((s) => (s ? `${s.item}:${s.qty}` : '-')).join('|') + '#' + gameState.selectedSeed;
    if (!force && key === this.lastKey) return;
    this.lastKey = key;
    for (let i = 0; i < CELLS; i++) {
      const slot = gameState.inventory.slots[i];
      const c = this.cells[i];
      if (!slot) { c.icon.setVisible(false); c.qty.setText(''); c.bg.setStrokeStyle(1, 0xf3e4c4, 0.35); continue; }
      const def = ITEMS[slot.item];
      c.icon.setTexture(def.icon.texture, def.icon.frame).setVisible(true);
      c.qty.setText(slot.qty > 1 ? String(slot.qty) : '');
      const selected = def.kind === 'seed' && slot.item === gameState.selectedSeed;
      c.bg.setStrokeStyle(selected ? 2 : 1, selected ? 0xfff2a0 : 0xf3e4c4, selected ? 1 : 0.35);
    }
  }
}
