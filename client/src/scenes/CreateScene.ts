// Écran de création du personnage : prénom + un trait de caractère (phase 8).
// S'affiche quand le trait n'est pas encore choisi : nouvelle partie, ou partie existante convertie
// (on garde tout, on demande juste le trait). En phase 10 (comptes), cet écran restera le même :
// seul l'endroit où le personnage est enregistré changera.

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/constants';
import { TRAITS, TRAIT_ORDER } from '../data/traits';
import { SKILLS } from '../data/skills';
import { gameState } from '../state/GameState';
import { SaveSystem } from '../systems/SaveSystem';

const FONT = { fontFamily: 'sans-serif', fontSize: '10px', color: '#2b2118' } as const;
const FONT_SMALL = { fontFamily: 'sans-serif', fontSize: '9px', color: '#4a3a2a' } as const;
const CARD_W = 108, CARD_H = 92, CARD_GAP = 6;
const DEFAULT_NAME = 'Fermier';

export class CreateScene extends Phaser.Scene {
  private selected: string | null = null;
  private cards: Record<string, Phaser.GameObjects.Rectangle> = {};
  private startButton!: Phaser.GameObjects.Rectangle;
  private startLabel!: Phaser.GameObjects.Text;
  private nameInput!: HTMLInputElement;

  constructor() {
    super('Create');
  }

  create(): void {
    this.selected = null;
    this.cards = {};
    this.cameras.main.setBackgroundColor(0x2f4f2f);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH - 24, GAME_HEIGHT - 16, 0xf3e4c4, 1).setStrokeStyle(2, 0x6b4a2b);

    const returning = gameState.time.day > 1 || Object.keys(gameState.farm).length > 0;
    this.add.text(GAME_WIDTH / 2, 16, 'Ton personnage', { ...FONT, fontSize: '14px', fontStyle: 'bold' }).setOrigin(0.5, 0);
    if (returning) {
      this.add.text(GAME_WIDTH / 2, 32, 'Ta partie est gardée : choisis juste ton prénom et ton trait.', FONT_SMALL).setOrigin(0.5, 0);
    }

    // Prénom : un vrai champ de saisie (clavier de l'ordinateur ou du téléphone).
    this.add.text(GAME_WIDTH / 2 - 100, 52, 'Prénom :', FONT).setOrigin(0, 0.5);
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 14;
    input.placeholder = DEFAULT_NAME;
    input.value = gameState.character.name;
    input.autocomplete = 'off';
    input.style.cssText = 'width:150px;height:18px;font:11px sans-serif;padding:0 6px;border:1px solid #6b4a2b;border-radius:3px;background:#fffaf0;color:#2b2118;outline:none;';
    this.nameInput = input;
    this.add.dom(GAME_WIDTH / 2 + 30, 52, input);

    // Trait : quatre cartes, deux par activité.
    this.add.text(GAME_WIDTH / 2, 74, 'Ton trait de caractère (un seul, pour toute la partie) :', FONT).setOrigin(0.5, 0);
    const totalW = TRAIT_ORDER.length * CARD_W + (TRAIT_ORDER.length - 1) * CARD_GAP;
    let x = (GAME_WIDTH - totalW) / 2;
    const y = 90;
    for (const id of TRAIT_ORDER) {
      const trait = TRAITS[id];
      const card = this.add.rectangle(x, y, CARD_W, CARD_H, 0xe6d3ae, 1).setOrigin(0, 0).setStrokeStyle(1, 0x9c7b52).setInteractive();
      const isFarm = trait.skill === 'agriculture';
      this.add.text(x + CARD_W / 2, y + 8, trait.nom, { ...FONT, fontStyle: 'bold' }).setOrigin(0.5, 0);
      this.add.text(x + CARD_W / 2, y + 22, SKILLS[trait.skill].nom, { ...FONT_SMALL, color: isFarm ? '#3d6b2f' : '#2f5f8b', fontStyle: 'bold' }).setOrigin(0.5, 0);
      this.add.text(x + CARD_W / 2, y + 38, trait.texte, { ...FONT_SMALL, align: 'center', wordWrap: { width: CARD_W - 12 } }).setOrigin(0.5, 0);
      card.on('pointerdown', () => this.select(id));
      card.on('pointerover', () => { if (this.selected !== id) card.setFillStyle(0xeddcb8); });
      card.on('pointerout', () => { if (this.selected !== id) card.setFillStyle(0xe6d3ae); });
      this.cards[id] = card;
      x += CARD_W + CARD_GAP;
    }

    // Bouton de départ (inactif tant qu'aucun trait n'est choisi).
    const by = GAME_HEIGHT - 42;
    this.startButton = this.add.rectangle(GAME_WIDTH / 2, by, 190, 24, 0xd9c49a, 1).setStrokeStyle(1, 0x6b4a2b).setInteractive();
    this.startLabel = this.add.text(GAME_WIDTH / 2, by, 'Choisis un trait pour commencer', FONT).setOrigin(0.5);
    this.startButton.on('pointerdown', () => this.confirm());
    this.startButton.setAlpha(0.6);

    // Entrée dans le champ = valider (si un trait est choisi).
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.confirm(); });
    this.events.once('shutdown', () => input.remove());
  }

  private select(id: string): void {
    this.selected = id;
    for (const [tid, card] of Object.entries(this.cards)) {
      const on = tid === id;
      card.setFillStyle(on ? 0xfff2a0 : 0xe6d3ae).setStrokeStyle(on ? 2 : 1, on ? 0x6b4a2b : 0x9c7b52);
    }
    this.startButton.setAlpha(1);
    this.startLabel.setText(returningLabel());
  }

  private confirm(): void {
    if (!this.selected) return;
    const name = this.nameInput.value.trim().slice(0, 14) || DEFAULT_NAME;
    gameState.character = { name, trait: this.selected };
    SaveSystem.save();
    this.nameInput.blur();
    this.scene.start(gameState.location === 'house' ? 'House' : 'World');
  }
}

function returningLabel(): string {
  return gameState.time.day > 1 || Object.keys(gameState.farm).length > 0 ? 'Reprendre la partie' : 'Commencer l\'aventure';
}
