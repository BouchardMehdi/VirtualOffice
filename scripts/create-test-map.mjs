import { mkdirSync, writeFileSync } from 'node:fs';

// Carte de validation technique uniquement. La carte finale sera réalisée dans Tiled.
const width = 26;
const height = 18;
const tileSize = 32;
const floor = [];
const walls = Array(width * height).fill(0);
const doors = Array(width * height).fill(0);
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) floor.push(x < 10 ? 2 : y < 10 ? 1 : 3);
}
const wall = (x, y, gid) => { walls[y * width + x] = gid; };
for (let x = 0; x < width; x++) { wall(x, 0, 5); wall(x, height - 1, 5); }
for (let y = 0; y < height; y++) { wall(0, y, 6); wall(width - 1, y, 6); }
for (let y = 1; y < height - 1; y++) if (y !== 7 && y !== 8) wall(10, y, 6);
for (let x = 11; x < width - 1; x++) if (x !== 18 && x !== 19) wall(x, 10, 5);
for (const [x, y] of [[0, 0], [25, 0], [0, 17], [25, 17], [10, 0], [10, 17], [10, 10]]) wall(x, y, 7);
doors[7 * width + 10] = 9;
doors[8 * width + 10] = 12;
doors[10 * width + 18] = 12;
doors[10 * width + 19] = 12;

let nextId = 1;
function object(name, x, y, w, h, extra = {}) {
  return { id: nextId++, name, type: '', x, y, width: w, height: h, rotation: 0, visible: true, ...extra };
}
const furniture = [
  object('Canapé', 96, 96, 128, 48, { type: 'sofa' }),
  object('Table', 128, 192, 64, 48),
  object('Bureau', 448, 96, 96, 48),
  object('Bureau', 640, 96, 96, 48),
  object('Table', 480, 400, 192, 64),
];
const collisions = [];
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    if (walls[y * width + x]) collisions.push(object('wall', x * tileSize, y * tileSize, tileSize, tileSize));
  }
}
for (const item of furniture) collisions.push(object(item.name, item.x, item.y, item.width, item.height));
const tileLayer = (id, name, data) => ({ id, name, type: 'tilelayer', width, height, x: 0, y: 0, opacity: 1, visible: true, data });
const objectLayer = (id, name, objects, visible = true) => ({ id, name, type: 'objectgroup', draworder: 'topdown', x: 0, y: 0, opacity: 1, visible, objects });
const zone = (name, label, x, y, w, h) => object(name, x, y, w, h, {
  properties: [{ name: 'label', type: 'string', value: label }],
});
const map = {
  compressionlevel: -1, width, height, infinite: false, orientation: 'orthogonal',
  renderorder: 'right-down', tilewidth: tileSize, tileheight: tileSize,
  type: 'map', version: '1.10', tiledversion: '1.11.0', nextlayerid: 8,
  layers: [
    tileLayer(1, 'Floor', floor), tileLayer(2, 'Walls', walls), tileLayer(3, 'Doors', doors),
    objectLayer(4, 'Furniture', furniture), objectLayer(5, 'Collision', collisions, false),
    objectLayer(6, 'Spawn', [object('spawn_lounge', 160, 336, 0, 0, { point: true })]),
    objectLayer(7, 'Zones', [
      zone('lounge', 'Détente', 32, 32, 288, 512),
      zone('open_space', 'Open space', 352, 32, 448, 288),
      zone('meeting_room', 'Réunion', 352, 352, 448, 192),
    ]),
  ],
  tilesets: [{ firstgid: 1, name: 'virtualoffice_base', tilewidth: 32, tileheight: 32,
    tilecount: 16, columns: 4, margin: 0, spacing: 0,
    image: '../tilesets/virtualoffice_base_tileset_32x32.png', imagewidth: 128, imageheight: 128 }],
};
map.nextobjectid = nextId;
const directory = new URL('../client/public/assets/maps/', import.meta.url);
mkdirSync(directory, { recursive: true });
writeFileSync(new URL('office-test.json', directory), `${JSON.stringify(map, null, 2)}\n`);
console.log('Carte de test écrite : client/public/assets/maps/office-test.json');
