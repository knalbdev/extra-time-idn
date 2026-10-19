// Run with COMPANION_REMINDER_FIXTURE=1 on the local DB fixture AND CSV-hook app.
// Real production credentials, schedules and Drive files are never used.
import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try {
  const contexts=await Promise.all([browser.newContext({viewport:{width:1440,height:1000}}),browser.newContext({viewport:{width:390,height:844}}),browser.newContext({viewport:{width:1440,height:1000}})]);
  const [page,other,admin]=await Promise.all(contexts.map(context=>context.newPage()));
  const errors=[];
  for(const p of [page,other,admin]){p.setDefaultTimeout(20000);p.on('pageerror',error=>errors.push(error.message));}
  // A wrong device date must not affect reminder deadlines supplied by the server.
  await page.clock.install({time:new Date('2030-06-01T00:00:00Z')});
  await other.clock.install({time:new Date('2030-06-01T00:00:00Z')});
  async function login(p,role){
    await p.goto('http://localhost:3033/'+(role==='admin'?'admin':'pendamping'));
    await p.getByRole('button',{name:role==='admin'?'Masuk sebagai admin':'Masuk sebagai pendamping',exact:true}).click();
    await p.getByLabel('Username',{exact:true}).fill(role==='admin'?'admin':'pendamping.eskul');
    await p.getByLabel('Password',{exact:true}).fill('Fixture-Password-123!');
    await p.getByRole('button',{name:'Masuk',exact:true}).click();
    await p.getByRole('button',{name:'Keluar akun',exact:true}).waitFor();
    await p.waitForFunction(()=>!document.querySelector('dialog[open]'));
  }
  await login(page,'companion');await login(other,'companion');
  const reminders=page.getByRole('region',{name:'Pengingat laporan pendamping',exact:true});
  const otherReminders=other.getByRole('region',{name:'Pengingat laporan pendamping',exact:true});
  await reminders.getByRole('heading',{name:'2 sesi belum memiliki laporan',exact:true}).waitFor();
  assert.equal(await reminders.locator('article').count(),2);
  assert.ok((await reminders.innerText()).includes('Berkuda'));
  assert.equal(await reminders.getByText('Eskul Renang belum ada laporan yang diisi.',{exact:true}).count(),0);
  assert.equal(await reminders.getByText(/Taekwondo/).count(),0);
  const previousDay=new Date(Date.parse(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())+'T00:00:00Z')-86400000);
  assert.ok((await reminders.innerText()).includes(String(previousDay.getUTCDate())));
  await page.clock.fastForward(16000);
  await reminders.getByRole('heading',{name:'3 sesi belum memiliki laporan',exact:true}).waitFor();
  assert.equal(await reminders.locator('article').count(),3);
  const archery=reminders.locator('article').filter({hasText:'Eskul Panahan belum ada laporan yang diisi.'});
  assert.ok((await archery.innerText()).includes('7B'));assert.ok((await archery.innerText()).includes('08.00'));
  await archery.getByRole('button',{name:'Isi laporan sekarang',exact:true}).click();
  const selected=page.getByRole('region',{name:'Sesi terpilih',exact:true});
  assert.ok((await selected.innerText()).includes('Panahan'));assert.ok((await selected.innerText()).includes('7B'));
  await page.getByRole('combobox',{name:'Nama pendamping',exact:true}).selectOption('__other__');
  await page.getByRole('textbox',{name:/^Nama pendamping tambahan/}).fill('G');
  await page.getByLabel('Link Google Drive dokumentasi',{exact:false}).fill('https://drive.google.com/drive/folders/manual-teacher');
  assert.equal(await page.getByRole('button',{name:'Kirim laporan pendampingan',exact:true}).isDisabled(),true);
  await page.getByRole('textbox',{name:/^Nama pendamping tambahan/}).fill('  Guru   Tambahan Sekolah  ');
  await reminders.locator('article').filter({hasText:'Eskul Berkuda'}).getByRole('button',{name:'Isi laporan sekarang',exact:true}).click();
  await page.getByRole('dialog',{name:'Ganti sesi laporan?',exact:true}).waitFor();
  await page.getByRole('button',{name:'Batal',exact:true}).click();
  assert.ok((await selected.innerText()).includes('Panahan'));
  // Keep a draft on a second device while another companion submits the session.
  await other.getByRole('combobox',{name:'Nama pendamping',exact:true}).selectOption({label:'Icha Oktaviana'});
  await page.getByRole('button',{name:'Kirim laporan pendampingan',exact:true}).click();
  await page.getByRole('region',{name:'Laporan berhasil dikirim',exact:true}).waitFor();
  assert.ok((await page.getByRole('region',{name:'Laporan berhasil dikirim',exact:true}).innerText()).includes('Guru Tambahan Sekolah'));
  assert.equal(await archery.count(),0);
  await other.clock.fastForward(61000);
  await otherReminders.locator('article').filter({hasText:'Eskul Panahan'}).waitFor({state:'detached'});
  assert.equal(await other.getByRole('combobox',{name:'Nama pendamping',exact:true}).inputValue(),'Icha Oktaviana');
  assert.equal(await other.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await other.screenshot({path:'/tmp/extra-tracker-companion-reminders-mobile.png',fullPage:true});
  await login(admin,'admin');
  await admin.getByRole('button',{name:'Manajemen laporan pendamping',exact:true}).click();
  const reports=admin.getByRole('region',{name:'Daftar laporan pendamping',exact:true});
  let report=reports.locator('article').filter({has:admin.getByRole('heading',{name:'Guru Tambahan Sekolah',exact:true})});
  await report.waitFor();
  await admin.getByLabel(/^Filter pendamping/).selectOption({label:'Guru Tambahan Sekolah'});
  assert.equal(await reports.locator('article').count(),1);
  await report.getByRole('button',{name:'Koreksi laporan',exact:true}).click();
  assert.equal(await admin.getByRole('textbox',{name:/^Nama pendamping tambahan/}).inputValue(),'Guru Tambahan Sekolah');
  await admin.getByRole('textbox',{name:/^Nama pendamping tambahan/}).fill('Guru Pengganti');
  await admin.getByRole('button',{name:'← Menu admin',exact:true}).click();
  await admin.getByRole('dialog',{name:'Tinggalkan perubahan?',exact:true}).waitFor();
  await admin.getByRole('button',{name:'Batal',exact:true}).click();
  assert.equal(await admin.getByRole('textbox',{name:/^Nama pendamping tambahan/}).inputValue(),'Guru Pengganti');
  await admin.getByRole('button',{name:'Simpan koreksi',exact:true}).click();
  await admin.getByRole('status').filter({hasText:'Koreksi laporan berhasil disimpan'}).waitFor();
  await admin.getByLabel(/^Filter pendamping/).selectOption({label:'Guru Pengganti'});
  report=reports.locator('article').filter({has:admin.getByRole('heading',{name:'Guru Pengganti',exact:true})});
  await report.getByRole('button',{name:'Hapus laporan',exact:true}).click();
  await admin.getByRole('button',{name:'Ya, hapus laporan',exact:true}).click();
  await admin.getByRole('status').filter({hasText:'Laporan pendamping berhasil dihapus'}).waitFor();
  await other.clock.fastForward(61000);
  await otherReminders.locator('article').filter({hasText:'Eskul Panahan'}).waitFor();
  assert.equal(await other.getByRole('combobox',{name:'Nama pendamping',exact:true}).inputValue(),'Icha Oktaviana');
  await page.reload();
  await page.getByRole('region',{name:'Pengingat laporan pendamping',exact:true}).locator('article').filter({hasText:'Eskul Berkuda'}).waitFor();
  assert.deepEqual(errors,[]);
  console.log('PASS manual names and admin correction/filtering, server WIB clock, exact one-hour threshold, multiple and overnight reminders, excluded old/canceled/future sessions, prefilled form and draft guard, cross-device completion/deletion sync, mobile and reload');
} finally {await browser.close();}
