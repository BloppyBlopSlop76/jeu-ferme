// Panneau « Sac / Options » : grille d'inventaire et réglages (sauvegarde, nouvelle partie).
// Vit dans la scène UI (caméra fixe), au-dessus du jeu.

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/constants';
import { ITEMS } from '../data/items';
import { gameState, INVENTORY_SIZE } from '../state/GameState';
import { SaveSystem } from '../systems/SaveSystem';
import { uiState } from './uiState';

const PANEL_W = 300;
const PANEL_H = 200;
const COLS = 5;
const CELL = 34;
const FONT = { fontFamily: 'sans-serif', fontSize: '10px', color: '#2b2118' } as const;
const FONT_SMALL = { fontFamily: 'sans-serif', fontSize: '9px', color: '#2b2118' } as const;

type Tab = 'sac' | 'options';

export class InventoryPanel {
  private root: Phaser.GameObjects.Container;
  private sacPage: Phaser.GameObjects.Container;
  private optionsPage: Phaser.GameObjects.Container;
  private tabSac!: Phaser.GameObjects.Rectangle;
  private tabOptions!: Phaser.GameObjects.Rectangle;
  private cells: { icon: Phaser.GameObjects.Image; qty: Phaser.GameObjects.Text }[] = [];
  private selectedLabel!: Phaser.GameObjects.Text;
  private autosaveLabel!: Phaser.GameObjects.Text;
  private message!: Phaser.GameObjects.Text;
  private confirmReset = false;
  private resetLabel!: Phaser.GameObjects.Text;

  constructor(private scene: Phaser.Scene, private onReset: () => void) {
    const x = (GAME_WIDTH - PANEL_W) / 2;
    const y = (GAME_HEIGHT - PANEL_H) / 2;
    this.root = scene.add.container(x, y).setDepth(20000).setVisible(false);

    // Fond sombre qui bloque les clics vers le jeu, puis le cadre.
    const shade = scene.add.rectangle(-x, -y, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.45).setOrigin(0, 0).setInteractive();
    const frame = scene.add.rectangle(0, 0, PANEL_W, PANEL_H, 0xf3e4c4, 1).setOrigin(0, 0).setStrokeStyle(2, 0x6b4a2b);
    this.root.add([shade, frame]);

    // Onglets.
    this.tabSac = this.makeTab(8, -12, 'Sac', () => this.showTab('sac'));
    this.tabOptions = this.makeTab(70, -12, 'Options', () => this.showTab('options'));
    // Bouton fermer.
    this.makeButton(PANEL_W - 30, 6, 24, 16, '✕', () => this.close());

    this.sacPage = scene.add.container(0, 0);
    this.optionsPage = scene.add.container(0, 0).setVisible(false);
    this.root.add([this.sacPage, this.optionsPage]);
    this.buildSac();
    this.buildOptions();

    this.message = scene.add.text(PANEL_W / 2, PANEL_H - 12, '', { ...FONT, color: '#3d6b2f' }).setOrigin(0.5);
    this.root.add(this.message);
  }

  // ---------- Construction ----------

  private makeTab(x: number, y: number, label: string, onClick: () => void): Phaser.GameObjects.Rectangle {
    const r = this.scene.add.rectangle(x, y, 56, 16, 0xd9c49a, 1).setOrigin(0, 0).setStrokeStyle(1, 0x6b4a2b).setInteractive();
    const t = this.scene.add.text(x + 28, y + 8, label, FONT).setOrigin(0.5);
    r.on('pointerdown', onClick);
    this.root.add([r, t]);
    return r;
  }

  private makeButton(x: number, y: number, w: number, h: number, label: string, onClick: () => void, into?: Phaser.GameObjects.Container): Phaser.GameObjects.Text {
    const r = this.scene.add.rectangle(x, y, w, h, 0xd9c49a, 1).setOrigin(0, 0).setStrokeStyle(1, 0x6b4a2b).setInteractive();
    const t = this.scene.add.text(x + w / 2, y + h / 2, label, FONT).setOrigin(0.5);
    r.on('pointerdown', onClick);
    r.on('pointerover', () => r.setFillStyle(0xe8d6ad));
    r.on('pointerout', () => r.setFillStyle(0xd9c49a));
    (into ?? this.root).add([r, t]);
    return t;
  }

  private buildSac(): void {
    const gridX = (PANEL_W - COLS * CELL) / 2;
    const gridY = 30;
    for (let i = 0; i < INVENTORY_SIZE; i++) {
      const cx = gridX + (i % COLS) * CELL;
      const cy = gridY + Math.floor(i / COLS) * CELL;
      const bg = this.scene.add.rectangle(cx, cy, CELL - 2, CELL - 2, 0xe6d3ae, 1).setOrigin(0, 0).setStrokeStyle(1, 0x9c7b52).setInteractive();
      const icon = this.scene.add.image(cx + (CELL - 2) / 2, cy + (CELL - 2) / 2, 'plants', 0).setVisible(false);
      const qty = this.scene.add.text(cx + CELL - 4, cy + CELL - 4, '', { ...FONT_SMALL, fontStyle: 'bold' }).setOrigin(1, 1);
      // Toucher une case affiche le nom de l'objet sous la grille.
      bg.on('pointerdown', () => {
        const slot = gameState.inventory.slots[i];
        this.selectedLabel.setText(slot ? `${ITEMS[slot.item].nom} ×${slot.qty}` : '');
      });
      this.sacPage.add([bg, icon, qty]);
      this.cells.push({ icon, qty });
    }
    this.selectedLabel = this.scene.add.text(PANEL_W / 2, gridY + Math.ceil(INVENTORY_SIZE / COLS) * CELL + 6, '', FONT).setOrigin(0.5, 0);
    this.sacPage.add(this.selectedLabel);
  }

  private buildOptions(): void {
    const p = this.optionsPage;
    let y = 36;
    this.makeButton(30, y, 240, 22, 'Sauvegarder maintenant', () => {
      this.flash(SaveSystem.save() ? 'Partie sauvegardée' : 'Sauvegarde impossible sur ce navigateur');
    }, p);
    y += 32;
    this.autosaveLabel = this.makeButton(30, y, 240, 22, '', () => {
      gameState.settings.autosave = !gameState.settings.autosave;
      this.refreshOptions();
      SaveSystem.save(); // le réglage lui-même est mémorisé
    }, p);
    y += 32;
    this.resetLabel = this.makeButton(30, y, 240, 22, 'Nouvelle partie', () => {
      if (!this.confirmReset) {
        this.confirmReset = true;
        this.resetLabel.setText('Tout effacer ? Appuie encore pour confirmer');
        return;
      }
      this.confirmReset = false;
      this.resetLabel.setText('Nouvelle partie');
      this.close();
      this.onReset();
    }, p);
    y += 32;
    const note = this.scene.add.text(PANEL_W / 2, y + 4,
      'La sauvegarde est gardée dans ce navigateur, sur cet appareil.', { ...FONT_SMALL, color: '#6b5a48' }).setOrigin(0.5, 0);
    p.add(note);
  }

  // ---------- Affichage ----------

  private showTab(tab: Tab): void {
    this.sacPage.setVisible(tab === 'sac');
    this.optionsPage.setVisible(tab === 'options');
    this.tabSac.setFillStyle(tab === 'sac' ? 0xf3e4c4 : 0xd9c49a);
    this.tabOptions.setFillStyle(tab === 'options' ? 0xf3e4c4 : 0xd9c49a);
    this.confirmReset = false;
    this.resetLabel?.setText('Nouvelle partie');
    if (tab === 'sac') this.refreshSac();
    else this.refreshOptions();
  }

  refreshSac(): void {
    gameState.inventory.slots.forEach((slot, i) => {
      const c = this.cells[i];
      if (!slot) {
        c.icon.setVisible(false); c.qty.setText('');
        return;
      }
      const def = ITEMS[slot.item];
      c.icon.setTexture(def.icon.texture, def.icon.frame).setVisible(true);
      c.qty.setText(String(slot.qty));
    });
    this.selectedLabel.setText('Touche une case pour voir le nom');
  }

  private refreshOptions(): void {
    this.autosaveLabel.setText(`Sauvegarde automatique : ${gameState.settings.autosave ? 'activée' : 'désactivée'}`);
  }

  private flash(text: string): void {
    this.message.setText(text).setAlpha(1);
    this.scene.tweens.add({ targets: this.message, alpha: 0, delay: 1200, duration: 400 });
  }

  // ---------- Ouverture / fermeture ----------

  get isOpen(): boolean { return this.root.visible; }

  open(): void {
    this.root.setVisible(true);
    uiState.panelOpen = true;
    this.showTab('sac');
  }

  close(): void {
    this.root.setVisible(false);
    uiState.panelOpen = false;
    this.confirmReset = false;
  }

  toggle(): void {
    if (this.isOpen) this.close(); else this.open();
  }
}
