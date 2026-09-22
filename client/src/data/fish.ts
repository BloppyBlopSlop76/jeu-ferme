// Définition des poissons. Des données, pas du code : ajouter une espèce = ajouter une ligne.
// Phase 7 : une seule espèce, populaire et mignonne : la sardine bleue (demande d'Anthony). Rareté, horaires, météo viendront après.

export interface FishDef {
  id: string;           // = identifiant de l'objet dans data/items.ts
  nom: string;
  /** Attente avant la touche, en secondes réelles (min, max). */
  waitSeconds: [number, number];
  /** Temps laissé au joueur pour ferrer, en secondes. */
  biteWindowSeconds: number;
}

export const FISH: Record<string, FishDef> = {
  sardine: { id: 'sardine', nom: 'Sardine', waitSeconds: [2, 5], biteWindowSeconds: 1.6 },
};

/** Espèce qui mord (une seule pour l'instant). */
export function pickFish(): FishDef {
  return FISH.sardine;
}
