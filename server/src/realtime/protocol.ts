// Contrat partagé par import de types uniquement côté client.
export type Position = { x: number; y: number };
export type Presence = Position & { id: string; userId: string; name: string };
export interface ServerEvents {
  'office:welcome': (self: Presence) => void;
  'office:state': (players: Presence[]) => void;
  'office:correction': (position: Position) => void;
  'session:expired': () => void;
}
export interface ClientEvents {
  'player:move': (position: Position) => void;
}
