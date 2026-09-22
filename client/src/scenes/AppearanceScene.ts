// Écran « Ton apparence » (phase 8) : aperçu animé du personnage et flèches ‹ › pour la peau, le visage,
// la couleur des yeux, la coiffure, la couleur des cheveux et le t-shirt. S'affiche après le prénom et le
// trait à la création, une fois pour les parties existantes (converties), et depuis Options → « Apparence ».

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/constants';
import { gameState } from '../state/GameState';
import { SaveSystem } from '../systems/SaveSystem';
import { Player } from '../entities/Player';
import { DEFAULT_APPEARANCE, EYE_COLORS, FACES, HAIR_COLORS, HAIR_STYLES, SHIRTS, SKINS, type Appearance, type Choice, type Swatch } from '../data/appearance';

const FONT = { fontFamily: 'sans-serif', fontSize: '10px', color: '#2b2118' } as const;
const FONT_SMALL = { fontFamily: 'sans-serif', fontSize: '9px', color: '#4a3a2a' } as const;
const DIRS = ['down', 'right', 'up', 'left'] as const;

interface Row { key: keyof Appearance; label: string; options: (Choice | Swatch)[] }

const ROWS: Row[] = [
  { key: 'skin', label: 'Peau', options: SKINS },
  { key: 'face', label: 'Visage', options: FACES },
  { key: 'eyes', label: 'Yeux', options: EYE_COLORS },
  { key: 'hairStyle', label: 'Coiffure', options: HAIR_STYLES },
  { key: 'hairColor', label: 'Cheveux', options: HAIR_COLORS },
  { key: 'shirt', label: 'T-shirt', options: SHIRTS },
];

export class AppearanceScene extends Phaser.Scene {
  private look!: Appearance;
  private preview!: Player;
  private dirIndex = 0;
  private values: Record<string, { text: Phaser.GameObjects.Text; swatch: Phaser.GameObjects.Rectangle }> = {};

  constructor() {
    super('Appearance');
  }

  create(): void {
    this.look = { ...(gameState.character.appearance ?? DEFAULT_APPEARANCE) };
    this.dirIndex = 0;
    this.values = {};
    this.cameras.main.setBackgroundColor(0x2f4f2f);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH - 24, GAME_HEIGHT - 16, 0xf3e4c4, 1).setStrokeStyle(2, 0x6b4a2b);
    this.add.text(GAME_WIDTH / 2, 16, 'Ton apparence', { ...FONT, fontSize: '14px', fontStyle: 'bold' }).setOrigin(0.5, 0);
    const name = gameState.character.name || 'Toi';
    this.add.text(GAME_WIDTH / 2, 32, `À quoi ressemble ${name} ? Tu pourras changer plus tard dans Options.`, FONT_SMALL).setOrigin(0.5, 0);

    // Aperçu : le vrai personnage (mêmes couches que dans le jeu), agrandi ×3, qui marche sur place.
    const px = 110, py = 190;
    this.add.rectangle(px, py - 60, 120, 140, 0xcfe3b0, 1).setStrokeStyle(1, 0x9c7b52);
    this.add.ellipse(px, py + 2, 60, 16, 0x000000, 0.12);
    this.preview = new Player(this, px, py, 'down', this.look);
    (this.preview.sprite.body as Phaser.Physics.Arcade.Body).setEnable(false);
    this.preview.sprite.setScale(3);
    this.preview.walkInPlace(true);
    // Tourner l'aperçu.
    this.makeButton(px - 52, py + 22, 24, 18, '‹', () => this.turn(-1));
    this.makeButton(px + 28, py + 22, 24, 18, '›', () => this.turn(1));
    this.add.text(px, py + 31, 'tourner', FONT_SMALL).setOrigin(0.5);

    // Lignes de choix.
    let y = 56;
    for (const row of ROWS) {
      this.add.text(196, y, row.label, { ...FONT, fontStyle: 'bold' }).setOrigin(0, 0.5);
      this.makeButton(250, y - 9, 22, 18, '‹', () => this.cycle(row, -1));
      const swatch = this.add.rectangle(286, y, 12, 12, 0xffffff, 1).setStrokeStyle(1, 0x6b4a2b).setOrigin(0, 0.5);
      const text = this.add.text(304, y, '', FONT).setOrigin(0, 0.5);
      this.makeButton(430, y - 9, 22, 18, '›', () => this.cycle(row, 1));
      this.values[row.key] = { text, swatch };
      y += 28;
    }
    this.refreshLabels();

    // Valider.
    const bx = 330, by = GAME_HEIGHT - 36;
    const btn = this.add.rectangle(bx, by, 150, 24, 0xd9c49a, 1).setStrokeStyle(1, 0x6b4a2b).setInteractive();
    this.add.text(bx, by, 'C\'est moi !', { ...FONT, fontStyle: 'bold' }).setOrigin(0.5);
    btn.on('pointerdown', () => this.confirm());
    btn.on('pointerover', () => btn.setFillStyle(0xe8d6ad));
    btn.on('pointerout', () => btn.setFillStyle(0xd9c49a));
  }

  private makeButton(x: number, y: number, w: number, h: number, label: string, onClick: () => void): void {
    const r = this.add.rectangle(x, y, w, h, 0xd9c49a, 1).setOrigin(0, 0).setStrokeStyle(1, 0x6b4a2b).setInteractive();
    this.add.text(x + w / 2, y + h / 2, label, { ...FONT, fontSize: '12px' }).setOrigin(0.5);
    r.on('pointerdown', onClick);
    r.on('pointerover', () => r.setFillStyle(0xe8d6ad));
    r.on('pointerout', () => r.setFillStyle(0xd9c49a));
  }

  private cycle(row: Row, delta: number): void {
    const ids = row.options.map((o) => o.id);
    const i = Math.max(0, ids.indexOf(this.look[row.key]));
    this.look[row.key] = ids[(i + delta + ids.length) % ids.length];
    this.preview.setAppearance(this.look);
    this.preview.walkInPlace(true);
    this.refreshLabels();
  }

  private turn(delta: number): void {
    this.dirIndex = (this.dirIndex + delta + DIRS.length) % DIRS.length;
    this.preview.face(DIRS[this.dirIndex]);
    this.preview.walkInPlace(true);
  }

  private refreshLabels(): void {
    for (const row of ROWS) {
      const opt = row.options.find((o) => o.id === this.look[row.key]) ?? row.options[0];
      const v = this.values[row.key];
      v.text.setText(opt.nom);
      const hex = (opt as Swatch).hex;
      v.swatch.setVisible(!!hex);
      if (hex) v.swatch.setFillStyle(Number.parseInt(hex.slice(1), 16));
      v.text.setX(hex ? 304 : 286);
    }
  }

  update(): void {
    this.preview.sync(); // les couches suivent l'image d'animation de la base
  }

  private confirm(): void {
    gameState.character.appearance = { ...this.look };
    SaveSystem.save();
    this.scene.start(gameState.location === 'house' ? 'House' : gameState.location === 'village' ? 'Village' : 'World');
  }
}
