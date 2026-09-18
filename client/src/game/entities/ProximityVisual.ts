import Phaser from 'phaser';
import { CHAT_PROXIMITY } from '../../../../server/src/realtime/protocol';
import type { Position } from '../../../../server/src/realtime/protocol';

type VisibleParticipant = Position & { id: string; grouped: boolean };

export class ProximityVisual {
  private readonly ranges: Phaser.GameObjects.Graphics;
  private readonly markers: Phaser.GameObjects.Graphics;
  private participants: VisibleParticipant[] = [];

  constructor(scene: Phaser.Scene) {
    // Les zones restent sous les murs et meubles, les anneaux sous les avatars.
    this.ranges = scene.add.graphics().setDepth(0.5);
    this.markers = scene.add.graphics().setDepth(9);
  }

  update(participants: VisibleParticipant[]) {
    if (participants.length === this.participants.length && participants.every((participant, index) => {
      const previous = this.participants[index];
      return participant.id === previous.id && participant.x === previous.x && participant.y === previous.y &&
        participant.grouped === previous.grouped;
    })) return;
    this.participants = participants;
    this.ranges.clear();
    this.markers.clear();
    for (const { x, y, grouped } of participants) {
      const color = grouped ? 0xb87512 : 0x486b79;
      this.ranges.fillStyle(color, grouped ? 0.045 : 0.035);
      this.ranges.fillCircle(x, y, CHAT_PROXIMITY.enter);
      this.ranges.lineStyle(1.5, color, 0.6);
      this.ranges.strokeCircle(x, y, CHAT_PROXIMITY.enter);
      if (!grouped) continue;
      this.ranges.lineStyle(1, color, 0.35);
      for (let segment = 0; segment < 32; segment++) {
        const angle = segment * Math.PI / 16;
        this.ranges.beginPath();
        this.ranges.arc(x, y, CHAT_PROXIMITY.leave, angle, angle + Math.PI / 32);
        this.ranges.strokePath();
      }
      this.markers.lineStyle(4, 0x704913, 0.85);
      this.markers.strokeCircle(x, y, 15);
      this.markers.lineStyle(2, 0xffcf69, 1);
      this.markers.strokeCircle(x, y, 15);
    }
  }

  snapshot() {
    return { enterRadius: CHAT_PROXIMITY.enter, leaveRadius: CHAT_PROXIMITY.leave,
      participants: this.participants.map(participant => ({ ...participant })) };
  }
}
