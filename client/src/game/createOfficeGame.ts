import Phaser from 'phaser';
import { OFFICE, type OfficeCallbacks, type PlayerSnapshot } from './config/office';
import { OfficeScene } from './scenes/OfficeScene';

declare global {
  interface Window {
    __virtualofficeTest?: { snapshot: () => PlayerSnapshot | null; network: () => ReturnType<OfficeScene['networkSnapshot']> };
  }
}

export function createOfficeGame(parent: HTMLElement, playerName: string, token: string, callbacks: OfficeCallbacks) {
  const scene = new OfficeScene(playerName, token, callbacks);
  const game = new Phaser.Game({
    type: Phaser.AUTO, parent, width: OFFICE.width, height: OFFICE.height,
    backgroundColor: '#273b32', pixelArt: true, roundPixels: true, banner: false,
    input: { keyboard: false },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
    scene: [scene],
  });
  const resize = new ResizeObserver(() => { if (game.isBooted) game.scale.refresh(); });
  resize.observe(parent);
  // Lecture seule, uniquement pour les tests du jeu ; aucun contrôle de position exposé.
  const probe = { snapshot: () => scene.snapshot(), network: () => scene.networkSnapshot() };
  if (import.meta.env.MODE === 'test') window.__virtualofficeTest = probe;

  return {
    destroy() {
      resize.disconnect();
      scene.releaseControls();
      if (window.__virtualofficeTest === probe) delete window.__virtualofficeTest;
      game.destroy(true);
    },
  };
}
