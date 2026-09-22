// Prépare les contrôles d'une scène : joystick et bouton d'action tactiles si l'appareil le permet,
// puis le contrôleur d'entrées. Utilisé par toutes les scènes jouables pour ne pas répéter ce code.

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/constants';
import { VirtualJoystick } from '../ui/VirtualJoystick';
import { ActionButton } from '../ui/ActionButton';
import { InputController } from './InputController';

export function createControls(scene: Phaser.Scene): InputController {
  const isTouch = scene.sys.game.device.input.touch;
  let joystick: VirtualJoystick | null = null;
  let button: ActionButton | null = null;
  if (isTouch) {
    scene.input.addPointer(1); // deux doigts : joystick + bouton d'action
    joystick = new VirtualJoystick(scene, 56, GAME_HEIGHT - 56);
    button = new ActionButton(scene, GAME_WIDTH - 48, GAME_HEIGHT - 48);
  }
  return new InputController(scene, joystick, button);
}
