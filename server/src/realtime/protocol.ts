// Contrat partagé sans dépendance serveur : types et distances du chat.
export const CHAT_PROXIMITY = { enter: 96, leave: 120 } as const;
export type Position = { x: number; y: number };
export type Presence = Position & { id: string; userId: string; name: string };
export type ChatMember = Pick<Presence, 'id' | 'name'>;
export type ChatMessage = { id: string; senderId: string; name: string; text: string; sentAt: number };
export type ChatState = { id: string; members: ChatMember[]; messages: ChatMessage[] } | null;
export type ChatRequest = { conversationId: string; text: string };
export type ChatResult = { ok: true } | { ok: false; error: string };
export interface ServerEvents {
  'office:welcome': (self: Presence) => void;
  'office:state': (players: Presence[]) => void;
  'office:correction': (position: Position) => void;
  'session:expired': () => void;
  'chat:state': (state: ChatState) => void;
}
export interface ClientEvents {
  'player:move': (position: Position) => void;
  'chat:send': (request: ChatRequest, reply: (result: ChatResult) => void) => void;
}
