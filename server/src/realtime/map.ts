import { readFileSync } from 'node:fs';
import type { Position } from './protocol.js';

type Rectangle = Position & { width: number; height: number; rotation?: number };
type MapObject = Rectangle & { name: string; point?: boolean };
type OfficeMap = { width: number; height: number; tilewidth: number; tileheight: number;
  layers: Array<{ name: string; objects?: MapObject[] }> };

// Même fichier que le navigateur, depuis src/realtime ou dist/realtime.
const map: OfficeMap = JSON.parse(readFileSync(new URL('../../../client/public/assets/maps/office-test.json', import.meta.url), 'utf8'));
export const PLAYER_RADIUS = 10;
export const PLAYER_SPEED = 160;
const width = map.width * map.tilewidth;
const height = map.height * map.tileheight;
const obstacles = map.layers.find(layer => layer.name === 'Collision')?.objects;
const spawn = map.layers.find(layer => layer.name === 'Spawn')?.objects?.find(object => object.name === 'spawn_lounge');
if (!obstacles?.length || !spawn || !Number.isFinite(width) || !Number.isFinite(height) ||
    obstacles.some(rect => ![rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) || rect.width <= 0 || rect.height <= 0 || rect.rotation)) {
  throw new Error('Carte multijoueur invalide : vérifier Collision et Spawn.');
}
export const spawnPosition: Position = { x: spawn.x, y: spawn.y };
const collisionRectangles = obstacles;

export function walkable(point: Position) {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x < PLAYER_RADIUS || point.y < PLAYER_RADIUS ||
      point.x > width - PLAYER_RADIUS || point.y > height - PLAYER_RADIUS) return false;
  return !collisionRectangles.some(rect => {
    const nearX = Math.max(rect.x, Math.min(point.x, rect.x + rect.width));
    const nearY = Math.max(rect.y, Math.min(point.y, rect.y + rect.height));
    return Math.hypot(point.x - nearX, point.y - nearY) < PLAYER_RADIUS - 0.1;
  });
}

if (!walkable(spawnPosition)) throw new Error('Le point de départ multijoueur est dans un obstacle.');

export function clearPath(from: Position, to: Position) {
  const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 2));
  for (let step = 1; step <= steps; step++) {
    if (!walkable({ x: from.x + (to.x - from.x) * step / steps, y: from.y + (to.y - from.y) * step / steps })) return false;
  }
  return true;
}

export function chooseSpawn(occupied: Position[]): Position {
  for (let row = 0; row < 5; row++) for (let column = 0; column < 4; column++) {
    const point = { x: spawnPosition.x + column * 36, y: spawnPosition.y + row * 36 };
    if (walkable(point) && occupied.every(other => Math.hypot(other.x - point.x, other.y - point.y) >= 30)) return point;
  }
  return { ...spawnPosition };
}
