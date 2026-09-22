// Traits de caractère : des données, pas du code. Un seul trait par personnage, choisi à la création
// (décision d'Anthony, 22/09). Chaque trait donne un avantage lié à une activité, sans malus ailleurs ;
// les forces sont comparables (≈ « un niveau d'avance » dans son activité). À recalibrer avec les tests.

import type { PerkEffect, SkillId } from './skills';

export interface TraitDef {
  id: string;
  nom: string;
  /** Activité favorisée (pour l'affichage). */
  skill: SkillId;
  /** Phrase courte affichée sur la carte de choix et dans l'onglet Talents. */
  texte: string;
  effects: PerkEffect[];
}

export const TRAITS: Record<string, TraitDef> = {
  main_verte: {
    id: 'main_verte', nom: 'Main verte', skill: 'agriculture',
    texte: 'XP agriculture +25 %, arroser coûte 1 énergie de moins',
    effects: [{ kind: 'xp_bonus', skill: 'agriculture', value: 0.25 }, { kind: 'energy_cost', action: 'water', value: 1 }],
  },
  cueilleur: {
    id: 'cueilleur', nom: 'Cueilleur', skill: 'agriculture',
    texte: 'Une récolte sur quatre donne un légume en plus',
    effects: [{ kind: 'extra_yield_chance', value: 0.25 }],
  },
  patient: {
    id: 'patient', nom: 'Patient', skill: 'peche',
    texte: 'XP pêche +25 %, 0,4 s de plus pour ferrer',
    effects: [{ kind: 'xp_bonus', skill: 'peche', value: 0.25 }, { kind: 'bite_window_seconds', value: 0.4 }],
  },
  oeil_de_lynx: {
    id: 'oeil_de_lynx', nom: 'Œil de lynx', skill: 'peche',
    texte: 'Le poisson mord 1 s plus vite',
    effects: [{ kind: 'wait_seconds', value: 1 }],
  },
};

/** Ordre d'affichage sur l'écran de création. */
export const TRAIT_ORDER = ['main_verte', 'cueilleur', 'patient', 'oeil_de_lynx'];
