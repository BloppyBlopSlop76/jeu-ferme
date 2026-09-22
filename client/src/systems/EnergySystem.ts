// Énergie. Aucune référence à Phaser. Principe (Anthony) : jamais un frein ultime.
// À 0, les actions restent possibles ; seule la marche ralentit.

import { gameState, ENERGY_MAX } from '../state/GameState';

/** Coût des actions, en points. Point de départ, à recalibrer avec les tests (phase 17). */
export const ENERGY_COST = { plant: 3, water: 2, harvest: 2 } as const;
/** Récupération naturelle : 4 points par heure de jeu (une journée sans rien faire recharge tout). */
const REGEN_PER_GAME_MINUTE = 4 / 60;
/** Vitesse de marche quand l'énergie est à 0 (fraction de la vitesse normale). */
export const TIRED_SPEED_FACTOR = 0.6;

export const Energy = {
  get(): number { return gameState.energy; },

  /** Dépense des points (jusqu'à 0, jamais en dessous). */
  spend(points: number): void {
    gameState.energy = Math.max(0, gameState.energy - points);
  },

  /** Rend des points (jusqu'au maximum). */
  restore(points: number): void {
    gameState.energy = Math.min(ENERGY_MAX, gameState.energy + points);
  },

  /** Récupération naturelle pour un nombre de minutes de jeu écoulées. */
  regen(gameMinutes: number): void {
    this.restore(gameMinutes * REGEN_PER_GAME_MINUTE);
  },

  /** Facteur de vitesse de déplacement selon la fatigue. */
  speedFactor(): number {
    return gameState.energy <= 0 ? TIRED_SPEED_FACTOR : 1;
  },
};
