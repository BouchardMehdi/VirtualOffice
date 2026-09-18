import { expect, test, type Page } from '@playwright/test';
import { signIn, ready, snapshot, hold, travel } from './helpers';

test('connexion, apparition, nom, rechargement et démontage du bureau', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/workspace');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator('canvas')).toHaveCount(0);
  await signIn(page);
  await ready(page);
  const initial = await snapshot(page);
  expect(initial).toMatchObject({ x: 160, y: 336, name: 'Alice Martin' });
  await expect(page.locator('.office-toolbar')).toContainText('Détente');
  await expect(page.locator('canvas')).toHaveCount(1);
  await page.screenshot({ path: testInfo.outputPath('bureau.png'), fullPage: true });
  await page.reload();
  await ready(page);
  await expect(page.locator('canvas')).toHaveCount(1);
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator('canvas')).toHaveCount(0);
  await signIn(page);
  await ready(page);
  await expect(page.locator('canvas')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('ZQSD, flèches, diagonales et suivi du nom', async ({ page }) => {
  await signIn(page);
  await ready(page);
  const directions = [
    ['d', 'x', 1], ['s', 'y', 1], ['q', 'x', -1], ['z', 'y', -1],
    ['ArrowRight', 'x', 1], ['ArrowDown', 'y', 1], ['ArrowLeft', 'x', -1], ['ArrowUp', 'y', -1],
  ] as const;
  for (const [key, axis, sign] of directions) {
    const before = await snapshot(page);
    await hold(page, key, 250);
    const after = await snapshot(page);
    expect((after[axis] - before[axis]) * sign).toBeGreaterThan(10);
    expect(Math.abs(after.labelX - after.x)).toBeLessThan(3);
    expect(Math.abs(after.labelY - (after.y - 46))).toBeLessThan(3);
  }
  await page.keyboard.down('d');
  await page.keyboard.down('z');
  await expect.poll(async () => {
    const state = await snapshot(page);
    return state.velocityX > 0 && state.velocityY < 0;
  }).toBe(true);
  const diagonal = await snapshot(page);
  expect(Math.hypot(diagonal.velocityX, diagonal.velocityY)).toBeCloseTo(160, 2);
  await page.keyboard.up('d');
  await page.keyboard.up('z');
});

test('les murs bloquent et les deux portes permettent le passage', async ({ page }) => {
  await signIn(page);
  await ready(page);
  await hold(page, 'd', 1_500);
  expect((await snapshot(page)).x).toBeCloseTo(310, 0);
  await travel(page, 'z', (state) => state.y <= 260);
  await travel(page, 'd', (state) => state.x >= 605);
  await expect(page.locator('.office-toolbar')).toContainText('Open space');
  await travel(page, 's', (state) => state.y >= 365);
  await expect(page.locator('.office-toolbar')).toContainText('Réunion');
});

test('le mobilier bloque et les déplacements cessent hors du canvas', async ({ page }) => {
  await signIn(page);
  await ready(page);
  await hold(page, 'z', 1_000);
  expect((await snapshot(page)).y).toBeCloseTo(250, 0);
  await page.keyboard.down('d');
  await expect.poll(async () => (await snapshot(page)).velocityX).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Vérifier à nouveau' }).focus();
  await page.keyboard.up('d');
  await expect.poll(async () => (await snapshot(page)).velocityX).toBe(0);
  const before = await snapshot(page);
  await page.keyboard.press('ArrowDown', { delay: 200 });
  const after = await snapshot(page);
  expect(after.x).toBeCloseTo(before.x, 0);
  expect(after.y).toBeCloseTo(before.y, 0);
  await page.locator('canvas').click();
  await expect(page.locator('canvas')).toBeFocused();
  await hold(page, 's', 200);
  expect((await snapshot(page)).y).toBeGreaterThan(after.y + 10);
});

test('les limites du bureau sont infranchissables', async ({ page }) => {
  await signIn(page);
  await ready(page);
  await hold(page, 'q', 1_500);
  expect((await snapshot(page)).x).toBeCloseTo(42, 0);
  await hold(page, 's', 1_700);
  expect((await snapshot(page)).y).toBeCloseTo(534, 0);
});

test('un chargement échoué propose de réessayer sans créer deux jeux', async ({ page }) => {
  await page.route('**/assets/maps/office-test.json', (route) => route.abort());
  await signIn(page);
  await expect(page.getByRole('alert')).toContainText('Impossible de charger le bureau');
  await page.unroute('**/assets/maps/office-test.json');
  await page.getByRole('button', { name: 'Réessayer', exact: true }).click();
  await ready(page);
  await expect(page.locator('canvas')).toHaveCount(1);
  await hold(page, 'd', 200);
  expect((await snapshot(page)).x).toBeGreaterThan(170);
});

test('deux comptes se voient, bougent, se reconnectent et quittent sans fantômes', async ({ browser }, testInfo) => {
  test.setTimeout(75_000);
  const aliceContext = await browser.newContext();
  const thomasContext = await browser.newContext();
  const alice = await aliceContext.newPage();
  const thomas = await thomasContext.newPage();
  const others = (page: Page) => page.evaluate(() => window.__virtualofficeTest?.network().others ?? []);
  try {
    await signIn(alice);
    await ready(alice);
    await signIn(thomas, 'thomas');
    await ready(thomas);
    await expect.poll(async () => (await others(alice)).map(player => player.name)).toEqual(['Thomas Bernard']);
    await expect.poll(async () => (await others(thomas)).map(player => player.name)).toEqual(['Alice Martin']);
    await expect(alice.locator('.office-presence')).toHaveText('2 connectés');
    await alice.locator('canvas').click();
    await hold(alice, 's', 300);
    const moved = await snapshot(alice);
    await expect.poll(async () => Math.abs((await others(thomas))[0].renderedY - moved.y)).toBeLessThan(2);
    await alice.screenshot({ path: testInfo.outputPath('multijoueur.png'), fullPage: true });
    await thomas.reload();
    await ready(thomas);
    await expect.poll(async () => (await others(alice)).length).toBe(1);
    await thomasContext.setOffline(true);
    await expect(thomas.locator('.office-presence')).toContainText('reconnexion', { timeout: 15_000 });
    await expect(thomas.getByLabel('Message au groupe')).toBeDisabled();
    await expect.poll(async () => (await others(alice)).length, { timeout: 15_000 }).toBe(0);
    await thomasContext.setOffline(false);
    await expect.poll(() => thomas.evaluate(() => window.__virtualofficeTest?.network().online), { timeout: 15_000 }).toBe(true);
    await expect.poll(async () => (await others(alice)).length).toBe(1);
    await thomas.getByRole('button', { name: 'Se déconnecter' }).click();
    await expect.poll(async () => (await others(alice)).length).toBe(0);
    await expect(alice.locator('.office-presence')).toHaveText('1 connecté');
  } finally { await aliceContext.close(); await thomasContext.close(); }
});

test('chat : saisie immobile, messages, séparation, reprise, nouveau groupe et plein écran', async ({ browser }, testInfo) => {
  test.setTimeout(90_000);
  const contexts = await Promise.all([browser.newContext(), browser.newContext(), browser.newContext()]);
  const [alice, thomas, julie] = await Promise.all(contexts.map(context => context.newPage()));
  const messages = (page: Page) => page.getByRole('log', { name: 'Messages du groupe' });
  try {
    await signIn(alice);
    await ready(alice);
    await expect(alice.getByLabel('Message au groupe')).toBeDisabled();
    await signIn(thomas, 'thomas');
    await ready(thomas);
    await expect(alice.locator('.chat-members')).toContainText('2 participants');
    await expect(alice.getByRole('status', { name: 'Événements de conversation' })).toContainText('Thomas Bernard a rejoint la conversation.');
    const before = await snapshot(alice);
    await alice.getByLabel('Message au groupe').fill('Bonjour Thomas ! ');
    await alice.getByLabel('Message au groupe').pressSequentially('zqsd f');
    await alice.getByLabel('Message au groupe').press('ArrowLeft');
    expect((await snapshot(alice)).x).toBe(before.x);
    expect((await snapshot(alice)).y).toBe(before.y);
    expect(await alice.evaluate(() => document.fullscreenElement === null)).toBe(true);
    await alice.getByLabel('Message au groupe').press('Enter');
    await expect(messages(thomas)).toContainText('Bonjour Thomas ! zqsd f');
    await expect(alice.getByLabel('Message au groupe')).toHaveValue('');
    await expect(alice.getByLabel('Message au groupe')).toBeFocused();
    await thomas.getByLabel('Message au groupe').fill('<b>Texte sans HTML</b>');
    await thomas.getByRole('button', { name: 'Envoyer', exact: true }).click();
    await expect(messages(alice)).toContainText('<b>Texte sans HTML</b>');
    await expect(messages(alice).locator('b')).toHaveCount(0);
    await thomas.locator('canvas').click();
    await travel(thomas, 's', state => state.y >= 490);
    await expect(alice.getByLabel('Message au groupe')).toBeDisabled();
    await expect(messages(alice)).not.toContainText('Bonjour Thomas');
    await travel(thomas, 'z', state => state.y <= 360);
    await expect(alice.getByLabel('Message au groupe')).toBeEnabled();
    await expect(messages(alice)).toContainText('Bonjour Thomas');
    await signIn(julie, 'julie');
    await ready(julie);
    await expect(alice.locator('.chat-members')).toContainText('3 participants');
    await expect(alice.getByRole('status', { name: 'Événements de conversation' })).toContainText('Julie Dupont a rejoint la conversation.');
    await expect(messages(julie)).not.toContainText('Bonjour Thomas');
    await julie.getByLabel('Message au groupe').fill('Bonjour à vous deux !');
    await julie.getByLabel('Message au groupe').press('Enter');
    await expect(messages(alice)).toContainText('Bonjour à vous deux !');
    await expect(messages(thomas)).toContainText('Bonjour à vous deux !');
    await alice.getByRole('button', { name: 'Plein écran', exact: true }).click();
    await expect.poll(() => alice.evaluate(() => document.fullscreenElement?.className)).toBe('office');
    await expect(alice.getByLabel('Message au groupe')).toBeVisible();
    await alice.getByLabel('Message au groupe').press('f');
    await expect(alice.getByLabel('Message au groupe')).toHaveValue('f');
    expect(await alice.evaluate(() => document.fullscreenElement?.className)).toBe('office');
    await alice.getByLabel('Message au groupe').fill('');
    await alice.screenshot({ path: testInfo.outputPath('chat-plein-ecran.png') });
    await alice.getByRole('button', { name: 'Quitter le plein écran' }).click();
    await julie.getByRole('button', { name: 'Se déconnecter' }).click();
    await expect(alice.locator('.chat-members')).toContainText('2 participants');
    await expect(alice.getByRole('status', { name: 'Événements de conversation' })).toContainText('Julie Dupont a quitté la conversation.');
    await expect(messages(alice)).toContainText('Bonjour Thomas');
    await expect(messages(alice)).not.toContainText('Bonjour à vous deux');
  } finally { for (const context of contexts) await context.close(); }
});
