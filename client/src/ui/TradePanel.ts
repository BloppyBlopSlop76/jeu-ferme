// Panneau d'échange (phase 9) : la boutique du marchand (Acheter / Vendre, argent immédiat) et la boîte
// d'expédition (Expédier : payé le lendemain matin). Vit dans la scène UI, au-dessus du jeu.

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/constants';
import { ITEMS } from '../data/items';
import { SHOP_STOCK, buyPrice } from '../data/economy';
import { gameState } from '../state/GameState';
import { Economy, type TradeError } from '../systems/EconomySystem';
import { Inventory } from '../systems/InventorySystem';
import { SaveSystem } from '../systems/SaveSystem';
import { uiState } from './uiState';

const PANEL_W = 300;
const PANEL_H = 200;
const FONT = { fontFamily: 'sans-serif', fontSize: '10px', color: '#2b2118' } as const;
const FONT_SMALL = { fontFamily: 'sans-serif', fontSize: '9px', color: '#2b2118' } as const;

type Mode = 'shop' | 'shipping';
type Tab = 'buy' | 'sell';

const ERRORS: Record<TradeError, string> = {
  pas_assez_argent: 'Pas assez de pièces',
  sac_plein: 'Sac plein',
  pas_en_stock: 'Plus en stock',
  invendable: 'Ça ne se vend pas',
  inachetable: 'Ça ne s\'achète pas',
};

export class TradePanel {
  private root: Phaser.GameObjects.Container;
  private page: Phaser.GameObjects.Container;
  private title!: Phaser.GameObjects.Text;
  private money!: Phaser.GameObjects.Text;
  private message!: Phaser.GameObjects.Text;
  private tabBuy!: Phaser.GameObjects.Rectangle;
  private tabSell!: Phaser.GameObjects.Rectangle;
  private tabTexts: Phaser.GameObjects.Text[] = [];
  private mode: Mode = 'shop';
  private tab: Tab = 'buy';

  constructor(private scene: Phaser.Scene, private onTrade: () => void) {
    const x = (GAME_WIDTH - PANEL_W) / 2;
    const y = (GAME_HEIGHT - PANEL_H) / 2;
    this.root = scene.add.container(x, y).setDepth(20000).setVisible(false);
    const shade = scene.add.rectangle(-x, -y, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.45).setOrigin(0, 0).setInteractive();
    const frame = scene.add.rectangle(0, 0, PANEL_W, PANEL_H, 0xf3e4c4, 1).setOrigin(0, 0).setStrokeStyle(2, 0x6b4a2b);
    this.root.add([shade, frame]);

    this.tabBuy = this.makeTab(8, -12, 'Acheter', () => this.showTab('buy'));
    this.tabSell = this.makeTab(70, -12, 'Vendre', () => this.showTab('sell'));
    this.title = scene.add.text(PANEL_W / 2, 10, '', { ...FONT, fontStyle: 'bold' }).setOrigin(0.5, 0);
    this.money = scene.add.text(PANEL_W - 62, 10, '', { ...FONT, fontStyle: 'bold', color: '#7a5a10' }).setOrigin(1, 0);
    this.root.add([this.title, this.money, scene.add.image(PANEL_W - 52, 15, 'coin').setScale(0.75)]);
    this.makeButton(PANEL_W - 30, 6, 24, 16, '✕', () => this.close());

    this.page = scene.add.container(0, 0);
    this.root.add(this.page);
    this.message = scene.add.text(PANEL_W / 2, PANEL_H - 12, '', { ...FONT, color: '#3d6b2f' }).setOrigin(0.5);
    this.root.add(this.message);
  }

  // ---------- Construction ----------

  private makeTab(x: number, y: number, label: string, onClick: () => void): Phaser.GameObjects.Rectangle {
    const w = 56;
    const r = this.scene.add.rectangle(x, y, w, 16, 0xd9c49a, 1).setOrigin(0, 0).setStrokeStyle(1, 0x6b4a2b).setInteractive();
    const t = this.scene.add.text(x + w / 2, y + 8, label, FONT).setOrigin(0.5);
    r.on('pointerdown', onClick);
    this.root.add([r, t]);
    this.tabTexts.push(t);
    return r;
  }

  private makeButton(x: number, y: number, w: number, h: number, label: string, onClick: () => void, into?: Phaser.GameObjects.Container, enabled = true): void {
    const r = this.scene.add.rectangle(x, y, w, h, 0xd9c49a, 1).setOrigin(0, 0).setStrokeStyle(1, 0x6b4a2b);
    const t = this.scene.add.text(x + w / 2, y + h / 2, label, FONT_SMALL).setOrigin(0.5);
    if (enabled) {
      r.setInteractive();
      r.on('pointerdown', onClick);
      r.on('pointerover', () => r.setFillStyle(0xe8d6ad));
      r.on('pointerout', () => r.setFillStyle(0xd9c49a));
    } else {
      r.setAlpha(0.5); t.setAlpha(0.5);
    }
    (into ?? this.root).add([r, t]);
  }

  private rebuild(): void {
    this.page.removeAll(true);
    this.money.setText(String(gameState.money));
    let y = 32;
    if (this.mode === 'shop' && this.tab === 'buy') {
      for (const id of SHOP_STOCK) {
        const def = ITEMS[id];
        const price = buyPrice(id) ?? 0;
        const icon = this.scene.add.image(30, y + 9, def.icon.texture, def.icon.frame);
        const name = this.scene.add.text(46, y + 9, `${def.nom} — ${price} p.`, FONT).setOrigin(0, 0.5);
        this.page.add([icon, name]);
        const can = gameState.money >= price && Inventory.canAdd(id, 1);
        this.makeButton(196, y, 34, 18, '×1', () => this.buy(id, 1), this.page, can);
        if (def.kind === 'seed') this.makeButton(236, y, 34, 18, '×5', () => this.buy(id, 5), this.page, gameState.money >= price * 5 && Inventory.canAdd(id, 5));
        y += 26;
      }
      const note = this.scene.add.text(PANEL_W / 2, y + 6, 'Le lit se pose dans la maison (sac → « Poser le lit »).', { ...FONT_SMALL, color: '#6b5a48' }).setOrigin(0.5, 0);
      this.page.add(note);
    } else {
      const rows = Economy.sellable();
      if (rows.length === 0) {
        this.page.add(this.scene.add.text(PANEL_W / 2, 70, 'Rien à vendre dans ton sac.', { ...FONT, color: '#6b5a48' }).setOrigin(0.5));
      }
      for (const row of rows.slice(0, 5)) {
        const def = ITEMS[row.item];
        const icon = this.scene.add.image(30, y + 9, def.icon.texture, def.icon.frame);
        const name = this.scene.add.text(46, y + 9, `${def.nom} ×${row.qty} — ${row.price} p. l'unité`, FONT).setOrigin(0, 0.5);
        this.page.add([icon, name]);
        this.makeButton(196, y, 34, 18, '×1', () => this.give(row.item, 1), this.page);
        this.makeButton(236, y, 34, 18, 'Tout', () => this.give(row.item, row.qty), this.page);
        y += 26;
      }
      if (this.mode === 'shipping') {
        const n = Economy.shippingCount();
        const info = n > 0 ? `Dans la boîte : ${n} objet${n > 1 ? 's' : ''} → ${Economy.shippingValue()} pièces demain matin` : 'La boîte est vide. Payé au lever du jour.';
        this.page.add(this.scene.add.text(PANEL_W / 2, PANEL_H - 30, info, { ...FONT_SMALL, color: '#6b5a48' }).setOrigin(0.5));
      }
    }
  }

  // ---------- Actions ----------

  private buy(id: string, qty: number): void {
    const err = Economy.buy(id, qty);
    if (err) { this.flash(ERRORS[err], true); return; }
    this.flash(`Acheté : ${ITEMS[id].nom} ×${qty}`);
    this.afterTrade();
  }

  private give(id: string, qty: number): void {
    if (this.mode === 'shop') {
      const gain = Economy.sell(id, qty);
      if (gain === null) { this.flash('Impossible', true); return; }
      this.flash(`Vendu : +${gain} pièces`);
    } else {
      if (!Economy.ship(id, qty)) { this.flash('Impossible', true); return; }
      this.flash(`Déposé dans la boîte : ${ITEMS[id].nom} ×${qty}`);
    }
    this.afterTrade();
  }

  private afterTrade(): void {
    SaveSystem.autosave();
    this.onTrade();
    this.rebuild();
  }

  private flash(text: string, error = false): void {
    this.message.setText(text).setColor(error ? '#a33b2e' : '#3d6b2f').setAlpha(1);
    this.scene.tweens.add({ targets: this.message, alpha: 0, delay: 1400, duration: 400 });
  }

  // ---------- Affichage ----------

  private showTab(tab: Tab): void {
    this.tab = tab;
    this.tabBuy.setFillStyle(tab === 'buy' ? 0xf3e4c4 : 0xd9c49a);
    this.tabSell.setFillStyle(tab === 'sell' ? 0xf3e4c4 : 0xd9c49a);
    this.rebuild();
  }

  get isOpen(): boolean { return this.root.visible; }

  open(mode: Mode): void {
    this.mode = mode;
    const shop = mode === 'shop';
    this.title.setText(shop ? 'Le marchand' : 'Boîte d\'expédition');
    this.tabBuy.setVisible(shop); this.tabTexts[0].setVisible(shop);
    this.tabSell.setVisible(shop); this.tabTexts[1].setVisible(shop);
    this.root.setVisible(true);
    uiState.panelOpen = true;
    this.tab = shop ? 'buy' : 'sell';
    this.showTab(this.tab);
  }

  close(): void {
    this.root.setVisible(false);
    uiState.panelOpen = false;
  }
}
