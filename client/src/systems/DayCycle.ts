// Chef d'orchestre du temps : à chaque image, avance l'horloge, régénère l'énergie et fait pousser
// les plantes à chaque nuit passée. Aucune référence à Phaser. Appelé par toutes les scènes de jeu.

import { TimeSystem } from './TimeSystem';
import { Energy } from './EnergySystem';
import { FarmSystem } from './FarmSystem';
import type { PlotState } from '../state/GameState';

export interface DayCycleResult {
  daysPassed: number;
  /** Cases dont le stade a changé (à redessiner). */
  grown: PlotState[];
}

export const DayCycle = {
  update(now: number = Date.now()): DayCycleResult {
    const { gameMinutes, daysPassed } = TimeSystem.tick(now);
    Energy.regen(gameMinutes);
    return { daysPassed, grown: daysPassed > 0 ? FarmSystem.growNights(daysPassed) : [] };
  },

  /** Dormir sur un couchage : saute au lendemain matin, rend de l'énergie, fait pousser. */
  sleep(energyRestored: number): DayCycleResult {
    const daysPassed = TimeSystem.sleepUntilMorning();
    Energy.restore(energyRestored);
    return { daysPassed, grown: daysPassed > 0 ? FarmSystem.growNights(daysPassed) : [] };
  },
};
