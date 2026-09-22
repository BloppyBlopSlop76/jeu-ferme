// Constantes globales du jeu. Un seul endroit à modifier quand on change une valeur de base.

/** Résolution logique du jeu (en pixels). Phaser l'adapte ensuite à la taille réelle de l'écran. */
export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 270;

/** Taille d'une tuile de la carte, en pixels. Décidée en phase 0. */
export const TILE_SIZE = 16;

/** Vitesse de déplacement du personnage, en pixels par seconde. */
export const PLAYER_SPEED = 80;

/** Chemin de base des fichiers (images, cartes). Vite le règle selon l'hébergement. */
export const ASSETS_URL = `${import.meta.env.BASE_URL}assets/`;

/** Version affichée à l'écran, à mettre à jour à chaque étape validée. */
export const GAME_VERSION = 'v0.3.2 — phase 4';
