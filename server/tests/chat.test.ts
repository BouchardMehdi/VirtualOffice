import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ProximityChat, CONVERSATION_TTL_MS, MAX_MESSAGES, MESSAGE_INTERVAL_MS } from '../src/realtime/chat.js';
import { canHear } from '../src/realtime/map.js';
import type { ChatState, Presence } from '../src/realtime/protocol.js';

const player = (id: string, x: number, y = 500): Presence => ({ id, userId: `user-${id}`, name: id.toUpperCase(), x, y });
function setup() {
  let now = 0;
  const states = new Map<string, ChatState>();
  const chat = new ProximityChat((id, state) => states.set(id, state), () => now);
  const send = (id: string, text: string) => chat.send(id, { conversationId: states.get(id)?.id, text });
  return { chat, states, send, advance: (ms: number) => { now += ms; } };
}

test('union des zones : groupe en chaîne sans agrandir le rayon individuel', () => {
  const { chat, states, send } = setup();
  chat.update([player('a', 60), player('b', 145), player('c', 230), player('d', 460)]);
  assert.equal(states.get('a')?.members.length, 3);
  assert.equal(states.get('a')?.id, states.get('c')?.id);
  assert.equal(states.get('d') ?? null, null);
  assert.deepEqual(send('a', 'Bonjour au groupe'), { ok: true });
  assert.equal(states.get('c')?.messages[0].text, 'Bonjour au groupe');
  assert.equal(states.get('d') ?? null, null);
});

test('hystérésis : entrée à 96 px et sortie au-delà de 120 px', () => {
  const { chat, states } = setup();
  const update = (x: number) => chat.update([player('a', 60), player('b', x)]);
  update(156);
  const id = states.get('a')?.id;
  assert.ok(id);
  update(180);
  assert.equal(states.get('a')?.id, id);
  update(181);
  assert.equal(states.get('a'), null);
  update(170);
  assert.equal(states.get('a'), null);
  update(156);
  assert.equal(states.get('a')?.id, id);
});

test('murs opaques, portes ouvertes et meubles sans effet sur la conversation', () => {
  assert.equal(canHear({ x: 305, y: 300 }, { x: 365, y: 300 }), false);
  assert.equal(canHear({ x: 305, y: 250 }, { x: 365, y: 250 }), true);
  assert.equal(canHear({ x: 608, y: 305 }, { x: 608, y: 365 }), true);
  assert.equal(canHear({ x: 120, y: 220 }, { x: 205, y: 220 }), true);
  const { chat, states } = setup();
  chat.update([player('a', 305, 250), player('b', 365, 250)]);
  assert.ok(states.get('a'));
  chat.update([player('a', 305, 300), player('b', 365, 300)]);
  assert.equal(states.get('a'), null);
});

test('fusion et séparation isolent les historiques et restaurent le groupe initial', () => {
  const { chat, states, send } = setup();
  const a = player('a', 60);
  const b = player('b', 120);
  const c = player('c', 270);
  chat.update([a, b, c]);
  const pairId = states.get('a')!.id;
  send('a', 'Message à deux');
  chat.update([a, b, { ...c, x: 200 }]);
  const groupId = states.get('a')!.id;
  assert.notEqual(groupId, pairId);
  assert.deepEqual(states.get('c')?.messages, []);
  send('c', 'Message à trois');
  assert.equal(states.get('a')?.messages[0].text, 'Message à trois');
  chat.update([a, b, c]);
  assert.equal(states.get('c'), null);
  assert.equal(states.get('a')?.id, pairId);
  assert.deepEqual(states.get('a')?.messages.map(message => message.text), ['Message à deux']);
  assert.equal(chat.send('c', { conversationId: groupId, text: 'Intrusion' }).ok, false);
  assert.equal(chat.send('a', { conversationId: groupId, text: 'Ancien groupe' }).ok, false);
});

test('conservation 5 min après inactivité uniquement, purge puis nouvelle conversation', () => {
  const { chat, states, send, advance } = setup();
  const close = [player('a', 60), player('b', 120)];
  const far = [player('a', 60), player('b', 270)];
  chat.update(close);
  const id = states.get('a')!.id;
  send('a', 'À conserver');
  advance(CONVERSATION_TTL_MS * 2);
  chat.update(close);
  assert.equal(states.get('a')?.id, id);
  chat.update(far);
  advance(CONVERSATION_TTL_MS - 1);
  chat.update(close);
  assert.equal(states.get('a')?.messages[0].text, 'À conserver');
  chat.update(far);
  advance(CONVERSATION_TTL_MS);
  chat.update(far); // Entretien périodique sans activité.
  chat.update(close);
  assert.notEqual(states.get('a')?.id, id);
  assert.deepEqual(states.get('a')?.messages, []);
});

test('départ, reconnexion et groupes distincts ne donnent pas accès aux anciennes conversations', () => {
  const { chat, states, send } = setup();
  const a = player('a', 60), b = player('b', 120), c = player('c', 400), d = player('d', 460);
  chat.update([a, b, c, d]);
  const id = states.get('a')!.id;
  send('a', 'Confidentiel au groupe');
  assert.deepEqual(states.get('c')?.messages, []);
  assert.equal(chat.send('c', { conversationId: id, text: 'Intrusion' }).ok, false);
  chat.update([a, c, d]);
  assert.equal(states.get('a'), null);
  assert.equal(chat.send('b', { conversationId: id, text: 'Après départ' }).ok, false);
  chat.update([a, { ...b, id: 'b-reconnected' }, c, d]);
  assert.notEqual(states.get('a')?.id, id);
  assert.deepEqual(states.get('a')?.messages, []);
});

test('valide les messages, impose l’identité, limite la cadence et borne l’historique', () => {
  const { chat, states, send, advance } = setup();
  chat.update([player('a', 60), player('b', 120)]);
  const id = states.get('a')!.id;
  for (const request of [null, {}, { conversationId: id, text: 42 }, { conversationId: id, text: ' ' }, { conversationId: id, text: 'x'.repeat(501) }]) {
    assert.equal(chat.send('a', request).ok, false);
  }
  assert.equal(chat.send('a', { conversationId: id, text: '<img src=x onerror=alert(1)>', name: 'Forged', senderId: 'b' }).ok, true);
  assert.equal(states.get('b')?.messages[0].name, 'A');
  assert.equal(states.get('b')?.messages[0].senderId, 'a');
  assert.equal(send('a', 'Trop vite').ok, false);
  for (let index = 0; index < MAX_MESSAGES; index++) { advance(MESSAGE_INTERVAL_MS); assert.equal(send('a', `Message ${index}`).ok, true); }
  assert.equal(states.get('b')?.messages.length, MAX_MESSAGES);
  assert.equal(states.get('b')?.messages[0].text, 'Message 0');
});
