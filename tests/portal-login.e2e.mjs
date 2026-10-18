// Run only against the local fixture described in docs/supabase-integration.md.
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', async dialog => { errors.push(`Unexpected browser dialog: ${dialog.type()}`); await dialog.dismiss(); });
  let failNextAction = false;
  await page.route('**/coach', async route => {
    if (route.request().method() === 'POST') {
      await new Promise(resolve => setTimeout(resolve, 350));
      if (failNextAction) { failNextAction = false; await route.abort('failed'); return; }
    }
    await route.continue();
  });
  const loading = title => page.getByRole('dialog', { name: title, exact: true });
  async function login(card, username) {
    await page.getByRole('button', { name: card }).click();
    await page.getByLabel('Username', { exact: true }).fill(username);
    await page.getByLabel('Password', { exact: true }).fill('Fixture-Password-123!');
    await page.getByRole('button', { name: 'Masuk workspace', exact: true }).click();
    await loading('Sedang memeriksa akun…').waitFor();
    await page.getByRole('button', { name: 'Keluar akun', exact: true }).waitFor();
    const unlocked = await page.evaluate(() => ({ body: getComputedStyle(document.body).overflowY, html: getComputedStyle(document.documentElement).overflowY, dialogs: document.querySelectorAll('dialog[open]').length }));
    assert.equal(unlocked.dialogs, 0, 'Login must remove both modal dialogs');
    assert.notEqual(unlocked.body, 'hidden', `Login left page scrolling locked: ${JSON.stringify(unlocked)}`);
    assert.notEqual(unlocked.html, 'hidden');
  }
  async function logout() {
    await page.getByRole('button', { name: 'Keluar akun', exact: true }).click();
    await page.getByRole('dialog', { name: 'Keluar dari akun?', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Ya, keluar', exact: true }).click();
    await page.getByRole('button', { name: 'Masuk admin', exact: true }).waitFor();
  }
  await page.goto('http://localhost:3033/coach', { waitUntil: 'domcontentloaded' });
  assert.equal((await page.content()).includes('Aini Rayhana Anwar'), false);
  await page.getByRole('button', { name: /Coach Renang/ }).click();
  await page.getByLabel('Username', { exact: true }).fill('coach.renang');
  await page.getByLabel('Password', { exact: true }).fill('wrong');
  await page.getByRole('button', { name: 'Tampilkan password', exact: true }).click();
  assert.equal(await page.getByLabel('Password', { exact: true }).getAttribute('type'), 'text');
  assert.equal(await page.getByLabel('Password', { exact: true }).inputValue(), 'wrong');
  await page.getByRole('button', { name: 'Sembunyikan password', exact: true }).click();
  assert.equal(await page.getByLabel('Password', { exact: true }).getAttribute('type'), 'password');
  await page.getByRole('button', { name: 'Masuk workspace', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Username atau password' }).waitFor();
  await page.getByRole('button', { name: 'Tutup popup password', exact: true }).click();
  await login(/Coach Renang/, 'coach.renang');
  assert.ok((await context.cookies()).some(cookie => cookie.name.startsWith('sb-') && cookie.httpOnly));
  assert.equal(await page.getByRole('button', { name: 'Reporting ekskul', exact: true }).count(), 0);

  await page.getByRole('button', { name: '+ Buat pertemuan', exact: true }).click();
  await page.getByLabel('Nama pertemuan', { exact: true }).fill('Latihan Supabase');
  await page.getByLabel('Kelas pertemuan', { exact: true }).selectOption('7A');
  await page.getByLabel('Materi / skill kemampuan inti', { exact: true }).fill('Pernapasan dasar');
  await page.getByRole('button', { name: 'Simpan pertemuan', exact: true }).click();
  await loading('Sedang menyimpan pertemuan…').waitFor();
  await page.getByRole('status').filter({ hasText: 'Pertemuan berhasil disimpan' }).waitFor();
  const note = ('Perkembangan latihan: sudah berani mencoba.\n' + 'Lanjutkan latihan pernapasan secara bertahap. '.repeat(8)).repeat(7).slice(0, 2000);
  const names = ['Aini Rayhana Anwar', 'Aqilah Khanza Shafiyyah', 'Dzakiyya Talita Sakhi', 'Farannisa Hana Mulia'];
  for (const [i, attendance] of ['Hadir', 'Izin', 'Sakit', 'Alpa'].entries()) {
    await page.getByRole('button', { name: `Nilai ${names[i]}`, exact: true }).click();
    await page.getByRole('radio', { name: attendance, exact: true }).check();
    if (i === 0) await page.getByRole('radio', { name: 'Pernapasan dasar E', exact: true }).check();
    await page.getByLabel('Catatan coach (opsional)', { exact: true }).fill(i === 0 ? note : `Catatan ${attendance.toLowerCase()}`);
    await page.getByRole('button', { name: 'Simpan absensi & penilaian', exact: true }).click();
    await loading('Sedang mengirim data penilaian…').waitFor();
    assert.equal(await page.getByRole('button', { name: 'Refresh data', exact: true }).isDisabled(), true);
    assert.equal(await page.evaluate(() => document.activeElement?.closest('dialog')?.getAttribute('aria-labelledby')), 'portal-loading-title');
    await page.keyboard.press('Escape');
    assert.equal(await loading('Sedang mengirim data penilaian…').isVisible(), true);
    await page.getByRole('status').filter({ hasText: `Absensi dan penilaian ${names[i]} berhasil disimpan.` }).waitFor();
  }
  const row = page.getByRole('button', { name: `Nilai ${names[0]}`, exact: true });
  assert.ok((await row.innerText()).includes('E'));
  assert.ok((await row.innerText()).includes(note));
  for (const [i, color] of ['emerald', 'amber', 'orange', 'rose'].entries()) {
    assert.ok((await page.getByRole('button', { name: `Nilai ${names[i]}`, exact: true }).innerHTML()).includes(`bg-${color}-50`));
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await row.click();
  await page.getByLabel('Catatan coach (opsional)', { exact: true }).fill(note);
  await page.getByRole('button', { name: 'Simpan absensi & penilaian', exact: true }).click();
  await loading('Sedang mengirim data penilaian…').waitFor();
  const overlay = await loading('Sedang mengirim data penilaian…').boundingBox();
  assert.ok(overlay.x >= 0 && overlay.y >= 0 && overlay.x + overlay.width <= 390);
  await page.getByRole('status').filter({ hasText: 'berhasil disimpan' }).waitFor();
  const toast = await page.getByRole('status').filter({ hasText: 'berhasil disimpan' }).boundingBox();
  assert.ok(toast.y >= 0 && toast.y + toast.height <= 844);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: '/tmp/extra-tracker-coach-mobile.png', fullPage: false });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /Latihan Supabase/ }).click();
  await row.click();
  assert.equal(await page.getByRole('radio', { name: 'Pernapasan dasar E', exact: true }).isChecked(), true);
  assert.equal(await page.getByLabel('Catatan coach (opsional)', { exact: true }).inputValue(), note);
  await page.getByRole('button', { name: 'Refresh data', exact: true }).click();
  await loading('Sedang memperbarui data…').waitFor();
  await page.getByRole('status').filter({ hasText: 'Data sudah diperbarui' }).waitFor();
  failNextAction = true;
  await page.getByRole('button', { name: 'Refresh data', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Proses belum dapat diselesaikan' }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Refresh data', exact: true }).isEnabled(), true);
  await page.getByRole('button', { name: 'Refresh data', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Data sudah diperbarui' }).waitFor();
  await row.click();
  await page.getByLabel('Catatan coach (opsional)', { exact: true }).fill('Perubahan belum disimpan');
  await page.getByRole('button', { name: 'Keluar akun', exact: true }).click();
  const confirmation = page.getByRole('dialog', { name: 'Keluar dari akun?', exact: true });
  await confirmation.waitFor();
  assert.ok((await confirmation.innerText()).includes('belum disimpan'));
  await page.screenshot({ path: '/tmp/extra-tracker-logout-mobile.png' });
  await page.getByRole('button', { name: 'Batal', exact: true }).click();
  assert.equal(await page.getByLabel('Catatan coach (opsional)', { exact: true }).inputValue(), 'Perubahan belum disimpan');
  await page.getByRole('button', { name: 'Refresh data', exact: true }).click();
  await page.getByRole('dialog', { name: 'Tinggalkan perubahan?', exact: true }).waitFor();
  await page.keyboard.press('Escape');
  assert.equal(await page.getByLabel('Catatan coach (opsional)', { exact: true }).inputValue(), 'Perubahan belum disimpan');
  await logout();
  await page.reload({ waitUntil: 'domcontentloaded' });
  assert.equal((await page.content()).includes(names[0]), false);
  console.log('PASS login, blocking loading, visible feedback, attendance colors/grades/notes, refresh failure recovery, custom confirmations, mobile, persistence');

  await page.setViewportSize({ width: 1440, height: 1000 });
  await login('Masuk admin', 'admin');
  await page.getByRole('button', { name: 'Reporting ekskul', exact: true }).click();
  await page.getByRole('button', { name: 'Generate laporan', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Laporan berhasil disusun' }).waitFor();
  const report = page.locator('#coach-report');
  assert.ok((await report.textContent()).includes('Pernapasan dasar'));
  assert.equal((await report.textContent()).includes('Invalid Date'), false);
  const slideCount = await report.locator('.report-slide').count();
  assert.ok(slideCount >= 5);
  assert.equal(await report.locator(".report-detail-table").count(), 1);
  assert.equal(await report.locator(".report-detail-table tbody tr").count(), 13);
  assert.ok((await report.locator(".report-detail-table").textContent()).includes("Keterangan predikat"));
  assert.equal(await report.locator('.report-slide:visible').count(), 1);
  await page.getByRole('button', { name: 'Tutup pemberitahuan', exact: true }).click();
  await page.screenshot({ path: '/tmp/extra-tracker-report-cover.png', fullPage: true });
  await page.getByRole('button', { name: 'Berikutnya →', exact: true }).click();
  await page.screenshot({ path: '/tmp/extra-tracker-report-overview.png', fullPage: true });
  const detailNotes = await report.locator('.report-appendix-text').allTextContents();
  assert.equal(detailNotes.join(''), note);
  assert.ok((await report.locator('.report-logo').first().getAttribute('src')).includes('idn.png'));
  assert.equal((await report.textContent()).includes('Data Supabase'), false);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Unduh CSV', exact: true }).click();
  await download;
  await page.getByRole('status').filter({ hasText: 'File CSV telah disiapkan' }).waitFor();
  await fs.writeFile('/tmp/extra-tracker-report-expected.json', JSON.stringify({names:await report.locator('.report-detail-table tbody th').allTextContents(),appendices:detailNotes,slides:slideCount}));
  for (const [button, extension] of [['Unduh PDF','pdf'], ['Unduh PowerPoint (.pptx)','pptx']]) {
    const file = page.waitForEvent('download');
    await page.getByRole('button', { name: button, exact: true }).click();
    const result = await file;
    const target = `/tmp/extra-tracker-report.${extension}`;
    await result.saveAs(target);
    const bytes = await fs.readFile(target);
    assert.ok(bytes.length > 10000, `${extension} must contain report data`);
    assert.ok(result.suggestedFilename().endsWith(`.${extension}`));
    await page.getByRole('status').filter({hasText: extension === 'pdf' ? 'Laporan PDF telah disiapkan' : 'Laporan PowerPoint telah disiapkan'}).waitFor();
    assert.equal(await page.locator('dialog[open]').count(), 0);
    assert.notEqual(await page.evaluate(()=>getComputedStyle(document.body).overflowY),'hidden');
  }
  // Check visible ink, not just the number of pages: the old selector priority
  // left all report text hidden while still producing the right page count.
  await page.emulateMedia({ media: 'print' });
  assert.equal(await report.locator('.report-slide h2').first().evaluate(el=>getComputedStyle(el).visibility),'visible');
  assert.equal(await report.locator('.report-detail-table tbody tr').first().evaluate(el=>getComputedStyle(el).visibility),'visible');
  await page.pdf({path:'/tmp/extra-tracker-browser-print.pdf',preferCSSPageSize:true,printBackground:true});
  await page.emulateMedia({ media: 'screen' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel('Pilih slide laporan', { exact: true }).selectOption('3');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: '/tmp/extra-tracker-report-mobile.png', fullPage: true });
  console.log(`PASS report cover/logo, shared context, complete notes, CSV, responsive navigation, ${slideCount} slides, direct PDF and editable PowerPoint downloads`);

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Manajemen coach', exact: true }).click();
  const coach = page.locator('div.rounded-xl.border').filter({ has: page.getByText('coach.renang · Aktif', { exact: true }) });
  await coach.getByRole('button', { name: 'Ubah', exact: true }).click();
  await page.getByLabel('Akun aktif', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Simpan penugasan', exact: true }).click();
  await loading('Sedang menyimpan penugasan…').waitFor();
  await page.getByRole('status').filter({ hasText: 'Penugasan dan status akun berhasil diperbarui' }).waitFor();
  await logout();
  await page.getByRole('button', { name: /Coach Renang/ }).click();
  await page.getByLabel('Username', { exact: true }).fill('coach.renang');
  await page.getByLabel('Password', { exact: true }).fill('Fixture-Password-123!');
  await page.getByRole('button', { name: 'Masuk workspace', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Username atau password' }).waitFor();
  await page.getByRole('button', { name: 'Tutup popup password', exact: true }).click();
  await login(/Coach Panahan/, 'coach.panahan');
  assert.equal(await page.getByRole('button', { name: /Latihan Supabase/ }).count(), 0);
  assert.deepEqual(errors, []);
  console.log('PASS admin-only reporting, deactivation, cross-coach isolation, no browser confirmation dialogs or runtime errors');
} finally { await browser.close(); }
