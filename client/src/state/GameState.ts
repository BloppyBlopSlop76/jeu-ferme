// État du jeu : des données pures, sans aucune référence à Phaser.
// Tout ce qui décrit « où en est le joueur » vit ici. Les scènes lisent et écrivent cet état ;
// c'est ce qui sera sauvegardé en phase 5 et contrôlé par le serveur en phase 13.

export type LocationId = 'world' | 'house';

export interface PlayerState {
  x: number;
  y: number;
  facing: 'down' | 'up' | 'left' | 'right';
}

/** Une case de champ bêchée. Clé dans `farm` : "tx,ty" (coordonnées en tuiles). */
export interface PlotState {
  tx: number;
  ty: number;
  /** Culture plantée, ou null si la terre est juste bêchée. */
  crop: string | null;
  /** Stade de pousse courant (0 = graine, dernier = mûr). */
  stage: number;
  /** Arrosée pour le stade en cours ? La pousse n'avance que si c'est vrai. */
  watered: boolean;
  /** Temps accumulé vers le prochain stade, en ms. */
  progress: number;
}

export interface GameState {
  location: LocationId;
  player: PlayerState;
  farm: Record<string, PlotState>;
  /** Récoltes en poche, par culture (inventaire provisoire, remplacé en phase 5). */
  harvest: Record<string, number>;
}

/** L'état courant. Un seul objet partagé par tout le jeu. */
export const gameState: GameState = {
  location: 'world',
  player: { x: 0, y: 0, facing: 'down' },
  farm: {},
  harvest: {},
};

export const plotKey = (tx: number, ty: number): string => `${tx},${ty}`;
