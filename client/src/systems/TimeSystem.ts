// Horloge du jeu. Aucune référence à Phaser.
// Une journée de jeu (24 h) dure DAY_REAL_MINUTES minutes réelles (choix d'Anthony : 19 min, nuit comprise).
// L'horloge tourne en continu et rattrape le temps passé quand le jeu était en pause (écran éteint, autre appli).

import { gameState, DAY_START_MINUTE } from '../state/GameState';

export const DAY_REAL_MINUTES = 19;
const GAME_MINUTES_PER_DAY = 24 * 60;
/** Millisecondes réelles pour une minute de jeu (≈ 792 ms). */
export const MS_PER_GAME_MINUTE = (DAY_REAL_MINUTES * 60 * 1000) / GAME_MINUTES_PER_DAY;
/** Rattrapage maximal après une pause (évite de sauter des semaines si on revient après 3 jours). */
const MAX_CATCHUP_DAYS = 7;

export const TimeSystem = {
  /**
   * Avance l'horloge jusqu'à l'heure réelle `now`. Renvoie les minutes de jeu écoulées et le nombre
   * de minuits franchis (= nuits passées).
   */
  tick(now: number = Date.now()): { gameMinutes: number; daysPassed: number } {
    const t = gameState.time;
    if (t.lastRealMs === 0) { t.lastRealMs = now; return { gameMinutes: 0, daysPassed: 0 }; }
    let elapsed = Math.max(0, now - t.lastRealMs);
    elapsed = Math.min(elapsed, MAX_CATCHUP_DAYS * GAME_MINUTES_PER_DAY * MS_PER_GAME_MINUTE);
    const gameMinutes = elapsed / MS_PER_GAME_MINUTE;
    t.lastRealMs = now;
    return { gameMinutes, daysPassed: this.advance(gameMinutes) };
  },

  /** Ajoute des minutes de jeu ; renvoie le nombre de jours franchis. */
  advance(gameMinutes: number): number {
    const t = gameState.time;
    t.minute += gameMinutes;
    let days = 0;
    while (t.minute >= GAME_MINUTES_PER_DAY) {
      t.minute -= GAME_MINUTES_PER_DAY;
      t.day += 1;
      days += 1;
    }
    return days;
  },

  /** Dormir : saute jusqu'au lendemain 6 h. Renvoie le nombre de nuits passées (0 si on est déjà après minuit, avant 6 h). */
  sleepUntilMorning(): number {
    const t = gameState.time;
    const target = t.minute < DAY_START_MINUTE ? DAY_START_MINUTE : GAME_MINUTES_PER_DAY + DAY_START_MINUTE;
    return this.advance(target - t.minute);
  },

  /** Heure et minutes entières. */
  clock(): { hour: number; minute: number } {
    const m = Math.floor(gameState.time.minute);
    return { hour: Math.floor(m / 60), minute: m % 60 };
  },

  /** Libellé court, ex. « 14h30 » (arrondi aux 10 minutes pour rester discret). */
  label(): string {
    const { hour, minute } = this.clock();
    return `${hour}h${String(Math.floor(minute / 10) * 10).padStart(2, '0')}`;
  },

  /** Obscurité de 0 (plein jour) à 1 (nuit noire), pour la teinte de l'écran. */
  darkness(): number {
    const h = gameState.time.minute / 60;
    const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.min(1, Math.max(0, t));
    if (h < 5) return 1;
    if (h < 6) return lerp(1, 0.8, h - 5);        // fin de nuit
    if (h < 7.5) return lerp(0.8, 0, (h - 6) / 1.5); // aube
    if (h < 18) return 0;                         // jour
    if (h < 20) return lerp(0, 0.55, (h - 18) / 2); // crépuscule
    if (h < 22) return lerp(0.55, 1, (h - 20) / 2); // soirée
    return 1;                                      // nuit
  },

  isNight(): boolean {
    const h = gameState.time.minute / 60;
    return h < 6 || h >= 20;
  },
};
