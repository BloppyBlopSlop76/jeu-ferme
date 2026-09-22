// Règles de l'inventaire : ajouter, retirer, compter. Aucune référence à Phaser.

import { ITEMS } from '../data/items';
import { gameState } from '../state/GameState';

export const Inventory = {
  /** Quantité totale d'un objet, toutes cases confondues. */
  count(itemId: string): number {
    return gameState.inventory.slots.reduce((n, s) => n + (s && s.item === itemId ? s.qty : 0), 0);
  },

  /** Peut-on ajouter cette quantité sans rien perdre ? */
  canAdd(itemId: string, qty: number): boolean {
    const max = ITEMS[itemId].stackMax;
    let room = 0;
    for (const s of gameState.inventory.slots) {
      if (s === null) room += max;
      else if (s.item === itemId) room += max - s.qty;
      if (room >= qty) return true;
    }
    return room >= qty;
  },

  /** Ajoute en complétant d'abord les piles existantes, puis les cases vides. Renvoie ce qui n'a pas tenu. */
  add(itemId: string, qty: number): number {
    const max = ITEMS[itemId].stackMax;
    const slots = gameState.inventory.slots;
    for (const s of slots) {
      if (qty <= 0) break;
      if (s && s.item === itemId && s.qty < max) {
        const take = Math.min(qty, max - s.qty);
        s.qty += take;
        qty -= take;
      }
    }
    for (let i = 0; i < slots.length && qty > 0; i++) {
      if (slots[i] === null) {
        const take = Math.min(qty, max);
        slots[i] = { item: itemId, qty: take };
        qty -= take;
      }
    }
    return qty;
  },

  /** Retire la quantité demandée. Renvoie false (et ne change rien) s'il n'y en a pas assez. */
  remove(itemId: string, qty: number): boolean {
    if (this.count(itemId) < qty) return false;
    const slots = gameState.inventory.slots;
    for (let i = slots.length - 1; i >= 0 && qty > 0; i--) {
      const s = slots[i];
      if (s && s.item === itemId) {
        const take = Math.min(qty, s.qty);
        s.qty -= take;
        qty -= take;
        if (s.qty === 0) slots[i] = null;
      }
    }
    return true;
  },
};
