# Test v0.11 (phase 9, musée et collections) : migration v7→v8, poissons selon l'heure, carotte en boutique,
# conservateur (dialogue sans rien à donner / panneau musée avec), dons et récompenses, onglet Collection, mobile.
# Lancer depuis client/ après `npx vite build` : python3 tools/test-collection.py
import asyncio, subprocess, time, os
from playwright.async_api import async_playwright

BASE = 'http://localhost:4173/jeu-ferme/'
SHOT = os.environ.get('SHOT', '/tmp/col-')
OK = []
def check(name, cond, info=''):
    OK.append((name, bool(cond))); print(('OK   ' if cond else 'FAIL ') + name, info if not cond else '')
async def press(page, key, ms=100):
    await page.keyboard.down(key); await page.wait_for_timeout(ms); await page.keyboard.up(key)
async def state(page): return await page.evaluate("() => JSON.parse(JSON.stringify(window.__gameState))")
async def panel(page): return await page.evaluate("() => window.__uiState.panelOpen")
def sc(): return min(844 / 480, 390 / 270)
def mob(x, y):  # coordonnées jeu → écran mobile (Scale.FIT centré)
    s = sc(); return (844 - 480 * s) / 2 + x * s, (390 - 270 * s) / 2 + y * s

SAVE = dict(version=7, location='village', player={'x': 12*16+8, 'y': 8*16+14, 'facing': 'up'}, farm={}, money=100, shipping=[], house={'bed': None}, selectedSeed='graine_navet',
            inventory={'slots': [{'item': 'graine_navet', 'qty': 10}]}, settings={'autosave': True}, time={'day': 3, 'minute': 600, 'lastRealMs': 0}, energy=80,
            skills={'agriculture': {'xp': 0}, 'peche': {'xp': 0}},
            character={'name': 'Tony', 'trait': 'patient', 'appearance': {'skin': 'peche', 'face': 'doux', 'eyes': 'bleu', 'hairStyle': 'court', 'hairColor': 'roux', 'shirt': 'vert'}})

async def load(page, **over):
    s = dict(SAVE); s.update(over); s['time'] = dict(s['time'], lastRealMs=int(time.time()*1000))
    await page.evaluate("(s) => { if (window.__gameState) window.__gameState.settings.autosave = false; localStorage.setItem('jeu-ferme.save', JSON.stringify(s)); }", s)
    await page.goto(BASE); await page.wait_for_timeout(2500)

async def main():
    server = subprocess.Popen(['npx', 'vite', 'preview', '--port', '4173', '--strictPort'], cwd='/home/claude/jeu-ferme/client', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(3)
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
            page = await browser.new_page(viewport={'width': 960, 'height': 540})
            errors = []; page.on('pageerror', lambda e: errors.append(str(e)))
            await page.goto(BASE); await page.wait_for_timeout(2000)
            # 1. Migration v7 → v8 : collection vide.
            await load(page)
            st = await state(page)
            check('migration : version 8', st['version'] == 8, st['version'])
            check('migration : collection vide', st.get('collection') == [], st.get('collection'))
            # 2. Conservateur sans rien à donner → dialogue.
            await press(page, 'ArrowUp', 30); await page.wait_for_timeout(300)
            await press(page, 'e'); await page.wait_for_timeout(400)
            check('conservateur : dialogue si rien à exposer', await panel(page))
            await page.screenshot(path=SHOT + 'dialogue.png')
            await press(page, 'Escape'); await page.wait_for_timeout(300)
            check('conservateur : dialogue fermé', not await panel(page))
            # 3. Avec navet + sardine dans le sac → panneau musée.
            await load(page, inventory={'slots': [{'item': 'navet', 'qty': 2}, {'item': 'sardine', 'qty': 1}, {'item': 'graine_navet', 'qty': 3}]})
            await press(page, 'ArrowUp', 30); await page.wait_for_timeout(300)
            await press(page, 'e'); await page.wait_for_timeout(400)
            check('musée : panneau ouvert', await panel(page))
            await page.screenshot(path=SHOT + 'museum.png')
            # Donner le navet (1re ligne : bouton à (216..270, 32..50) dans le panneau à ((480-300)/2, (270-200)/2) = (90, 35)) → écran ×2.
            await page.mouse.click((90 + 243) * 2, (35 + 41) * 2); await page.wait_for_timeout(300)
            st = await state(page)
            check('don : navet exposé', st['collection'] == ['navet'], st['collection'])
            check('don : 1 navet retiré du sac', any(s and s['item'] == 'navet' and s['qty'] == 1 for s in st['inventory']['slots']), st['inventory']['slots'])
            check('don : pas de récompense à 1 objet', st['money'] == 100, st['money'])
            await page.screenshot(path=SHOT + 'donated1.png')
            # Donner la sardine (devenue 1re ligne) → palier 2 : +50.
            await page.mouse.click((90 + 243) * 2, (35 + 41) * 2); await page.wait_for_timeout(300)
            st = await state(page)
            check('don : sardine exposée', st['collection'] == ['navet', 'sardine'], st['collection'])
            check('récompense : +50 pièces à 2 objets', st['money'] == 150, st['money'])
            check('don : sardine retirée du sac', not any(s and s['item'] == 'sardine' for s in st['inventory']['slots']))
            await page.screenshot(path=SHOT + 'donated2.png')
            # Fermer (✕ à (270..294, 6..22)).
            await page.mouse.click((90 + 282) * 2, (35 + 14) * 2); await page.wait_for_timeout(300)
            check('musée : fermé', not await panel(page))
            # Re-parler : plus rien à donner (navet restant déjà exposé) → dialogue.
            await press(page, 'e'); await page.wait_for_timeout(400)
            check('conservateur : dialogue quand tout est déjà exposé', await panel(page))
            await press(page, 'Escape'); await page.wait_for_timeout(300)
            # 4. Sauvegarde : la collection survit au rechargement.
            await page.evaluate("() => window.__gameState.settings.autosave = true")
            await page.goto(BASE); await page.wait_for_timeout(2500)
            st = await state(page)
            check('sauvegarde : collection conservée', st['collection'] == ['navet', 'sardine'], st['collection'])
            # 5. Palier final : 5 exposés + carpe dans le sac → +300.
            await load(page, collection=['navet', 'carotte', 'ble', 'sardine', 'truite'], money=0, inventory={'slots': [{'item': 'carpe', 'qty': 1}]}, version=8)
            await press(page, 'ArrowUp', 30); await page.wait_for_timeout(300)
            await press(page, 'e'); await page.wait_for_timeout(400)
            await page.mouse.click((90 + 243) * 2, (35 + 41) * 2); await page.wait_for_timeout(300)
            st = await state(page)
            check('récompense : +300 à 6 objets', st['money'] == 300 and len(st['collection']) == 6, (st['money'], st['collection']))
            await page.screenshot(path=SHOT + 'complete.png')
            await page.mouse.click((90 + 282) * 2, (35 + 14) * 2); await page.wait_for_timeout(300)
            # 6. Onglet Collection du sac (I → onglet à x 102..164, y -12..4 → écran).
            await press(page, 'i'); await page.wait_for_timeout(300)
            await page.mouse.click((90 + 133) * 2, (35 - 4) * 2); await page.wait_for_timeout(300)
            await page.screenshot(path=SHOT + 'tab-full.png')
            await press(page, 'Escape'); await page.wait_for_timeout(300)
            await load(page, collection=['navet'], version=8)
            await press(page, 'i'); await page.wait_for_timeout(300)
            await page.mouse.click((90 + 133) * 2, (35 - 4) * 2); await page.wait_for_timeout(300)
            await page.screenshot(path=SHOT + 'tab-partial.png')
            # Toucher la 2e vitrine (carotte, manquante) : (gridX=18 + 44, y 52..92)
            await page.mouse.click((90 + 18 + 44 + 20) * 2, (35 + 72) * 2); await page.wait_for_timeout(200)
            await page.screenshot(path=SHOT + 'tab-touch.png')
            await press(page, 'Escape'); await page.wait_for_timeout(300)
            # 7. Poissons selon l'heure : on fait tourner la machine à états de la pêche (cast → bite → reel) 60 fois
            #    à 8 h (sardine + truite attendues, jamais de carpe) puis à 22 h (sardine + carpe, jamais de truite).
            await load(page, location='world', player={'x': 39*16+8, 'y': 10*16+8, 'facing': 'right'}, version=8, collection=[], inventory={'slots': []})
            async def catches(hour, n=60):
                return await page.evaluate("""([hour, n]) => {
                  const f = window.__fishing, g = window.__gameState; const out = {};
                  for (let i = 0; i < n; i++) {
                    g.time.minute = hour * 60; g.energy = 100;
                    f.cast(0); f.update(100000); const r = f.reel();
                    const id = r ? r.fish.id : 'rien'; out[id] = (out[id] || 0) + 1;
                    g.inventory.slots = g.inventory.slots.map(() => null);
                  }
                  return out; }""", [hour, n])
            morning = await catches(8); night = await catches(22); noon = await catches(14)
            print('  8 h :', morning, '| 22 h :', night, '| 14 h :', noon)
            check('pêche : matin = sardine + truite, pas de carpe', 'truite' in morning and 'carpe' not in morning and 'sardine' in morning, morning)
            check('pêche : nuit = sardine + carpe, pas de truite', 'carpe' in night and 'truite' not in night and 'sardine' in night, night)
            check('pêche : après-midi = sardine seulement', set(noon) == {'sardine'}, noon)
            # 8. Boutique : graine de carotte (2e ligne) achetable, 4 lignes (navet, carotte, blé, lit).
            await load(page, location='world', player={'x': 46*16+8, 'y': 16*16+14, 'facing': 'up'}, version=8, collection=[])
            await press(page, 'ArrowUp', 30); await page.wait_for_timeout(300)
            await press(page, 'e'); await page.wait_for_timeout(500)
            check('boutique : ouverte', await panel(page))
            await page.screenshot(path=SHOT + 'shop.png')
            await page.mouse.click((90 + 196 + 17) * 2, (35 + 58 + 9) * 2); await page.wait_for_timeout(300)  # carotte ×1
            st = await state(page)
            check('boutique : graine de carotte achetée (100 → 94)', st['money'] == 94 and any(s and s['item'] == 'graine_carotte' for s in st['inventory']['slots']), st['money'])
            await press(page, 'Escape'); await page.wait_for_timeout(300)
            # 9. Carotte : planter (graine choisie), 3 nuits, récolter.
            await page.evaluate("() => { window.__gameState.selectedSeed = 'graine_carotte'; }")
            await load(page, location='world', player={'x': 200, 'y': 220, 'facing': 'down'}, version=8, collection=[], selectedSeed='graine_carotte',
                       inventory={'slots': [{'item': 'graine_carotte', 'qty': 2}]})
            await press(page, 'ArrowDown', 30); await page.wait_for_timeout(200)
            await press(page, 'e'); await page.wait_for_timeout(250)
            await press(page, 'e'); await page.wait_for_timeout(250)
            st = await state(page)
            plots = list(st['farm'].values())
            check('carotte : plantée et arrosée', len(plots) == 1 and plots[0]['crop'] == 'carotte' and plots[0]['watered'], st['farm'])
            await page.screenshot(path=SHOT + 'carrot-planted.png')
            for _ in range(3):
                await page.evaluate("() => { window.__gameState.time.minute = 1439; window.__gameState.time.lastRealMs = Date.now() - 60000; }")
                await page.wait_for_timeout(800)
                await press(page, 'e'); await page.wait_for_timeout(250)  # arroser le matin (ou récolter à la fin)
            st = await state(page)
            await page.screenshot(path=SHOT + 'carrot-grown.png')
            check('carotte : récoltée après 3 nuits', st['farm'] == {} and any(s and s['item'] == 'carotte' for s in st['inventory']['slots']), (st['farm'], st['inventory']['slots']))
            # 10. Mobile : onglet Collection et panneau musée lisibles.
            ctx = await browser.new_context(viewport={'width': 844, 'height': 390}, device_scale_factor=2, has_touch=True, is_mobile=True)
            mp = await ctx.new_page(); mp.on('pageerror', lambda e: errors.append('mobile: ' + str(e)))
            await mp.goto(BASE); await mp.wait_for_timeout(2000)
            s2 = dict(SAVE); s2.update(version=8, collection=['navet', 'sardine'], inventory={'slots': [{'item': 'carotte', 'qty': 1}]}); s2['time'] = dict(s2['time'], lastRealMs=int(time.time()*1000))
            await mp.evaluate("(s) => { if (window.__gameState) window.__gameState.settings.autosave = false; localStorage.setItem('jeu-ferme.save', JSON.stringify(s)); }", s2)
            await mp.goto(BASE); await mp.wait_for_timeout(2500)
            x, y = mob(480 - 22, 30); await mp.touchscreen.tap(x, y); await mp.wait_for_timeout(300)   # bouton Sac
            x, y = mob(90 + 133, 35 - 4); await mp.touchscreen.tap(x, y); await mp.wait_for_timeout(300)  # onglet Collection
            await mp.screenshot(path=SHOT + 'mobile-tab.png')
            check('mobile : onglet Collection ouvert', await mp.evaluate("() => window.__uiState.panelOpen"))
            x, y = mob(90 + 282, 35 + 14); await mp.touchscreen.tap(x, y); await mp.wait_for_timeout(300)  # ✕
            # Bouton d'action (bas droite) face au conservateur → musée.
            x, y = mob(480 - 48, 270 - 48); await mp.touchscreen.tap(x, y); await mp.wait_for_timeout(500)
            await mp.screenshot(path=SHOT + 'mobile-museum.png')
            check('mobile : panneau musée via le bouton d\'action', await mp.evaluate("() => window.__uiState.panelOpen"))
            await ctx.close()
            print('erreurs page :', errors)
            fails = [n for n, ok in OK if not ok]
            print(f'{len(OK) - len(fails)}/{len(OK)} OK', ('— ÉCHECS : ' + ', '.join(fails)) if fails else '')
            await browser.close()
    finally:
        server.terminate()

asyncio.run(main())
