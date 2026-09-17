import { randomUUID } from 'node:crypto';
import { canHear } from './map.js';
import type { ChatMember, ChatMessage, ChatResult, ChatState, Presence } from './protocol.js';

export const CHAT_ENTER_RADIUS = 96;
export const CHAT_LEAVE_RADIUS = 120;
export const CONVERSATION_TTL_MS = 5 * 60 * 1_000;
export const MAX_MESSAGE_LENGTH = 500;
export const MAX_MESSAGES = 100;
export const MESSAGE_INTERVAL_MS = 600;
type Conversation = { id: string; members: ChatMember[]; messages: ChatMessage[]; inactiveSince: number | null };

export class ProximityChat {
  private edges = new Set<string>();
  private assignments = new Map<string, Conversation>();
  private readonly conversations = new Map<string, Conversation>();
  private readonly lastMessage = new Map<string, number>();

  constructor(private readonly deliver: (socketId: string, state: ChatState) => void,
    private readonly clock: () => number = Date.now) {}

  update(players: Presence[]) {
    const now = this.clock();
    for (const [key, conversation] of this.conversations) {
      if (conversation.inactiveSince !== null && now - conversation.inactiveSince >= CONVERSATION_TTL_MS) this.conversations.delete(key);
    }
    const sorted = [...players].sort((a, b) => a.id.localeCompare(b.id));
    const neighbors = new Map(sorted.map(player => [player.id, new Set<string>()]));
    const nextEdges = new Set<string>();
    for (let i = 0; i < sorted.length; i++) for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i];
      const b = sorted[j];
      const edge = JSON.stringify([a.id, b.id]);
      const radius = this.edges.has(edge) ? CHAT_LEAVE_RADIUS : CHAT_ENTER_RADIUS;
      if (Math.hypot(a.x - b.x, a.y - b.y) <= radius && canHear(a, b)) {
        nextEdges.add(edge);
        neighbors.get(a.id)!.add(b.id);
        neighbors.get(b.id)!.add(a.id);
      }
    }
    this.edges = nextEdges;
    const visited = new Set<string>();
    const next = new Map<string, Conversation>();
    const active = new Set<Conversation>();
    const byId = new Map(sorted.map(player => [player.id, player]));
    for (const player of sorted) {
      if (visited.has(player.id)) continue;
      const group: string[] = [];
      const queue = [player.id];
      while (queue.length) {
        const id = queue.pop()!;
        if (visited.has(id)) continue;
        visited.add(id);
        group.push(id);
        queue.push(...neighbors.get(id)!);
      }
      if (group.length < 2) continue;
      group.sort();
      const key = JSON.stringify(group);
      let conversation = this.conversations.get(key);
      if (!conversation) {
        conversation = { id: randomUUID(), members: group.map(id => ({ id, name: byId.get(id)!.name })), messages: [], inactiveSince: null };
        this.conversations.set(key, conversation);
      }
      conversation.inactiveSince = null;
      active.add(conversation);
      for (const id of group) next.set(id, conversation);
    }
    for (const conversation of this.conversations.values()) {
      if (!active.has(conversation) && conversation.inactiveSince === null) conversation.inactiveSince = now;
    }
    for (const player of sorted) {
      if (this.assignments.get(player.id)?.id !== next.get(player.id)?.id) this.deliver(player.id, this.snapshot(next.get(player.id)));
    }
    this.assignments = next;
    for (const id of this.lastMessage.keys()) if (!byId.has(id)) this.lastMessage.delete(id);
  }

  private snapshot(conversation?: Conversation): ChatState {
    return conversation ? { id: conversation.id, members: [...conversation.members], messages: [...conversation.messages] } : null;
  }

  send(socketId: string, request: unknown): ChatResult {
    const conversation = this.assignments.get(socketId);
    if (!conversation || typeof request !== 'object' || request === null || !('conversationId' in request) || request.conversationId !== conversation.id) {
      return { ok: false, error: 'Ton groupe a changé. Rapproche-toi des participants avant d’envoyer.' };
    }
    if (!('text' in request) || typeof request.text !== 'string' || request.text.length > MAX_MESSAGE_LENGTH || !request.text.trim()) {
      return { ok: false, error: `Écris un message de 1 à ${MAX_MESSAGE_LENGTH} caractères.` };
    }
    const now = this.clock();
    if (now - (this.lastMessage.get(socketId) ?? -Infinity) < MESSAGE_INTERVAL_MS) {
      return { ok: false, error: 'Attends un instant avant d’envoyer un autre message.' };
    }
    const member = conversation.members.find(member => member.id === socketId)!;
    const message: ChatMessage = { id: randomUUID(), senderId: socketId, name: member.name, text: request.text.trim(), sentAt: now };
    conversation.messages.push(message);
    if (conversation.messages.length > MAX_MESSAGES) conversation.messages.shift();
    this.lastMessage.set(socketId, now);
    for (const recipient of conversation.members) this.deliver(recipient.id, this.snapshot(conversation));
    return { ok: true };
  }
}
