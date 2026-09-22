// Prépare les contrôles d'une scène : joystick tactile si l'appareil le permet, puis le contrôleur d'entrées.
// Utilisé par toutes les scènes jouables (monde, maison…) pour ne pas répéter ce code.

import Phaser from 'phaser';
import { GAME_HEIGHT } from '../config/constants';
import { VirtualJoystick } from '../ui/VirtualJoystick';
import { InputController } from './InputController';

export function createControls(scene: Phaser.Scene): InputController {
  const isTouch = scene.sys.game.device.input.touch;
  let joystick: VirtualJoystick | null = null;
  if (isTouch) {
    scene.input.addPointer(1); // deux doigts : joystick + futur bouton d'action
    joystick = new VirtualJoystick(scene, 56, GAME_HEIGHT - 56);
  }
  return new InputController(scene, joystick);
}
