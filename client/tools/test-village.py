import asyncio, subprocess, time
from playwright.async_api import async_playwright

BASE = 'http://localhost:4173/jeu-ferme/'
SHOT = '/tmp/claude-0/-home-claude/b4c96d6e-8357-59f8-bdeb-55842db25df6/scratchpad/vil-'
OK = []
def check(name, cond, info=''):
    OK.append((name, bool(cond))); print(('OK   ' if cond else 'FAIL ') + name, info if not cond else '')
async def press(page, key, ms=100):
    await page.keyboard.down(key); await page.wait_for_timeout(ms); await page.keyboard.up(key)
async def state(page): return await page.evaluate("() => JSON.parse(JSON.stringify(window.__gameState))")

SAVE = dict(version=7, location='world', player={'x': 24*16+16, 'y': 6*16, 'facing': 'up'}, farm={}, money=100, shipping=[], house={'bed': None}, selectedSeed='graine_navet',
            inventory={'slots': [{'item': 'graine_navet', 'qty': 10}]}, settings={'autosave': True}, time={'day': 3, 'minute': 600, 'lastRealMs': 0}, energy=80,
            skills={'agriculture': {'xp': 0}, 'peche': {'xp': 0}},
            character={'name': 'Tony', 'trait': 'patient', 'appearance': {'skin': 'peche', 'face': 'doux', 'eyes': 'bleu', 'hairStyle': 'court', 'hairColor': 'roux', 'shirt': 'vert'}})

async def main():
    server = subprocess.Popen(['npx', 'vite', 'preview', '--port', '4173', '--strictPort'], cwd='/home/claude/jeu-ferme/client', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(3)
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
            page = await browser.new_page(viewport={'width': 960, 'height': 540})
            errors = []; page.on('pageerror', lambda e: errors.append(str(e)))
            await page.goto(BASE); await page.wait_for_timeout(2000)
            s = dict(SAVE); s['time'] = dict(SAVE['time'], lastRealMs=int(time.time()*1000))
            await page.evaluate("(s) => { window.__gameState.settings.autosave = false; localStorage.setItem('jeu-ferme.save', JSON.stringify(s)); }", s)
            await page.goto(BASE); await page.wait_for_timeout(2500)
            await page.screenshot(path=SHOT + 'road.png')
            # 1. Monter jusqu'au passage nord (chemin de terre colonnes 24-25).
            await press(page, 'ArrowUp', 1500); await page.wait_for_timeout(1500)
            st = await state(page)
            check('passage : arrivée au village', st['location'] == 'village', st['location'])
            await page.screenshot(path=SHOT + 'arrival.png')
            # 2. Pas de retour automatique.
            await page.wait_for_timeout(1000)
            check('passage : pas de retour automatique', (await state(page))['location'] == 'village')
            # 3. Remonter la rue jusqu'à la place, parler à la villageoise (tile 18,13) : se placer à (18,14) regard haut.
            await page.evaluate("() => { const s = window.__gameState; const c = JSON.parse(JSON.stringify(s)); s.settings.autosave = false; c.player = {x: 18*16+8, y: 14*16+14, facing: 'up'}; c.location = 'village'; localStorage.setItem('jeu-ferme.save', JSON.stringify(c)); }")
            await page.goto(BASE); await page.wait_for_timeout(2500)
            check('village : rechargement direct dans le village', (await state(page))['location'] == 'village')
            await press(page, 'ArrowUp', 30); await page.wait_for_timeout(300)
            await page.screenshot(path=SHOT + 'square.png')
            await press(page, 'e'); await page.wait_for_timeout(400)
            open1 = await page.evaluate("() => window.__uiState.panelOpen")
            check('dialogue : ouvert (joueur figé)', open1)
            await page.screenshot(path=SHOT + 'dialogue.png')
            for i in range(3):
                await press(page, 'e'); await page.wait_for_timeout(400)
                print('  après appui', i+1, ':', await page.evaluate("() => window.__uiState.panelOpen"))
                await page.screenshot(path=SHOT + f'dlg{i+1}.png')
            check('dialogue : fermé après 3 phrases', not await page.evaluate("() => window.__uiState.panelOpen"))
            # 4. Conservateur (tile 12,7) : se placer à (12,8) regard haut.
            await page.evaluate("() => { const s = window.__gameState; const c = JSON.parse(JSON.stringify(s)); s.settings.autosave = false; c.player = {x: 12*16+8, y: 8*16+14, facing: 'up'}; c.location = 'village'; localStorage.setItem('jeu-ferme.save', JSON.stringify(c)); }")
            await page.goto(BASE); await page.wait_for_timeout(2500)
            await press(page, 'ArrowUp', 30); await page.wait_for_timeout(300)
            await press(page, 'e'); await page.wait_for_timeout(400)
            check('conservateur : dialogue', await page.evaluate("() => window.__uiState.panelOpen"))
            await page.screenshot(path=SHOT + 'museum.png')
            await press(page, 'Escape'); await page.wait_for_timeout(300)
            # 5. Retour au terrain par le passage sud : se placer sur la rue (16, 18) et descendre.
            await page.evaluate("() => { const s = window.__gameState; const c = JSON.parse(JSON.stringify(s)); s.settings.autosave = false; c.player = {x: 16*16, y: 18*16+8, facing: 'down'}; c.location = 'village'; localStorage.setItem('jeu-ferme.save', JSON.stringify(c)); }")
            await page.goto(BASE); await page.wait_for_timeout(2500)
            await press(page, 'ArrowDown', 1500); await page.wait_for_timeout(1500)
            st = await state(page)
            check('passage : retour au terrain', st['location'] == 'world', st)
            await page.screenshot(path=SHOT + 'back.png')
            await page.wait_for_timeout(1000)
            check('passage : pas de re-départ automatique', (await state(page))['location'] == 'world')
            # 6. Le terrain reste cultivable et la maison accessible après la refonte : planter, aller à la porte.
            await press(page, 'ArrowDown', 30); await page.wait_for_timeout(200)
            await press(page, 'e'); await page.wait_for_timeout(300)
            check('terrain : planter fonctionne toujours', len((await state(page))['farm']) == 1)
            print('erreurs page :', errors)
            fails = [n for n, ok in OK if not ok]
            print(f'{len(OK) - len(fails)}/{len(OK)} OK', ('— ÉCHECS : ' + ', '.join(fails)) if fails else '')
            await browser.close()
    finally:
        server.terminate()

asyncio.run(main())
