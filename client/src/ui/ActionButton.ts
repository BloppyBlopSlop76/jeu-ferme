// Bouton d'action tactile : un rond en bas à droite. Fixé à l'écran, au-dessus de tout.
// Il mémorise une pression jusqu'à ce que le jeu la consomme (une pression = une action).

import Phaser from 'phaser';

export class ActionButton {
  private pressed = false;
  private circle: Phaser.GameObjects.Arc;
  private label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, radius = 26) {
    this.circle = scene.add.circle(x, y, radius, 0xffffff, 0.35)
      .setStrokeStyle(2, 0xffffff, 0.8)
      .setScrollFactor(0)
      .setDepth(1000)
      .setInteractive();
    this.label = scene.add.text(x, y, '', { fontFamily: 'sans-serif', fontSize: '10px', color: '#ffffff', align: 'center' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1001);

    this.circle.on('pointerdown', () => {
      this.pressed = true;
      this.circle.setFillStyle(0xffffff, 0.7);
    });
    this.circle.on('pointerup', () => this.circle.setFillStyle(0xffffff, 0.35));
    this.circle.on('pointerout', () => this.circle.setFillStyle(0xffffff, 0.35));
  }

  /** Texte affiché dans le bouton (l'action possible), vide si rien à faire. */
  setLabel(text: string): void {
    this.label.setText(text);
    this.circle.setAlpha(text ? 1 : 0.5);
  }

  /** Vrai une seule fois par pression. */
  consume(): boolean {
    const p = this.pressed;
    this.pressed = false;
    return p;
  }
}
