// Définition des objets. Des données, pas du code : ajouter un objet = ajouter une ligne.
// Les icônes viennent de plants.png (Sprout Lands) : rangée × 6 + colonne (0 = sachet, 5 = récolte).

export type ItemKind = 'seed' | 'crop' | 'fish';

export interface ItemDef {
  id: string;
  nom: string;
  kind: ItemKind;
  /** Texture et numéro d'image de l'icône (16×16). */
  icon: { texture: string; frame: number };
  /** Quantité maximale par case d'inventaire. */
  stackMax: number;
  /** Pour une graine : la culture qu'elle plante. */
  crop?: string;
}

export const ITEMS: Record<string, ItemDef> = {
  graine_navet: { id: 'graine_navet', nom: 'Graine de navet', kind: 'seed', icon: { texture: 'plants', frame: 6 }, stackMax: 99, crop: 'navet' },
  navet: { id: 'navet', nom: 'Navet', kind: 'crop', icon: { texture: 'plants', frame: 11 }, stackMax: 99 },
  graine_ble: { id: 'graine_ble', nom: 'Graine de blé', kind: 'seed', icon: { texture: 'plants', frame: 0 }, stackMax: 99, crop: 'ble' },
  ble: { id: 'ble', nom: 'Blé', kind: 'crop', icon: { texture: 'plants', frame: 5 }, stackMax: 99 },
  sardine: { id: 'sardine', nom: 'Sardine', kind: 'fish', icon: { texture: 'fish', frame: 0 }, stackMax: 99 },
};
