import Phaser from 'phaser';
import { OFFICE, type PlayerSnapshot } from '../config/office';

export class LocalPlayer {
  readonly marker: Phaser.GameObjects.Arc;
  readonly body: Phaser.Physics.Arcade.Body;
  private readonly label: Phaser.GameObjects.Text;
  private readonly direction = new Phaser.Math.Vector2();

  constructor(scene: Phaser.Scene, x: number, y: number, name: string) {
    this.marker = scene.add.circle(x, y, OFFICE.playerRadius, 0x153f34)
      .setStrokeStyle(3, 0xffffff).setDepth(20);
    scene.physics.add.existing(this.marker);
    this.body = this.marker.body as Phaser.Physics.Arcade.Body;
    this.body.setCircle(OFFICE.playerRadius).setCollideWorldBounds(true);
    this.label = scene.add.text(x, y - 22, name, {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#ffffff',
      backgroundColor: '#153f34', padding: { x: 6, y: 3 },
    }).setOrigin(0.5, 1).setDepth(30);
  }

  move(x: number, y: number) {
    this.direction.set(x, y).normalize().scale(OFFICE.playerSpeed);
    this.body.setVelocity(this.direction.x, this.direction.y);
    this.label.setPosition(this.marker.x, this.marker.y - 22);
  }

  setPosition(x: number, y: number) {
    this.body.reset(x, y);
    this.label.setPosition(x, y - 22);
  }

  snapshot(): PlayerSnapshot {
    return {
      x: this.marker.x, y: this.marker.y,
      velocityX: this.body.velocity.x, velocityY: this.body.velocity.y,
      name: this.label.text, labelX: this.label.x, labelY: this.label.y,
    };
  }
}
