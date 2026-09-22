// Boîte de dialogue (phase 10) : le nom du personnage et une phrase, en bas de l'écran. Toucher n'importe où,
// E ou Espace : phrase suivante, puis fermeture. Le joueur est figé pendant le dialogue (uiState.panelOpen).

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/constants';
import { NPCS } from '../data/npcs';
import { uiState } from './uiState';

const BOX_W = 400;
const BOX_H = 56;

export class DialogueBox {
  private root: Phaser.GameObjects.Container;
  private name: Phaser.GameObjects.Text;
  private text: Phaser.GameObjects.Text;
  private hint: Phaser.GameObjects.Text;
  private lines: string[] = [];
  private index = 0;
  private openedAt = 0;

  constructor(private scene: Phaser.Scene) {
    const x = (GAME_WIDTH - BOX_W) / 2, y = GAME_HEIGHT - BOX_H - 10;
    this.root = scene.add.container(x, y).setDepth(21000).setVisible(false);
    // Voile qui capte les touchers sur tout l'écran.
    const shade = scene.add.rectangle(-x, -y, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.001).setOrigin(0, 0).setInteractive();
    shade.on('pointerdown', () => this.next());
    const frame = scene.add.rectangle(0, 0, BOX_W, BOX_H, 0xf3e4c4, 0.97).setOrigin(0, 0).setStrokeStyle(2, 0x6b4a2b);
    this.name = scene.add.text(10, 6, '', { fontFamily: 'sans-serif', fontSize: '10px', color: '#7a5a10', fontStyle: 'bold' });
    this.text = scene.add.text(10, 20, '', { fontFamily: 'sans-serif', fontSize: '10px', color: '#2b2118', wordWrap: { width: BOX_W - 20 } });
    this.hint = scene.add.text(BOX_W - 8, BOX_H - 4, '▼', { fontFamily: 'sans-serif', fontSize: '9px', color: '#6b4a2b' }).setOrigin(1, 1);
    this.root.add([shade, frame, this.name, this.text, this.hint]);
    scene.tweens.add({ targets: this.hint, y: BOX_H - 6, yoyo: true, repeat: -1, duration: 500 });
    scene.input.keyboard?.on('keydown-E', () => this.next());
    scene.input.keyboard?.on('keydown-SPACE', () => this.next());
    scene.input.keyboard?.on('keydown-ESC', () => { if (this.isOpen) this.close(); });
  }

  get isOpen(): boolean { return this.root.visible; }

  /** Ouvre le dialogue d'un PNJ (par identifiant) ou des phrases libres. */
  open(npcId: string, lines?: string[]): void {
    const def = NPCS[npcId];
    this.lines = lines ?? def?.lines ?? [];
    if (this.lines.length === 0) return;
    this.name.setText(def?.nom ?? '');
    this.index = 0;
    this.openedAt = this.scene.time.now;
    this.text.setText(this.lines[0]);
    this.root.setVisible(true);
    uiState.panelOpen = true;
  }

  private next(): void {
    if (!this.isOpen) return;
    if (this.scene.time.now - this.openedAt < 250) return; // l'appui qui a ouvert le dialogue ne le fait pas avancer
    this.index += 1;
    if (this.index >= this.lines.length) { this.close(); return; }
    this.text.setText(this.lines[this.index]);
    this.hint.setText(this.index === this.lines.length - 1 ? '✕' : '▼');
  }

  close(): void {
    this.root.setVisible(false);
    this.hint.setText('▼');
    // Le joueur est libéré à l'image suivante : l'appui qui ferme le dialogue est d'abord consommé par la scène de jeu.
    this.scene.time.delayedCall(60, () => { if (!this.isOpen) uiState.panelOpen = false; });
  }
}
