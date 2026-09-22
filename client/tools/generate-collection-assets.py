# Images de la phase 9 (collections) : la carotte (rangée 2 de plants.png : sachet, 4 stades, récolte),
# la truite et la carpe (fish.png devient 48×16 : sardine, truite, carpe). Créations originales dans le style
# du pack (16×16, contours doux). Lancer : python3 tools/generate-collection-assets.py (depuis client/)

from PIL import Image, ImageDraw
import os

ASSETS = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets')
OUT = (74, 46, 36)
SOIL = (196, 150, 104)
LEAF = (110, 178, 96)
LEAF_D = (64, 116, 56)
CAR = (240, 140, 60)
CAR_D = (200, 100, 40)
BAG = (232, 200, 150)
BAG_D = (196, 150, 104)


def cell():
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)


def soil(d):
    d.ellipse((2, 11, 13, 15), fill=SOIL, outline=(160, 116, 76))


def carrot_row():
    frames = []
    # 0 : sachet de graines (même forme que ceux du pack) avec une petite carotte dessinée
    im, d = cell()
    d.rectangle((3, 2, 12, 14), fill=BAG, outline=(160, 116, 76))
    d.rectangle((4, 3, 11, 5), fill=BAG_D)
    d.polygon([(8, 7), (6, 11), (10, 11)], fill=CAR, outline=CAR_D)
    d.line((8, 6, 8, 7), fill=LEAF)
    frames.append(im)
    # 1 : pousse (deux feuilles)
    im, d = cell(); soil(d)
    d.line((8, 12, 8, 9), fill=LEAF_D); d.point((7, 9), fill=LEAF); d.point((9, 9), fill=LEAF); d.point((8, 8), fill=LEAF)
    frames.append(im)
    # 2 : fanes moyennes
    im, d = cell(); soil(d)
    for x in (6, 8, 10):
        d.line((x, 12, x, 7), fill=LEAF_D); d.point((x - 1, 7), fill=LEAF); d.point((x + 1, 7), fill=LEAF); d.point((x, 6), fill=LEAF)
    frames.append(im)
    # 3 : fanes hautes
    im, d = cell(); soil(d)
    for x in (5, 8, 11):
        d.line((x, 12, x, 5), fill=LEAF_D)
        for y in (5, 7, 9):
            d.point((x - 1, y), fill=LEAF); d.point((x + 1, y), fill=LEAF)
        d.point((x, 4), fill=LEAF)
    frames.append(im)
    # 4 : mûre : fanes + haut de carotte qui dépasse
    im, d = cell(); soil(d)
    for x in (5, 8, 11):
        d.line((x, 11, x, 4), fill=LEAF_D)
        for y in (4, 6, 8):
            d.point((x - 1, y), fill=LEAF); d.point((x + 1, y), fill=LEAF)
        d.point((x, 3), fill=LEAF)
    d.rectangle((6, 11, 10, 13), fill=CAR, outline=CAR_D)
    frames.append(im)
    # 5 : la carotte récoltée (objet)
    im, d = cell()
    d.polygon([(4, 5), (12, 5), (8, 15)], fill=CAR, outline=(255, 255, 255))
    d.line((6, 8, 10, 8), fill=CAR_D); d.line((7, 11, 9, 11), fill=CAR_D)
    d.line((8, 4, 8, 1), fill=LEAF_D); d.line((6, 3, 8, 4), fill=LEAF); d.line((10, 3, 8, 4), fill=LEAF)
    frames.append(im)
    return frames


def fish(kind):
    im, d = cell()
    if kind == 'truite':
        body, dark, belly = (200, 150, 120), (130, 90, 70), (240, 210, 190)
    else:  # carpe
        body, dark, belly = (232, 170, 70), (170, 110, 40), (250, 220, 150)
    d.ellipse((2, 5, 12, 11), fill=body, outline=OUT)        # corps
    d.polygon([(12, 8), (15, 5), (15, 11)], fill=dark, outline=OUT)  # queue
    d.line((4, 10, 10, 10), fill=belly)                        # ventre clair
    d.point((4, 7), fill=(255, 255, 255)); d.point((5, 7), fill=OUT)  # œil
    if kind == 'truite':
        for x, y in ((6, 6), (8, 7), (10, 6), (7, 9)):
            d.point((x, y), fill=(220, 90, 90))                 # points roses
        d.line((6, 5, 8, 4), fill=dark)                         # nageoire dorsale
    else:
        d.line((5, 5, 9, 4), fill=dark); d.line((7, 4, 7, 5), fill=dark)  # dorsale plus haute
        d.point((3, 9), fill=(255, 200, 120)); d.point((3, 10), fill=dark)  # barbillon
        d.line((6, 8, 9, 8), fill=dark)                         # écailles
    return im


def main():
    plants = Image.open(os.path.join(ASSETS, 'plants.png')).convert('RGBA')
    if plants.height < 48:
        sheet = Image.new('RGBA', (96, 48), (0, 0, 0, 0))
        sheet.alpha_composite(plants, (0, 0))
    else:
        sheet = plants
    for i, fr in enumerate(carrot_row()):
        sheet.paste((0, 0, 0, 0), (i * 16, 32, i * 16 + 16, 48))
        sheet.alpha_composite(fr, (i * 16, 32))
    sheet.save(os.path.join(ASSETS, 'plants.png'))
    fishes = Image.new('RGBA', (48, 16), (0, 0, 0, 0))
    old = Image.open(os.path.join(ASSETS, 'fish.png')).convert('RGBA').crop((0, 0, 16, 16))
    fishes.alpha_composite(old, (0, 0))
    fishes.alpha_composite(fish('truite'), (16, 0))
    fishes.alpha_composite(fish('carpe'), (32, 0))
    fishes.save(os.path.join(ASSETS, 'fish.png'))
    print('écrit plants.png (96×48) et fish.png (48×16)')


if __name__ == '__main__':
    main()
