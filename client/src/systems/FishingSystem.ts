// Règles de la pêche : une petite machine à états. Aucune référence à Phaser.
//   idle → (lancer) → waiting → (ça mord) → bite → (ferrer à temps) → catch / (trop tard) → miss
// Le serveur (phase 13) pourra rejouer exactement ces états pour valider une capture.

import { pickFish, type FishDef } from '../data/fish';
import { gameState } from '../state/GameState';
import { Inventory } from './InventorySystem';
import { Energy } from './EnergySystem';
import { Skills } from './SkillSystem';
import { XP_GAIN } from '../data/skills';

export type FishingPhase = 'idle' | 'waiting' | 'bite';

export class FishingSystem {
  phase: FishingPhase = 'idle';
  private fish: FishDef | null = null;
  private phaseEndsAt = 0;

  /** Lance la ligne. `now` en ms (Date.now()). */
  cast(now: number): void {
    this.fish = pickFish(gameState.time.minute / 60);
    const [min, max] = this.fish.waitSeconds;
    // Bonus de compétence : le poisson mord plus vite (jamais moins d'une seconde d'attente).
    const faster = Skills.bonus('wait_seconds');
    const wait = Math.max(1, min - faster + Math.random() * (max - min));
    this.phase = 'waiting';
    this.phaseEndsAt = now + wait * 1000;
    Energy.spendFor('fish');
  }

  /** À appeler chaque image. Renvoie 'bite' quand ça mord, 'miss' si le joueur a laissé passer, sinon null. */
  update(now: number): 'bite' | 'miss' | null {
    if (this.phase === 'waiting' && now >= this.phaseEndsAt) {
      this.phase = 'bite';
      // Bonus de compétence : plus de temps pour ferrer.
      this.phaseEndsAt = now + ((this.fish?.biteWindowSeconds ?? 1.5) + Skills.bonus('bite_window_seconds')) * 1000;
      return 'bite';
    }
    if (this.phase === 'bite' && now >= this.phaseEndsAt) {
      this.reset();
      return 'miss';
    }
    return null;
  }

  /** Le joueur appuie pendant la touche : capture (si le sac a de la place). */
  reel(): { fish: FishDef; qty: number; stored: boolean; levelUp: number | null } | null {
    if (this.phase !== 'bite' || !this.fish) return null;
    const fish = this.fish;
    // Bonus de compétence : parfois deux poissons d'un coup.
    const qty = Math.random() < Skills.bonus('double_catch_chance') ? 2 : 1;
    const stored = Inventory.canAdd(fish.id, 1);
    let kept = 0;
    if (stored) kept = qty - Inventory.add(fish.id, qty);
    this.reset();
    const levelUp = stored ? Skills.gain('peche', XP_GAIN.fish_catch) : null;
    return { fish, qty: kept, stored, levelUp };
  }

  /** Abandon (le joueur bouge, ouvre le sac…). */
  reset(): void {
    this.phase = 'idle';
    this.fish = null;
    this.phaseEndsAt = 0;
  }

  get isActive(): boolean { return this.phase !== 'idle'; }
}
