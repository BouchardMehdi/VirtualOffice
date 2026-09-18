import Phaser from 'phaser';
import { OFFICE, type OfficeCallbacks } from '../config/office';
import { LocalPlayer } from '../entities/LocalPlayer';
import { MovementControls } from '../input/MovementControls';
import { buildOffice, type OfficeZone } from '../maps/buildOffice';
import { RemotePlayer } from '../entities/RemotePlayer';
import { ProximityVisual } from '../entities/ProximityVisual';
import { OfficeConnection } from '../network/OfficeConnection';
import type { ChatRequest, ChatResult, Presence } from '../../../../server/src/realtime/protocol';

export class OfficeScene extends Phaser.Scene {
  private player?: LocalPlayer;
  private controls?: MovementControls;
  private zones: OfficeZone[] = [];
  private area = '';
  private failed = false;
  private connection?: OfficeConnection;
  private readonly others = new Map<string, RemotePlayer>();
  private lastSend = 0;
  private selfId?: string;
  private readonly groupMembers = new Set<string>();
  private proximity?: ProximityVisual;

  constructor(private readonly playerName: string, private readonly token: string, private readonly callbacks: OfficeCallbacks) {
    super('office');
  }

  preload() {
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, this.fail, this);
    this.load.tilemapTiledJSON(OFFICE.mapKey, OFFICE.mapUrl);
    this.load.image(OFFICE.tilesetKey, OFFICE.tilesetUrl);
    this.load.image(OFFICE.furnitureKey, OFFICE.furnitureUrl);
    this.load.spritesheet(OFFICE.decorKey, OFFICE.decorUrl, { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet(OFFICE.avatarKey, OFFICE.avatarUrl, { frameWidth: 32, frameHeight: 48 });
  }

  create() {
    if (this.failed) return;
    try {
      const { map, obstacles, spawn, zones } = buildOffice(this);
      this.zones = zones;
      this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
      this.player = new LocalPlayer(this, spawn.x, spawn.y, this.playerName);
      this.proximity = new ProximityVisual(this);
      this.physics.add.collider(this.player.marker, obstacles);
      this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
        .startFollow(this.player.marker, true);

      const canvas = this.game.canvas;
      canvas.tabIndex = 0;
      canvas.setAttribute('role', 'application');
      canvas.setAttribute('aria-label', `Bureau virtuel de ${this.playerName}`);
      canvas.setAttribute('aria-describedby', 'office-controls');
      this.controls = new MovementControls(canvas);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.releaseControls, this);
      this.updateArea();
      this.callbacks.onReady();
      this.connection = new OfficeConnection(this.token, {
        welcome: self => { this.selfId = self.id; this.controls?.reset(); this.player?.setPosition(self.x, self.y); this.updateArea(); },
        players: (players, total) => { this.updatePlayers(players); this.callbacks.onPresence(total); },
        correction: position => this.player?.setPosition(position.x, position.y),
        status: status => {
          if (status !== 'online') {
            this.controls?.reset(); this.player?.move(0, 0);
            this.groupMembers.clear(); this.proximity?.update([]);
          }
          this.callbacks.onNetwork(status);
        },
        expired: this.callbacks.onSessionExpired,
        chat: state => {
          this.groupMembers.clear();
          for (const member of state?.members ?? []) this.groupMembers.add(member.id);
          this.callbacks.onChat(state);
        },
      });
      canvas.focus({ preventScroll: true });
    } catch (error) {
      console.error('Chargement du bureau :', error);
      this.fail();
    }
  }

  update(time: number, delta: number) {
    if (this.failed || !this.player || !this.controls) return;
    const direction = this.connection?.ready ? this.controls.getDirection() : { x: 0, y: 0 };
    this.player.move(direction.x, direction.y);
    for (const other of this.others.values()) other.update(delta);
    this.updateProximity();
    if (time - this.lastSend >= 50 && this.connection?.ready) {
      this.lastSend = time;
      this.connection.send({ x: this.player.marker.x, y: this.player.marker.y });
    }
    this.updateArea();
  }

  private updatePlayers(players: Presence[]) {
    const ids = new Set(players.map(player => player.id));
    for (const [id, other] of this.others) {
      if (!ids.has(id)) { other.destroy(); this.others.delete(id); }
    }
    for (const player of players) {
      const existing = this.others.get(player.id);
      if (existing) existing.setTarget(player);
      else this.others.set(player.id, new RemotePlayer(this, player));
    }
  }

  private updateArea() {
    if (!this.player) return;
    const { x, y } = this.player.marker;
    const area = this.zones.find((zone) => zone.bounds.contains(x, y))?.label ?? 'Passage';
    if (this.area !== area) { this.area = area; this.callbacks.onAreaChange(area); }
  }

  private updateProximity() {
    if (!this.player || !this.selfId || !this.connection?.ready) { this.proximity?.update([]); return; }
    const participants = [{ id: this.selfId, x: this.player.marker.x, y: this.player.marker.y,
      grouped: this.groupMembers.has(this.selfId) }];
    for (const [id, other] of this.others) {
      if (!this.groupMembers.has(id)) continue;
      const { renderedX: x, renderedY: y } = other.snapshot();
      participants.push({ id, x, y, grouped: true });
    }
    this.proximity?.update(participants);
  }

  private fail() {
    if (this.failed) return;
    this.failed = true;
    this.releaseControls();
    this.physics?.world?.pause();
    this.callbacks.onError('Impossible de charger le bureau. Vérifie ta connexion puis réessaie.');
  }

  releaseControls() {
    this.groupMembers.clear();
    this.proximity?.update([]);
    this.connection?.destroy();
    this.connection = undefined;
    this.updatePlayers([]);
    this.controls?.destroy();
    this.controls = undefined;
    this.player?.body.setVelocity(0, 0);
  }

  snapshot() { return this.player?.snapshot() ?? null; }
  proximitySnapshot() { return this.proximity?.snapshot() ?? null; }
  sendChat(request: ChatRequest): Promise<ChatResult> {
    return this.connection?.sendChat(request) ?? Promise.resolve({ ok: false, error: 'Le bureau est déconnecté.' });
  }
  networkSnapshot() { return { online: this.connection?.ready ?? false, others: [...this.others.values()].map(other => other.snapshot()) }; }
}
