# Régression complète v0.11 : création → apparence → agriculture (navet + blé) → pêche → talents → boîte → boutique
# → maison (paille, lit) → options (autosave, nouvelle partie) → anciennes sauvegardes v1/v3/v5 → tactile.
import asyncio, subprocess, time, json
from playwright.async_api import async_playwright

BASE = 'http://localhost:4173/jeu-ferme/'
SHOT = '/tmp/claude-0/-home-claude/b4c96d6e-8357-59f8-bdeb-55842db25df6/scratchpad/full-'
SX, SY = 960 / 480, 540 / 270
PX, PY = 90, 35
OK = []

def check(name, cond, info=''):
    OK.append((name, bool(cond)))
    print(('OK   ' if cond else 'FAIL ') + name, info if not cond else '')

async def press(page, key, ms=100):
    await page.keyboard.down(key); await page.wait_for_timeout(ms); await page.keyboard.up(key)

async def click(page, x, y, wait=300):
    await page.mouse.click(x * SX, y * SY); await page.wait_for_timeout(wait)

async def state(page, expr='window.__gameState'):
    return await page.evaluate(f"() => JSON.parse(JSON.stringify({expr}))")

async def load_save(page, save, wait=2500):
    await page.evaluate("(s) => { if (window.__gameState) window.__gameState.settings.autosave = false; localStorage.setItem('jeu-ferme.save', JSON.stringify(s)); }", save)
    await page.goto(BASE); await page.wait_for_timeout(wait)

async def teleport(page, x, y, facing, location='world'):
    s = await state(page)
    s['player'] = {'x': x, 'y': y, 'facing': facing}; s['location'] = location
    await load_save(page, s)

async def next_day(page):
    await page.evaluate("() => { window.__gameState.time.minute = 1439; window.__gameState.time.lastRealMs = Date.now() - 60000; }")
    await page.wait_for_timeout(800)

async def main():
    server = subprocess.Popen(['npx', 'vite', 'preview', '--port', '4173', '--strictPort'], cwd='/home/claude/jeu-ferme/client',
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(3)
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
            page = await browser.new_page(viewport={'width': 960, 'height': 540})
            errors = []
            page.on('pageerror', lambda e: errors.append(str(e)))

            # ---------- 1. Nouvelle partie : Create → Appearance → monde
            await page.goto(BASE); await page.wait_for_timeout(3000)
            check('création : écran affiché (champ prénom)', await page.evaluate("() => document.querySelectorAll('input').length") == 1)
            await page.fill('input', 'Tony')
            await click(page, (480 - (4*108 + 3*6)) / 2 + 0*114 + 54, 90 + 46)      # Main verte
            await click(page, 240, 270 - 42, 1200)
            check('création : prénom + trait', (await state(page, 'window.__gameState.character')) == {'name': 'Tony', 'trait': 'main_verte', 'appearance': None})
            await click(page, 441, 84)  # visage ›
            await click(page, 330, 270 - 36, 1500)
            st = await state(page)
            check('apparence : sauvée, jeu lancé', st['character']['appearance']['face'] == 'malicieux' and st['location'] == 'world' and st['money'] == 50 and st['version'] == 8)

            # ---------- 2. Agriculture navet : planter, arroser, nuit, récolter (+2 graines +1 trait ? non : Main verte = arroser -1 énergie)
            await teleport(page, 200, 220, 'down')
            e0 = (await state(page))['energy']
            await press(page, 'ArrowDown', 30); await page.wait_for_timeout(200)
            await press(page, 'e'); await page.wait_for_timeout(250)   # planter (3)
            await press(page, 'e'); await page.wait_for_timeout(250)   # arroser (2-1 = 1 avec Main verte)
            st = await state(page)
            plots = list(st['farm'].values())
            check('navet : planté et arrosé', len(plots) == 1 and plots[0]['crop'] == 'navet' and plots[0]['watered'])
            check('énergie : planter 3 + arroser 1 (Main verte)', abs((e0 - st['energy']) - 4) < 0.3, st['energy'])
            check('graines : 9 restantes', sum(s['qty'] for s in st['inventory']['slots'] if s and s['item'] == 'graine_navet') == 9)
            await next_day(page); await next_day(page)
            st = await state(page)
            check('navet : mûr après 2 nuits', list(st['farm'].values())[0]['stage'] == 3, st['farm'])
            await press(page, 'e'); await page.wait_for_timeout(300)
            st = await state(page)
            check('navet : récolté (+1 navet, +2 graines)', st['farm'] == {} and any(s and s['item'] == 'navet' and s['qty'] == 1 for s in st['inventory']['slots'])
                  and sum(s['qty'] for s in st['inventory']['slots'] if s and s['item'] == 'graine_navet') == 11)
            check('XP agriculture : (1+1+3) × 1,25 = 6,25', st['skills']['agriculture']['xp'] == 6.25, st['skills'])

            # ---------- 3. Pêche
            await teleport(page, 39*16+8, 10*16+8, 'right')
            await press(page, 'ArrowRight', 30); await page.wait_for_timeout(300)
            await press(page, 'e'); await page.wait_for_timeout(300)
            check('pêche : lancer', await page.evaluate("() => window.__fishing.phase") == 'waiting')
            for _ in range(70):
                await page.wait_for_timeout(100)
                if await page.evaluate("() => window.__fishing.phase") == 'bite': break
            await page.screenshot(path=SHOT + 'fishing.png')
            await press(page, 'e'); await page.wait_for_timeout(300)
            st = await state(page)
            check('pêche : sardine capturée, XP pêche 3', any(s and s['item'] == 'sardine' for s in st['inventory']['slots']) and st['skills']['peche']['xp'] == 3)

            # ---------- 4. Talents (niveau 2 agriculture à 10 XP) + onglet
            await page.evaluate("() => { window.__gameState.skills.agriculture.xp = 9; }")
            await teleport(page, 200, 220, 'down')
            await press(page, 'ArrowDown', 30); await page.wait_for_timeout(200)
            await press(page, 'e'); await page.wait_for_timeout(300)
            st = await state(page)
            check('talents : niveau 2 franchi (xp ≥ 10)', st['skills']['agriculture']['xp'] >= 10)
            await press(page, 'i'); await page.wait_for_timeout(300)
            await click(page, PX + 50 + 25, PY - 12 + 8)   # onglet Talents
            await page.screenshot(path=SHOT + 'talents.png')
            await press(page, 'Escape'); await page.wait_for_timeout(300)

            # ---------- 5. Boîte d'expédition + paiement
            await teleport(page, 10*16+8, 8*16+12, 'right')
            await press(page, 'ArrowRight', 30); await page.wait_for_timeout(300)
            await press(page, 'e'); await page.wait_for_timeout(500)
            await click(page, PX + 236 + 17, PY + 32 + 9)   # 1re ligne Tout
            st = await state(page)
            check('boîte : dépôt', len(st['shipping']) == 1 and st['money'] == 50, st['shipping'])
            value = 10 if st['shipping'][0]['item'] == 'navet' else 15
            await press(page, 'Escape'); await page.wait_for_timeout(300)
            await next_day(page)
            st = await state(page)
            check('boîte : payée le lendemain', st['money'] == 50 + value and st['shipping'] == [], st['money'])
            await page.screenshot(path=SHOT + 'shipping-paid.png')

            # ---------- 6. Boutique : acheter blé ×5 + lit (avec argent triché), vendre
            await page.evaluate("() => { window.__gameState.money = 400; }")
            await teleport(page, 46*16+8, 16*16+14, 'up')
            await press(page, 'ArrowUp', 30); await page.wait_for_timeout(300)
            await press(page, 'e'); await page.wait_for_timeout(500)
            await click(page, PX + 236 + 17, PY + 84 + 9)   # blé ×5 (3e ligne depuis v0.11 : navet, carotte, blé, lit)
            await click(page, PX + 196 + 17, PY + 110 + 9)  # lit
            st = await state(page)
            check('boutique : achats blé ×5 + lit', st['money'] == 60 and any(s and s['item'] == 'lit' for s in st['inventory']['slots']) and any(s and s['item'] == 'graine_ble' and s['qty'] == 5 for s in st['inventory']['slots']), st['money'])
            await click(page, PX + 70 + 28, PY - 12 + 8)    # onglet Vendre
            rows = await page.evaluate("() => window.__gameState.inventory.slots.filter(s => s && ['navet','sardine','ble'].includes(s.item)).map(s => s.item)")
            money_before = st['money']
            await click(page, PX + 236 + 17, PY + 32 + 9)   # 1re ligne Tout
            st = await state(page)
            check('boutique : vente immédiate', st['money'] > money_before, (money_before, st['money'], rows))
            await press(page, 'Escape'); await page.wait_for_timeout(300)

            # ---------- 7. Barre rapide : choisir le blé, planter du blé, 5 nuits
            slots = await page.evaluate("() => window.__gameState.inventory.slots.slice(0,5).map(s => s && s.item)")
            idx = slots.index('graine_ble')
            await press(page, str(idx + 1)); await page.wait_for_timeout(300)
            check('barre rapide : blé choisi', (await state(page))['selectedSeed'] == 'graine_ble')
            await teleport(page, 200, 240, 'down')
            await press(page, 'ArrowDown', 30); await page.wait_for_timeout(200)
            await press(page, 'e'); await page.wait_for_timeout(250); await press(page, 'e'); await page.wait_for_timeout(250)
            for _ in range(5): await next_day(page)
            st = await state(page)
            bles = [p for p in st['farm'].values() if p['crop'] == 'ble']
            check('blé : mûr après 5 nuits', len(bles) == 1 and bles[0]['stage'] == 3, st['farm'])
            await press(page, 'e'); await page.wait_for_timeout(300)
            st = await state(page)
            # niveau 2 agriculture atteint plus haut : +1 graine par récolte → 5 - 1 + 2 + 1 = 7
            check('blé : récolté (+2 blé, +3 graines de blé avec le bonus niveau 2)', any(s and s['item'] == 'ble' and s['qty'] == 2 for s in st['inventory']['slots']) and sum(s['qty'] for s in st['inventory']['slots'] if s and s['item'] == 'graine_ble') == 7, st['inventory'])
            await page.screenshot(path=SHOT + 'hotbar.png')

            # ---------- 8. Maison : entrer par la porte, paille, lit
            await teleport(page, 136, 140, 'down')            # devant la porte (zone 128..144, 144..152)
            await press(page, 'ArrowDown', 300); await page.wait_for_timeout(1200)
            st = await state(page)
            check('maison : entrée par la porte', st['location'] == 'house')
            e0 = st['energy']
            await page.evaluate("() => { window.__gameState.energy = 20; }")
            # paille : coin haut gauche (left+28, top+22) ; le joueur arrive en bas au centre : aller en haut à gauche
            await press(page, 'ArrowUp', 900); await page.wait_for_timeout(100)
            await press(page, 'ArrowLeft', 900); await page.wait_for_timeout(300)
            await page.screenshot(path=SHOT + 'straw.png')
            await press(page, 'e'); await page.wait_for_timeout(2500)
            st = await state(page)
            check('paille : +30 énergie, lendemain 6 h', 49 <= st['energy'] <= 52 and 360 <= st['time']['minute'] <= 370, (st['energy'], st['time']))
            # lit : se placer au milieu, regarder à droite, poser
            await press(page, 'ArrowDown', 500); await press(page, 'ArrowRight', 900); await page.wait_for_timeout(300)
            await page.screenshot(path=SHOT + 'before-bed.png')
            await press(page, 'e'); await page.wait_for_timeout(400)
            st = await state(page)
            check('lit : posé', st['house']['bed'] is not None and not any(s and s['item'] == 'lit' for s in st['inventory']['slots']), st['house'])
            await page.screenshot(path=SHOT + 'bed.png')
            await press(page, 'e'); await page.wait_for_timeout(2500)
            st = await state(page)
            check('lit : énergie pleine', st['energy'] == 100)
            await press(page, 'i'); await page.wait_for_timeout(300)
            await page.screenshot(path=SHOT + 'bag-house.png')
            await click(page, PX + 8 + 44, PY + 6 + 8)
            st = await state(page)
            check('lit : rangé dans le sac', st['house']['bed'] is None and any(s and s['item'] == 'lit' for s in st['inventory']['slots']))
            # sortie par le bas
            await press(page, 'ArrowDown', 2500); await page.wait_for_timeout(1500)
            st = await state(page)
            check('maison : sortie par le bas', st['location'] == 'world')
            await page.screenshot(path=SHOT + 'after-exit.png')
            # aller-retour : re-entrer par la porte puis ressortir (régression du ping-pong maison ↔ terrain)
            await page.wait_for_timeout(500)
            await press(page, 'ArrowUp', 400); await page.wait_for_timeout(1500)
            check('maison : re-entrée par la porte', (await state(page))['location'] == 'house')
            await press(page, 'ArrowUp', 300); await page.wait_for_timeout(200); await press(page, 'ArrowDown', 1500); await page.wait_for_timeout(1500)
            check('maison : re-sortie, retour stable sur le terrain', (await state(page))['location'] == 'world')
            await page.wait_for_timeout(1500)
            check('maison : pas de re-entrée automatique', (await state(page))['location'] == 'world')

            # ---------- 9. Options : autosave off/on, sauvegarder, nouvelle partie
            await press(page, 'i'); await page.wait_for_timeout(300)
            await click(page, PX + 166 + 25, PY - 12 + 8)        # Options (onglets décalés par Collection en v0.11)
            await click(page, PX + 150, PY + 68 + 11)            # autosave off
            check('options : autosave désactivée', (await state(page))['settings']['autosave'] is False)
            await click(page, PX + 150, PY + 68 + 11)            # autosave on
            await click(page, PX + 150, PY + 36 + 11)            # sauvegarder
            saved = json.loads(await page.evaluate("() => localStorage.getItem('jeu-ferme.save')"))
            check('options : sauvegarde écrite (v8, Tony)', saved['version'] == 8 and saved['character']['name'] == 'Tony')
            await click(page, PX + 150, PY + 132 + 11); await click(page, PX + 150, PY + 132 + 11, 1500)   # nouvelle partie ×2
            check('options : nouvelle partie → écran de création', await page.evaluate("() => document.querySelectorAll('input').length") == 1 and (await state(page))['time']['day'] == 1)

            # ---------- 10. Anciennes sauvegardes v1, v3, v5 → converties, écrans manquants une fois
            for v, extra in [(1, {}), (3, {}), (5, {'skills': {'agriculture': {'xp': 12}, 'peche': {'xp': 0}}, 'character': {'name': 'Vieux', 'trait': 'patient'}})]:
                old = dict(version=v, location='world', player={'x': 200, 'y': 200, 'facing': 'down'},
                           farm={'12,12': {'tx': 12, 'ty': 12, 'crop': 'navet', 'stage': 1, 'watered': True, 'wateredAt': 5, 'progress': 0.5}},
                           inventory={'slots': [{'item': 'graine_navet', 'qty': 7}]}, settings={'autosave': True},
                           time={'day': 6, 'minute': 600, 'lastRealMs': int(time.time()*1000)}, energy=70)
                old.update(extra)
                await load_save(page, old)
                st = await state(page)
                inputs = await page.evaluate("() => document.querySelectorAll('input').length")
                check(f'sauvegarde v{v} : convertie en v8, jour 6 gardé, écran de création', st['version'] == 8 and st['collection'] == [] and st['time']['day'] == 6 and st['money'] == 50 and (inputs == 1) == (st['character']['trait'] is None), (st['version'], st['time'], inputs))
                check(f'sauvegarde v{v} : plante gardée sans champs obsolètes', '12,12' in st['farm'] and 'wateredAt' not in st['farm']['12,12'])

            # ---------- 11. Tactile : joystick + bouton d'action sur un téléphone simulé
            await browser.close()
            browser = await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
            ctx = await browser.new_context(viewport={'width': 844, 'height': 390}, has_touch=True, is_mobile=True, device_scale_factor=2)
            mp = await ctx.new_page()
            mp.on('pageerror', lambda e: errors.append('mobile: ' + str(e)))
            await mp.goto(BASE); await mp.wait_for_timeout(2500)
            ready = dict(version=7, location='world', player={'x': 200, 'y': 220, 'facing': 'down'}, farm={}, money=50, shipping=[], house={'bed': None}, selectedSeed='graine_navet',
                         inventory={'slots': [{'item': 'graine_navet', 'qty': 10}]}, settings={'autosave': True}, time={'day': 2, 'minute': 600, 'lastRealMs': int(time.time()*1000)}, energy=90,
                         skills={'agriculture': {'xp': 0}, 'peche': {'xp': 0}}, character={'name': 'Mob', 'trait': 'patient', 'appearance': {'skin': 'peche', 'face': 'doux', 'eyes': 'bleu', 'hairStyle': 'long', 'hairColor': 'blond', 'shirt': 'rouge'}})
            await mp.evaluate("(s) => localStorage.setItem('jeu-ferme.save', JSON.stringify(s))", ready)
            await mp.goto(BASE); await mp.wait_for_timeout(2500)
            # écran d'orientation ? (paysage : non). Bouton d'action en bas à droite (480-48, 270-48) → écran 844×390 : facteur
            sc = min(844 / 480, 390 / 270); ox, oy = (844 - 480 * sc) / 2, (390 - 270 * sc) / 2
            def g2s(x, y): return (ox + x * sc, oy + y * sc)
            await mp.screenshot(path=SHOT + 'mobile.png')
            joystick_visible = await mp.evaluate("() => window.__gameState && true")
            await mp.touchscreen.tap(*g2s(480 - 48, 270 - 48)); await mp.wait_for_timeout(400)   # planter
            st = await mp.evaluate("() => JSON.parse(JSON.stringify(window.__gameState))")
            check('tactile : bouton d\'action → plante', len(st['farm']) == 1, st['farm'])
            await mp.touchscreen.tap(*g2s(480 - 48, 270 - 48)); await mp.wait_for_timeout(400)   # arroser
            st = await mp.evaluate("() => JSON.parse(JSON.stringify(window.__gameState))")
            check('tactile : bouton d\'action → arrose', list(st['farm'].values())[0]['watered'])
            # joystick : glisser vers la droite via CDP
            cdp = await ctx.new_cdp_session(mp)
            jx, jy = g2s(56, 270 - 56)
            await cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': jx, 'y': jy}]})
            await cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': jx + 40, 'y': jy}]})
            await mp.wait_for_timeout(600)
            await cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
            await mp.wait_for_timeout(300)
            st = await mp.evaluate("() => JSON.parse(JSON.stringify(window.__gameState))")
            check('tactile : joystick déplace vers la droite', st['player']['x'] > 210, st['player'])
            await mp.screenshot(path=SHOT + 'mobile-moved.png')
            # barre rapide tactile : toucher la 1re case
            await mp.touchscreen.tap(*g2s(480 - 4 - 110 - 40 + 10, 14)); await mp.wait_for_timeout(300)
            await mp.screenshot(path=SHOT + 'mobile2.png')
            await browser.close()

            print('\nerreurs page :', errors)
            fails = [n for n, ok in OK if not ok]
            print(f'\n{len(OK) - len(fails)}/{len(OK)} vérifications OK', ('— ÉCHECS : ' + ', '.join(fails)) if fails else '')
    finally:
        server.terminate()

asyncio.run(main())
