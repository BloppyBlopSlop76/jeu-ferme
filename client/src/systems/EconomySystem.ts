// Règles de l'économie : acheter, vendre, expédier, encaisser. Aucune référence à Phaser.
// Le serveur (phase 13) rejouera ces règles pour valider les échanges.

import { buyPrice, sellPrice } from '../data/economy';
import { ITEMS } from '../data/items';
import { gameState } from '../state/GameState';
import { Inventory } from './InventorySystem';

export type TradeError = 'pas_assez_argent' | 'sac_plein' | 'pas_en_stock' | 'invendable' | 'inachetable';

export const Economy = {
  money(): number { return gameState.money; },

  /** Achète `qty` exemplaires. Renvoie null si OK, sinon la raison. */
  buy(itemId: string, qty: number): TradeError | null {
    const price = buyPrice(itemId);
    if (price === null) return 'inachetable';
    if (gameState.money < price * qty) return 'pas_assez_argent';
    if (!Inventory.canAdd(itemId, qty)) return 'sac_plein';
    gameState.money -= price * qty;
    Inventory.add(itemId, qty);
    return null;
  },

  /** Vend `qty` exemplaires du sac, argent immédiat (boutique). Renvoie le montant gagné, ou null. */
  sell(itemId: string, qty: number): number | null {
    const price = sellPrice(itemId);
    if (price === null) return null;
    if (!Inventory.remove(itemId, qty)) return null;
    const gain = price * qty;
    gameState.money += gain;
    return gain;
  },

  /** Dépose `qty` exemplaires du sac dans les boîtes d'expédition (payé le lendemain matin). */
  ship(itemId: string, qty: number): boolean {
    if (sellPrice(itemId) === null) return false;
    if (!Inventory.remove(itemId, qty)) return false;
    const stack = gameState.shipping.find((s) => s.item === itemId);
    if (stack) stack.qty += qty; else gameState.shipping.push({ item: itemId, qty });
    return true;
  },

  /** Valeur de ce qui attend dans les boîtes. */
  shippingValue(): number {
    return gameState.shipping.reduce((sum, s) => sum + (sellPrice(s.item) ?? 0) * s.qty, 0);
  },

  shippingCount(): number {
    return gameState.shipping.reduce((n, s) => n + s.qty, 0);
  },

  /** Encaisse les boîtes (appelé à chaque nouveau jour). Renvoie le montant versé. */
  payShipping(): number {
    const total = this.shippingValue();
    gameState.money += total;
    gameState.shipping = [];
    return total;
  },

  /** Objets du sac qui se vendent, regroupés (pour les panneaux Vendre / Expédier). */
  sellable(): { item: string; nom: string; qty: number; price: number }[] {
    const seen = new Map<string, number>();
    for (const s of gameState.inventory.slots) if (s && sellPrice(s.item) !== null) seen.set(s.item, (seen.get(s.item) ?? 0) + s.qty);
    return [...seen.entries()].map(([item, qty]) => ({ item, nom: ITEMS[item].nom, qty, price: sellPrice(item)! }));
  },
};
