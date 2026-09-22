// Panneau « Sac / Talents / Collection / Options / Commandes » : inventaire, compétences, musée, réglages, raccourcis.
// Vit dans la scène UI (caméra fixe), au-dessus du jeu.

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/constants';
import { ITEMS } from '../data/items';
import { gameState, INVENTORY_SIZE } from '../state/GameState';
import { SaveSystem } from '../systems/SaveSystem';
import { Skills } from '../systems/SkillSystem';
import { SKILLS, MAX_LEVEL, type SkillId } from '../data/skills';
import { COLLECTIBLES } from '../data/collection';
import { Museum } from '../systems/MuseumSystem';
import { uiState } from './uiState';

const PANEL_W = 300;
const PANEL_H = 200;
const COLS = 5;
const CELL = 34;
const FONT = { fontFamily: 'sans-serif', fontSize: '10px', color: '#2b2118' } as const;
const FONT_SMALL = { fontFamily: 'sans-serif', fontSize: '9px', color: '#2b2118' } as const;

type Tab = 'sac' | 'talents' | 'collection' | 'options' | 'commandes';

export class InventoryPanel {
  private root: Phaser.GameObjects.Container;
  private sacPage: Phaser.GameObjects.Container;
  private optionsPage: Phaser.GameObjects.Container;
  private tabSac!: Phaser.GameObjects.Rectangle;
  private tabOptions!: Phaser.GameObjects.Rectangle;
  private tabCommandes!: Phaser.GameObjects.Rectangle;
  private commandesPage!: Phaser.GameObjects.Container;
  private tabTalents!: Phaser.GameObjects.Rectangle;
  private talentsPage!: Phaser.GameObjects.Container;
  private tabCollection!: Phaser.GameObjects.Rectangle;
  private collectionPage!: Phaser.GameObjects.Container;
  private collectionCells: { icon: Phaser.GameObjects.Image; name: Phaser.GameObjects.Text }[] = [];
  private collectionCounter!: Phaser.GameObjects.Text;
  private collectionNext!: Phaser.GameObjects.Text;
  private collectionLabel!: Phaser.GameObjects.Text;
  private traitLabel!: Phaser.GameObjects.Text;
  private talentRows: Record<string, { level: Phaser.GameObjects.Text; bar: Phaser.GameObjects.Rectangle; xp: Phaser.GameObjects.Text; next: Phaser.GameObjects.Text }> = {};
  private cells: { icon: Phaser.GameObjects.Image; qty: Phaser.GameObjects.Text }[] = [];
  private selectedLabel!: Phaser.GameObjects.Text;
  private autosaveLabel!: Phaser.GameObjects.Text;
  private message!: Phaser.GameObjects.Text;
  private confirmReset = false;
  private resetLabel!: Phaser.GameObjects.Text;
  private bedButton: Phaser.GameObjects.GameObject[] = [];

  constructor(private scene: Phaser.Scene, private onReset: () => void, private onAppearance: () => void) {
    const x = (GAME_WIDTH - PANEL_W) / 2;
    const y = (GAME_HEIGHT - PANEL_H) / 2;
    this.root = scene.add.container(x, y).setDepth(20000).setVisible(false);

    // Fond sombre qui bloque les clics vers le jeu, puis le cadre.
    const shade = scene.add.rectangle(-x, -y, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.45).setOrigin(0, 0).setInteractive();
    const frame = scene.add.rectangle(0, 0, PANEL_W, PANEL_H, 0xf3e4c4, 1).setOrigin(0, 0).setStrokeStyle(2, 0x6b4a2b);
    this.root.add([shade, frame]);

    // Onglets.
    this.tabSac = this.makeTab(8, -12, 40, 'Sac', () => this.showTab('sac'));
    this.tabTalents = this.makeTab(50, -12, 50, 'Talents', () => this.showTab('talents'));
    this.tabCollection = this.makeTab(102, -12, 62, 'Collection', () => this.showTab('collection'));
    this.tabOptions = this.makeTab(166, -12, 50, 'Options', () => this.showTab('options'));
    this.tabCommandes = this.makeTab(218, -12, 68, 'Commandes', () => this.showTab('commandes'));
    // Bouton fermer.
    this.makeButton(PANEL_W - 30, 6, 24, 16, '✕', () => this.close());

    this.sacPage = scene.add.container(0, 0);
    this.optionsPage = scene.add.container(0, 0).setVisible(false);
    this.commandesPage = scene.add.container(0, 0).setVisible(false);
    this.talentsPage = scene.add.container(0, 0).setVisible(false);
    this.collectionPage = scene.add.container(0, 0).setVisible(false);
    this.root.add([this.sacPage, this.optionsPage, this.commandesPage, this.talentsPage, this.collectionPage]);
    this.buildSac();
    this.buildTalents();
    this.buildCollection();
    this.buildOptions();
    this.buildCommandes();

    this.message = scene.add.text(PANEL_W / 2, PANEL_H - 12, '', { ...FONT, color: '#3d6b2f' }).setOrigin(0.5);
    this.root.add(this.message);
  }

  // ---------- Construction ----------

  private makeTab(x: number, y: number, w: number, label: string, onClick: () => void): Phaser.GameObjects.Rectangle {
    const r = this.scene.add.rectangle(x, y, w, 16, 0xd9c49a, 1).setOrigin(0, 0).setStrokeStyle(1, 0x6b4a2b).setInteractive();
    const t = this.scene.add.text(x + w / 2, y + 8, label, FONT).setOrigin(0.5);
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
        if (!slot) { this.selectedLabel.setText(''); return; }
        const def = ITEMS[slot.item];
        // Toucher une graine la choisit pour planter (phase 9).
        if (def.kind === 'seed') {
          gameState.selectedSeed = slot.item;
          this.selectedLabel.setText(`${def.nom} ×${slot.qty} — graine choisie pour planter`);
          this.scene.game.events.emit('trade');
        } else {
          this.selectedLabel.setText(`${def.nom} ×${slot.qty}`);
        }
      });
      this.sacPage.add([bg, icon, qty]);
      this.cells.push({ icon, qty });
    }
    this.selectedLabel = this.scene.add.text(PANEL_W / 2, gridY + Math.ceil(INVENTORY_SIZE / COLS) * CELL + 6, '', FONT).setOrigin(0.5, 0);
    this.sacPage.add(this.selectedLabel);
    // Dans la maison, quand le lit est posé : le ranger dans le sac (inspiration Animal Crossing).
    const bx = 8, by = 6; // à gauche du titre, loin du bouton ✕
    const r = this.scene.add.rectangle(bx, by, 88, 16, 0xd9c49a, 1).setOrigin(0, 0).setStrokeStyle(1, 0x6b4a2b).setInteractive();
    const t = this.scene.add.text(bx + 44, by + 8, 'Ranger le lit', FONT_SMALL).setOrigin(0.5);
    r.on('pointerdown', () => { this.close(); this.scene.game.events.emit('pickup-bed'); });
    this.sacPage.add([r, t]);
    this.bedButton = [r, t];
  }

  private buildTalents(): void {
    const p = this.talentsPage;
    this.traitLabel = this.scene.add.text(30, 30, '', { ...FONT_SMALL, wordWrap: { width: PANEL_W - 60 } });
    p.add(this.traitLabel);
    let y = 54;
    for (const id of Object.keys(SKILLS) as SkillId[]) {
      const def = SKILLS[id];
      const name = this.scene.add.text(30, y, def.nom, { ...FONT, fontStyle: 'bold' });
      const level = this.scene.add.text(PANEL_W - 30, y, '', FONT).setOrigin(1, 0);
      // Barre de progression vers le niveau suivant.
      const barBg = this.scene.add.rectangle(30, y + 16, PANEL_W - 60, 6, 0xc9b68f, 1).setOrigin(0, 0).setStrokeStyle(1, 0x9c7b52);
      const bar = this.scene.add.rectangle(31, y + 17, 0, 4, 0x6fae4a, 1).setOrigin(0, 0);
      const xp = this.scene.add.text(PANEL_W - 30, y + 25, '', { ...FONT_SMALL, color: '#6b5a48' }).setOrigin(1, 0);
      const next = this.scene.add.text(30, y + 25, '', { ...FONT_SMALL, color: '#6b5a48' });
      p.add([name, level, barBg, bar, xp, next]);
      this.talentRows[id] = { level, bar, xp, next };
      y += 50;
    }
    const note = this.scene.add.text(PANEL_W / 2, y - 6,
      'Planter, arroser, récolter et pêcher font progresser tes talents.', { ...FONT_SMALL, color: '#6b5a48' }).setOrigin(0.5, 0);
    p.add(note);
  }

  private refreshTalents(): void {
    const trait = Skills.trait();
    const name = gameState.character.name || 'Toi';
    this.traitLabel.setText(trait ? `${name} — trait : ${trait.nom} (${trait.texte})` : `${name} — aucun trait`);
    for (const id of Object.keys(SKILLS) as SkillId[]) {
      const row = this.talentRows[id];
      const prog = Skills.progress(id);
      row.level.setText(`Niveau ${prog.level}${prog.level >= MAX_LEVEL ? ' (max)' : ''}`);
      const fraction = prog.to === null ? 1 : (prog.xp - prog.from) / (prog.to - prog.from);
      row.bar.width = Math.round((PANEL_W - 62) * Math.min(1, Math.max(0, fraction)));
      const xp = Math.floor(prog.xp);
      row.xp.setText(prog.to === null ? `${xp} XP` : `${xp} / ${prog.to} XP`);
      const nextPerk = Skills.nextPerk(id);
      row.next.setText(nextPerk ? `Niveau ${nextPerk.level} : ${nextPerk.texte}` : 'Tous les bonus sont débloqués');
    }
  }

  private buildCollection(): void {
    const p = this.collectionPage;
    this.collectionCounter = this.scene.add.text(PANEL_W / 2, 30, '', { ...FONT, fontStyle: 'bold' }).setOrigin(0.5, 0);
    p.add(this.collectionCounter);
    // Une vitrine par objet collectionnable : icône ×2 (silhouette sombre tant qu'il manque), nom au toucher.
    const cols = 6, cell = 44;
    const gridX = (PANEL_W - cols * cell) / 2, gridY = 52;
    COLLECTIBLES.forEach((id, i) => {
      const cx = gridX + (i % cols) * cell, cy = gridY + Math.floor(i / cols) * cell;
      const def = ITEMS[id];
      const bg = this.scene.add.rectangle(cx, cy, cell - 4, cell - 4, 0xe6d3ae, 1).setOrigin(0, 0).setStrokeStyle(1, 0x9c7b52).setInteractive();
      const icon = this.scene.add.image(cx + (cell - 4) / 2, cy + (cell - 4) / 2, def.icon.texture, def.icon.frame).setScale(2);
      const name = this.scene.add.text(cx + (cell - 4) / 2, cy + cell - 2, '', { ...FONT_SMALL, color: '#6b5a48' }).setOrigin(0.5, 0);
      bg.on('pointerdown', () => {
        this.collectionLabel.setText(Museum.has(id) ? `${def.nom} — exposé au musée` : `${def.nom} — manque au musée (à donner au conservateur)`);
      });
      p.add([bg, icon, name]);
      this.collectionCells.push({ icon, name });
    });
    this.collectionLabel = this.scene.add.text(PANEL_W / 2, gridY + cell + 12, '', { ...FONT, wordWrap: { width: PANEL_W - 40 } }).setOrigin(0.5, 0);
    this.collectionNext = this.scene.add.text(PANEL_W / 2, PANEL_H - 40, '', { ...FONT_SMALL, color: '#6b5a48', wordWrap: { width: PANEL_W - 40 }, align: 'center' }).setOrigin(0.5, 0);
    p.add([this.collectionLabel, this.collectionNext]);
  }

  private refreshCollection(): void {
    this.collectionCounter.setText(`Musée : ${Museum.count()} / ${Museum.total()} objets exposés`);
    COLLECTIBLES.forEach((id, i) => {
      const c = this.collectionCells[i];
      const found = Museum.has(id);
      if (found) { c.icon.clearTint().setAlpha(1); c.name.setText(ITEMS[id].nom); }
      else { c.icon.setTint(0x5a4636).setTintMode(Phaser.TintModes.FILL).setAlpha(0.55); c.name.setText('?'); }
    });
    this.collectionLabel.setText('Touche une vitrine pour voir le nom');
    const next = Museum.nextReward();
    this.collectionNext.setText(next
      ? `Prochaine récompense : ${next.coins} pièces à ${next.count} objets exposés. Donne tes trouvailles au conservateur, au musée du bourg.`
      : 'Collection complète : toutes les récompenses ont été gagnées !');
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
    this.makeButton(30, y, 240, 22, 'Changer d\'apparence', () => {
      this.close();
      this.onAppearance();
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
    const note = this.scene.add.text(PANEL_W / 2, y + 2,
      'La sauvegarde est gardée dans ce navigateur, sur cet appareil.', { ...FONT_SMALL, color: '#6b5a48' }).setOrigin(0.5, 0);
    p.add(note);
  }

  private buildCommandes(): void {
    const isTouch = this.scene.sys.game.device.input.touch;
    const lines = isTouch
      ? [
          ['Joystick (bas gauche)', 'se déplacer'],
          ['Bouton rond (bas droite)', 'action : planter, arroser, récolter, pêcher, parler, expédier, dormir'],
          ['Barre rapide (haut droite)', 'toucher une graine pour la choisir'],
          ['Bouton Sac (haut droite)', 'ouvrir / fermer ce menu'],
          ['Marcher sur la porte', 'entrer dans la maison'],
          ['Marcher sur le paillasson', 'sortir de la maison'],
        ]
      : [
          ['Flèches ou Z Q S D', 'se déplacer'],
          ['E ou Espace', 'action : planter, arroser, récolter, pêcher, parler, expédier, dormir'],
          ['1 à 5', 'choisir une case de la barre rapide (graine)'],
          ['I', 'ouvrir / fermer ce menu'],
          ['Échap', 'fermer ce menu'],
          ['Marcher sur la porte', 'entrer dans la maison'],
          ['Marcher sur le paillasson', 'sortir de la maison'],
        ];
    let y = 34;
    for (const [key, what] of lines) {
      const k = this.scene.add.text(30, y, key, { ...FONT, fontStyle: 'bold' });
      const w = this.scene.add.text(150, y, what, { ...FONT_SMALL, wordWrap: { width: 130 } });
      this.commandesPage.add([k, w]);
      y += 19;
    }
  }

  // ---------- Affichage ----------

  private showTab(tab: Tab): void {
    this.sacPage.setVisible(tab === 'sac');
    this.talentsPage.setVisible(tab === 'talents');
    this.collectionPage.setVisible(tab === 'collection');
    this.optionsPage.setVisible(tab === 'options');
    this.commandesPage.setVisible(tab === 'commandes');
    this.tabSac.setFillStyle(tab === 'sac' ? 0xf3e4c4 : 0xd9c49a);
    this.tabTalents.setFillStyle(tab === 'talents' ? 0xf3e4c4 : 0xd9c49a);
    this.tabCollection.setFillStyle(tab === 'collection' ? 0xf3e4c4 : 0xd9c49a);
    this.tabOptions.setFillStyle(tab === 'options' ? 0xf3e4c4 : 0xd9c49a);
    this.tabCommandes.setFillStyle(tab === 'commandes' ? 0xf3e4c4 : 0xd9c49a);
    this.confirmReset = false;
    this.resetLabel?.setText('Nouvelle partie');
    if (tab === 'sac') this.refreshSac();
    else if (tab === 'talents') this.refreshTalents();
    else if (tab === 'collection') this.refreshCollection();
    else if (tab === 'options') this.refreshOptions();
  }

  refreshSac(): void {
    const bedPlaced = gameState.location === 'house' && gameState.house.bed !== null;
    this.bedButton.forEach((o) => (o as Phaser.GameObjects.Rectangle).setVisible(bedPlaced));
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
