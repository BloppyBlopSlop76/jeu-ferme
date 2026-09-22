// Scène du village (phase 10) : le bourg au nord du terrain — vieux musée, place et fontaine, deux PNJ,
// des espaces libres pour de futurs bâtiments. Pas d'agriculture ni de pêche ici : tout vient de MapScene.

import { MapScene } from './MapScene';

export class VillageScene extends MapScene {
  constructor() {
    super('Village', 'village', 'village');
  }

  create(): void {
    this.buildMap('Le bourg');
  }
}
