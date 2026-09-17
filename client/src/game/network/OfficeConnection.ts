import { io, type Socket } from 'socket.io-client';
import type { ChatRequest, ChatResult, ChatState, ClientEvents, Position, Presence, ServerEvents } from '../../../../server/src/realtime/protocol';

export type NetworkStatus = 'connecting' | 'online' | 'reconnecting';
type Callbacks = {
  welcome: (self: Presence) => void;
  players: (others: Presence[], total: number) => void;
  correction: (position: Position) => void;
  status: (status: NetworkStatus) => void;
  expired: () => void;
  chat: (state: ChatState) => void;
};

export class OfficeConnection {
  private readonly socket: Socket<ServerEvents, ClientEvents>;
  private retry?: ReturnType<typeof setTimeout>;
  private disposed = false;
  ready = false;

  constructor(token: string, private readonly callbacks: Callbacks) {
    this.socket = io({ auth: { token }, autoConnect: false, forceNew: true,
      reconnectionDelay: 500, reconnectionDelayMax: 2_000, timeout: 5_000 });
    callbacks.status('connecting');
    this.socket.on('office:welcome', self => {
      if (this.retry) clearTimeout(this.retry);
      callbacks.welcome(self);
      this.ready = true;
      callbacks.status('online');
    });
    this.socket.on('office:state', players => {
      if (this.ready) callbacks.players(players.filter(player => player.id !== this.socket.id), players.length);
    });
    this.socket.on('office:correction', callbacks.correction);
    this.socket.on('chat:state', callbacks.chat);
    this.socket.on('session:expired', () => { this.destroy(); callbacks.expired(); });
    this.socket.on('disconnect', () => {
      this.ready = false;
      callbacks.chat(null);
      callbacks.players([], 0);
      callbacks.status('reconnecting');
      if (!this.socket.active) this.retryConnection();
    });
    this.socket.on('connect_error', error => {
      this.ready = false;
      if ('data' in error && (error.data as { code?: string })?.code === 'AUTH_REQUIRED') {
        this.destroy(); callbacks.expired(); return;
      }
      callbacks.status('reconnecting');
      // Les refus temporaires du middleware ne sont pas réessayés par Socket.IO.
      if (!this.socket.active) this.retryConnection();
    });
    this.socket.connect();
  }

  private retryConnection() {
    if (this.retry) clearTimeout(this.retry);
    this.retry = setTimeout(() => { if (!this.disposed) this.socket.connect(); }, 2_000);
  }

  send(position: Position) {
    if (this.ready && this.socket.connected) this.socket.volatile.emit('player:move', position);
  }

  sendChat(request: ChatRequest): Promise<ChatResult> {
    if (!this.ready || !this.socket.connected) return Promise.resolve({ ok: false, error: 'Connexion perdue. Attends la reconnexion.' });
    return new Promise(resolve => {
      this.socket.timeout(5_000).emit('chat:send', request, (error, result) => {
        resolve(error ? { ok: false, error: 'Envoi non confirmé. Vérifie les messages avant de réessayer.' } : result);
      });
    });
  }

  destroy() {
    this.disposed = true;
    this.ready = false;
    if (this.retry) clearTimeout(this.retry);
    this.socket.removeAllListeners();
    this.socket.disconnect();
  }
}
