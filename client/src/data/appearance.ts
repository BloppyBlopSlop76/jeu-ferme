// Apparence du personnage : des données, pas du code. Les feuilles d'images sont générées par
// tools/chibi.py (python3 tools/chibi.py sheets) dans public/assets/chibi/ ; les identifiants ici
// doivent correspondre à celles-ci (voir public/assets/chibi/manifest.json).
// Ajouter une couleur = une ligne ici + une ligne dans chibi.py + régénérer les feuilles.

export interface Swatch { id: string; nom: string; hex: string }
export interface Choice { id: string; nom: string }

export const SKINS: Swatch[] = [
  { id: 'porcelaine', nom: 'Porcelaine', hex: '#ffe2cc' },
  { id: 'peche', nom: 'Pêche', hex: '#f5ccac' },
  { id: 'dore', nom: 'Doré', hex: '#deb084' },
  { id: 'caramel', nom: 'Caramel', hex: '#b8825c' },
  { id: 'cacao', nom: 'Cacao', hex: '#80543a' },
];
export const FACES: Choice[] = [
  { id: 'doux', nom: 'Doux' },
  { id: 'malicieux', nom: 'Malicieux' },
  { id: 'etoile', nom: 'Étoilé' },
  { id: 'calme', nom: 'Calme' },
];
export const EYE_COLORS: Swatch[] = [
  { id: 'noisette', nom: 'Noisette', hex: '#8c5c34' },
  { id: 'vert', nom: 'Vert', hex: '#5c965a' },
  { id: 'bleu', nom: 'Bleu', hex: '#5282c8' },
  { id: 'ambre', nom: 'Ambre', hex: '#d0963c' },
  { id: 'gris', nom: 'Gris', hex: '#78808c' },
  { id: 'violet', nom: 'Violet', hex: '#9664b4' },
];
export const HAIR_STYLES: Choice[] = [
  { id: 'court', nom: 'Courte' },
  { id: 'long', nom: 'Longue' },
  { id: 'couettes', nom: 'Couettes' },
  { id: 'boucle', nom: 'Bouclée' },
];
export const HAIR_COLORS: Swatch[] = [
  { id: 'chatain', nom: 'Châtain', hex: '#805434' },
  { id: 'blond', nom: 'Blond', hex: '#f0cc6e' },
  { id: 'roux', nom: 'Roux', hex: '#d86c34' },
  { id: 'noir', nom: 'Noir', hex: '#362e3a' },
  { id: 'gris', nom: 'Gris', hex: '#b0b0b8' },
  { id: 'bleu', nom: 'Bleu', hex: '#5c84d2' },
  { id: 'rose', nom: 'Rose', hex: '#e882aa' },
  { id: 'vert', nom: 'Vert', hex: '#5caa78' },
];
export const SHIRTS: Swatch[] = [
  { id: 'vert', nom: 'Vert', hex: '#6eb260' },
  { id: 'rouge', nom: 'Rouge', hex: '#de6054' },
  { id: 'bleu', nom: 'Bleu', hex: '#6090d8' },
  { id: 'jaune', nom: 'Jaune', hex: '#f0c858' },
  { id: 'violet', nom: 'Violet', hex: '#a070c8' },
  { id: 'blanc', nom: 'Blanc', hex: '#f0ece4' },
  { id: 'orange', nom: 'Orange', hex: '#f09646' },
];

/** Ce qui est sauvegardé pour décrire le personnage. */
export interface Appearance {
  skin: string;
  face: string;
  eyes: string;
  hairStyle: string;
  hairColor: string;
  shirt: string;
}

export const DEFAULT_APPEARANCE: Appearance = { skin: 'peche', face: 'doux', eyes: 'noisette', hairStyle: 'court', hairColor: 'chatain', shirt: 'vert' };

/** Clés de textures des quatre couches, dans l'ordre de dessin (dessous → dessus). */
export function appearanceTextures(a: Appearance): string[] {
  return [`base_${a.skin}`, `shirt_${a.shirt}`, `face_${a.face}_${a.eyes}`, `hair_${a.hairStyle}_${a.hairColor}`];
}

/** Toutes les feuilles à charger au démarrage (fichier = clé + .png dans assets/chibi/). */
export function allAppearanceTextures(): string[] {
  const keys: string[] = [];
  for (const s of SKINS) keys.push(`base_${s.id}`);
  for (const s of SHIRTS) keys.push(`shirt_${s.id}`);
  for (const f of FACES) for (const e of EYE_COLORS) keys.push(`face_${f.id}_${e.id}`);
  for (const h of HAIR_STYLES) for (const c of HAIR_COLORS) keys.push(`hair_${h.id}_${c.id}`);
  return keys;
}
