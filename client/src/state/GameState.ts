// État du jeu : des données pures, sans aucune référence à Phaser.
// Tout ce qui décrit « où en est le joueur » vit ici. Les scènes lisent et écrivent cet état ;
// c'est ce qui est sauvegardé (phase 5) et ce que le serveur contrôlera en phase 13.

export type LocationId = 'world' | 'house';

export interface PlayerState {
  x: number;
  y: number;
  facing: 'down' | 'up' | 'left' | 'right';
}

/** Une case de terre plantée. Clé dans `farm` : "tx,ty" (coordonnées en tuiles). */
export interface PlotState {
  tx: number;
  ty: number;
  crop: string | null;
  /** Stade de pousse courant (0 = graine, dernier = mûr). */
  stage: number;
  watered: boolean;
  /** Heure de l'arrosage (ms, Date.now()) ou null ; la pousse se calcule sur le temps réel écoulé. */
  wateredAt: number | null;
}

/** Une pile d'objets dans une case d'inventaire. */
export interface ItemStack {
  item: string;
  qty: number;
}

export interface InventoryState {
  /** Cases dans l'ordre d'affichage ; null = case vide. */
  slots: (ItemStack | null)[];
}

export interface SettingsState {
  autosave: boolean;
}

export interface GameState {
  /** Version du format de sauvegarde : à augmenter quand la structure change. */
  version: number;
  location: LocationId;
  player: PlayerState;
  farm: Record<string, PlotState>;
  inventory: InventoryState;
  settings: SettingsState;
}

export const INVENTORY_SIZE = 20;

/** L'état d'une nouvelle partie. */
export function createDefaultState(): GameState {
  const slots: (ItemStack | null)[] = new Array(INVENTORY_SIZE).fill(null);
  slots[0] = { item: 'graine_navet', qty: 10 }; // de quoi commencer
  return {
    version: 1,
    location: 'world',
    player: { x: 0, y: 0, facing: 'down' },
    farm: {},
    inventory: { slots },
    settings: { autosave: true },
  };
}

/** L'état courant. Un seul objet partagé par tout le jeu (on le remplit, on ne le remplace jamais). */
export const gameState: GameState = createDefaultState();

export const plotKey = (tx: number, ty: number): string => `${tx},${ty}`;
