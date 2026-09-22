// Scène du terrain : la carte Tiled (sol, rivière, décor), la maison, les arbres, le pont,
// le personnage, la caméra et la porte d'entrée de la maison.

import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { createControls } from '../systems/createControls';
import { InputController } from '../systems/InputController';
import { Hud } from '../ui/Hud';
import { gameState } from '../state/GameState';

export class WorldScene extends Phaser.Scene {
  private player!: Player;
  private controls!: InputController;
  private hud!: Hud;
  private doorZone!: Phaser.GameObjects.Zone;
  private entering = false;

  constructor() {
    super('World');
  }

  create(): void {
    // Une scène Phaser est réutilisée à chaque retour : on remet les drapeaux à zéro ici, pas dans le constructeur.
    this.entering = false;

    const map = this.make.tilemap({ key: 'ferme' });
    const grass = map.addTilesetImage('grass', 'grass')!;
    const water = map.addTilesetImage('water', 'water')!;

    // Calques dans l'ordre de dessin : eau dessous, puis sol, puis décor.
    const eau = map.createLayer('eau', [water])!;
    map.createLayer('eau_libre', [water]);   // sous le pont et les rives : pas de collision
    map.createLayer('sol', [grass]);
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

    for (const obj of objets.objects) {
      const x = obj.x ?? 0;
      const y = obj.y ?? 0; // pour les images Tiled, y = bord BAS de l'objet
      switch (obj.type) {
        case 'house': {
          const img = this.add.image(x, y, 'house').setOrigin(0, 1).setDepth(y);
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
          break;
        }
        case 'bridge':
          this.add.image(x, y, 'bridge').setOrigin(0, 1).setDepth(0);
          break;
        case 'door':
          this.doorZone = this.add.zone(x + (obj.width ?? 16) / 2, y + (obj.height ?? 8) / 2, obj.width ?? 16, obj.height ?? 8);
          this.physics.add.existing(this.doorZone, true);
          break;
        case 'spawn':
          spawn = { x, y };
          break;
      }
    }

    // --- Joueur : à la position mémorisée (retour de la maison) ou au point de départ. ---
    const start = gameState.location === 'world' && gameState.player.x > 0 ? gameState.player : spawn;
    this.player = new Player(this, start.x, start.y, gameState.player.facing);
    gameState.location = 'world';

    this.physics.add.collider(this.player.sprite, eau);
    this.physics.add.collider(this.player.sprite, obstacles);
    this.physics.add.overlap(this.player.sprite, this.doorZone, () => this.enterHouse());

    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12);
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.fadeIn(300);

    this.controls = createControls(this);
    this.hud = new Hud(this, 'Ton terrain');
  }

  update(): void {
    if (this.entering) return;
    this.player.move(this.controls.getDirection());
    this.hud.setInfo(`${Math.round(this.player.x)}, ${Math.round(this.player.y)}`);
  }

  /** Entrée dans la maison : on mémorise la position devant la porte, fondu, changement de scène. */
  private enterHouse(): void {
    if (this.entering) return;
    this.entering = true;
    gameState.player = { x: this.player.x, y: this.player.y + 10, facing: 'down' };
    gameState.location = 'house';
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('House'));
  }
}
