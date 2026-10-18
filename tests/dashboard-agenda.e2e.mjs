// Public dashboard, local Supabase fixture, and mocked spreadsheet CSV only.
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, timezoneId: 'Asia/Jakarta', reducedMotion: 'reduce' });
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const OriginalDate = Date, fixed = new OriginalDate('2026-10-18T13:30:00+07:00').getTime();
    window.Date = class extends OriginalDate {
      constructor(...args) { super(...(args.length ? args : [fixed])); }
      static now() { return fixed; }
    };
  });
  const sheets = {
    Renang: 'Pekan,Tanggal,Kelas,Guru,Status,Hasil,Catatan,Status Pelaksanaan\n1,13 Okt 2026,9A,Coach,Libur,,,Sudah Terlaksana\n2,14 Okt 2026,7A,Coach,Sudah Terlaksana,,,',
    Panahan: 'Pekan,Tanggal,Kelas1,Jam1,Guru1,Status Pelaksanaan 1,Kelas2,Jam2,Guru2,Status Pelaksanaan 2,Hasil,Catatan\n1,18 Okt 2026,7A,10.00,Coach,Belum Terlaksana,7B,13.00,Coach,Menunggu konfirmasi,,',
    Berkuda: 'Pekan,Semester,Tanggal,Jenjang,Kelas,Status Pelaksanaan,Hasil,Catatan\n1,1,18 Okt 2026,SMP,8A dan 8B,Libur,,',
    Taekwondo: 'Pekan,Semester,Tanggal,Jenjang,Kelas,Status Pelaksanaan,Hasil,Catatan\n1,1,18 Okt 2026,SMP,7A,Sudah dibatalkan,,',
  };
  let longLabel = false;
  await page.route('https://docs.google.com/**', route => {
    let csv = sheets[new URL(route.request().url()).searchParams.get('sheet')] || 'Header\n';
    if (longLabel) csv = csv.replace('Menunggu konfirmasi', 'MenungguKonfirmasi'.repeat(20));
    return route.fulfill({ contentType: 'text/csv', body: csv });
  });
  await page.goto('http://localhost:3033/?view=dashboard', { waitUntil: 'domcontentloaded' });
  const agenda = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Pekan ini', exact: true }) });
  const labels = ['Sudah Terlaksana', 'Status belum diisi', 'Belum Terlaksana', 'Menunggu konfirmasi', 'Libur', 'Sudah dibatalkan'];
  for (const label of labels) await agenda.getByLabel(`Status pelaksanaan: ${label}`, { exact: true }).waitFor();
  assert.equal(await agenda.getByLabel('Status pelaksanaan: Sudah Terlaksana', { exact: true }).count(), 1, 'A past date with a blank status must not become completed');
  assert.equal(await agenda.getByText('Berlangsung', { exact: true }).count(), 0, 'A scheduled time must not override spreadsheet status');
  assert.equal(await agenda.getByLabel('Status pelaksanaan: Sudah Terlaksana', { exact: true }).evaluate(el => getComputedStyle(el).color), 'rgb(6, 95, 70)');
  assert.equal(await agenda.getByLabel('Status pelaksanaan: Sudah dibatalkan', { exact: true }).evaluate(el => getComputedStyle(el).color), 'rgb(55, 65, 81)');
  await agenda.screenshot({ path: '/tmp/extra-tracker-dashboard-agenda.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await agenda.screenshot({ path: '/tmp/extra-tracker-dashboard-agenda-mobile.png' });
  longLabel = true;
  await page.getByRole('button', { name: 'Refresh data', exact: true }).click();
  await agenda.getByLabel(`Status pelaksanaan: ${'MenungguKonfirmasi'.repeat(20)}`, { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Long spreadsheet labels wrap on mobile');
  assert.deepEqual(errors, []);
  console.log('PASS dashboard status badges from spreadsheet headers, exact labels, blank past status, no time-based completion/live inference, two Panahan sessions, desktop/mobile and long-label wrapping');
} finally { await browser.close(); }
