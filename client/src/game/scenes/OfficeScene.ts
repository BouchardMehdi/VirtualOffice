import Phaser from 'phaser';
import { OFFICE, type OfficeCallbacks } from '../config/office';
import { LocalPlayer } from '../entities/LocalPlayer';
import { MovementControls } from '../input/MovementControls';
import { buildOffice, type OfficeZone } from '../maps/buildOffice';

export class OfficeScene extends Phaser.Scene {
  private player?: LocalPlayer;
  private controls?: MovementControls;
  private zones: OfficeZone[] = [];
  private area = '';
  private failed = false;

  constructor(private readonly playerName: string, private readonly callbacks: OfficeCallbacks) {
    super('office');
  }

  preload() {
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, this.fail, this);
    this.load.tilemapTiledJSON(OFFICE.mapKey, OFFICE.mapUrl);
    this.load.image(OFFICE.tilesetKey, OFFICE.tilesetUrl);
  }

  create() {
    if (this.failed) return;
    try {
      const { map, obstacles, spawn, zones } = buildOffice(this);
      this.zones = zones;
      this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
      this.player = new LocalPlayer(this, spawn.x, spawn.y, this.playerName);
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
      canvas.focus({ preventScroll: true });
    } catch (error) {
      console.error('Chargement du bureau :', error);
      this.fail();
    }
  }

  update() {
    if (this.failed || !this.player || !this.controls) return;
    const direction = this.controls.getDirection();
    this.player.move(direction.x, direction.y);
    this.updateArea();
  }

  private updateArea() {
    if (!this.player) return;
    const { x, y } = this.player.marker;
    const area = this.zones.find((zone) => zone.bounds.contains(x, y))?.label ?? 'Passage';
    if (this.area !== area) { this.area = area; this.callbacks.onAreaChange(area); }
  }

  private fail() {
    if (this.failed) return;
    this.failed = true;
    this.releaseControls();
    this.physics?.world?.pause();
    this.callbacks.onError('Impossible de charger le bureau. Vérifie ta connexion puis réessaie.');
  }

  releaseControls() {
    this.controls?.destroy();
    this.controls = undefined;
    this.player?.body.setVelocity(0, 0);
  }

  snapshot() { return this.player?.snapshot() ?? null; }
}
