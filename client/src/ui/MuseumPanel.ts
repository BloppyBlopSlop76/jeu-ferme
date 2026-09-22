// Panneau du musée (phase 9) : le conservateur reçoit un exemplaire de chaque légume ou poisson.
// Liste des objets du sac qu'il accepte, bouton « Donner », compteur et prochain palier de récompense.

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/constants';
import { ITEMS } from '../data/items';
import { Museum } from '../systems/MuseumSystem';
import { SaveSystem } from '../systems/SaveSystem';
import { uiState } from './uiState';

const PANEL_W = 300;
const PANEL_H = 200;
const FONT = { fontFamily: 'sans-serif', fontSize: '10px', color: '#2b2118' } as const;
const FONT_SMALL = { fontFamily: 'sans-serif', fontSize: '9px', color: '#2b2118' } as const;

export class MuseumPanel {
  private root: Phaser.GameObjects.Container;
  private page: Phaser.GameObjects.Container;
  private counter: Phaser.GameObjects.Text;
  private message: Phaser.GameObjects.Text;

  constructor(private scene: Phaser.Scene, private onDonate: () => void) {
    const x = (GAME_WIDTH - PANEL_W) / 2;
    const y = (GAME_HEIGHT - PANEL_H) / 2;
    this.root = scene.add.container(x, y).setDepth(20000).setVisible(false);
    const shade = scene.add.rectangle(-x, -y, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.45).setOrigin(0, 0).setInteractive();
    const frame = scene.add.rectangle(0, 0, PANEL_W, PANEL_H, 0xf3e4c4, 1).setOrigin(0, 0).setStrokeStyle(2, 0x6b4a2b);
    const title = scene.add.text(PANEL_W / 2, 10, 'Le musée', { ...FONT, fontStyle: 'bold' }).setOrigin(0.5, 0);
    this.counter = scene.add.text(10, 10, '', { ...FONT, fontStyle: 'bold', color: '#7a5a10' });
    this.root.add([shade, frame, title, this.counter]);
    this.makeButton(PANEL_W - 30, 6, 24, 16, '✕', () => this.close());
    this.page = scene.add.container(0, 0);
    this.message = scene.add.text(PANEL_W / 2, PANEL_H - 12, '', { ...FONT, color: '#3d6b2f' }).setOrigin(0.5);
    this.root.add([this.page, this.message]);
  }

  private makeButton(x: number, y: number, w: number, h: number, label: string, onClick: () => void, into?: Phaser.GameObjects.Container): void {
    const r = this.scene.add.rectangle(x, y, w, h, 0xd9c49a, 1).setOrigin(0, 0).setStrokeStyle(1, 0x6b4a2b).setInteractive();
    const t = this.scene.add.text(x + w / 2, y + h / 2, label, FONT_SMALL).setOrigin(0.5);
    r.on('pointerdown', onClick);
    r.on('pointerover', () => r.setFillStyle(0xe8d6ad));
    r.on('pointerout', () => r.setFillStyle(0xd9c49a));
    (into ?? this.root).add([r, t]);
  }

  private rebuild(): void {
    this.page.removeAll(true);
    this.counter.setText(`${Museum.count()} / ${Museum.total()}`);
    const rows = Museum.donatable();
    let y = 32;
    if (rows.length === 0) {
      this.page.add(this.scene.add.text(PANEL_W / 2, 70, 'Rien de nouveau à exposer dans ton sac.', { ...FONT, color: '#6b5a48' }).setOrigin(0.5));
    }
    for (const row of rows.slice(0, 5)) {
      const def = ITEMS[row.item];
      const icon = this.scene.add.image(30, y + 9, def.icon.texture, def.icon.frame);
      const name = this.scene.add.text(46, y + 9, `${def.nom} ×${row.qty} — nouveau pour le musée`, FONT).setOrigin(0, 0.5);
      this.page.add([icon, name]);
      this.makeButton(216, y, 54, 18, 'Donner', () => this.donate(row.item), this.page);
      y += 26;
    }
    const next = Museum.nextReward();
    const info = next ? `Prochaine récompense : ${next.coins} pièces à ${next.count} objets exposés.` : 'Toutes les récompenses ont été gagnées.';
    this.page.add(this.scene.add.text(PANEL_W / 2, PANEL_H - 30, info, { ...FONT_SMALL, color: '#6b5a48' }).setOrigin(0.5));
  }

  private donate(id: string): void {
    const res = Museum.donate(id);
    if (!res) { this.flash('Impossible', true); return; }
    if (res.reward) this.flash(`${res.reward.texte} +${res.reward.coins} pièces`);
    else this.flash(`Exposé : ${ITEMS[id].nom}`);
    SaveSystem.autosave();
    this.onDonate();
    this.rebuild();
  }

  private flash(text: string, error = false): void {
    this.message.setText(text).setColor(error ? '#a33b2e' : '#3d6b2f').setAlpha(1);
    this.scene.tweens.add({ targets: this.message, alpha: 0, delay: 2200, duration: 400 });
  }

  get isOpen(): boolean { return this.root.visible; }

  open(): void {
    this.root.setVisible(true);
    uiState.panelOpen = true;
    this.message.setAlpha(0);
    this.rebuild();
  }

  close(): void {
    this.root.setVisible(false);
    uiState.panelOpen = false;
  }
}
