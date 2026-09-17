import Phaser from 'phaser';
import type { Presence } from '../../../../server/src/realtime/protocol';
import { OFFICE } from '../config/office';

export class RemotePlayer {
  private readonly marker: Phaser.GameObjects.Arc;
  private readonly label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, private target: Presence) {
    this.marker = scene.add.circle(target.x, target.y, OFFICE.playerRadius, 0x226f99)
      .setStrokeStyle(3, 0xffffff).setDepth(10);
    this.label = scene.add.text(target.x, target.y - 22, target.name, {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#ffffff',
      backgroundColor: '#226f99', padding: { x: 6, y: 3 },
    }).setOrigin(0.5, 1).setDepth(15);
  }

  setTarget(target: Presence) { this.target = target; }

  update(delta: number) {
    const ratio = 1 - Math.exp(-delta / 65);
    this.marker.x = Phaser.Math.Linear(this.marker.x, this.target.x, ratio);
    this.marker.y = Phaser.Math.Linear(this.marker.y, this.target.y, ratio);
    this.label.setPosition(this.marker.x, this.marker.y - 22);
  }

  snapshot() { return { ...this.target, renderedX: this.marker.x, renderedY: this.marker.y }; }
  destroy() { this.marker.destroy(); this.label.destroy(); }
}
