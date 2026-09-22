# Images de la phase 9 (économie) : boutique (variante de la maison Sprout Lands), boîte d'expédition,
# PNJ marchand (généré avec chibi.py, création originale) et pièce.
# Lancer : python3 tools/generate-economy-assets.py   (depuis le dossier client)

from PIL import Image, ImageDraw
import os, sys, colorsys

sys.path.insert(0, os.path.dirname(__file__))
import chibi  # noqa: E402

ASSETS = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets')


def shop():
    """Boutique : la maison Sprout Lands avec un toit rouge-brique, un auvent rayé et une enseigne."""
    im = Image.open(os.path.join(ASSETS, 'house.png')).convert('RGBA')
    px = im.load()
    for y in range(0, 48):           # le toit occupe le haut
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if s > 0.25:              # tuiles orangées → rouge brique
                h = (h - 0.06) % 1.0
                s = min(1.0, s * 1.15)
                v = v * 0.92
                r2, g2, b2 = colorsys.hsv_to_rgb(h, s, v)
                px[x, y] = (int(r2 * 255), int(g2 * 255), int(b2 * 255), a)
    d = ImageDraw.Draw(im)
    # Auvent rayé au-dessus de la porte / vitrine (y 48..55)
    for x in range(8, 72):
        stripe = (232, 96, 84) if (x // 4) % 2 == 0 else (247, 236, 220)
        for y in range(46, 54):
            px[x, y] = (*stripe, 255)
    d.line((8, 54, 71, 54), fill=(74, 46, 36))
    for x in range(8, 72, 4):
        px[x, 55] = (74, 46, 36, 255)
    # Enseigne : petit panneau clair avec un sac de graines stylisé
    d.rectangle((30, 56, 49, 66), fill=(247, 236, 220), outline=(74, 46, 36))
    d.rectangle((36, 58, 43, 64), fill=(110, 178, 96), outline=(64, 116, 56))
    d.point((39, 60), fill=(232, 96, 84))
    im.save(os.path.join(ASSETS, 'shop.png'))


def shipping_box():
    """Boîte d'expédition 16×16 : caisse en bois avec une fente, couvercle plus clair."""
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rectangle((1, 5, 14, 14), fill=(170, 120, 72), outline=(74, 46, 36))
    d.rectangle((0, 2, 15, 6), fill=(200, 150, 92), outline=(74, 46, 36))
    d.line((2, 9, 13, 9), fill=(120, 80, 48))
    d.line((7, 6, 7, 14), fill=(120, 80, 48))
    d.rectangle((4, 3, 11, 4), fill=(60, 40, 30))          # fente
    d.point((1, 12), fill=(120, 80, 48)); d.point((14, 12), fill=(120, 80, 48))
    im.save(os.path.join(ASSETS, 'shipping_box.png'))


def npc():
    """Le marchand : 4 images (bas) pour un léger balancement. Création originale (chibi.py)."""
    sheet = Image.new('RGBA', (48 * 4, 48), (0, 0, 0, 0))
    for f in range(4):
        cell = chibi.compose('down', f if f in (0, 1) else 0, chibi.SKINS['doré'], 'calme', chibi.EYES['ambre'], 'bouclé', chibi.HAIRS['gris'], chibi.SHIRTS['orange'])
        # tablier vert sur le t-shirt, pour le distinguer du joueur
        d = ImageDraw.Draw(cell)
        d.rectangle((21, 33, 27, 37), fill=(96, 150, 90), outline=(64, 116, 56))
        sheet.alpha_composite(cell, (f * 48, 0))
    sheet.save(os.path.join(ASSETS, 'npc_marchand.png'))


def coin():
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse((2, 2, 13, 13), fill=(240, 200, 88), outline=(160, 120, 40))
    d.ellipse((4, 4, 11, 11), outline=(255, 232, 150))
    d.rectangle((7, 5, 8, 10), fill=(200, 150, 60))
    im.save(os.path.join(ASSETS, 'coin.png'))


if __name__ == '__main__':
    shop(); shipping_box(); npc(); coin()
    print('écrit shop.png, shipping_box.png, npc_marchand.png, coin.png')
