import { expect, type Page } from '@playwright/test';
import type { PlayerSnapshot } from '../src/game/config/office';

export async function signIn(page: Page, account = 'alice') {
  await page.goto('/login');
  await page.getByLabel('Adresse email').fill(`${account}@virtualoffice.test`);
  await page.getByLabel('Mot de passe').fill(process.env.DEMO_PASSWORD!);
  await page.getByRole('button', { name: 'Entrer dans le bureau' }).click();
  await expect(page).toHaveURL(/\/workspace$/);
}

export async function ready(page: Page) {
  await page.bringToFront();
  await expect(page.getByRole('application')).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => page.evaluate(() => window.__virtualofficeTest?.snapshot())).toBeTruthy();
  await expect.poll(() => page.evaluate(() => window.__virtualofficeTest?.network().online)).toBe(true);
  await page.locator('canvas').click();
}

export async function snapshot(page: Page): Promise<PlayerSnapshot> {
  const value = await page.evaluate(() => window.__virtualofficeTest?.snapshot());
  expect(value).toBeTruthy();
  return value!;
}

export async function hold(page: Page, key: string, duration: number) {
  await page.keyboard.down(key);
  await page.waitForTimeout(duration);
  await page.keyboard.up(key);
  await expect.poll(async () => {
    const value = await snapshot(page);
    return Math.hypot(value.velocityX, value.velocityY);
  }).toBe(0);
}

export async function travel(page: Page, key: string, reached: (value: PlayerSnapshot) => boolean, timeout = 5_000) {
  await page.keyboard.down(key);
  try {
    await expect.poll(async () => reached(await snapshot(page)), { intervals: [50], timeout }).toBe(true);
  } finally {
    await page.keyboard.up(key);
  }
}
