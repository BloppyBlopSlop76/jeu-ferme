// Scène du terrain : la carte Tiled (sol, rivière, décor), la maison, les arbres, le pont,
// le personnage, la caméra, la porte de la maison et le champ cultivable.

import Phaser from 'phaser';
import { TILE_SIZE } from '../config/constants';
import { Player } from '../entities/Player';
import { FarmView } from '../entities/FarmView';
import { createControls } from '../systems/createControls';
import { InputController } from '../systems/InputController';
import { FarmSystem, ACTION_LABELS } from '../systems/FarmSystem';
import { ITEMS } from '../data/items';
import { Hud } from '../ui/Hud';
import { gameState } from '../state/GameState';
import { SaveSystem } from '../systems/SaveSystem';
import { Inventory } from '../systems/InventorySystem';
import { uiState } from '../ui/uiState';
import { DayCycle } from '../systems/DayCycle';
import { Energy } from '../systems/EnergySystem';

export class WorldScene extends Phaser.Scene {
  private player!: Player;
  private controls!: InputController;
  private hud!: Hud;
  private doorZone!: Phaser.GameObjects.Zone;
  private entering = false;

  private farm!: FarmSystem;
  private farmView!: FarmView;
  private cursor!: Phaser.GameObjects.Rectangle;   // surlignage de la case visée
  private cursorLabel!: Phaser.GameObjects.Text;   // nom de l'action possible

  constructor() {
    super('World');
  }

  create(): void {
    // Une scène Phaser est réutilisée à chaque retour : on remet les drapeaux à zéro ici, pas dans le constructeur.
    this.entering = false;

    const map = this.make.tilemap({ key: 'ferme' });
    const grass = map.addTilesetImage('grass', 'grass')!;
    const water = map.addTilesetImage('water', 'water')!;
    const dirt = map.addTilesetImage('dirt', 'dirt')!;

    // Calques dans l'ordre de dessin : eau dessous, puis sol, champ, décor.
    const eau = map.createLayer('eau', [water])!;
    map.createLayer('eau_libre', [water]);   // sous le pont et les rives : pas de collision
    map.createLayer('sol', [grass]);
    const champ = map.createLayer('champ', [dirt]) as Phaser.Tilemaps.TilemapLayer;
    map.createLayer('deco', [grass]);
    // Toute tuile d'eau (hors pont) bloque le passage.
    eau.setCollisionByExclusion([-1]);

    const worldWidth = map.widthInPixels;
    const worldHeight = map.heightInPixels;
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);

    // --- Objets de la carte ---
    const objets = map.getObjectLayer('objets')!;
    const obstacles = this.physics.add.staticGroup();
    let spawn = { x: worldWidth / 2, y: worldHeight / 2 };
    // Cases où l'on ne peut pas planter : eau et rives (tuiles), puis les objets (maison, arbres, pont, porte).
    const blocked = new Set<string>();
    const block = (px: number, py: number, w: number, h: number) => {
      for (let ty = Math.floor(py / TILE_SIZE); ty < Math.ceil((py + h) / TILE_SIZE); ty++)
        for (let tx = Math.floor(px / TILE_SIZE); tx < Math.ceil((px + w) / TILE_SIZE); tx++)
          blocked.add(`${tx},${ty}`);
    };
    for (const layerName of ['eau', 'eau_libre']) {
      map.getLayer(layerName)!.data.forEach((row) => row.forEach((t) => { if (t.index > 0) blocked.add(`${t.x},${t.y}`); }));
    }

    for (const obj of objets.objects) {
      const x = obj.x ?? 0;
      const y = obj.y ?? 0; // pour les images Tiled, y = bord BAS de l'objet
      switch (obj.type) {
        case 'house': {
          const img = this.add.image(x, y, 'house').setOrigin(0, 1).setDepth(y);
          block(x, y - img.height, img.width, img.height);
          // Le bloc solide = les murs (moitié basse), pas le toit : on peut passer derrière.
          const wall = this.add.zone(x + 40, y - 16, img.width, 32);
          obstacles.add(wall);
          break;
        }
        case 'tree': {
          const size = (obj.properties as { name: string; value: string }[] | undefined)
            ?.find((p) => p.name === 'size')?.value ?? 'big';
          const frame = size === 'big' ? 'tree_big' : 'tree_small';
          const w = obj.width ?? 16;
          const img = this.add.image(x + w / 2, y, 'things', frame).setOrigin(0.5, 1).setDepth(y);
          // Tronc solide : petite zone au pied de l'arbre.
          const trunk = this.add.zone(img.x, y - 4, size === 'big' ? 14 : 8, 8);
          obstacles.add(trunk);
          block(x, y - 16, w, 16); // le pied de l'arbre
          break;
        }
        case 'bridge':
          this.add.image(x, y, 'bridge').setOrigin(0, 1).setDepth(0);
          block(x, y - 32, 48, 32);
          break;
        case 'door':
          this.doorZone = this.add.zone(x + (obj.width ?? 16) / 2, y + (obj.height ?? 8) / 2, obj.width ?? 16, obj.height ?? 8);
          this.physics.add.existing(this.doorZone, true);
          block(x, y, obj.width ?? 16, obj.height ?? 8);
          break;
        case 'spawn':
          spawn = { x, y };
          break;
      }
    }

    // --- Champ : règles (FarmSystem) et affichage (FarmView) ---
    // Sol libre = dans la carte et pas dans la liste des cases bloquées.
    this.farm = new FarmSystem((tx, ty) =>
      tx >= 0 && ty >= 0 && tx < map.width && ty < map.height && !blocked.has(`${tx},${ty}`));
    this.farmView = new FarmView(this, champ);

    // --- Joueur : à la position mémorisée (retour de la maison) ou au point de départ. ---
    const start = gameState.location === 'world' && gameState.player.x > 0 ? gameState.player : spawn;
    this.player = new Player(this, start.x, start.y, gameState.player.facing);
    gameState.location = 'world';

    this.physics.add.collider(this.player.sprite, eau);
    this.physics.add.collider(this.player.sprite, obstacles);
    this.physics.add.overlap(this.player.sprite, this.doorZone, () => this.enterHouse());

    // Curseur de case visée : un carré de la taille d'une tuile + le nom de l'action.
    this.cursor = this.add.rectangle(0, 0, TILE_SIZE, TILE_SIZE, 0xffffff, 0.15)
      .setOrigin(0, 0).setStrokeStyle(1, 0xffffff, 0.8).setDepth(9000);
    this.cursorLabel = this.add.text(0, 0, '', {
      fontFamily: 'sans-serif', fontSize: '9px', color: '#ffffff', backgroundColor: '#00000088', padding: { x: 2, y: 1 },
    }).setOrigin(0.5, 1).setDepth(9001);

    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12);
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.fadeIn(300);

    this.controls = createControls(this);
    this.hud = new Hud(this, 'Ton terrain');
    this.refreshHud();

    // Interface (sac, options) : une scène à part, toujours au-dessus.
    if (!this.scene.isActive('UI')) this.scene.launch('UI');
    this.scene.bringToTop('UI');
  }

  update(): void {
    if (this.entering) return;

    // Panneau ouvert : le joueur reste immobile et rien ne se déclenche.
    if (uiState.panelOpen) {
      this.player.move({ x: 0, y: 0 });
      return;
    }
    this.player.move(this.controls.getDirection(), Energy.speedFactor());
    // Position mémorisée en continu (pour la sauvegarde).
    gameState.player.x = this.player.x;
    gameState.player.y = this.player.y;
    gameState.player.facing = this.player.direction;

    // Horloge, énergie, pousse par nuits.
    const cycle = DayCycle.update();
    for (const plot of cycle.grown) this.farmView.refresh(plot);
    if (cycle.daysPassed > 0) this.floatText(`Jour ${gameState.time.day}`, Math.floor(this.player.x / TILE_SIZE), Math.floor(this.player.y / TILE_SIZE) - 2);

    // Case visée = la tuile devant les pieds du joueur.
    const { tx, ty } = this.targetTile();
    const action = this.farm.getAction(tx, ty);
    const label = action ? ACTION_LABELS[action] : (this.farm.getBlockReason(tx, ty) ?? '');
    this.cursor.setPosition(tx * TILE_SIZE, ty * TILE_SIZE).setVisible(!!label || !!this.farm.getPlot(tx, ty));
    this.cursor.setStrokeStyle(1, action ? 0xfff2a0 : 0xffffff, action ? 1 : 0.5);
    this.cursorLabel.setPosition(tx * TILE_SIZE + TILE_SIZE / 2, ty * TILE_SIZE - 2).setText(label).setVisible(!!label);
    this.controls.setActionLabel(action ? label : '');

    if (this.controls.actionJustPressed() && action) {
      const result = this.farm.act(tx, ty);
      if (!result) return;
      if (result.plot) this.farmView.refresh(result.plot);
      if (result.action === 'harvest') {
        this.farmView.clear(tx, ty);
        if (result.gained) {
          this.floatText(result.gained.map((g) => `+${g.qty} ${ITEMS[g.item].nom}`).join('  '), tx, ty);
        }
      }
      this.refreshHud();
      this.game.events.emit('inventory-changed');
      SaveSystem.autosave();
    }
  }

  /** Tuile devant le joueur, selon la direction où il regarde. */
  private targetTile(): { tx: number; ty: number } {
    const feetX = Math.floor(this.player.x / TILE_SIZE);
    const feetY = Math.floor((this.player.y - 2) / TILE_SIZE);
    const d = this.player.direction;
    return {
      tx: feetX + (d === 'left' ? -1 : d === 'right' ? 1 : 0),
      ty: feetY + (d === 'up' ? -1 : d === 'down' ? 1 : 0),
    };
  }

  private refreshHud(): void {
    this.hud.setInfo(`Graines ×${Inventory.count('graine_navet')}   Navets ×${Inventory.count('navet')}`);
  }

  /** Petit texte qui monte et disparaît (retour visuel d'une récolte). */
  private floatText(text: string, tx: number, ty: number): void {
    const t = this.add.text(tx * TILE_SIZE + TILE_SIZE / 2, ty * TILE_SIZE - 14, text, {
      fontFamily: 'sans-serif', fontSize: '10px', color: '#fff2a0', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5, 1).setDepth(9500);
    this.tweens.add({ targets: t, y: t.y - 16, alpha: 0, duration: 900, onComplete: () => t.destroy() });
  }

  /** Entrée dans la maison : on mémorise la position devant la porte, fondu, changement de scène. */
  private enterHouse(): void {
    if (this.entering) return;
    this.entering = true;
    gameState.player = { x: this.player.x, y: this.player.y + 10, facing: 'down' };
    gameState.location = 'house';
    SaveSystem.autosave();
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('House'));
  }
}
