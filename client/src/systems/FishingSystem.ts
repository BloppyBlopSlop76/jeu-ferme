// Règles de la pêche : une petite machine à états. Aucune référence à Phaser.
//   idle → (lancer) → waiting → (ça mord) → bite → (ferrer à temps) → catch / (trop tard) → miss
// Le serveur (phase 13) pourra rejouer exactement ces états pour valider une capture.

import { pickFish, type FishDef } from '../data/fish';
import { Inventory } from './InventorySystem';
import { Energy } from './EnergySystem';

export type FishingPhase = 'idle' | 'waiting' | 'bite';

export const FISHING_ENERGY_COST = 3;

export class FishingSystem {
  phase: FishingPhase = 'idle';
  private fish: FishDef | null = null;
  private phaseEndsAt = 0;

  /** Lance la ligne. `now` en ms (Date.now()). */
  cast(now: number): void {
    this.fish = pickFish();
    const [min, max] = this.fish.waitSeconds;
    this.phase = 'waiting';
    this.phaseEndsAt = now + (min + Math.random() * (max - min)) * 1000;
    Energy.spend(FISHING_ENERGY_COST);
  }

  /** À appeler chaque image. Renvoie 'bite' quand ça mord, 'miss' si le joueur a laissé passer, sinon null. */
  update(now: number): 'bite' | 'miss' | null {
    if (this.phase === 'waiting' && now >= this.phaseEndsAt) {
      this.phase = 'bite';
      this.phaseEndsAt = now + (this.fish?.biteWindowSeconds ?? 1.5) * 1000;
      return 'bite';
    }
    if (this.phase === 'bite' && now >= this.phaseEndsAt) {
      this.reset();
      return 'miss';
    }
    return null;
  }

  /** Le joueur appuie pendant la touche : capture (si le sac a de la place). */
  reel(): { fish: FishDef; stored: boolean } | null {
    if (this.phase !== 'bite' || !this.fish) return null;
    const fish = this.fish;
    const stored = Inventory.canAdd(fish.id, 1);
    if (stored) Inventory.add(fish.id, 1);
    this.reset();
    return { fish, stored };
  }

  /** Abandon (le joueur bouge, ouvre le sac…). */
  reset(): void {
    this.phase = 'idle';
    this.fish = null;
    this.phaseEndsAt = 0;
  }

  get isActive(): boolean { return this.phase !== 'idle'; }
}
