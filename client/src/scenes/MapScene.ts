// Scène de base pour toute carte extérieure (terrain, village) : calques Tiled, objets (bâtiments, arbres,
// PNJ, passages), personnage, caméra, HUD, interface, horloge. Les scènes concrètes ajoutent leurs règles
// (agriculture et pêche sur le terrain) dans `updateActions`.

import Phaser from 'phaser';
import { TILE_SIZE } from '../config/constants';
import { Player } from '../entities/Player';
import { createControls } from '../systems/createControls';
import { InputController } from '../systems/InputController';
import { Hud } from '../ui/Hud';
import { gameState, type LocationId } from '../state/GameState';
import { SaveSystem } from '../systems/SaveSystem';
import { uiState } from '../ui/uiState';
import { DayCycle } from '../systems/DayCycle';
import { Energy } from '../systems/EnergySystem';
import { NPCS } from '../data/npcs';

/** Ce qu'on peut faire sur une case visée (hors agriculture / pêche). */
export type Interact = { kind: 'shop' } | { kind: 'shipping' } | { kind: 'talk'; npc: string };

interface Exit { zone: Phaser.GameObjects.Zone; target: LocationId }

const SCENE_FOR: Record<string, string> = { world: 'World', house: 'House', village: 'Village' };
/** Point d'arrivée demandé par la carte précédente (nom d'un objet `spawn` de la carte suivante). */
let pendingSpawn: string | null = null;

export abstract class MapScene extends Phaser.Scene {
  protected player!: Player;
  protected controls!: InputController;
  protected hud!: Hud;
  protected map!: Phaser.Tilemaps.Tilemap;
  protected obstacles!: Phaser.Physics.Arcade.StaticGroup;
  /** Cases où l'on ne peut pas planter (eau, bâtiments, arbres, passages…). */
  protected blocked = new Set<string>();
  /** Cases d'eau où l'on peut pêcher. */
  protected water = new Set<string>();
  /** Cases avec lesquelles on peut interagir (PNJ, boîte). */
  protected interact = new Map<string, Interact>();
  protected cursor!: Phaser.GameObjects.Rectangle;   // surlignage de la case visée
  protected cursorLabel!: Phaser.GameObjects.Text;   // nom de l'action possible
  private exits: Exit[] = [];
  private spawns = new Map<string, { x: number; y: number }>();
  private transitioning = false;
  /** Les passages ne s'activent qu'une fois que le joueur en est sorti (évite l'aller-retour au retour). */
  private exitsArmed = false;

  constructor(key: string, protected readonly mapKey: string, protected readonly location: LocationId) {
    super(key);
  }

  /** Construit la carte, les objets, le personnage et l'interface. À appeler au début de `create()`. */
  protected buildMap(title: string): void {
    // Une scène Phaser est réutilisée à chaque retour : on remet les drapeaux à zéro ici, pas dans le constructeur.
    this.transitioning = false;
    this.exitsArmed = false;
    this.blocked.clear(); this.water.clear(); this.interact.clear(); this.exits = []; this.spawns.clear();

    const map = this.make.tilemap({ key: this.mapKey });
    this.map = map;
    const grass = map.addTilesetImage('grass', 'grass')!;
    const water = map.addTilesetImage('water', 'water')!;
    const dirt = map.addTilesetImage('dirt', 'dirt')!;
    const all = [grass, water, dirt];
    // Calques dans l'ordre du fichier : eau, eau_libre, sol, chemin, deco, champ…
    for (const layerData of map.layers) {
      if (layerData.name === 'champ') continue; // dessiné par FarmView (terrain)
      const layer = map.createLayer(layerData.name, all)!;
      if (layerData.name === 'eau') layer.setCollisionByExclusion([-1]); // le collider est ajouté après la création du joueur
      if (layerData.name === 'eau' || layerData.name === 'eau_libre') {
        layer.layer.data.forEach((row) => row.forEach((t) => { if (t.index > 0) { this.blocked.add(`${t.x},${t.y}`); this.water.add(`${t.x},${t.y}`); } }));
      }
    }

    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    // --- Objets ---
    this.obstacles = this.physics.add.staticGroup();
    for (const obj of map.getObjectLayer('objets')!.objects) this.buildObject(obj);

    // --- Joueur : à la position mémorisée si on est bien sur cette carte, sinon au point de départ. ---
    const fallback = this.spawns.get('depart') ?? this.spawns.get('arrivee_terrain') ?? { x: map.widthInPixels / 2, y: map.heightInPixels / 2 };
    const arrival = pendingSpawn ? this.spawns.get(pendingSpawn) : undefined;
    pendingSpawn = null;
    const start = arrival ?? (gameState.location === this.location && gameState.player.x > 0 ? gameState.player : fallback);
    this.player = new Player(this, start.x, start.y, gameState.player.facing);
    gameState.location = this.location;

    const eauLayer = map.getLayer('eau')?.tilemapLayer;
    if (eauLayer) this.physics.add.collider(this.player.sprite, eauLayer);
    this.physics.add.collider(this.player.sprite, this.obstacles);
    for (const exit of this.exits) this.physics.add.overlap(this.player.sprite, exit.zone, () => this.travel(exit.target));

    // Curseur de case visée + nom de l'action.
    this.cursor = this.add.rectangle(0, 0, TILE_SIZE, TILE_SIZE, 0xffffff, 0.15).setOrigin(0, 0).setStrokeStyle(1, 0xffffff, 0.8).setDepth(9000);
    this.cursorLabel = this.add.text(0, 0, '', {
      fontFamily: 'sans-serif', fontSize: '9px', color: '#ffffff', backgroundColor: '#00000088', padding: { x: 2, y: 1 },
    }).setOrigin(0.5, 1).setDepth(9001);

    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12);
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.fadeIn(300);

    this.controls = createControls(this);
    this.hud = new Hud(this, title);
    if (!this.scene.isActive('UI')) this.scene.launch('UI');
    this.scene.bringToTop('UI');
  }

  /** Marque les cases couvertes par un rectangle (en pixels) comme non plantables. */
  protected block(px: number, py: number, w: number, h: number): void {
    for (let ty = Math.floor(py / TILE_SIZE); ty < Math.ceil((py + h) / TILE_SIZE); ty++)
      for (let tx = Math.floor(px / TILE_SIZE); tx < Math.ceil((px + w) / TILE_SIZE); tx++)
        this.blocked.add(`${tx},${ty}`);
  }

  /** Crée l'affichage et la collision d'un objet de la carte. Les scènes concrètes peuvent compléter. */
  protected buildObject(obj: Phaser.Types.Tilemaps.TiledObject): void {
    const x = obj.x ?? 0;
    const y = obj.y ?? 0; // pour les images Tiled, y = bord BAS de l'objet
    const prop = (name: string) => (obj.properties as { name: string; value: string }[] | undefined)?.find((p) => p.name === name)?.value;
    switch (obj.type) {
      case 'house': case 'shop': case 'museum': {
        const img = this.add.image(x, y, obj.type).setOrigin(0, 1).setDepth(y);
        this.block(x, y - img.height, img.width, img.height);
        // Le bloc solide = les murs (moitié basse), pas le toit : on peut passer derrière.
        this.obstacles.add(this.add.zone(x + img.width / 2, y - 16, img.width, 32));
        break;
      }
      case 'fountain': {
        const img = this.add.image(x, y, 'fountain').setOrigin(0, 1).setDepth(y);
        this.block(x, y - img.height, img.width, img.height);
        this.obstacles.add(this.add.zone(x + 16, y - 8, 28, 14));
        break;
      }
      case 'tree': {
        const size = prop('size') ?? 'big';
        const w = obj.width ?? 16;
        const img = this.add.image(x + w / 2, y, 'things', size === 'big' ? 'tree_big' : 'tree_small').setOrigin(0.5, 1).setDepth(y);
        this.obstacles.add(this.add.zone(img.x, y - 4, size === 'big' ? 14 : 8, 8)); // tronc solide
        this.block(x, y - 16, w, 16);
        break;
      }
      case 'bridge':
        this.add.image(x, y, 'bridge').setOrigin(0, 1).setDepth(0);
        this.block(x, y - 32, 48, 32);
        break;
      case 'npc': {
        const def = NPCS[prop('role') ?? ''];
        if (!def) break;
        const anim = `npc-idle@${def.texture}`;
        if (!this.anims.exists(anim)) this.anims.create({ key: anim, frames: this.anims.generateFrameNumbers(def.texture, { start: 0, end: 1 }), frameRate: 1.5, repeat: -1 });
        const w = obj.width ?? 16;
        const npc = this.add.sprite(x + w / 2, y, def.texture, 0).setOrigin(0.5, 0.8).setDepth(y);
        npc.play(anim);
        this.obstacles.add(this.add.zone(npc.x, y - 4, 12, 8));
        this.block(x, y - 16, w, 16);
        this.interact.set(`${Math.floor(x / TILE_SIZE)},${Math.floor((y - 1) / TILE_SIZE)}`, def.role === 'shop' ? { kind: 'shop' } : { kind: 'talk', npc: def.id });
        break;
      }
      case 'shipping': {
        this.add.image(x, y, 'shipping_box').setOrigin(0, 1).setDepth(y);
        this.obstacles.add(this.add.zone(x + 8, y - 8, 16, 16));
        this.block(x, y - 16, 16, 16);
        this.interact.set(`${Math.floor(x / TILE_SIZE)},${Math.floor((y - 1) / TILE_SIZE)}`, { kind: 'shipping' });
        break;
      }
      case 'door': case 'exit': {
        // Zone (pas une image) : x, y = coin haut-gauche.
        const w = obj.width ?? 16, h = obj.height ?? 8;
        const zone = this.add.zone(x + w / 2, y + h / 2, w, h);
        this.physics.add.existing(zone, true);
        this.exits.push({ zone, target: (prop('target') ?? 'house') as LocationId });
        this.block(x, y, w, h);
        break;
      }
      case 'spawn':
        this.spawns.set(obj.name ?? 'depart', { x, y });
        break;
    }
  }

  update(): void {
    if (this.transitioning) return;
    // Panneau ou dialogue ouvert : le joueur reste immobile et rien ne se déclenche.
    if (uiState.panelOpen) {
      this.player.move({ x: 0, y: 0 });
      this.controls.actionJustPressed(); // consommé : l'appui qui ferme un dialogue ne doit pas en rouvrir un
      return;
    }
    const dir = this.controls.getDirection();
    if (!this.beforeMove(dir)) return;
    this.player.move(dir, Energy.speedFactor());
    if (!this.exitsArmed && !this.exits.some((e) => this.physics.overlap(this.player.sprite, e.zone))) this.exitsArmed = true;
    // Position mémorisée en continu (pour la sauvegarde).
    gameState.player.x = this.player.x;
    gameState.player.y = this.player.y;
    gameState.player.facing = this.player.direction;

    // Horloge, énergie, pousse par nuits, expéditions.
    const cycle = DayCycle.update();
    this.onDayCycle(cycle);
    const ptx = Math.floor(this.player.x / TILE_SIZE), pty = Math.floor(this.player.y / TILE_SIZE);
    if (cycle.daysPassed > 0) this.floatText(`Jour ${gameState.time.day}`, ptx, pty - 2);
    if (cycle.shippingPaid > 0) { this.floatText(`Expédition : +${cycle.shippingPaid} pièces`, ptx, pty - 4); SaveSystem.autosave(); }

    // Case visée = la tuile devant les pieds du joueur.
    const { tx, ty } = this.targetTile();
    const thing = this.interact.get(`${tx},${ty}`);
    if (thing) {
      const label = thing.kind === 'shipping' ? 'Expédier' : 'Parler';
      this.showCursor(tx, ty, label, 0xfff2a0);
      if (this.controls.actionJustPressed()) {
        if (thing.kind === 'shop') this.game.events.emit('open-shop');
        else if (thing.kind === 'shipping') this.game.events.emit('open-shipping');
        else this.game.events.emit('dialogue', thing.npc);
      }
      return;
    }
    this.updateActions(tx, ty);
  }

  /** Hook : appelé avant le déplacement ; renvoyer false pour interrompre l'update (ex. pêche en cours). */
  protected beforeMove(_dir: { x: number; y: number }): boolean { return true; }
  /** Hook : après l'avancement de l'horloge (pousse des plantes…). */
  protected onDayCycle(_cycle: ReturnType<typeof DayCycle.update>): void {}
  /** Hook : actions propres à la carte sur la case visée (agriculture, pêche). Par défaut : rien. */
  protected updateActions(_tx: number, _ty: number): void {
    this.cursor.setVisible(false);
    this.cursorLabel.setVisible(false);
    this.controls.setActionLabel('');
  }

  protected showCursor(tx: number, ty: number, label: string, color: number): void {
    this.cursor.setPosition(tx * TILE_SIZE, ty * TILE_SIZE).setVisible(true).setStrokeStyle(1, color, 1);
    this.cursorLabel.setPosition(tx * TILE_SIZE + TILE_SIZE / 2, ty * TILE_SIZE - 2).setText(label).setVisible(true);
    this.controls.setActionLabel(label);
  }

  /** Tuile devant le joueur, selon la direction où il regarde. */
  protected targetTile(): { tx: number; ty: number } {
    const feetX = Math.floor(this.player.x / TILE_SIZE);
    const feetY = Math.floor((this.player.y - 2) / TILE_SIZE);
    const d = this.player.direction;
    return { tx: feetX + (d === 'left' ? -1 : d === 'right' ? 1 : 0), ty: feetY + (d === 'up' ? -1 : d === 'down' ? 1 : 0) };
  }

  /** Petit texte qui monte et disparaît (retour visuel). */
  protected floatText(text: string, tx: number, ty: number): void {
    const t = this.add.text(tx * TILE_SIZE + TILE_SIZE / 2, ty * TILE_SIZE - 14, text, {
      fontFamily: 'sans-serif', fontSize: '10px', color: '#fff2a0', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5, 1).setDepth(9500);
    this.tweens.add({ targets: t, y: t.y - 16, alpha: 0, duration: 900, onComplete: () => t.destroy() });
  }

  /** Changement de carte (porte de la maison, passage vers le village…) : fondu, position d'arrivée, scène. */
  private travel(target: LocationId): void {
    if (this.transitioning || !this.exitsArmed) return;
    this.transitioning = true;
    this.player.move({ x: 0, y: 0 });
    if (target === 'house') {
      // Au retour, le joueur réapparaît juste sous la porte, hors de sa zone.
      const door = this.exits.find((e) => e.target === 'house')!.zone;
      gameState.player = { x: door.x, y: door.y + door.height / 2 + 12, facing: 'down' };
    } else {
      // Sur l'autre carte, le point d'arrivée porte le nom de la carte d'où l'on vient (arrivee_<ici>).
      pendingSpawn = target === 'village' ? 'arrivee_terrain' : 'arrivee_village';
      gameState.player = { x: -1, y: -1, facing: target === 'village' ? 'up' : 'down' };
    }
    gameState.location = target;
    SaveSystem.autosave();
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(SCENE_FOR[target]));
  }
}
