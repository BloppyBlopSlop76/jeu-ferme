// Petite horloge « mignonne et discrète » (demande d'Anthony) + barre d'énergie, en haut à gauche.
// Un soleil le jour, une lune la nuit, le jour et l'heure arrondie aux 10 minutes.

import Phaser from 'phaser';
import { gameState, ENERGY_MAX } from '../state/GameState';
import { TimeSystem } from '../systems/TimeSystem';

export class ClockWidget {
  private icon: Phaser.GameObjects.Graphics;
  private text: Phaser.GameObjects.Text;
  private energyBar: Phaser.GameObjects.Graphics;
  private lastLabel = '';
  private lastNight: boolean | null = null;
  private lastEnergy = -1;

  constructor(scene: Phaser.Scene, x = 6, y = 6) {
    const bg = scene.add.graphics().setDepth(15000);
    bg.fillStyle(0x2b2118, 0.55).fillRoundedRect(x, y, 78, 24, 6);

    this.icon = scene.add.graphics().setDepth(15001);
    this.icon.setPosition(x + 13, y + 12);

    this.text = scene.add.text(x + 26, y + 5, '', {
      fontFamily: 'sans-serif', fontSize: '9px', color: '#fff4d6',
    }).setDepth(15001);

    // Barre d'énergie sous l'horloge : fond sombre + remplissage coloré.
    this.energyBar = scene.add.graphics().setDepth(15001);
    this.energyBar.setPosition(x, y + 27);

    this.refresh(true);
  }

  refresh(force = false): void {
    const label = `J${gameState.time.day}  ${TimeSystem.label()}`;
    if (force || label !== this.lastLabel) {
      this.text.setText(label);
      this.lastLabel = label;
    }
    const night = TimeSystem.isNight();
    if (force || night !== this.lastNight) {
      this.drawIcon(night);
      this.lastNight = night;
    }
    const e = Math.round(gameState.energy);
    if (force || e !== this.lastEnergy) {
      this.drawEnergy(e);
      this.lastEnergy = e;
    }
  }

  private drawIcon(night: boolean): void {
    const g = this.icon;
    g.clear();
    if (night) {
      // Croissant de lune : un disque clair, un disque sombre décalé par-dessus.
      g.fillStyle(0xfff1b0, 1).fillCircle(0, 0, 6);
      g.fillStyle(0x2b2118, 1).fillCircle(2.5, -1.5, 5);
    } else {
      g.fillStyle(0xffd23f, 1).fillCircle(0, 0, 5);
      g.lineStyle(1, 0xffd23f, 0.9);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        g.lineBetween(Math.cos(a) * 6.5, Math.sin(a) * 6.5, Math.cos(a) * 8.5, Math.sin(a) * 8.5);
      }
    }
  }

  private drawEnergy(energy: number): void {
    const g = this.energyBar;
    const w = 78, h = 6;
    const ratio = energy / ENERGY_MAX;
    const color = ratio > 0.5 ? 0x7ccf6a : ratio > 0.2 ? 0xf2b04e : 0xe0563f;
    g.clear();
    g.fillStyle(0x2b2118, 0.55).fillRoundedRect(0, 0, w, h, 3);
    if (ratio > 0) g.fillStyle(color, 1).fillRoundedRect(1, 1, Math.max(3, (w - 2) * ratio), h - 2, 2);
  }
}
