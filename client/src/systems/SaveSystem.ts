// Sauvegarde locale : l'état du jeu est écrit dans le navigateur (localStorage = petit espace de
// stockage propre au site, sur cet appareil). La sauvegarde serveur (phase 11) remplacera ce fichier
// sans toucher au reste du jeu : les scènes n'appellent que save() / load() / reset().

import { gameState, createDefaultState, type GameState } from '../state/GameState';

const KEY = 'jeu-ferme.save';

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
      const saved = JSON.parse(raw) as Partial<GameState>;
      if (saved.version !== gameState.version) return false; // ancien format : on repart de zéro
      // On complète les champs manquants avec les valeurs par défaut (robuste aux ajouts futurs).
      const fresh = createDefaultState();
      Object.assign(gameState, fresh, saved, {
        player: { ...fresh.player, ...saved.player },
        inventory: { ...fresh.inventory, ...saved.inventory },
        settings: { ...fresh.settings, ...saved.settings },
      });
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
