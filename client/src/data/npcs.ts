// Personnages non joueurs : des données, pas du code. Ajouter un PNJ = une ligne ici + son image.
// Les images sont des créations originales générées par tools/generate-economy-assets.py (chibi.py).

export interface NpcDef {
  id: string;
  nom: string;
  /** Feuille d'images (4 cases 48×48, balancement sur les 2 premières). */
  texture: string;
  /** Ce que fait « Parler » : ouvrir la boutique, ouvrir le musée (si le sac contient une pièce à exposer, sinon parler), ou dire des phrases. */
  role: 'shop' | 'museum' | 'talk';
  /** Phrases dites l'une après l'autre (tap / E pour passer). */
  lines: string[];
}

export const NPCS: Record<string, NpcDef> = {
  marchand: { id: 'marchand', nom: 'Le marchand', texture: 'npc_marchand', role: 'shop', lines: [] },
  conservateur: {
    id: 'conservateur', nom: 'Le conservateur', texture: 'npc_conservateur', role: 'museum',
    lines: [
      'Bienvenue au vieux musée du bourg… enfin, ce qu\'il en reste.',
      'Les vitrines sont vides depuis des années. Si tu rapportes des légumes ou des poissons rares, je saurai les exposer.',
      'Reviens quand tu auras trouvé quelque chose de nouveau !',
    ],
  },
  villageoise: {
    id: 'villageoise', nom: 'Léa', texture: 'npc_villageoise', role: 'talk',
    lines: [
      'Oh, une nouvelle tête ! Tu as repris la ferme au sud ?',
      'Le bourg est calme… trop calme. On dit que d\'autres maisons vont se construire par ici.',
      'La fontaine ne marche que quand il pleut. Enfin, presque.',
    ],
  },
};
