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
  /** Arrosée ? La pousse ne démarre qu'une fois arrosée. */
  watered: boolean;
  /** Heure de l'arrosage (ms depuis 1970, Date.now()), ou null. La pousse se calcule à partir du temps réel écoulé,
   *  pour continuer même si le jeu est en pause (écran du téléphone éteint, onglet en arrière-plan). */
  wateredAt: number | null;
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
