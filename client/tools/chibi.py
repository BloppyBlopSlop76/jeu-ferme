# Générateur du personnage (création originale, pixel art 48×48, en couches).
# Style demandé par Anthony (22/09) : humain chibi chaleureux et mignon dans les codes de Stardew Valley
# (grosse tête, grands yeux, contours bruns doux), sans rien copier. Couleurs libres pour la peau,
# les cheveux, le t-shirt et les yeux ; 4 visages ; 4 coiffures. Les nuances (ombre, lumière) sont
# calculées à partir de la couleur choisie : ajouter une couleur = ajouter une ligne dans le jeu.
#
# Usage : python3 tools/chibi.py preview → tools/chibi-preview.png (planche de design)
#         python3 tools/chibi.py sheets  → public/assets/chibi/*.png (feuilles par couche, 4 dir × 4 images)
#
# Chaque couche est dessinée à partir de « cartes » de caractères (une lettre = un pixel) :
#   . = transparent   o = contour   s = base   S = ombre   L = lumière
#   pour les yeux : w = blanc, i = iris (couleur choisie), p = pupille, k = reflet
#   b = joues (rose), m = bouche

from PIL import Image
import sys, os

W = H = 48
CX = 24              # centre horizontal
HEAD_Y = 17          # haut de la tête (image de repos) : pieds à y = 40
OUTLINE = (74, 46, 36)          # brun chaud
OUTLINE_SOFT = (120, 80, 62)
SHADOW = (0, 0, 0, 38)
BLUSH = (247, 160, 150)
MOUTH = (172, 84, 84)
MOUTH_OPEN = (120, 50, 60)
EYE_WHITE = (255, 251, 244)
PUPIL = (40, 30, 42)
PANTS = (86, 78, 110)
SHOES = (92, 62, 46)

# Couleurs proposées à la création (base). Les nuances sont dérivées.
SKINS = {'porcelaine': (255, 226, 204), 'pêche': (245, 204, 172), 'doré': (222, 176, 132), 'caramel': (184, 130, 92), 'cacao': (128, 84, 58)}
HAIRS = {'châtain': (128, 84, 52), 'blond': (240, 204, 110), 'roux': (216, 108, 52), 'noir': (54, 46, 58), 'gris': (176, 176, 184), 'bleu': (92, 132, 210), 'rose': (232, 130, 170), 'vert': (92, 170, 120)}
SHIRTS = {'vert': (110, 178, 96), 'rouge': (222, 96, 84), 'bleu': (96, 144, 216), 'jaune': (240, 200, 88), 'violet': (160, 112, 200), 'blanc': (240, 236, 228), 'orange': (240, 150, 70)}
EYES = {'noisette': (140, 92, 52), 'vert': (92, 150, 90), 'bleu': (82, 130, 200), 'ambre': (208, 150, 60), 'gris': (120, 128, 140), 'violet': (150, 100, 180)}

FACES = ['doux', 'malicieux', 'étoilé', 'calme']
HAIR_STYLES = ['court', 'long', 'couettes', 'bouclé']


def shade(c, f):
    return tuple(max(0, min(255, int(v * f))) for v in c)


def light(c, f=0.18):
    return tuple(max(0, min(255, int(v + (255 - v) * f))) for v in c)


def blit_map(img, rows, ox, oy, palette, mirror=False):
    """Pose une carte de caractères sur l'image (ox, oy = coin haut gauche)."""
    px = img.load()
    for j, row in enumerate(rows):
        if mirror:
            row = row[::-1]
        for i, ch in enumerate(row):
            if ch == '.':
                continue
            c = palette.get(ch)
            if c is None:
                continue
            x, y = ox + i, oy + j
            if 0 <= x < W and 0 <= y < H:
                px[x, y] = c if len(c) == 4 else (*c, 255)


# ---------------------------------------------------------------- tête : 14 × 13, ronde, menton fin
HEAD = [
    '....oooooo....',
    '..oossssssoo..',
    '.osssssssssso.',
    'osssssssssssso',
    'osssssssssssso',
    'osssssssssssso',
    'osssssssssssso',
    'osssssssssssso',
    'osssssssssssso',
    '.oSssssssssSo.',
    '..oSSssssSSo..',
    '...ooSSSSoo...',
    '.....oooo.....',
]
HEAD_W, HEAD_H = 14, 13

# ---------------------------------------------------------------- visages (14 × 13, calés sur la tête)
FACE_DOWN = {
    'doux': [
        '..............',
        '..............',
        '..............',
        '..............',
        '...oo....oo...',
        '..owwo..owwo..',
        '..oiko..oiko..',
        '..oipo..oipo..',
        '.bopio..opiob.',
        '...oo....oo...',
        '......mm......',
        '..............',
        '..............',
    ],
    'malicieux': [
        '..............',
        '..............',
        '..............',
        '..............',
        '..............',
        '...oo....oo...',
        '..oiio..oiio..',
        '..okpo..okpo..',
        '.b.oo....oo.b.',
        '.....m..m.....',
        '......mm......',
        '..............',
        '..............',
    ],
    'étoilé': [
        '..............',
        '..............',
        '..............',
        '...oo....oo...',
        '..okwo..okwo..',
        '..oiio..oiio..',
        '..okio..okio..',
        '..oppo..oppo..',
        '.b.oo....oo.b.',
        '......mm......',
        '......mm......',
        '..............',
        '..............',
    ],
    'calme': [
        '..............',
        '..............',
        '..............',
        '..............',
        '..............',
        '..oooo..oooo..',
        '..oiko..oiko..',
        '..oipo..oipo..',
        '.b.oo....oo.b.',
        '..............',
        '......mm......',
        '..............',
        '..............',
    ],
}
# De côté (regard à droite ; miroir pour la gauche) : un œil vers l'avant, petit nez, bouche.
FACE_SIDE = {
    'doux': [
        '..............',
        '..............',
        '..............',
        '..............',
        '.........oo...',
        '........owwo..',
        '........oiko..',
        '........oipo..',
        '....b...opioS.',
        '.........oo...',
        '..........mm..',
        '..............',
        '..............',
    ],
    'malicieux': [
        '..............',
        '..............',
        '..............',
        '..............',
        '..............',
        '.........oo...',
        '........oiio..',
        '........okpo..',
        '....b....oo.S.',
        '.........m.m..',
        '..........m...',
        '..............',
        '..............',
    ],
    'étoilé': [
        '..............',
        '..............',
        '..............',
        '.........oo...',
        '........okwo..',
        '........oiio..',
        '........okio..',
        '........oppo..',
        '....b....oo.S.',
        '..........mm..',
        '..........mm..',
        '..............',
        '..............',
    ],
    'calme': [
        '..............',
        '..............',
        '..............',
        '..............',
        '..............',
        '........oooo..',
        '........oiko..',
        '........oipo..',
        '....b....oo.S.',
        '..............',
        '..........mm..',
        '..............',
        '..............',
    ],
}

# ---------------------------------------------------------------- coiffures : cartes 20 de large, origine (CX-10, HEAD_Y-4)
# La tête occupe les colonnes 3..16 de la carte ; la rangée 4 de la carte = haut de la tête.
E = '....................'
HAIR_DOWN = {
    'court': [
        '........o.o.........',
        '......oosoosoo......',
        '.....ossssssssoo....',
        '....osLssssssssso...',
        '...osLLsssssssssso..',
        '...osLssssssssssso..',
        '...oSsssssssssssSo..',
        '...oSSsssSSssSSSo...',
        '....oSo.oSo..oSo....',
    ],
    'long': [
        E,
        '......oooooooo......',
        '....oossssssssoo....',
        '...osLssssssssssso..',
        '...osLLsssssssssso..',
        '...osLssssssssssso..',
        '...oSsssssssssssSo..',
        '...oSSsssSSsssSSSo..',
        '...oSSo.oSo..oSSo...',
        '...oSSo......oSSo...',
        '...oSSo......oSSo...',
        '...oSSo......oSSo...',
        '...oSSo......oSSo...',
        '...oSSo......oSSo...',
        '...oSSo......oSSo...',
        '...osso......osso...',
        '....oo........oo....',
    ],
    'couettes': [
        E,
        '......oooooooo......',
        '....oossssssssoo....',
        '...osLssssssssssso..',
        '...osLLsssssssssso..',
        '..oosLsssssssssssoo.',
        '.osSossssssssssoSso.',
        '.osSoSssssssssSoSso.',
        '.osSoSSssSSssSSoSso.',
        '.osSo.oSo..oSo.oSso.',
        '.osSo..........oSso.',
        '.osSo..........oSso.',
        '.osso..........osso.',
        '..oo............oo..',
    ],
    'bouclé': [
        '......oooooooo......',
        '....oossssssssoo....',
        '...osssLssssssssso..',
        '..osssLLssssssssso..',
        '..osssssssssssssso..',
        '..oSssssssssssssSo..',
        '..oSSssssssssssSSo..',
        '..oSSSssSSssSSSSSo..',
        '...oSSSooSSooSSSo...',
        '....ooo..oo..ooo....',
    ],
}
HAIR_SIDE = {
    'court': [
        '........o.o.........',
        '......oosoosoo......',
        '.....ossssssssoo....',
        '....osLssssssssso...',
        '...osLLsssssssssso..',
        '...osLssssssssssso..',
        '...oSssssssssssSsSo.',
        '...oSSssssssssSSSSo.',
        '....oSSSSo.....oSSo.',
        '.....oooo...........',
    ],
    'long': [
        E,
        '......oooooooo......',
        '....oossssssssoo....',
        '...osLssssssssssso..',
        '...osLLsssssssssso..',
        '...osLssssssssssso..',
        '...oSssssssssssSsSo.',
        '...oSSssssssssSSSSo.',
        '...oSSSo.......oSSo.',
        '...oSSSo............',
        '...oSSSo............',
        '...oSSSo............',
        '...oSSSo............',
        '...oSSSo............',
        '...oSSSo............',
        '...osso.............',
        '....oo..............',
    ],
    'couettes': [
        E,
        '......oooooooo......',
        '....oossssssssoo....',
        '...osLssssssssssso..',
        '...osLLsssssssssso..',
        '..oosLssssssssssso..',
        '.oosSssssssssssSsSo.',
        'osSoSSssssssssSSSSo.',
        'osSoSSSo.......oSSo.',
        'osSo.ooo............',
        'osSo................',
        'osSo................',
        'osso................',
        '.oo.................',
    ],
    'bouclé': [
        '......oooooooo......',
        '....oossssssssoo....',
        '...osssLssssssssso..',
        '..osssLLssssssssso..',
        '..osssssssssssssso..',
        '..oSssssssssssssSo..',
        '..oSSssssssssssSSo..',
        '..oSSSssSSssSSSSSo..',
        '...oSSSooSSSo.......',
        '....ooo..ooo........',
    ],
}
HAIR_UP = {
    'court': [
        '........o.o.........',
        '......oosoosoo......',
        '.....ossssssssoo....',
        '....osLssssssssso...',
        '...osLLsssssssssso..',
        '...osLssssssssssso..',
        '...oSsssssssssssSo..',
        '...oSsssssssssssSo..',
        '...oSsssssssssssSo..',
        '...oSsssssssssssSo..',
        '...oSsssssssssssSo..',
        '...oSsssssssssssSo..',
        '....oSSSSSSSSSSSo...',
        '.....oooooooooo.....',
    ],
    'long': [
        E,
        '......oooooooo......',
        '....oossssssssoo....',
        '...osLssssssssssso..',
        '...osLLsssssssssso..',
        '...osLssssssssssso..',
        '...oSsssssssssssSo..',
        '...oSsssssssssssSo..',
        '...oSsssssssssssSo..',
        '...oSsssssssssssSo..',
        '...oSSsssssssssSSo..',
        '...oSSSsssssssSSSo..',
        '...oSSSSsssssSSSSo..',
        '...oSSSSSSSSSSSSSo..',
        '...oSSSSSSSSSSSSSo..',
        '...osssssssssssssso.',
        '....oooooooooooooo..',
    ],
    'couettes': [
        E,
        '......oooooooo......',
        '....oossssssssoo....',
        '...osLssssssssssso..',
        '...osLLsssssssssso..',
        '..oosLsssssssssssoo.',
        '.osSossssssssssoSso.',
        '.osSoSssssssssSoSso.',
        '.osSoSsssssssssoSso.',
        '.osSoSSSSSSSSSSoSso.',
        '.osSooooooooooooSso.',
        '.osSo..........oSso.',
        '.osso..........osso.',
        '..oo............oo..',
    ],
    'bouclé': [
        '......oooooooo......',
        '....oossssssssoo....',
        '...osssLssssssssso..',
        '..osssLLssssssssso..',
        '..osssssssssssssso..',
        '..oSssssssssssssSo..',
        '..oSSssssssssssSSo..',
        '..oSSSSSSSSSSSSSSo..',
        '..oSSSSSSSSSSSSSSo..',
        '...oSSSSSSSSSSSSo...',
        '....oooooooooooo....',
    ],
}


# ---------------------------------------------------------------- corps (procédural)
# Deux couches : la base (ombre, pantalon, chaussures, nuque, tête, mains — la peau) et le t-shirt (torse + manches).
def _tools(img):
    px = img.load()

    def put(x, y, c):
        if 0 <= x < W and 0 <= y < H:
            px[x, y] = c if len(c) == 4 else (*c, 255)

    def box(x0, y0, x1, y1, fill, outline=OUTLINE):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                edge = x in (x0, x1) or y in (y0, y1)
                put(x, y, outline if edge else fill)

    return put, box


def _layout(frame):
    bob = 1 if frame in (1, 3) else 0
    step = [0, 1, 0, -1][frame]
    ny = HEAD_Y + HEAD_H - bob       # rangée de la nuque (juste sous le menton)
    ty = ny + 1                      # haut du t-shirt
    ly = ty + 5                      # haut du pantalon (t-shirt de 6 rangées)
    return bob, step, ny, ty, ly


def draw_base(img, direction, frame, skin):
    put, box = _tools(img)
    bob, step, ny, ty, ly = _layout(frame)
    sk_s = shade(skin, 0.82)
    # Ombre au sol
    for x in range(CX - 6, CX + 6):
        for y in (40, 41):
            if (x - CX + 0.5) ** 2 / 36 + (y - 40.5) ** 2 / 1.2 <= 1:
                put(x, y, SHADOW)
    # Nuque
    put(CX - 1, ny, sk_s); put(CX, ny, sk_s); put(CX - 2, ny, OUTLINE); put(CX + 1, ny, OUTLINE)
    if direction in ('down', 'up'):
        box(CX - 4, ly + max(0, step), CX - 1, ly + 3, PANTS)
        box(CX + 0, ly + max(0, -step), CX + 3, ly + 3, PANTS)
        for x in range(CX - 4, CX + 4):
            put(x, ly + 3, SHOES)
            put(x, ly + 4, OUTLINE)
        put(CX - 4, ly + 3, OUTLINE); put(CX + 3, ly + 3, OUTLINE)
        # mains (sous les manches)
        for side, ax in ((-1, CX - 7), (1, CX + 5)):
            sw = step * side
            put(ax, ty + 4 + sw, skin); put(ax + 1, ty + 4 + sw, skin)
            put(ax, ty + 5 + sw, OUTLINE); put(ax + 1, ty + 5 + sw, OUTLINE)
            put(ax - 1, ty + 4 + sw, OUTLINE); put(ax + 2, ty + 4 + sw, OUTLINE)
    else:
        s = 1 if direction == 'right' else -1
        box(CX - 3 - s * step, ly, CX + 0 - s * step, ly + 3, PANTS)
        box(CX - 1 + s * step, ly, CX + 2 + s * step, ly + 3, PANTS)
        for x in range(CX - 3 - s * step, CX + 1 - s * step):
            put(x, ly + 3, SHOES); put(x, ly + 4, OUTLINE)
        for x in range(CX - 1 + s * step, CX + 3 + s * step):
            put(x, ly + 3, SHOES); put(x, ly + 4, OUTLINE)
        ax = CX + s * 1 + s * step
        put(ax - 1, ty + 3, OUTLINE); put(ax + 1, ty + 3, OUTLINE); put(ax, ty + 3, skin)
        put(ax, ty + 4, OUTLINE)
    # Tête (peau)
    hy = HEAD_Y - bob
    blit_map(img, HEAD, CX - 7, hy, {'o': OUTLINE, 's': skin, 'S': shade(skin, 0.86)})


def draw_shirt(img, direction, frame, shirt):
    put, box = _tools(img)
    bob, step, ny, ty, ly = _layout(frame)
    sh_s = shade(shirt, 0.72)
    sh_l = light(shirt, 0.22)
    if direction in ('down', 'up'):
        box(CX - 5, ty, CX + 4, ly, shirt)
        for x in range(CX - 4, CX + 4):
            put(x, ly - 1, sh_s)
        put(CX - 3, ty + 1, sh_l); put(CX - 2, ty + 1, sh_l)
        if direction == 'down':
            put(CX - 1, ty, sh_s); put(CX, ty, sh_s)   # encolure
        for side, ax in ((-1, CX - 7), (1, CX + 5)):
            sw = step * side
            box(ax - 1, ty + 1 + sw, ax + 2, ty + 3 + sw, shirt)   # manche courte
    else:
        s = 1 if direction == 'right' else -1
        box(CX - 4, ty, CX + 3, ly, shirt)
        for x in range(CX - 3, CX + 3):
            put(x, ly - 1, sh_s)
        ax = CX + s * 1 + s * step
        box(ax - 1, ty + 1, ax + 1, ty + 2, shirt)


def draw_face(img, direction, frame, face, eye):
    bob = 1 if frame in (1, 3) else 0
    hy = HEAD_Y - bob
    hx = CX - 7
    fpal = {'o': OUTLINE, 'w': EYE_WHITE, 'i': eye, 'p': PUPIL, 'k': (255, 255, 255), 'b': BLUSH,
            'm': MOUTH if face != 'étoilé' else MOUTH_OPEN, 'S': OUTLINE_SOFT}
    if direction == 'down':
        blit_map(img, FACE_DOWN[face], hx, hy, fpal)
    elif direction in ('left', 'right'):
        blit_map(img, FACE_SIDE[face], hx, hy, fpal, mirror=(direction == 'left'))


def draw_hair(img, direction, frame, style, color):
    bob = 1 if frame in (1, 3) else 0
    pal = {'o': OUTLINE, 's': color, 'S': shade(color, 0.76), 'L': light(color, 0.28)}
    ox, oy = CX - 10, HEAD_Y - 4 - bob
    if direction == 'down':
        blit_map(img, HAIR_DOWN[style], ox, oy, pal)
    elif direction == 'up':
        blit_map(img, HAIR_UP[style], ox, oy, pal)
    else:
        blit_map(img, HAIR_SIDE[style], ox, oy, pal, mirror=(direction == 'left'))


def compose(direction, frame, skin, face, eye, style, hair, shirt):
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    draw_base(img, direction, frame, skin)
    draw_shirt(img, direction, frame, shirt)
    draw_face(img, direction, frame, face, eye)
    draw_hair(img, direction, frame, style, hair)
    return img


def preview():
    scale = 5
    bg = (118, 172, 92, 255)
    combos = [
        # peau, visage, yeux, coiffure, cheveux, t-shirt
        ('pêche', 'doux', 'noisette', 'court', 'châtain', 'vert'),
        ('porcelaine', 'malicieux', 'bleu', 'long', 'blond', 'rouge'),
        ('cacao', 'étoilé', 'ambre', 'couettes', 'noir', 'jaune'),
        ('doré', 'calme', 'vert', 'bouclé', 'roux', 'bleu'),
        ('caramel', 'doux', 'gris', 'long', 'rose', 'violet'),
        ('porcelaine', 'étoilé', 'violet', 'court', 'bleu', 'blanc'),
        ('pêche', 'malicieux', 'noisette', 'bouclé', 'gris', 'orange'),
        ('doré', 'calme', 'bleu', 'couettes', 'vert', 'vert'),
    ]
    cols = len(combos)
    sheet = Image.new('RGBA', (W * cols, H * 3), bg)
    for i, c in enumerate(combos):
        sheet.alpha_composite(compose('down', 0, SKINS[c[0]], c[1], EYES[c[2]], c[3], HAIRS[c[4]], SHIRTS[c[5]]), (i * W, 0))
    # Ligne 2 : le 1er personnage sous 4 angles + 2 pas
    c = combos[0]
    args = (SKINS[c[0]], c[1], EYES[c[2]], c[3], HAIRS[c[4]], SHIRTS[c[5]])
    seq = [('down', 0), ('left', 0), ('right', 0), ('up', 0), ('down', 1), ('down', 3), ('right', 1), ('right', 3)]
    for i, (d, f) in enumerate(seq):
        sheet.alpha_composite(compose(d, f, *args), (i * W, H))
    # Ligne 3 : les 4 visages en gros plan (même perso), puis les 4 coiffures de côté
    for i, face in enumerate(FACES):
        sheet.alpha_composite(compose('down', 0, SKINS['pêche'], face, EYES['bleu'], 'court', HAIRS['châtain'], SHIRTS['vert']), (i * W, 2 * H))
    for i, style in enumerate(HAIR_STYLES):
        sheet.alpha_composite(compose('right', 0, SKINS['pêche'], 'doux', EYES['bleu'], style, HAIRS['châtain'], SHIRTS['vert']), ((4 + i) * W, 2 * H))
    sheet = sheet.resize((sheet.width * scale, sheet.height * scale), Image.NEAREST)
    out = os.path.join(os.path.dirname(__file__), 'chibi-preview.png')
    sheet.save(out)
    print('écrit', out)


DIRS = ['down', 'up', 'left', 'right']   # même ordre de rangées que Player.ts
SLUG = {'châtain': 'chatain', 'pêche': 'peche', 'doré': 'dore', 'étoilé': 'etoile', 'bouclé': 'boucle'}


def slug(name):
    return SLUG.get(name, name)


def sheet(draw):
    """Feuille 4 rangées (bas, haut, gauche, droite) × 4 images."""
    img = Image.new('RGBA', (W * 4, H * 4), (0, 0, 0, 0))
    for r, d in enumerate(DIRS):
        for f in range(4):
            cell = Image.new('RGBA', (W, H), (0, 0, 0, 0))
            draw(cell, d, f)
            img.alpha_composite(cell, (f * W, r * H))
    return img


def sheets():
    out = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'chibi')
    os.makedirs(out, exist_ok=True)
    n = 0
    for name, c in SKINS.items():
        sheet(lambda im, d, f, c=c: draw_base(im, d, f, c)).save(os.path.join(out, f'base_{slug(name)}.png')); n += 1
    for name, c in SHIRTS.items():
        sheet(lambda im, d, f, c=c: draw_shirt(im, d, f, c)).save(os.path.join(out, f'shirt_{slug(name)}.png')); n += 1
    for face in FACES:
        for ename, ec in EYES.items():
            sheet(lambda im, d, f, face=face, ec=ec: draw_face(im, d, f, face, ec)).save(os.path.join(out, f'face_{slug(face)}_{slug(ename)}.png')); n += 1
    for style in HAIR_STYLES:
        for hname, hc in HAIRS.items():
            sheet(lambda im, d, f, style=style, hc=hc: draw_hair(im, d, f, style, hc)).save(os.path.join(out, f'hair_{slug(style)}_{slug(hname)}.png')); n += 1
    # Liste des identifiants, à recopier dans src/data/appearance.ts
    import json
    manifest = {
        'skins': {slug(k): '#%02x%02x%02x' % v for k, v in SKINS.items()},
        'hairColors': {slug(k): '#%02x%02x%02x' % v for k, v in HAIRS.items()},
        'shirts': {slug(k): '#%02x%02x%02x' % v for k, v in SHIRTS.items()},
        'eyes': {slug(k): '#%02x%02x%02x' % v for k, v in EYES.items()},
        'faces': [slug(f) for f in FACES], 'hairStyles': [slug(h) for h in HAIR_STYLES],
    }
    with open(os.path.join(out, 'manifest.json'), 'w', encoding='utf-8') as fh:
        json.dump(manifest, fh, ensure_ascii=False, indent=1)
    print('écrit', n, 'feuilles dans', os.path.abspath(out))


if __name__ == '__main__':
    if sys.argv[1:] == ['preview']:
        preview()
    elif sys.argv[1:] == ['sheets']:
        sheets()
