// Constantes globales du jeu. Un seul endroit à modifier quand on change une valeur de base.

/** Résolution logique du jeu (en pixels). Phaser l'adapte ensuite à la taille réelle de l'écran. */
export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 270;

/** Taille d'une tuile de la carte, en pixels. Décidée en phase 0. */
export const TILE_SIZE = 16;

/** Taille du monde de test (phase 2), en tuiles. Sera remplacée par les cartes Tiled en phase 3. */
export const WORLD_TILES_X = 80;
export const WORLD_TILES_Y = 45;

/** Vitesse de déplacement du personnage, en pixels par seconde. */
export const PLAYER_SPEED = 90;

/** Version affichée à l'écran, à mettre à jour à chaque étape validée. */
export const GAME_VERSION = 'v0.1 — phase 2';
