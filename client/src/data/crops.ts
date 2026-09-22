// Définition des cultures. Des données, pas du code : ajouter une culture = ajouter une ligne.
// Les images viennent de plants.png (Sprout Lands) : 6 colonnes par rangée
// (0 = sachet de graines, 1 à 4 = stades de pousse, 5 = objet récolté).

export interface CropDef {
  id: string;
  nom: string;
  /** Rangée dans plants.png. */
  row: number;
  /** Nombre de stades de pousse (le dernier = mûr). */
  stages: number;
  /** Nuits nécessaires, après arrosage, pour arriver à maturité (au moins 1 : décision d'Anthony). */
  growthNights: number;
  /** Quantité récoltée. */
  yield: number;
}

export const CROPS: Record<string, CropDef> = {
  navet: { id: 'navet', nom: 'Navet', row: 1, stages: 4, growthNights: 2, yield: 1 },  // mûr en 2 nuits
  ble: { id: 'ble', nom: 'Blé', row: 0, stages: 4, growthNights: 5, yield: 2 },        // mûr en 5 nuits
  carotte: { id: 'carotte', nom: 'Carotte', row: 2, stages: 4, growthNights: 3, yield: 1 },  // mûre en 3 nuits (phase 9)
};

/** Numéro d'image dans plants.png pour un stade donné (0 = premier stade). */
export function cropFrame(crop: CropDef, stage: number): number {
  return crop.row * 6 + 1 + Math.min(stage, crop.stages - 1);
}

/** Numéro d'image de l'objet récolté. */
export function cropItemFrame(crop: CropDef): number {
  return crop.row * 6 + 5;
}
