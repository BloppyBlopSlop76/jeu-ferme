// Compétences : XP, niveaux et bonus. Aucune référence à Phaser.
// Les autres systèmes demandent ici « quel bonus s'applique ? » ; ils ne connaissent pas les niveaux.

import { LEVEL_THRESHOLDS, MAX_LEVEL, SKILLS, type PerkDef, type PerkEffect, type SkillId } from '../data/skills';
import { gameState } from '../state/GameState';

export interface SkillProgress {
  level: number;
  xp: number;
  /** XP cumulée du niveau courant et du suivant (null au niveau max). */
  from: number;
  to: number | null;
}

export const Skills = {
  xp(id: SkillId): number {
    return gameState.skills[id]?.xp ?? 0;
  },

  /** Niveau (1..MAX_LEVEL) calculé depuis l'XP : rien à synchroniser, rien à corrompre. */
  level(id: SkillId): number {
    const xp = this.xp(id);
    let level = 1;
    for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1;
    return level;
  },

  progress(id: SkillId): SkillProgress {
    const level = this.level(id);
    return {
      level,
      xp: this.xp(id),
      from: LEVEL_THRESHOLDS[level - 1],
      to: level >= MAX_LEVEL ? null : LEVEL_THRESHOLDS[level],
    };
  },

  /** Ajoute de l'XP. Renvoie le nouveau niveau si un palier vient d'être franchi, sinon null. */
  gain(id: SkillId, amount: number): number | null {
    const before = this.level(id);
    const entry = gameState.skills[id] ?? (gameState.skills[id] = { xp: 0 });
    entry.xp += amount;
    const after = this.level(id);
    return after > before ? after : null;
  },

  /** Bonus débloqués (niveau atteint) pour une compétence. */
  unlocked(id: SkillId): PerkDef[] {
    const level = this.level(id);
    return SKILLS[id].perks.filter((p) => p.level <= level);
  },

  /** Prochain bonus à débloquer, ou null. */
  nextPerk(id: SkillId): PerkDef | null {
    const level = this.level(id);
    return SKILLS[id].perks.find((p) => p.level > level) ?? null;
  },

  /** Somme des valeurs d'un type d'effet, toutes compétences confondues. */
  bonus(kind: PerkEffect['kind'], action?: string): number {
    let total = 0;
    for (const id of Object.keys(SKILLS) as SkillId[]) {
      for (const perk of this.unlocked(id)) {
        const e = perk.effect;
        if (e.kind !== kind) continue;
        if (e.kind === 'energy_cost' && e.action !== action) continue;
        total += e.value;
      }
    }
    return total;
  },
};
