// État du jeu : des données pures, sans aucune référence à Phaser.
// Tout ce qui décrit « où en est le joueur » vit ici. Les scènes lisent et écrivent cet état ;
// c'est ce qui sera sauvegardé en phase 5 et contrôlé par le serveur en phase 13.

export type LocationId = 'world' | 'house';

export interface PlayerState {
  x: number;
  y: number;
  facing: 'down' | 'up' | 'left' | 'right';
}

export interface GameState {
  location: LocationId;
  player: PlayerState;
}

/** L'état courant. Un seul objet partagé par tout le jeu. */
export const gameState: GameState = {
  location: 'world',
  player: { x: 0, y: 0, facing: 'down' },
};
