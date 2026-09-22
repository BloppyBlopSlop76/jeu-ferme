// Définition des poissons. Des données, pas du code : ajouter une espèce = ajouter une ligne.
// Phase 7 : la sardine seule. Phase 9 (collections) : la truite (matin) et la carpe (soir et nuit, rare).

export interface FishDef {
  id: string;           // = identifiant de l'objet dans data/items.ts
  nom: string;
  /** Attente avant la touche, en secondes réelles (min, max). */
  waitSeconds: [number, number];
  /** Temps laissé au joueur pour ferrer, en secondes. */
  biteWindowSeconds: number;
  /** Heures de la journée (0–24) où l'espèce mord ; null = toute heure. Peut passer minuit (ex. 18 → 6). */
  hours: [number, number] | null;
  /** Poids de tirage parmi les espèces disponibles (plus c'est petit, plus c'est rare). */
  weight: number;
}

export const FISH: Record<string, FishDef> = {
  sardine: { id: 'sardine', nom: 'Sardine', waitSeconds: [2, 5], biteWindowSeconds: 1.6, hours: null, weight: 6 },
  truite: { id: 'truite', nom: 'Truite', waitSeconds: [3, 6], biteWindowSeconds: 1.3, hours: [6, 12], weight: 3 },
  carpe: { id: 'carpe', nom: 'Carpe', waitSeconds: [4, 8], biteWindowSeconds: 1.1, hours: [18, 6], weight: 1 },
};

/** Espèces qui mordent à cette heure (heure décimale 0–24). */
export function fishAvailable(hour: number): FishDef[] {
  return Object.values(FISH).filter((f) => {
    if (!f.hours) return true;
    const [a, b] = f.hours;
    return a <= b ? hour >= a && hour < b : hour >= a || hour < b;
  });
}

/** Tire l'espèce qui mord, selon l'heure et les poids. `random` injectable pour les tests. */
export function pickFish(hour: number, random: () => number = Math.random): FishDef {
  const pool = fishAvailable(hour);
  const total = pool.reduce((s, f) => s + f.weight, 0);
  let r = random() * total;
  for (const f of pool) { r -= f.weight; if (r <= 0) return f; }
  return pool[pool.length - 1] ?? FISH.sardine;
}
