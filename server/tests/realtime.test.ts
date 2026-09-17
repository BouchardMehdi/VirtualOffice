import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { after, afterEach, before, test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import jwt from 'jsonwebtoken';
import { io as connect, type Socket } from 'socket.io-client';
import { createToken, TOKEN_AUDIENCE, TOKEN_ISSUER } from '../src/auth/token.js';
import { env } from '../src/config/env.js';
import { attachOffice } from '../src/realtime/office.js';
import { clearPath, walkable } from '../src/realtime/map.js';
import type { ChatResult, ChatState, ClientEvents, Presence, ServerEvents } from '../src/realtime/protocol.js';
import { prisma } from '../src/services/prisma.js';

const server = createServer();
const io = attachOffice(server);
const sockets: Socket<ServerEvents, ClientEvents>[] = [];
let base: string;
let aliceId: string;
let thomasId: string;

before(async () => {
  aliceId = (await prisma.user.findUniqueOrThrow({ where: { email: 'alice@virtualoffice.test' } })).id;
  thomasId = (await prisma.user.findUniqueOrThrow({ where: { email: 'thomas@virtualoffice.test' } })).id;
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  base = `http://127.0.0.1:${address.port}`;
});
afterEach(async () => { for (const socket of sockets.splice(0)) socket.disconnect(); await delay(40); });
after(async () => { await new Promise<void>(resolve => io.close(() => resolve())); await prisma.$disconnect(); });

function socket(token?: string) {
  const result: Socket<ServerEvents, ClientEvents> = connect(base, { autoConnect: false, reconnection: false,
    transports: ['websocket'], auth: { token, name: 'Forged', userId: 'forged' } });
  sockets.push(result);
  return result;
}
function event<T>(source: Socket, name: string, matches: (value: T) => boolean = () => true): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { source.off(name, receive); reject(new Error(`Timeout: ${name}`)); }, 4_000);
    const receive = (value: T) => { if (matches(value)) { clearTimeout(timer); source.off(name, receive); resolve(value); } };
    source.on(name, receive);
  });
}
async function joined(userId: string) {
  const client = socket(createToken(userId).token);
  const welcome = event<Presence>(client, 'office:welcome');
  client.connect();
  return { client, self: await welcome };
}

test('refuse les sockets sans JWT, falsifiées, expirées ou sans utilisateur', async () => {
  const expired = jwt.sign({}, env.jwtSecret, { subject: aliceId, issuer: TOKEN_ISSUER, audience: TOKEN_AUDIENCE, expiresIn: -1 });
  for (const token of [undefined, 'forged', expired, createToken('missing-user').token]) {
    const client = socket(token);
    const error = event<{ data: { code: string } }>(client, 'connect_error');
    client.connect();
    assert.equal((await error).data.code, 'AUTH_REQUIRED');
    assert.equal(client.connected, false);
  }
});

test('diffuse les identités issues de la base, les arrivées et les départs', async () => {
  const alice = await joined(aliceId);
  assert.equal(alice.self.name, 'Alice Martin');
  const state = event<Presence[]>(alice.client, 'office:state');
  const thomas = await joined(thomasId);
  const players = await state;
  assert.equal(players.length, 2);
  assert.deepEqual(Object.keys(players[0]).sort(), ['id', 'name', 'userId', 'x', 'y']);
  assert.equal(players.find(player => player.id === thomas.self.id)?.name, 'Thomas Bernard');
  assert.notEqual(alice.self.x, thomas.self.x);
  const left = event<Presence[]>(alice.client, 'office:state');
  thomas.client.disconnect();
  assert.deepEqual((await left).map(player => player.id), [alice.self.id]);
});

test('synchronise une position valide sans accepter une identité fournie par le client', async () => {
  const alice = await joined(aliceId);
  const thomas = await joined(thomasId);
  const state = event<Presence[]>(thomas.client, 'office:state');
  alice.client.emit('player:move', { x: alice.self.x + 16, y: alice.self.y, id: thomas.self.id, name: 'Forged' } as never);
  const players = await state;
  assert.equal(players.find(player => player.id === alice.self.id)?.x, alice.self.x + 16);
  assert.equal(players.find(player => player.id === alice.self.id)?.name, 'Alice Martin');
  assert.equal(players.find(player => player.id === thomas.self.id)?.x, thomas.self.x);
});

test('corrige les coordonnées invalides, téléportations et déplacements trop rapides', async () => {
  const { client, self } = await joined(aliceId);
  for (const invalid of [null, { x: '170', y: 336 }, { x: Infinity, y: 336 }, { x: 700, y: 450 }, { x: -100, y: 0 }]) {
    const correction = event(client, 'office:correction');
    client.emit('player:move', invalid as never);
    assert.deepEqual(await correction, { x: self.x, y: self.y });
    await delay(25);
  }
  client.emit('player:move', { x: self.x + 40, y: self.y });
  await delay(30);
  const correction = event(client, 'office:correction');
  client.emit('player:move', { x: self.x + 80, y: self.y });
  assert.deepEqual(await correction, { x: self.x + 40, y: self.y });
});

test('la géométrie serveur bloque murs et meubles mais autorise les portes', () => {
  assert.equal(walkable({ x: 160, y: 220 }), false);
  assert.equal(walkable({ x: 160, y: 250 }), true);
  assert.equal(clearPath({ x: 310, y: 336 }, { x: 362, y: 336 }), false);
  assert.equal(clearPath({ x: 310, y: 250 }, { x: 362, y: 250 }), true);
  assert.equal(clearPath({ x: 608, y: 300 }, { x: 608, y: 370 }), true);
});

test('deux onglets du même compte ont des présences distinctes et nettoyées', async () => {
  const first = await joined(aliceId);
  const state = event<Presence[]>(first.client, 'office:state');
  const second = await joined(aliceId);
  assert.equal((await state).length, 2);
  assert.notEqual(first.self.id, second.self.id);
  const left = event<Presence[]>(second.client, 'office:state');
  first.client.disconnect();
  assert.deepEqual((await left).map(player => player.id), [second.self.id]);
});

test('déconnecte une session lorsque son JWT expire', async () => {
  const token = jwt.sign({}, env.jwtSecret, { subject: aliceId, issuer: TOKEN_ISSUER, audience: TOKEN_AUDIENCE, expiresIn: 2 });
  const client = socket(token);
  const welcome = event(client, 'office:welcome');
  const expiry = event(client, 'session:expired');
  const disconnected = event<string>(client, 'disconnect');
  client.connect();
  await welcome;
  await expiry;
  assert.equal(await disconnected, 'io server disconnect');
});

test('chat Socket.IO : accusés de réception, auteur imposé et refus après départ', async () => {
  const alice = await joined(aliceId);
  const send = (client: Socket<ServerEvents, ClientEvents>, request: unknown) =>
    new Promise<ChatResult>((resolve, reject) => client.timeout(3_000).emit('chat:send', request as never,
      (error, result) => error ? reject(error) : resolve(result)));
  assert.equal((await send(alice.client, { conversationId: 'invented', text: 'Seul' })).ok, false);
  const group = event<ChatState>(alice.client, 'chat:state', state => state?.members.length === 2);
  const thomas = await joined(thomasId);
  const conversation = await group;
  assert.ok(conversation);
  const received = event<ChatState>(thomas.client, 'chat:state', state => state?.messages.length === 1);
  assert.equal((await send(alice.client, { conversationId: conversation.id, text: 'Bonjour', name: 'Forged', senderId: thomas.self.id })).ok, true);
  const message = (await received)!.messages[0];
  assert.equal(message.name, 'Alice Martin');
  assert.equal(message.senderId, alice.self.id);
  const gone = event<ChatState>(alice.client, 'chat:state', state => state === null);
  thomas.client.disconnect();
  await gone;
  assert.equal((await send(alice.client, { conversationId: conversation.id, text: 'Trop tard' })).ok, false);
});
