// Local Supabase fixture only; no production credentials or records.
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
try {
  for (const viewport of [{ width: 1280, height: 600 }, { width: 390, height: 640 }]) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', async dialog => { errors.push(`Unexpected native dialog: ${dialog.type()}`); await dialog.dismiss(); });
    await page.route('https://docs.google.com/**', route => route.fulfill({ contentType: 'text/csv', body: 'Tanggal,Kelas,Kegiatan\n' }));
    await page.route('**/coach', async route => {
      if (route.request().method() === 'POST') await new Promise(resolve => setTimeout(resolve, 250));
      await route.continue();
    });
    async function idleAndScrollable() {
      await page.waitForFunction(() => !document.querySelector('dialog[open]') && getComputedStyle(document.body).overflowY !== 'hidden' && getComputedStyle(document.documentElement).overflowY !== 'hidden');
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await page.mouse.move(viewport.width - 25, Math.round(viewport.height / 2));
      await page.mouse.wheel(0, 400);
      await page.waitForFunction(() => window.scrollY > 20);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    }
    async function enterFromDashboard(alreadyOnDashboard = false) {
      if (!alreadyOnDashboard) await page.getByRole('button', { name: /^Lihat Jadwal/ }).first().click();
      if (viewport.width < 1024) await page.getByRole('button', { name: 'Buka menu', exact: true }).click();
      await page.getByRole('link', { name: /Portal Coach/ }).click();
      await page.getByRole('button', { name: /Coach Renang/ }).waitFor();
      await idleAndScrollable();
    }
    await page.goto('http://localhost:3033/', { waitUntil: 'domcontentloaded' });
    await enterFromDashboard();
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: /Coach Renang/ }).click();
      await page.getByRole('dialog', { name: 'Masuk ruang Renang', exact: true }).waitFor();
      await page.keyboard.press('Escape');
      await idleAndScrollable();
    }
    await page.getByRole('button', { name: /Coach Renang/ }).click();
    await page.getByLabel('Username', { exact: true }).fill('coach.renang');
    await page.getByLabel('Password', { exact: true }).fill('Fixture-Password-123!');
    await page.getByRole('button', { name: 'Masuk workspace', exact: true }).click();
    await page.getByRole('dialog', { name: 'Sedang memeriksa akun…', exact: true }).waitFor();
    assert.equal(await page.locator('dialog[open]').count(), 2, 'Login and loading overlap in this regression');
    await page.getByRole('button', { name: 'Keluar akun', exact: true }).waitFor();
    await idleAndScrollable();
    assert.equal(await page.locator('header a[href="/"]').count(), 0);
    await page.locator('header').getByText('IDN Akhwat', { exact: false }).click();
    assert.equal(new URL(page.url()).pathname, '/coach');

    // Back to the public page visited before login must resolve to the workspace.
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/coach');
    await page.getByRole('button', { name: 'Keluar akun', exact: true }).waitFor();
    await idleAndScrollable();
    // A direct address-bar visit must respect the same active-account rule.
    await page.goto('http://localhost:3033/', { waitUntil: 'domcontentloaded' });
    assert.equal(new URL(page.url()).pathname, '/coach');
    await page.getByRole('button', { name: 'Keluar akun', exact: true }).waitFor();
    for (let i = 0; i < 2; i++) {
      await page.getByRole('button', { name: 'Refresh data', exact: true }).click();
      await page.getByRole('dialog', { name: 'Sedang memperbarui data…', exact: true }).waitFor();
      await page.getByRole('status').filter({ hasText: 'Data sudah diperbarui' }).waitFor();
      await idleAndScrollable();
    }
    await page.getByRole('button', { name: 'Keluar akun', exact: true }).click();
    await page.getByRole('dialog', { name: 'Keluar dari akun?', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Batal', exact: true }).click();
    await idleAndScrollable();
    await page.getByRole('button', { name: 'Keluar akun', exact: true }).click();
    await page.getByRole('button', { name: 'Ya, keluar', exact: true }).click();
    await page.getByRole('button', { name: 'Masuk admin', exact: true }).waitFor();
    await idleAndScrollable();
    await page.getByRole('link', { name: '← Kembali ke dashboard', exact: true }).click();
    await page.getByRole('button', { name: 'Refresh data', exact: true }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get('view'), 'dashboard');
    assert.equal(await page.getByRole('button', { name: /^Lihat Jadwal/ }).count(), 0);
    await page.goto('http://localhost:3033/pendamping', { waitUntil: 'domcontentloaded' });
    await page.getByRole('link', { name: '← Kembali ke dashboard', exact: true }).click();
    await page.getByRole('button', { name: 'Refresh data', exact: true }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get('view'), 'dashboard');
    await enterFromDashboard(true);
    await page.getByRole('button', { name: /Coach Renang/ }).click();
    await page.getByRole('dialog', { name: 'Masuk ruang Renang', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Tutup popup password', exact: true }).click();
    await idleAndScrollable();
    assert.deepEqual(errors, []);
    console.log(`PASS ${viewport.width}px: dashboard links, overlapping modals, real wheel scrolling, Back/direct-route guard, refresh, cancel/logout, return without reload`);
    await context.close();
  }
} finally { await browser.close(); }
