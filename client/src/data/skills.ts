// Compétences : des données, pas du code. Ajouter une compétence ou un bonus = ajouter une ligne.
// Phase 8, option A (Anthony) : paliers fixes, deux compétences, un bonus par niveau.
// Tout est « à recalibrer » : les chiffres sont un point de départ, pas une promesse.

export type SkillId = 'agriculture' | 'peche';

/** Ce qu'un niveau modifie. Les systèmes (Farm, Fishing, Energy) lisent ces effets via SkillSystem. */
export type PerkEffect =
  | { kind: 'bite_window_seconds'; value: number }   // pêche : temps en plus pour ferrer
  | { kind: 'wait_seconds'; value: number }          // pêche : attente en moins avant la touche
  | { kind: 'energy_cost'; action: string; value: number } // coût en énergie d'une action, en moins
  | { kind: 'seeds_per_harvest'; value: number }     // agriculture : graines en plus par récolte
  | { kind: 'harvest_yield'; value: number }         // agriculture : récolte en plus
  | { kind: 'double_catch_chance'; value: number };  // pêche : chance (0..1) de prendre 2 poissons

export interface PerkDef {
  level: number;
  /** Phrase courte affichée dans l'onglet Talents. */
  texte: string;
  effect: PerkEffect;
}

export interface SkillDef {
  id: SkillId;
  nom: string;
  perks: PerkDef[];
}

/** XP cumulée nécessaire pour atteindre chaque niveau (index 0 = niveau 1). Niveau max = longueur. */
export const LEVEL_THRESHOLDS = [0, 10, 25, 50, 100];
export const MAX_LEVEL = LEVEL_THRESHOLDS.length;

/** XP gagnée par action. */
export const XP_GAIN = {
  plant: 1,
  water: 1,
  harvest: 3,
  fish_catch: 3,
} as const;

export const SKILLS: Record<SkillId, SkillDef> = {
  agriculture: {
    id: 'agriculture',
    nom: 'Agriculture',
    perks: [
      { level: 2, texte: '+1 graine par récolte', effect: { kind: 'seeds_per_harvest', value: 1 } },
      { level: 3, texte: 'Planter coûte 1 énergie de moins', effect: { kind: 'energy_cost', action: 'plant', value: 1 } },
      { level: 4, texte: 'Arroser coûte 1 énergie de moins', effect: { kind: 'energy_cost', action: 'water', value: 1 } },
      { level: 5, texte: '+1 légume par récolte', effect: { kind: 'harvest_yield', value: 1 } },
    ],
  },
  peche: {
    id: 'peche',
    nom: 'Pêche',
    perks: [
      { level: 2, texte: 'Plus de temps pour ferrer', effect: { kind: 'bite_window_seconds', value: 0.6 } },
      { level: 3, texte: 'Pêcher coûte 1 énergie de moins', effect: { kind: 'energy_cost', action: 'fish', value: 1 } },
      { level: 4, texte: 'Le poisson mord plus vite', effect: { kind: 'wait_seconds', value: 1 } },
      { level: 5, texte: 'Parfois deux poissons d\'un coup', effect: { kind: 'double_catch_chance', value: 0.25 } },
    ],
  },
};
