import { expect, test } from '@playwright/test';
import { ready, signIn, travel } from './helpers';

test('login : mauvais identifiants, panne API puis connexion administrateur', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('link', { name: /inscri/i })).toHaveCount(0);
  await page.getByLabel('Adresse email').fill('alice@virtualoffice.test');
  await page.getByLabel('Mot de passe').fill('incorrect');
  await page.getByRole('button', { name: 'Entrer dans le bureau' }).click();
  await expect(page.getByRole('alert')).toContainText(/incorrect|invalide/i);
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator('canvas')).toHaveCount(0);
  await page.route('**/api/auth/login', route => route.abort());
  await page.getByLabel('Mot de passe').fill(process.env.DEMO_PASSWORD!);
  await page.getByRole('button', { name: 'Entrer dans le bureau' }).click();
  await expect(page.getByRole('alert')).toContainText(/connexion|serveur|réseau/i);
  await page.unroute('**/api/auth/login');
  await signIn(page, 'admin');
  await ready(page);
  await expect(page.locator('.workspace > .eyebrow')).toContainText('Paul Admin');
});

test('restauration : panne temporaire, reprise puis rejet d’un jeton altéré', async ({ page }) => {
  await signIn(page);
  await ready(page);
  await page.route('**/api/auth/me', route => route.abort());
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Connexion interrompue' })).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  await page.unroute('**/api/auth/me');
  await page.getByRole('button', { name: 'Réessayer', exact: true }).click();
  await ready(page);
  await page.evaluate(() => sessionStorage.setItem('virtualoffice.token', 'jeton-invalide'));
  await page.reload();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('alert')).toContainText('session');
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(await page.evaluate(() => sessionStorage.getItem('virtualoffice.token'))).toBeNull();
});

test('expiration côté interface : retour au login et nettoyage de la session', async ({ page }) => {
  // L’expiration du JWT signé est testée côté serveur ; ici on accélère le délai de l’interface.
  await page.route('**/api/auth/login', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, json: { ...await response.json(), expiresAt: Date.now() + 3_000 } });
  });
  await signIn(page);
  await expect(page).toHaveURL(/\/login$/, { timeout: 10_000 });
  await expect(page.getByRole('alert')).toContainText('expiré');
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(await page.evaluate(() => sessionStorage.getItem('virtualoffice.token'))).toBeNull();
});

test('deux comptes dans les onglets du même navigateur gardent des sessions indépendantes', async ({ context, page }) => {
  const thomas = await context.newPage();
  await signIn(page);
  await ready(page);
  await signIn(thomas, 'thomas');
  await ready(thomas);
  await expect(page.locator('.workspace > .eyebrow')).toContainText('Alice Martin');
  await expect(thomas.locator('.workspace > .eyebrow')).toContainText('Thomas Bernard');
  const aliceToken = await page.evaluate(() => sessionStorage.getItem('virtualoffice.token'));
  const thomasToken = await thomas.evaluate(() => sessionStorage.getItem('virtualoffice.token'));
  expect(aliceToken).toBeTruthy();
  expect(thomasToken).toBeTruthy();
  expect(aliceToken).not.toBe(thomasToken);
  await thomas.getByRole('button', { name: 'Se déconnecter' }).click();
  await expect(page.locator('.office-presence')).toHaveText('1 connecté');
  await page.reload();
  await ready(page);
  await expect(page.locator('.workspace > .eyebrow')).toContainText('Alice Martin');
  await expect(thomas).toHaveURL(/\/login$/);
});

test('plein écran au clavier et mise en page sur plusieurs tailles de bureau', async ({ page }, testInfo) => {
  await signIn(page);
  await ready(page);
  const fullscreen = () => page.evaluate(() => Boolean(document.fullscreenElement));
  await page.keyboard.press('f');
  await expect.poll(fullscreen).toBe(true);
  await expect(page.getByRole('button', { name: 'Quitter le plein écran' })).toBeVisible();
  await page.keyboard.press('f');
  await expect.poll(fullscreen).toBe(false);
  await page.keyboard.press('f');
  await expect.poll(fullscreen).toBe(true);
  await page.keyboard.press('Escape');
  await expect.poll(fullscreen).toBe(false);
  for (const [width, height] of [[1920, 1080], [1280, 720], [800, 700]]) {
    await page.setViewportSize({ width, height });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect.poll(async () => {
      const canvas = await page.locator('canvas').boundingBox();
      const host = await page.locator('.office-game').boundingBox();
      return Boolean(canvas && host && canvas.width > 0 && canvas.height > 0 &&
        canvas.width <= host.width + 1 && canvas.height <= host.height + 1);
    }).toBe(true);
    await expect(page.getByLabel('Message au groupe')).toBeVisible();
    await expect(page.locator('.chat-members')).toBeVisible();
    await expect(page.locator('.chat-retention')).toBeVisible();
  }
  await page.screenshot({ path: testInfo.outputPath('bureau-etroit.png'), fullPage: true });
});

test('asset manquant : message compréhensible et rechargement du personnage', async ({ page }) => {
  await page.route('**/assets/custom/avatars/avatar_basic_32x48.png', route => route.abort());
  await signIn(page);
  await expect(page.getByRole('alert')).toContainText('Impossible de charger le bureau');
  await page.unroute('**/assets/custom/avatars/avatar_basic_32x48.png');
  await page.getByRole('button', { name: 'Réessayer', exact: true }).click();
  await ready(page);
  await expect(page.locator('canvas')).toHaveCount(1);
});

test('quatre onglets : deux groupes échangent sans voir les messages de l’autre groupe', async ({ context, page }) => {
  test.setTimeout(90_000);
  const alice = page;
  const thomas = await context.newPage();
  const julie = await context.newPage();
  const admin = await context.newPage();
  const messages = (tab: typeof page) => tab.getByRole('log', { name: 'Messages du groupe' });
  await signIn(alice);
  await ready(alice);
  await signIn(thomas, 'thomas');
  await ready(thomas);
  await travel(thomas, 's', state => state.y >= 500, 15_000);
  await signIn(julie, 'julie');
  await ready(julie);
  await signIn(admin, 'admin');
  await ready(admin);
  // Quatre canvas avec rendu logiciel peuvent ralentir Chromium en CI.
  await travel(admin, 's', state => state.y >= 500, 15_000);
  for (const tab of [alice, thomas, julie, admin]) await expect(tab.locator('.chat-members')).toContainText('2 participants');
  await alice.getByLabel('Message au groupe').fill('Message privé Alice et Julie');
  await alice.getByLabel('Message au groupe').press('Enter');
  await expect(messages(julie)).toContainText('Message privé Alice et Julie');
  await thomas.getByLabel('Message au groupe').fill('Message privé Thomas et Paul');
  await thomas.getByLabel('Message au groupe').press('Enter');
  await expect(messages(admin)).toContainText('Message privé Thomas et Paul');
  for (const tab of [alice, julie]) await expect(messages(tab)).not.toContainText('Message privé Thomas et Paul');
  for (const tab of [thomas, admin]) await expect(messages(tab)).not.toContainText('Message privé Alice et Julie');
});
