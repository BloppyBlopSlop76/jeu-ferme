// État du jeu : des données pures, sans aucune référence à Phaser.
// Tout ce qui décrit « où en est le joueur » vit ici. Les scènes lisent et écrivent cet état ;
// c'est ce qui est sauvegardé (phase 5) et ce que le serveur contrôlera en phase 13.

import type { Appearance } from '../data/appearance';

export type LocationId = 'world' | 'house' | 'village';

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
  /** Arrosée ? Une plante arrosée gagne un stade à chaque nuit passée. */
  watered: boolean;
  /** Nuits passées depuis le dernier changement de stade. */
  nights: number;
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

/** Horloge du jeu. La journée commence à 6 h ; le jour change à minuit. */
export interface TimeState {
  /** Numéro du jour (1 = premier jour). */
  day: number;
  /** Minute de la journée, 0..1439 (360 = 6 h 00). */
  minute: number;
  /** Heure réelle (Date.now()) du dernier avancement : l'horloge rattrape le temps passé en pause. */
  lastRealMs: number;
}

/** Progression d'une compétence : seule l'XP est stockée, le niveau s'en déduit (SkillSystem). */
export interface SkillState {
  xp: number;
}

/** Le personnage : prénom et trait de caractère (phase 8). trait = null tant qu'il n'a pas été choisi. */
export interface CharacterState {
  name: string;
  trait: string | null;
  /** Apparence (phase 8) ; null tant qu'elle n'a pas été choisie → écran « Ton apparence ». */
  appearance: Appearance | null;
}

/** Ce qui est posé dans la maison (phase 9) : le lit, en coordonnées de tuiles de la pièce (case du haut). */
export interface HouseState {
  bed: { tx: number; ty: number } | null;
}

export interface GameState {
  /** Version du format de sauvegarde : à augmenter quand la structure change. */
  version: number;
  location: LocationId;
  player: PlayerState;
  farm: Record<string, PlotState>;
  inventory: InventoryState;
  settings: SettingsState;
  time: TimeState;
  /** Énergie, de 0 à ENERGY_MAX. Jamais bloquante : à 0 on marche plus lentement, c'est tout. */
  energy: number;
  /** Compétences (phase 8) : clé = identifiant de compétence (data/skills.ts). */
  skills: Record<string, SkillState>;
  character: CharacterState;
  /** Pièces (phase 9). */
  money: number;
  /** Objets déposés dans les boîtes d'expédition, payés le lendemain matin. */
  shipping: ItemStack[];
  house: HouseState;
  /** Graine plantée par le bouton d'action (choisie dans le sac). */
  selectedSeed: string;
}

export const INVENTORY_SIZE = 20;
export const ENERGY_MAX = 100;
export const DAY_START_MINUTE = 6 * 60;

/** L'état d'une nouvelle partie. */
export function createDefaultState(): GameState {
  const slots: (ItemStack | null)[] = new Array(INVENTORY_SIZE).fill(null);
  slots[0] = { item: 'graine_navet', qty: 10 }; // de quoi commencer
  return {
    version: 7,
    location: 'world',
    player: { x: 0, y: 0, facing: 'down' },
    farm: {},
    inventory: { slots },
    settings: { autosave: true },
    time: { day: 1, minute: 8 * 60, lastRealMs: 0 }, // une nouvelle partie commence à 8 h, en plein jour
    energy: ENERGY_MAX,
    skills: { agriculture: { xp: 0 }, peche: { xp: 0 } },
    character: { name: '', trait: null, appearance: null },
    money: 50,
    shipping: [],
    house: { bed: null },
    selectedSeed: 'graine_navet',
  };
}

/** L'état courant. Un seul objet partagé par tout le jeu (on le remplit, on ne le remplace jamais). */
export const gameState: GameState = createDefaultState();

export const plotKey = (tx: number, ty: number): string => `${tx},${ty}`;
