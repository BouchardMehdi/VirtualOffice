import Phaser from 'phaser';
import { OFFICE } from '../config/office';

type TiledObject = Phaser.Types.Tilemaps.TiledObject;
export type OfficeZone = { bounds: Phaser.Geom.Rectangle; label: string };

function rectangle(object: TiledObject) {
  const { x, y, width, height } = object;
  if (![x, y, width, height].every((value) => typeof value === 'number' && Number.isFinite(value)) ||
      !width || !height || width < 0 || height < 0 || object.rotation || object.ellipse || object.polygon || object.polyline) {
    throw new Error(`L'objet ${object.name} doit être un rectangle non pivoté.`);
  }
  return new Phaser.Geom.Rectangle(x!, y!, width, height);
}

export function buildOffice(scene: Phaser.Scene) {
  const map = scene.make.tilemap({ key: OFFICE.mapKey });
  const tileset = map.addTilesetImage(OFFICE.tilesetName, OFFICE.tilesetKey);
  if (!tileset) throw new Error('Tileset absent ou incompatible.');

  for (const [depth, name] of ['Floor', 'Walls', 'Doors'].entries()) {
    const layer = map.createLayer(name, tileset, 0, 0);
    if (!layer) throw new Error(`Calque ${name} absent.`);
    layer.setDepth(depth);
  }

  const collisionLayer = map.getObjectLayer('Collision');
  if (!collisionLayer?.objects.length) throw new Error('Calque Collision absent ou vide.');
  const collisionBounds = collisionLayer.objects.map(rectangle);
  const obstacles = scene.physics.add.staticGroup();
  for (const bounds of collisionBounds) {
    const obstacle = scene.add.zone(bounds.centerX, bounds.centerY, bounds.width, bounds.height);
    scene.physics.add.existing(obstacle, true);
    obstacles.add(obstacle);
  }

  // Cadres détourés dans les cellules 64×64 du pack, sans modifier les PNG.
  const furniture = scene.textures.get(OFFICE.furnitureKey);
  for (const [name, x, y, width, height] of [
    ['desk', 69, 8, 55, 55], ['sofa', 197, 12, 55, 39], ['table', 132, 82, 57, 29],
  ] as const) {
    if (!furniture.has(name)) furniture.add(name, 0, x, y, width, height);
  }
  for (const item of map.getObjectLayer('Furniture')?.objects ?? []) {
    const bounds = rectangle(item);
    const frame = item.type === 'sofa' ? 'sofa' : item.type === 'desk' || item.name === 'Bureau' ? 'desk' : 'table';
    scene.add.image(bounds.centerX, bounds.centerY, OFFICE.furnitureKey, frame)
      .setDisplaySize(bounds.width, bounds.height).setDepth(5);
  }
  for (const item of map.getObjectLayer('Decor')?.objects ?? []) {
    const bounds = rectangle(item);
    const frame = item.type === 'clock' ? 1 : item.type === 'plant' ? 6 : 0;
    scene.add.image(bounds.centerX, bounds.centerY, OFFICE.decorKey, frame)
      .setDisplaySize(bounds.width, bounds.height).setDepth(6);
  }

  const zones: OfficeZone[] = (map.getObjectLayer('Zones')?.objects ?? []).map((object) => {
    const bounds = rectangle(object);
    const properties = object.properties as Array<{ name: string; value: unknown }> | undefined;
    const property = Array.isArray(properties) ? properties.find((item) => item.name === 'label') : undefined;
    const label = typeof property?.value === 'string' ? property.value : object.name;
    scene.add.text(bounds.x + 12, bounds.y + 10, label, {
      fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: '#182d27',
      backgroundColor: '#f5f7f6', padding: { x: 6, y: 3 },
    }).setDepth(4);
    return { bounds, label };
  });

  const spawn = map.getObjectLayer('Spawn')?.objects.find((object) => object.name === 'spawn_lounge');
  const radius = OFFICE.playerRadius;
  if (!spawn || !Number.isFinite(spawn.x) || !Number.isFinite(spawn.y) ||
      spawn.x! < radius || spawn.y! < radius || spawn.x! > map.widthInPixels - radius ||
      spawn.y! > map.heightInPixels - radius) throw new Error('Point spawn_lounge absent ou hors carte.');
  const spawnCircle = new Phaser.Geom.Circle(spawn.x!, spawn.y!, radius);
  if (collisionBounds.some((bounds) => Phaser.Geom.Intersects.CircleToRectangle(spawnCircle, bounds))) {
    throw new Error('Le point de départ se trouve dans un obstacle.');
  }
  return { map, obstacles, zones, spawn: { x: spawn.x!, y: spawn.y! } };
}
