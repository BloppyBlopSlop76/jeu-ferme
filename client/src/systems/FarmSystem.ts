// Logique de l'agriculture : que peut-on faire sur une case, et que se passe-t-il quand on le fait.
// Aucune référence à Phaser : ce fichier ne sait rien de l'affichage. C'est lui que le serveur
// réutilisera en phase 13 pour valider les actions.

import { CROPS } from '../data/crops';
import { gameState, plotKey, type PlotState } from '../state/GameState';
import { Inventory } from './InventorySystem';

// Boucle voulue par Anthony : planter → arroser → attendre → récolter. Pas d'étape « bêcher ».
export type FarmAction = 'plant' | 'water' | 'harvest';

export const ACTION_LABELS: Record<FarmAction, string> = {
  plant: 'Planter',
  water: 'Arroser',
  harvest: 'Récolter',
};

/** Graine utilisée quand on plante (une seule disponible tant qu'il n'y a pas de boutique). */
export const DEFAULT_SEED = 'graine_navet';
/** Provisoire (pas de boutique) : une récolte rend aussi des graines, pour ne jamais rester bloqué. */
export const SEEDS_PER_HARVEST = 2;

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
      return this.isPlantable(tx, ty) && Inventory.count(DEFAULT_SEED) > 0 ? 'plant' : null;
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
      if (this.isPlantable(tx, ty) && Inventory.count(DEFAULT_SEED) === 0) return 'Plus de graines';
      return null;
    }
    const crop = CROPS[plot.crop];
    if (plot.stage >= crop.stages - 1 && !Inventory.canAdd(crop.id, crop.yield)) return 'Sac plein';
    return null;
  }

  /** Exécute l'action possible. Renvoie ce qui a été fait (pour l'affichage), ou null. */
  act(tx: number, ty: number): { action: FarmAction; plot?: PlotState; gained?: { item: string; qty: number }[] } | null {
    const action = this.getAction(tx, ty);
    if (!action) return null;
    const key = plotKey(tx, ty);
    switch (action) {
      case 'plant': {
        if (!Inventory.remove(DEFAULT_SEED, 1)) return null;
        const plot: PlotState = { tx, ty, crop: CROPS.navet.id, stage: 0, watered: false, wateredAt: null };
        gameState.farm[key] = plot;
        return { action, plot };
      }
      case 'water': {
        const plot = gameState.farm[key];
        plot.watered = true;
        plot.wateredAt = Date.now();
        return { action, plot };
      }
      case 'harvest': {
        const plot = gameState.farm[key];
        const crop = CROPS[plot.crop!];
        Inventory.add(crop.id, crop.yield);
        const seedsLeft = Inventory.add(DEFAULT_SEED, SEEDS_PER_HARVEST); // sac plein : graines perdues, tant pis
        delete gameState.farm[key]; // la terre redevient de l'herbe
        const gained = [{ item: crop.id, qty: crop.yield }];
        if (SEEDS_PER_HARVEST - seedsLeft > 0) gained.push({ item: DEFAULT_SEED, qty: SEEDS_PER_HARVEST - seedsLeft });
        return { action, gained };
      }
    }
  }

  /** Fait avancer la pousse d'après le temps réel écoulé depuis l'arrosage. Renvoie les cases changées. */
  tick(now: number = Date.now()): PlotState[] {
    const changed: PlotState[] = [];
    for (const plot of Object.values(gameState.farm)) {
      if (!plot.crop || !plot.watered || plot.wateredAt === null) continue;
      const crop = CROPS[plot.crop];
      const newStage = Math.min(crop.stages - 1, Math.floor((now - plot.wateredAt) / crop.stageMs));
      if (newStage > plot.stage) {
        plot.stage = newStage;
        changed.push(plot);
      }
    }
    return changed;
  }
}
