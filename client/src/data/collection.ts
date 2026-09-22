// Le musée (phase 9) : ce qui se collectionne, dans l'ordre d'affichage, et les récompenses par palier.
// Des données, pas du code : ajouter un objet collectionnable = une ligne.

export const COLLECTIBLES: string[] = ['navet', 'carotte', 'ble', 'sardine', 'truite', 'carpe'];

/** Récompense (pièces) quand la collection atteint ce nombre de pièces exposées. */
export const COLLECTION_REWARDS: { count: number; coins: number; texte: string }[] = [
  { count: 2, coins: 50, texte: 'Le musée rouvre une vitrine !' },
  { count: 4, coins: 100, texte: 'Les visiteurs reviennent au musée.' },
  { count: 6, coins: 300, texte: 'Collection complète : le musée retrouve sa gloire !' },
];
