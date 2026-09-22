// Sauvegarde locale : l'état du jeu est écrit dans le navigateur (localStorage = petit espace de
// stockage propre au site, sur cet appareil). La sauvegarde serveur (phase 11) remplacera ce fichier
// sans toucher au reste du jeu : les scènes n'appellent que save() / load() / reset().

import { gameState, createDefaultState, type GameState } from '../state/GameState';

const KEY = 'jeu-ferme.save';

/**
 * Convertit une sauvegarde d'une ancienne version vers la version courante, étape par étape.
 * Règle (Anthony, 22/09) : on ne jette jamais une partie ; chaque changement de structure a sa conversion.
 * Renvoie null seulement si la sauvegarde est illisible.
 */
function migrate(saved: Partial<GameState> & { version?: number }): Partial<GameState> | null {
  if (typeof saved !== 'object' || saved === null) return null;
  let v = saved.version ?? 1;
  const s = saved as Record<string, unknown>;
  if (v === 1) {
    // v1 → v2 : arrivée de l'horloge et de l'énergie (valeurs par défaut), plantes : plus de « wateredAt ».
    const farm = (s.farm ?? {}) as Record<string, Record<string, unknown>>;
    for (const plot of Object.values(farm)) { delete plot.wateredAt; delete plot.progress; plot.nights = 0; }
    v = 2;
  }
  // v2 → v3 : nuits de pousse comptées en total (pas par stade) — même champ `nights`, rien à convertir.
  if (v === 2) v = 3;
  // v3 → v4 : arrivée des compétences (phase 8) : tout le monde part du niveau 1.
  if (v === 3) { s.skills = { agriculture: { xp: 0 }, peche: { xp: 0 } }; v = 4; }
  s.version = v;
  return s as Partial<GameState>;
}

export const SaveSystem = {
  /** Écrit l'état courant. Renvoie false si le navigateur refuse (mode privé, espace plein…). */
  save(): boolean {
    try {
      localStorage.setItem(KEY, JSON.stringify(gameState));
      return true;
    } catch {
      return false;
    }
  },

  /** Charge la sauvegarde dans l'état courant, si elle existe et si son format est compatible. */
  load(): boolean {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return false;
      const saved = migrate(JSON.parse(raw) as Partial<GameState> & { version?: number });
      if (!saved) return false;
      // On complète les champs manquants avec les valeurs par défaut (robuste aux ajouts futurs).
      const fresh = createDefaultState();
      Object.assign(gameState, fresh, saved, {
        player: { ...fresh.player, ...saved.player },
        inventory: { ...fresh.inventory, ...saved.inventory },
        settings: { ...fresh.settings, ...saved.settings },
        skills: { ...fresh.skills, ...saved.skills },
      });
      // Sac : toujours le bon nombre de cases (robuste si la taille du sac change un jour).
      const slots = gameState.inventory.slots.slice(0, fresh.inventory.slots.length);
      while (slots.length < fresh.inventory.slots.length) slots.push(null);
      gameState.inventory.slots = slots;
      return true;
    } catch {
      return false;
    }
  },

  /** Efface la sauvegarde et remet une partie neuve dans l'état courant. */
  reset(): void {
    try { localStorage.removeItem(KEY); } catch { /* ignoré */ }
    Object.assign(gameState, createDefaultState());
  },

  /** Sauvegarde seulement si l'option est activée. À appeler après chaque action importante. */
  autosave(): void {
    if (gameState.settings.autosave) this.save();
  },
};
