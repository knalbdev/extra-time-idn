// Local fixture DB + simulated browser push APIs. No real devices are subscribed
// and no external push service receives a message from this test.
import { chromium } from 'playwright-core';
import { randomUUID, randomBytes } from 'node:crypto';
import webpush from 'web-push';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base = 'http://localhost:3033';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const errors = [];
try {
  const config = await (await fetch(base + '/api/push/config')).json();
  assert.equal(config.enabled, true);
  assert.deepEqual(Object.keys(config).sort(), ['enabled', 'publicKey']);
  for (const asset of ['/sw.js', '/manifest.webmanifest', '/push-icon-192.png', '/push-icon-512.png']) assert.equal((await fetch(base + asset)).status, 200, asset);
  assert.match((await fetch(base + '/sw.js')).headers.get('cache-control'), /no-store/);
  const invalid = await fetch(base + '/api/push/subscription', { method: 'POST', headers: { Origin: 'https://evil.example.test', 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(invalid.status, 403);
  const large = await fetch(base + '/api/push/subscription', { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ huge: 'x'.repeat(5000) }) });
  assert.equal(large.status, 400);
  const deniedCron = await fetch(base + '/api/push/daily', { method: 'POST' }); assert.equal(deniedCron.status, 401);

  async function device(width = 390, permission = 'default') {
    const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
    await context.addInitScript(({ endpoint, publicKey, encryptionKey, auth, permission }) => {
      let sub = null;
      const decode = value => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')), char => char.charCodeAt(0));
      window.__pushPermissionRequests = 0;
      class FakeNotification {
        static get permission() { return permission; }
        static async requestPermission() { window.__pushPermissionRequests++; permission = 'granted'; return permission; }
      }
      Object.defineProperty(window, 'Notification', { configurable: true, value: FakeNotification });
      Object.defineProperty(window, 'PushManager', { configurable: true, value: class {} });
      const registration = { pushManager: {
        async getSubscription() { return sub; },
        async subscribe() {
          sub = { endpoint, options: { applicationServerKey: decode(publicKey).buffer }, toJSON: () => ({ endpoint, keys: { p256dh: encryptionKey, auth } }), async unsubscribe() { sub = null; return true; } };
          return sub;
        },
      } };
      Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { register: async () => registration, getRegistration: async () => registration, ready: Promise.resolve(registration) } });
    }, { endpoint: 'https://fcm.googleapis.com/fcm/send/fixture-' + randomUUID(), publicKey: config.publicKey, encryptionKey: webpush.generateVAPIDKeys().publicKey, auth: randomBytes(16).toString('base64url'), permission });
    const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '/');
    await page.getByRole('button', { name: 'Pengingat jadwal', exact: true }).click();
    await page.getByText('Memeriksa pengingat…', { exact: true }).waitFor({ state: 'hidden' });
    assert.equal(await page.evaluate(() => window.__pushPermissionRequests), 0, 'opening settings must not request permission');
    return { context, page };
  }

  const { context, page } = await device();
  await page.getByRole('button', { name: 'Aktifkan notifikasi jadwal', exact: true }).click();
  await page.getByText('✓ Aktif pada perangkat ini', { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => window.__pushPermissionRequests), 1);
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const box = await page.getByRole('dialog').boundingBox(); assert.ok(box.width <= width - 16);
    if (width === 390) await page.screenshot({ path: '/tmp/extra-tracker-push-390.png' });
  }
  let testCalls = 0;
  await page.route('**/api/push/subscription', async route => {
    const request = route.request().postDataJSON();
    if (request.action === 'test') { testCalls++; return route.fulfill({ json: { sent: true } }); }
    return route.continue();
  });
  await page.getByRole('button', { name: 'Kirim notifikasi uji', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Notifikasi uji sudah dikirim' }).waitFor(); assert.equal(testCalls, 1);
  await page.getByRole('button', { name: 'Tutup pengingat jadwal', exact: true }).click();
  assert.notEqual(await page.evaluate(() => getComputedStyle(document.body).overflowY), 'hidden');
  await page.getByRole('button', { name: 'Pengingat jadwal', exact: true }).click();
  await page.getByText('✓ Aktif pada perangkat ini', { exact: true }).waitFor();

  const second = await device(390, 'granted');
  await second.page.getByRole('button', { name: 'Aktifkan notifikasi jadwal', exact: true }).click();
  await second.page.getByText('✓ Aktif pada perangkat ini', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Nonaktifkan pada perangkat ini', exact: true }).click();
  await page.getByText('Belum aktif pada perangkat ini', { exact: true }).waitFor();
  await second.page.getByRole('button', { name: 'Tutup pengingat jadwal', exact: true }).click();
  await second.page.getByRole('button', { name: 'Pengingat jadwal', exact: true }).click();
  await second.page.getByText('✓ Aktif pada perangkat ini', { exact: true }).waitFor();
  await second.page.getByRole('button', { name: 'Nonaktifkan pada perangkat ini', exact: true }).click();
  await second.page.getByText('Belum aktif pada perangkat ini', { exact: true }).waitFor();

  const denied = await device(320, 'denied');
  await denied.page.getByText('Notifikasi diblokir.', { exact: false }).waitFor();
  assert.equal(await denied.page.getByRole('button', { name: 'Aktifkan notifikasi jadwal', exact: true }).isDisabled(), true);
  const iphone = await browser.newContext({ viewport: { width: 390, height: 844 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1' });
  const iosPage = await iphone.newPage(); await iosPage.goto(base + '/'); await iosPage.getByRole('button', { name: 'Pengingat jadwal', exact: true }).click();
  await iosPage.getByText('Bagikan → Tambah ke Layar Utama', { exact: true }).waitFor();
  assert.equal(await iosPage.getByRole('button', { name: 'Aktifkan notifikasi jadwal', exact: true }).count(), 0);

  await page.getByRole('button', { name: 'Tutup pengingat jadwal', exact: true }).click();
  await page.route('https://docs.google.com/**', async route => {
    const sheet = new URL(route.request().url()).searchParams.get('sheet');
    const body = await fs.readFile(new URL(`./fixtures/sheets-current-2026-10/${sheet}.csv`, import.meta.url), 'utf8');
    return route.fulfill({ contentType: 'text/csv', body });
  });
  await page.goto(base + '/?view=dashboard&scheduleDate=2026-10-20');
  await page.getByText('Kalender Ekstrakurikuler', { exact: true }).waitFor();
  await page.getByRole('heading', { name: 'Oktober 2026', exact: true }).waitFor();
  await page.getByRole('button', { name: /^Selasa, 20 Oktober 2026 ·/ }).waitFor();
  assert.equal(await page.getByRole('button', { name: /^Selasa, 20 Oktober 2026 ·/ }).getAttribute('aria-pressed'), 'true');
  await Promise.all([context.close(), second.context.close(), denied.context.close(), iphone.close()]);
  assert.deepEqual(errors, []);
  console.log('PASS: anonymous opt-in, per-device ownership, unsubscribe, explicit permission, blocked/iPhone guidance, and responsive notification dialog. Push transport is simulated.');
} finally { await browser.close(); }
