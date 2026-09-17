import Phaser from 'phaser';
import { OFFICE } from '../config/office';

// Planche fournie : bas, gauche, droite, haut ; trois poses par direction.
const directions = ['down', 'left', 'right', 'up'] as const;

export class AvatarVisual {
  private readonly sprite: Phaser.GameObjects.Sprite;
  private row = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, depth: number) {
    directions.forEach((direction, row) => {
      const key = `office-walk-${direction}`;
      if (!scene.anims.exists(key)) scene.anims.create({ key,
        frames: scene.anims.generateFrameNumbers(OFFICE.avatarKey, { start: row * 3, end: row * 3 + 2 }),
        frameRate: 8, repeat: -1 });
    });
    this.sprite = scene.add.sprite(x, y + 8, OFFICE.avatarKey, 1).setOrigin(0.5, 1).setDepth(depth);
  }

  update(x: number, y: number, dx: number, dy: number) {
    this.sprite.setPosition(x, y + 8);
    if (Math.hypot(dx, dy) > 0.1) {
      this.row = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0);
      this.sprite.play(`office-walk-${directions[this.row]}`, true);
    } else {
      this.sprite.stop();
      this.sprite.setFrame(this.row * 3 + 1);
    }
  }

  destroy() { this.sprite.destroy(); }
}
