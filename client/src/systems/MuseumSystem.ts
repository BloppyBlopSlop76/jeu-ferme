// Règles du musée (phase 9) : donner un objet, savoir ce qui manque, verser les récompenses par palier.
// Aucune référence à Phaser. La collection vit dans gameState.collection (liste d'identifiants d'objets).

import { COLLECTIBLES, COLLECTION_REWARDS } from '../data/collection';
import { ITEMS } from '../data/items';
import { gameState } from '../state/GameState';
import { Inventory } from './InventorySystem';

export interface DonationResult {
  /** Récompense débloquée par ce don (null si aucun palier atteint). */
  reward: { coins: number; texte: string } | null;
}

export const Museum = {
  /** Vrai si cet objet est déjà exposé. */
  has(itemId: string): boolean { return gameState.collection.includes(itemId); },

  /** Nombre d'objets exposés / total. */
  count(): number { return COLLECTIBLES.filter((id) => this.has(id)).length; },
  total(): number { return COLLECTIBLES.length; },

  /** Objets du sac que le conservateur accepterait (collectionnables, pas encore exposés). */
  donatable(): { item: string; nom: string; qty: number }[] {
    const qty = new Map<string, number>();
    for (const s of gameState.inventory.slots) {
      if (s && COLLECTIBLES.includes(s.item) && !this.has(s.item)) qty.set(s.item, (qty.get(s.item) ?? 0) + s.qty);
    }
    return COLLECTIBLES.filter((id) => qty.has(id)).map((item) => ({ item, nom: ITEMS[item].nom, qty: qty.get(item)! }));
  },

  /** Donne un exemplaire au musée. Renvoie null si impossible (déjà exposé, absent du sac, pas collectionnable). */
  donate(itemId: string): DonationResult | null {
    if (!COLLECTIBLES.includes(itemId) || this.has(itemId)) return null;
    const before = this.count();
    if (!Inventory.remove(itemId, 1)) return null;
    gameState.collection.push(itemId);
    const after = this.count();
    // Un seul palier peut être franchi par don (un objet = +1).
    const tier = COLLECTION_REWARDS.find((r) => r.count > before && r.count <= after);
    if (tier) {
      gameState.money += tier.coins;
      return { reward: { coins: tier.coins, texte: tier.texte } };
    }
    return { reward: null };
  },

  /** Prochain palier à atteindre (null si tout est débloqué). */
  nextReward(): { count: number; coins: number } | null {
    const n = this.count();
    return COLLECTION_REWARDS.find((r) => r.count > n) ?? null;
  },
};
