// Shared settings integration: local Supabase fixture and mocked spreadsheet only.
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
try {
  const errors = [];
  const contexts = await Promise.all([1, 2, 3].map(() => browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })));
  for (const context of contexts) context.on('page', page => { page.setDefaultTimeout(15000); page.on('pageerror', error => errors.push(error.message)); });
  const [admin, coach, visitor] = await Promise.all(contexts.map(context => context.newPage()));
  const sheetRequests = [];
  await contexts[2].route('https://docs.google.com/**', route => {
    const sheet = new URL(route.request().url()).searchParams.get('sheet');
    sheetRequests.push(sheet);
    const csv = sheet === 'Renang' ? 'Pekan,Tanggal,Kelas,Guru,Status,Hasil,Catatan\n1,18 Okt 2026,7A,Coach,Sudah Terlaksana,,' : 'Header\n';
    return route.fulfill({ contentType: 'text/csv', body: csv });
  });
  async function login(page, card, username) {
    await page.goto('http://localhost:3033/coach');
    await page.getByRole('button', { name: card }).click();
    await page.getByLabel('Username', { exact: true }).fill(username);
    await page.getByLabel('Password', { exact: true }).fill('Fixture-Password-123!');
    await page.getByRole('button', { name: 'Masuk workspace', exact: true }).click();
    await page.getByRole('button', { name: 'Keluar akun', exact: true }).waitFor();
  }
  async function switchActivity(label, active) {
    await admin.getByRole('switch', { name: `Aktifkan ${label}`, exact: true }).click();
    await admin.getByRole('dialog', { name: `${active ? 'Aktifkan' : 'Nonaktifkan'} ${label}?`, exact: true }).waitFor();
    await admin.getByRole('button', { name: active ? 'Ya, aktifkan' : 'Ya, nonaktifkan', exact: true }).click();
    await admin.getByRole('status').filter({ hasText: `${label} berhasil ${active ? 'diaktifkan' : 'dinonaktifkan'}` }).waitFor();
    assert.equal(await admin.getByRole('switch', { name: `Aktifkan ${label}`, exact: true }).getAttribute('aria-checked'), String(active));
  }
  await login(admin, 'Masuk admin', 'admin');
  await admin.getByRole('button', { name: 'Pengaturan ekskul', exact: true }).click();
  assert.equal(await admin.getByRole('switch').count(), 5);
  assert.equal(await admin.getByRole('switch', { name: 'Aktifkan Pramuka', exact: true }).getAttribute('aria-checked'), 'false');
  await admin.getByRole('switch', { name: 'Aktifkan Renang', exact: true }).click();
  await admin.getByRole('button', { name: 'Batal', exact: true }).click();
  assert.equal(await admin.getByRole('switch', { name: 'Aktifkan Renang', exact: true }).getAttribute('aria-checked'), 'true');
  await login(coach, /Coach Renang/, 'coach.renang');
  assert.equal(await coach.getByRole('button', { name: 'Pengaturan ekskul', exact: true }).count(), 0);

  // Persisted browser cache may include a paused activity; it must never be rendered.
  await visitor.addInitScript(() => localStorage.setItem('extratime:schedule-cache:v2', JSON.stringify({ events: [{ id: 'old', eskul: 'pramuka', eskulLabel: 'Pramuka', date: '2026-10-18', dateLabel: '18 Okt 2026', classes: ['7A'], time: '08.00', weekNo: '1', status: 'Sudah Terlaksana', statusNormalized: 'selesai' }], fetchedAt: '2026-10-01T00:00:00Z' })));
  await visitor.goto('http://localhost:3033/');
  assert.equal(await visitor.getByText('Pramuka', { exact: true }).count(), 0);
  await visitor.getByRole('button', { name: /^Lihat Jadwal/ }).first().click();
  await visitor.getByRole('button', { name: 'Refresh data', exact: true }).waitFor({ state: 'visible' });
  await visitor.waitForFunction(() => !document.querySelector('button[aria-label="Refresh data"]').disabled);
  assert.equal(await visitor.getByText('Pramuka', { exact: true }).count(), 0);
  assert.ok(sheetRequests.includes('Renang'));
  assert.ok(!sheetRequests.includes('Pramuka'), 'Paused sheet is not fetched');

  await coach.getByRole('button', { name: '+ Buat pertemuan', exact: true }).click();
  await coach.getByLabel('Nama pertemuan', { exact: true }).fill('Draft kegiatan yang sedang dijeda');
  const gateway = await contexts[2].newPage();
  await gateway.goto('http://localhost:3033/coach');
  await gateway.getByRole('button', { name: /Coach Renang/ }).click();
  await gateway.getByLabel('Password', { exact: true }).fill('Unsaved-password');
  await switchActivity('Renang', false);
  await coach.evaluate(() => window.dispatchEvent(new Event('focus')));
  await coach.getByRole('heading', { name: 'Ruang coach belum tersedia', exact: true }).waitFor();
  assert.equal(await coach.getByRole('button', { name: '+ Buat pertemuan', exact: true }).count(), 0);
  await gateway.evaluate(() => window.dispatchEvent(new Event('focus')));
  await gateway.waitForFunction(() => !document.querySelector('dialog[open]'));
  assert.notEqual(await gateway.evaluate(() => getComputedStyle(document.body).overflowY), 'hidden');
  // Existing public pages remove the activity when refreshed; unrelated activities remain.
  await visitor.getByRole('button', { name: 'Refresh data', exact: true }).click();
  await visitor.waitForFunction(() => !document.querySelector('button[aria-label="Refresh data"]').disabled);
  assert.equal(await visitor.getByText('Renang', { exact: true }).count(), 0);
  assert.ok(await visitor.getByText('Panahan', { exact: true }).count() > 0);
  await admin.getByRole('button', { name: 'Reporting ekskul', exact: true }).click();
  assert.ok(!(await admin.getByLabel('Ekskul laporan', { exact: true }).locator('option').allTextContents()).includes('Renang'));
  await admin.getByRole('button', { name: 'Rekap sesi', exact: true }).click();
  assert.ok(!(await admin.getByLabel('Ekstrakurikuler rekap', { exact: true }).locator('option').allTextContents()).includes('Renang'));
  await admin.getByRole('button', { name: 'Manajemen coach', exact: true }).click();
  assert.equal(await admin.getByText('coach.renang', { exact: false }).count(), 0);
  await admin.reload();
  await admin.getByRole('button', { name: 'Pengaturan ekskul', exact: true }).click();
  assert.equal(await admin.getByRole('switch', { name: 'Aktifkan Renang', exact: true }).getAttribute('aria-checked'), 'false', 'Pause persists across reloads');
  const settings = await (await visitor.request.get('http://localhost:3033/api/extracurriculars')).json();
  assert.deepEqual(settings.enabled, ['panahan', 'berkuda', 'taekwondo']);
  await visitor.goto('http://localhost:3033/coach');
  assert.equal(await visitor.getByRole('button', { name: /Coach Renang/ }).count(), 0);
  assert.equal(await visitor.getByRole('button', { name: /Coach Pramuka/ }).count(), 0);
  await visitor.getByRole('button', { name: 'Masuk admin', exact: true }).waitFor();

  await switchActivity('Renang', true);
  await coach.getByRole('button', { name: 'Refresh data', exact: true }).click();
  await coach.getByRole('heading', { name: 'Ruang Renang', exact: true }).waitFor();
  await coach.getByRole('button', { name: '+ Buat pertemuan', exact: true }).waitFor();
  assert.equal(await coach.getByLabel('Nama pertemuan', { exact: true }).count(), 0, 'Paused draft is not silently reopened');
  await gateway.evaluate(() => window.dispatchEvent(new Event('focus')));
  await gateway.getByRole('button', { name: /Coach Renang/ }).waitFor();
  assert.equal(await gateway.locator('dialog[open]').count(), 0);
  await switchActivity('Pramuka', true);
  await visitor.reload();
  await visitor.getByRole('button', { name: /Coach Pramuka/ }).waitFor();
  await switchActivity('Pramuka', false); // Leave the fixture in its initial activity state.
  for (const label of ['Renang', 'Panahan', 'Berkuda', 'Taekwondo']) await switchActivity(label, false);
  await visitor.reload();
  assert.equal(await visitor.getByRole('button', { name: /Coach (Renang|Panahan|Berkuda|Taekwondo|Pramuka)/ }).count(), 0);
  await visitor.getByRole('button', { name: 'Masuk admin', exact: true }).waitFor();
  await admin.reload();
  await admin.getByRole('button', { name: 'Pengaturan ekskul', exact: true }).click();
  for (const label of ['Renang', 'Panahan', 'Berkuda', 'Taekwondo']) await switchActivity(label, true);
  await admin.setViewportSize({ width: 390, height: 844 });
  assert.equal(await admin.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await admin.screenshot({ path: '/tmp/extra-tracker-extracurricular-settings-mobile.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log('PASS shared admin switches, custom confirmation/cancel, Pramuka initially paused, persistence, cache exclusion, spreadsheet filtering, existing coach pause/reactivation, report filters, public gateway, mobile');
} finally { await browser.close(); }
