// Logique de l'agriculture : que peut-on faire sur une case, et que se passe-t-il quand on le fait.
// Aucune référence à Phaser : ce fichier ne sait rien de l'affichage. C'est lui que le serveur
// réutilisera en phase 13 pour valider les actions.

import { CROPS } from '../data/crops';
import { gameState, plotKey, type PlotState } from '../state/GameState';

// Boucle voulue par Anthony : planter → arroser → attendre → récolter. Pas d'étape « bêcher » :
// planter retourne la terre en même temps.
export type FarmAction = 'plant' | 'water' | 'harvest';

export const ACTION_LABELS: Record<FarmAction, string> = {
  plant: 'Planter',
  water: 'Arroser',
  harvest: 'Récolter',
};

/** Culture plantée quand on plante (une seule graine disponible en phase 4). */
export const DEFAULT_CROP = 'navet';

export class FarmSystem {
  /**
   * @param isFreeGround dit si une case est du sol libre (herbe sans eau, arbre, bâtiment, pont…).
   * On peut planter partout sur le terrain, sauf là où ce test dit non (décision d'Anthony).
   */
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
    if (!plot || !plot.crop) return this.isPlantable(tx, ty) ? 'plant' : null;
    const crop = CROPS[plot.crop];
    if (plot.stage >= crop.stages - 1) return 'harvest';
    if (!plot.watered) return 'water';
    return null; // arrosée et en train de pousser : on attend
  }

  /** Exécute l'action possible. Renvoie ce qui a été fait (pour l'affichage), ou null. */
  act(tx: number, ty: number): { action: FarmAction; plot?: PlotState; gained?: { crop: string; qty: number } } | null {
    const action = this.getAction(tx, ty);
    if (!action) return null;
    const key = plotKey(tx, ty);
    switch (action) {
      case 'plant': {
        // Planter crée la case de terre et y met la graine d'un coup.
        const plot: PlotState = { tx, ty, crop: DEFAULT_CROP, stage: 0, watered: false, wateredAt: null };
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
        gameState.harvest[crop.id] = (gameState.harvest[crop.id] ?? 0) + crop.yield;
        delete gameState.farm[key]; // la terre redevient de l'herbe : il faudra re-bêcher
        return { action, gained: { crop: crop.id, qty: crop.yield } };
      }
    }
  }

  /**
   * Fait avancer la pousse d'après le temps réel écoulé depuis l'arrosage. À appeler régulièrement
   * (chaque image suffit). Renvoie les cases dont le stade a changé.
   */
  tick(now: number = Date.now()): PlotState[] {
    const changed: PlotState[] = [];
    for (const plot of Object.values(gameState.farm)) {
      if (!plot.crop || !plot.watered || plot.wateredAt === null) continue;
      const crop = CROPS[plot.crop];
      const elapsedStages = Math.floor((now - plot.wateredAt) / crop.stageMs);
      const newStage = Math.min(crop.stages - 1, elapsedStages);
      if (newStage > plot.stage) {
        plot.stage = newStage;
        changed.push(plot);
      }
    }
    return changed;
  }
}
