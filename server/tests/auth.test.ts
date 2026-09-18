import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { Server } from 'node:http';
import { after, before, test } from 'node:test';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { app } from '../src/app.js';
import { createToken, TOKEN_AUDIENCE, TOKEN_ISSUER } from '../src/auth/token.js';
import { env } from '../src/config/env.js';
import { prisma } from '../src/services/prisma.js';

let server: Server;
let base: string;
let aliceId: string;
const password = process.env.DEMO_PASSWORD!;

before(async () => {
  const alice = await prisma.user.findUniqueOrThrow({ where: { email: 'alice@virtualoffice.test' } });
  aliceId = alice.id;
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  base = `http://127.0.0.1:${address.port}/api/auth`;
});

after(async () => {
  if (server) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await prisma.$disconnect();
});

function login(body: unknown) {
  return fetch(`${base}/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
}

function me(token?: string) {
  return fetch(`${base}/me`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
}

test('les cinq comptes existent, peuvent se connecter et ont des mots de passe bcrypt', async () => {
  for (const name of ['alice', 'thomas', 'julie', 'emma', 'admin']) {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: `${name}@virtualoffice.test` } });
    assert.notEqual(user.passwordHash, password);
    assert.equal(await bcrypt.compare(password, user.passwordHash), true);
    assert.equal(user.role, name === 'admin' ? 'ADMIN' : 'USER');
    const response = await login({ email: user.email, password });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).user.id, user.id);
  }
});

test('connexion et /me renvoient uniquement le profil public', async () => {
  const response = await login({ email: '  ALICE@VIRTUALOFFICE.TEST ', password, role: 'ADMIN', userId: 'forged' });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const session = await response.json();
  assert.deepEqual(Object.keys(session.user).sort(), ['email', 'firstName', 'id', 'lastName', 'role']);
  assert.equal(session.user.id, aliceId);
  assert.equal(session.user.role, 'USER');
  assert.ok(session.expiresAt > Date.now());
  const current = await me(session.token);
  assert.equal(current.status, 200);
  assert.deepEqual(await current.json(), { user: session.user, expiresAt: session.expiresAt });
});

test('le compte administrateur peut se connecter', async () => {
  const response = await login({ email: 'admin@virtualoffice.test', password });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).user.role, 'ADMIN');
});

test('email absent et mauvais mot de passe donnent la même erreur', async () => {
  const wrong = await login({ email: 'alice@virtualoffice.test', password: 'incorrect' });
  const unknown = await login({ email: 'inconnu@virtualoffice.test', password });
  assert.equal(wrong.status, 401);
  assert.equal(unknown.status, 401);
  assert.deepEqual(await wrong.json(), await unknown.json());
});

test('les entrées mal formées et mots de passe trop longs sont refusés', async () => {
  for (const input of [null, [], {}, { email: 'bad', password },
    { email: 'alice@virtualoffice.test', password: { value: password } },
    { email: 'alice@virtualoffice.test', password: '' },
    { email: 'alice@virtualoffice.test', password: 'é'.repeat(37) }]) {
    assert.equal((await login(input)).status, 400);
  }
});

test('le JSON invalide donne une erreur JSON sans détails internes', async () => {
  const response = await fetch(`${base}/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{',
  });
  assert.equal(response.status, 400);
  assert.deepEqual(Object.keys(await response.json()), ['error']);
});

test('/me refuse les requêtes sans jeton ou avec un jeton altéré', async () => {
  for (const token of [undefined, 'not-a-token', `${createToken(aliceId).token}invalid`]) {
    assert.equal((await me(token)).status, 401);
  }
});

test('/me refuse les jetons expirés, mal signés et avec un algorithme différent', async () => {
  const options = { subject: aliceId, issuer: TOKEN_ISSUER, audience: TOKEN_AUDIENCE };
  const tokens = [
    jwt.sign({}, env.jwtSecret, { ...options, expiresIn: -1 }),
    jwt.sign({}, 'another-secret-used-only-in-tests', { ...options, expiresIn: 60 }),
    jwt.sign({}, env.jwtSecret, { ...options, algorithm: 'HS384', expiresIn: 60 }),
    jwt.sign({}, env.jwtSecret, { ...options, audience: 'another-application', expiresIn: 60 }),
    jwt.sign({}, env.jwtSecret, options),
  ];
  for (const token of tokens) assert.equal((await me(token)).status, 401);
});

test('un JWT ne donne pas accès si son utilisateur est absent de la base', async () => {
  assert.equal((await me(createToken('missing-user').token)).status, 401);
});

test('aucune route inscription n est disponible', async () => {
  assert.equal((await fetch(`${base}/register`, { method: 'POST' })).status, 404);
});
