// Default: sanitized CSV snapshot + local accounts. LIVE_SHEETS=1 reads public
// Google CSVs through the browser, without a connector or Google login.
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, timezoneId: 'Asia/Jakarta', reducedMotion: 'reduce' });
  page.setDefaultTimeout(30000);
  const errors = [], sheets = new Set();
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (request.url().startsWith('https://docs.google.com/spreadsheets/')) sheets.add(new URL(request.url()).searchParams.get('sheet')); });
  if (!process.env.LIVE_SHEETS) await page.route('https://docs.google.com/**', async route => {
    const sheet = new URL(route.request().url()).searchParams.get('sheet');
    return route.fulfill({ contentType: 'text/csv', body: await fs.readFile(`tests/fixtures/sheets-revised-2026-10/${sheet}.csv`, 'utf8') });
  });
  await page.goto('http://localhost:3033/?view=dashboard', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const cache = JSON.parse(localStorage.getItem('extratime:schedule-cache:v2') || 'null');
    return cache?.events?.length === 140;
  });
  const data = await page.evaluate(() => JSON.parse(localStorage.getItem('extratime:schedule-cache:v2')).events);
  assert.equal(new Set(data.map(event => event.id)).size, 140);
  assert.equal(data.filter(event => event.eskul === 'panahan' && event.date === '2026-10-24').length, 3);
  assert.equal(data.find(event => event.eskul === 'taekwondo' && event.weekNo === 'R01').time, '11.30 - 13.30');
  assert.equal(data.find(event => event.eskul === 'taekwondo' && event.weekNo === 'R02').classes.length, 4);
  assert.equal(data.filter(event => event.eskul === 'berkuda' && event.date === '2026-10-31').length, 1);
  assert.ok(data.filter(event => event.date > '2026-10-18').every(event => event.statusNormalized === 'terjadwal'));
  assert.deepEqual([...sheets].sort(), ['Berkuda','Jadwal Gabungan','Panahan','Renang','Taekwondo'].sort());
  await page.getByRole('button', { name: 'Jadwal', exact: true }).click();
  await page.getByLabel(/^Bulan/).selectOption('2026-11');
  await page.getByLabel(/^Kelas/).selectOption('11 DKV');
  await page.getByText('11.30 - 13.30', { exact: true }).first().waitFor();
  await page.getByRole('button', { name: 'Refresh data', exact: true }).click();
  await page.waitForFunction(() => !document.querySelector('button[aria-label="Refresh data"]').disabled);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: '/tmp/extra-tracker-revised-spreadsheet-mobile.png', fullPage: true });
  await page.goto('http://localhost:3033/coach');
  await page.getByRole('button', { name: 'Masuk admin', exact: true }).click();
  await page.getByLabel('Username', { exact: true }).fill('admin');
  await page.getByLabel('Password', { exact: true }).fill('Fixture-Password-123!');
  await page.getByRole('button', { name: 'Masuk workspace', exact: true }).click();
  await page.getByRole('button', { name: 'Rekap sesi', exact: true }).click();
  await page.getByLabel('Tanggal mulai rekap', { exact: true }).fill('2026-08-01');
  await page.getByLabel('Tanggal akhir rekap', { exact: true }).fill('2027-06-30');
  await page.getByRole('button', { name: 'Tampilkan rekap', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Terdapat 20 sesi terlaksana' }).waitFor();
  const rows = await page.getByRole('region', { name: 'Hasil rekap sesi', exact: true }).locator('tbody tr').allTextContents();
  assert.equal(rows.length, 4);
  assert.ok(rows.find(row => row.includes('Renang')).includes('9'));
  assert.deepEqual(errors, []);
  console.log(`PASS ${process.env.LIVE_SHEETS ? 'live Google CSV with browser CORS' : 'revised CSV snapshot'}: 140 active schedules, unique replacement sessions, combined trips, scoped classes, revised times, filters, refresh, mobile and 20 completed sessions`);
} finally { await browser.close(); }
