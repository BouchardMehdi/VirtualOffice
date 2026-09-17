import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { verifyToken } from '../auth/token.js';
import { env } from '../config/env.js';
import { prisma } from '../services/prisma.js';
import { chooseSpawn, clearPath, PLAYER_SPEED } from './map.js';
import type { ClientEvents, Presence, ServerEvents } from './protocol.js';
import { ProximityChat } from './chat.js';

type SocketData = { userId: string; name: string; expiresAt: number };
type Player = { presence: Presence; credit: number; lastMove: number; lastPacket: number };
const MAX_TRAVEL_CREDIT = 48; // Tolérance de 300 ms, sans accumulation à l'arrêt.

function connectionError(code: string) {
  return Object.assign(new Error(code === 'AUTH_REQUIRED' ? 'Session invalide.' : 'Connexion indisponible.'), { data: { code } });
}

export function attachOffice(server: HttpServer) {
  const io = new Server<ClientEvents, ServerEvents, Record<string, never>, SocketData>(server, {
    cors: { origin: env.clientOrigin }, maxHttpBufferSize: 8_192,
    pingInterval: 5_000, pingTimeout: 5_000,
  });
  const players = new Map<string, Player>();
  const chat = new ProximityChat((id, state) => io.to(id).emit('chat:state', state));
  const updateChat = () => chat.update([...players.values()].map(player => player.presence));
  let dirty = false;
  const publish = () => { io.emit('office:state', [...players.values()].map(player => player.presence)); dirty = false; };
  const timer = setInterval(() => { if (dirty) publish(); updateChat(); }, 100);
  timer.unref();
  server.once('close', () => clearInterval(timer));

  io.use(async (socket, next) => {
    let session: ReturnType<typeof verifyToken>;
    try {
      const token: unknown = socket.handshake.auth?.token;
      if (typeof token !== 'string' || token.length > 4_096) throw new Error('Invalid token');
      session = verifyToken(token);
    } catch { next(connectionError('AUTH_REQUIRED')); return; }
    try {
      const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, firstName: true, lastName: true } });
      if (!user || session.expiresAt <= Date.now()) { next(connectionError('AUTH_REQUIRED')); return; }
      socket.data = { userId: user.id, name: `${user.firstName} ${user.lastName}`, expiresAt: session.expiresAt };
      next();
    } catch { next(connectionError('UNAVAILABLE')); }
  });

  io.on('connection', socket => {
    const presence: Presence = { id: socket.id, userId: socket.data.userId, name: socket.data.name,
      ...chooseSpawn([...players.values()].map(player => player.presence)) };
    const player: Player = { presence, credit: MAX_TRAVEL_CREDIT, lastMove: performance.now(), lastPacket: -Infinity };
    players.set(socket.id, player);
    socket.emit('office:welcome', presence);
    publish();
    updateChat();
    const expire = () => { socket.emit('session:expired'); socket.disconnect(true); };
    const expiry = setTimeout(expire, Math.max(0, socket.data.expiresAt - Date.now()));
    expiry.unref();

    socket.on('player:move', (position: unknown) => {
      if (Date.now() >= socket.data.expiresAt) { expire(); return; }
      const now = performance.now();
      if (now - player.lastPacket < 20) return; // Au plus 50 validations/s par connexion.
      player.lastPacket = now;
      player.credit = Math.min(MAX_TRAVEL_CREDIT, player.credit + (now - player.lastMove) * PLAYER_SPEED / 1_000);
      player.lastMove = now;
      if (typeof position !== 'object' || position === null || !('x' in position) || !('y' in position) ||
          typeof position.x !== 'number' || typeof position.y !== 'number' || !Number.isFinite(position.x) || !Number.isFinite(position.y)) {
        socket.emit('office:correction', { x: presence.x, y: presence.y }); return;
      }
      const next = { x: position.x, y: position.y };
      const distance = Math.hypot(next.x - presence.x, next.y - presence.y);
      if (distance > player.credit + 0.1 || !clearPath(presence, next)) {
        socket.emit('office:correction', { x: presence.x, y: presence.y }); return;
      }
      player.credit = Math.max(0, player.credit - distance);
      if (distance > 0) { presence.x = next.x; presence.y = next.y; dirty = true; }
    });
    socket.on('chat:send', (request: unknown, reply) => {
      if (typeof reply !== 'function') return;
      if (Date.now() >= socket.data.expiresAt) { reply({ ok: false, error: 'Session expirée.' }); expire(); return; }
      updateChat(); // Vérifie les positions actuelles, même avant la prochaine diffusion.
      reply(chat.send(socket.id, request));
    });
    socket.on('disconnect', () => { clearTimeout(expiry); players.delete(socket.id); publish(); updateChat(); });
  });
  return io;
}
