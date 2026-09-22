// Logique de l'agriculture : que peut-on faire sur une case, et que se passe-t-il quand on le fait.
// Aucune référence à Phaser : ce fichier ne sait rien de l'affichage. C'est lui que le serveur
// réutilisera en phase 13 pour valider les actions.

import { CROPS } from '../data/crops';
import { ITEMS } from '../data/items';
import { gameState, plotKey, type PlotState } from '../state/GameState';
import { Inventory } from './InventorySystem';
import { Energy } from './EnergySystem';
import { Skills } from './SkillSystem';
import { XP_GAIN } from '../data/skills';

// Boucle voulue par Anthony : planter → arroser → attendre → récolter. Pas d'étape « bêcher ».
export type FarmAction = 'plant' | 'water' | 'harvest';

export const ACTION_LABELS: Record<FarmAction, string> = {
  plant: 'Planter',
  water: 'Arroser',
  harvest: 'Récolter',
};

/** Une récolte rend aussi des graines de la même culture, pour ne jamais rester bloqué. */
export const SEEDS_PER_HARVEST = 2;

/** Graine que le bouton d'action plante : celle choisie dans le sac, sinon la première graine du sac. */
export function currentSeed(): string | null {
  if (Inventory.count(gameState.selectedSeed) > 0) return gameState.selectedSeed;
  const slot = gameState.inventory.slots.find((s) => s && ITEMS[s.item].kind === 'seed');
  if (slot) { gameState.selectedSeed = slot.item; return slot.item; }
  return null;
}

/** La graine qui donne cette culture (pour rendre des graines à la récolte). */
function seedFor(cropId: string): string | undefined {
  return Object.values(ITEMS).find((i) => i.kind === 'seed' && i.crop === cropId)?.id;
}

export class FarmSystem {
  /** @param isFreeGround dit si une case est du sol libre (herbe sans eau, arbre, bâtiment, pont…). */
  constructor(private isFreeGround: (tx: number, ty: number) => boolean) {}

  isPlantable(tx: number, ty: number): boolean {
    return this.isFreeGround(tx, ty);
  }

  getPlot(tx: number, ty: number): PlotState | undefined {
    return gameState.farm[plotKey(tx, ty)];
  }

  /** L'action possible sur une case, ou null s'il n'y a rien à faire. */
  getAction(tx: number, ty: number): FarmAction | null {
    const plot = this.getPlot(tx, ty);
    if (!plot || !plot.crop) {
      return this.isPlantable(tx, ty) && currentSeed() !== null ? 'plant' : null;
    }
    const crop = CROPS[plot.crop];
    if (plot.stage >= crop.stages - 1) return Inventory.canAdd(crop.id, crop.yield) ? 'harvest' : null;
    if (!plot.watered) return 'water';
    return null; // arrosée et en train de pousser : on attend
  }

  /** Pourquoi rien n'est possible (pour l'affichage), ou null. */
  getBlockReason(tx: number, ty: number): string | null {
    const plot = this.getPlot(tx, ty);
    if (!plot || !plot.crop) {
      if (this.isPlantable(tx, ty) && currentSeed() === null) return 'Plus de graines';
      return null;
    }
    const crop = CROPS[plot.crop];
    if (plot.stage >= crop.stages - 1 && !Inventory.canAdd(crop.id, crop.yield)) return 'Sac plein';
    return null;
  }

  /** Exécute l'action possible. Renvoie ce qui a été fait (pour l'affichage), ou null. */
  act(tx: number, ty: number): { action: FarmAction; plot?: PlotState; gained?: { item: string; qty: number }[]; levelUp: number | null } | null {
    const action = this.getAction(tx, ty);
    if (!action) return null;
    const key = plotKey(tx, ty);
    switch (action) {
      case 'plant': {
        const seed = currentSeed();
        if (!seed || !Inventory.remove(seed, 1)) return null;
        const cropId = ITEMS[seed].crop ?? 'navet';
        const plot: PlotState = { tx, ty, crop: CROPS[cropId].id, stage: 0, watered: false, nights: 0 };
        Energy.spendFor('plant');
        gameState.farm[key] = plot;
        return { action, plot, levelUp: Skills.gain('agriculture', XP_GAIN.plant) };
      }
      case 'water': {
        const plot = gameState.farm[key];
        plot.watered = true;
        Energy.spendFor('water');
        return { action, plot, levelUp: Skills.gain('agriculture', XP_GAIN.water) };
      }
      case 'harvest': {
        const plot = gameState.farm[key];
        const crop = CROPS[plot.crop!];
        Energy.spendFor('harvest');
        // Bonus de compétence (+1 fixe) et de trait (parfois +1).
        const lucky = Math.random() < Skills.bonus('extra_yield_chance') ? 1 : 0;
        const yieldQty = crop.yield + Skills.bonus('harvest_yield') + lucky;
        const seedsQty = SEEDS_PER_HARVEST + Skills.bonus('seeds_per_harvest');
        const seedItem = seedFor(crop.id) ?? 'graine_navet';
        const cropLeft = Inventory.add(crop.id, yieldQty);
        const seedsLeft = Inventory.add(seedItem, seedsQty); // sac plein : le surplus est perdu, tant pis
        delete gameState.farm[key]; // la terre redevient de l'herbe
        const gained = [{ item: crop.id, qty: yieldQty - cropLeft }];
        if (seedsQty - seedsLeft > 0) gained.push({ item: seedItem, qty: seedsQty - seedsLeft });
        return { action, gained, levelUp: Skills.gain('agriculture', XP_GAIN.harvest) };
      }
    }
  }

  /**
   * Pousse par nuits (décision d'Anthony : au moins une nuit par stade). Pour chaque nuit passée,
   * une plante arrosée avance ; quand elle a assez de nuits, elle change de stade.
   * Fonction statique : appelée par DayCycle même quand aucune scène de terrain n'est affichée.
   */
  static growNights(nights: number): PlotState[] {
    const changed: PlotState[] = [];
    for (const plot of Object.values(gameState.farm)) {
      if (!plot.crop || !plot.watered) continue;
      const crop = CROPS[plot.crop];
      if (plot.stage >= crop.stages - 1) continue;
      plot.nights += nights;
      // Le stade suit la proportion de nuits accomplies : 2 nuits pour 4 stades → stade 1 puis mûr.
      const newStage = Math.min(crop.stages - 1, Math.floor((plot.nights / crop.growthNights) * (crop.stages - 1)));
      if (newStage > plot.stage) {
        plot.stage = newStage;
        changed.push(plot);
      }
    }
    return changed;
  }
}
