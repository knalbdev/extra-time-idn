// Local fixture users and Google CSV only; no production credentials or writes.
import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const failures=[],errors=[];
try {
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await context.route('https://docs.google.com/**',async route=>{
    const sheet=new URL(route.request().url()).searchParams.get('sheet')||'Jadwal Induk';
    const body=await fs.readFile(new URL(`./fixtures/sheets-current-2026-10/${sheet}.csv`,import.meta.url),'utf8');
    await route.fulfill({contentType:'text/csv',body});
  });
  const page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));
  async function inspect(label,width){
    await page.setViewportSize({width,height:width===568?320:844});
    await page.waitForTimeout(350);
    const result=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,body:document.body.scrollWidth,
      controls:[...document.querySelectorAll('input:not([type=checkbox]):not([type=radio]),select,textarea')].filter(e=>e.getBoundingClientRect().width>0).map(e=>({tag:e.tagName,width:e.getBoundingClientRect().width,size:getComputedStyle(e).fontSize})),
      offenders:[...document.querySelectorAll('main *,header *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.right>innerWidth+2&&getComputedStyle(e).visibility!=='hidden'&&!e.closest('[class*=overflow-x-auto]');}).slice(0,6).map(e=>({tag:e.tagName,cls:e.className,text:e.textContent.slice(0,65)}))}));
    if(result.scroll>width+1||result.body>width+1)failures.push({label,width,...result});
    if(width<640)for(const control of result.controls)if(parseFloat(control.size)<16)failures.push({label,width,control});
    if(width===390||width===1280)await page.screenshot({path:`/tmp/extra-tracker-ui-${label}-${width}.png`,fullPage:true});
    if(label==='companion-workspace'&&width<640){const heading=await page.getByRole('region',{name:'Pengingat laporan pendamping',exact:true}).locator('h2').boundingBox();assert.ok(heading.width>=width*.5,`Reminder heading must remain readable at ${width}px`);}
    console.log(`CHECK ${label} ${width}px: document ${result.scroll}px`);
  }
  async function allWidths(label){for(const width of [320,390,768,1280])await inspect(label,width);}
  async function menu(name){
    if(await page.getByRole('button',{name:'Buka menu',exact:true}).isVisible())await page.getByRole('button',{name:'Buka menu',exact:true}).click();
    await page.getByRole('button',{name,exact:true}).click();
  }
  await page.goto('http://localhost:3033/');await allWidths('landing');
  await page.getByRole('button',{name:/^Lihat Jadwal/}).first().click();
  await page.getByRole('heading',{name:'Dashboard Ekstrakurikuler',exact:true}).waitFor();
  await page.getByRole('button',{name:'Perbarui data',exact:true}).waitFor({state:'visible'});
  await page.waitForFunction(()=>!document.querySelector('button[aria-label="Perbarui data"][disabled]'));
  await allWidths('dashboard');
  await page.setViewportSize({width:320,height:568});await menu('Jadwal');
  await page.getByRole('region',{name:'Kalender jadwal',exact:true}).waitFor();await allWidths('calendar');
  await page.getByRole('button',{name:'Daftar',exact:true}).click();await allWidths('schedule-list');
  await page.setViewportSize({width:390,height:844});await menu('Laporan');
  await page.getByRole('heading',{name:'Laporan Pelaksanaan',exact:true}).waitFor();await allWidths('public-reports');
  await page.setViewportSize({width:568,height:320});
  await page.getByRole('button',{name:'Buka menu',exact:true}).click();
  const companionLink=page.getByRole('link',{name:/Portal Pendamping/});await companionLink.scrollIntoViewIfNeeded();assert.ok(await companionLink.isVisible());
  await page.getByRole('button',{name:'Tutup menu',exact:true}).click();
  await page.goto('http://localhost:3033/coach');await allWidths('coach-gateway');
  await page.setViewportSize({width:320,height:568});await page.getByRole('button',{name:/Coach Renang/}).click();await inspect('coach-login',320);
  await page.keyboard.press('Escape');
  await page.goto('http://localhost:3033/pendamping');await allWidths('companion-gateway');
  await page.setViewportSize({width:320,height:568});await page.getByRole('button',{name:'Masuk sebagai pendamping',exact:true}).click();await inspect('companion-login',320);
  await page.getByLabel('Password',{exact:true}).fill('Fixture-Password-123!');await page.getByRole('button',{name:'Masuk',exact:true}).click();
  await page.getByRole('heading',{name:'Laporan Pendamping Eskul',exact:true}).waitFor();await page.waitForFunction(()=>!document.querySelector('dialog[open]'));
  await allWidths('companion-workspace');
  await page.getByRole('combobox',{name:'Nama pendamping',exact:true}).selectOption('__other__');
  await page.getByRole('textbox',{name:/^Nama pendamping tambahan/}).fill('Guru Pendamping Tambahan dengan Nama yang Cukup Panjang');
  await page.getByRole('checkbox',{name:'Ada kendala atau catatan pelaksanaan',exact:true}).check();await inspect('companion-manual',320);
  await page.getByRole('button',{name:'Keluar akun',exact:true}).click();await page.getByRole('button',{name:'Ya, keluar',exact:true}).click();
  await page.getByRole('button',{name:'Masuk sebagai pendamping',exact:true}).waitFor();
  await page.goto('http://localhost:3033/coach');await page.getByRole('button',{name:/Coach Renang/}).click();
  await page.getByLabel('Username',{exact:true}).fill('coach.renang');await page.getByLabel('Password',{exact:true}).fill('Fixture-Password-123!');await page.getByRole('button',{name:'Masuk',exact:true}).click();
  await page.getByRole('heading',{name:'Ruang Renang',exact:true}).waitFor();await allWidths('coach-workspace');
  await page.getByRole('button',{name:'+ Buat pertemuan',exact:true}).click();await inspect('coach-meeting-form',320);
  await page.getByLabel('Nama pertemuan',{exact:true}).fill('Pertemuan uji tampilan pada layar kecil');
  await page.getByLabel('Materi / skill kemampuan inti',{exact:true}).fill('Pernapasan dasar, mengapung, dan latihan koordinasi gerakan');
  await page.getByRole('button',{name:'Simpan pertemuan',exact:true}).click();
  await page.getByRole('status').filter({hasText:'Pertemuan berhasil disimpan'}).waitFor();
  await page.getByRole('button',{name:'Nilai Aini Rayhana Anwar',exact:true}).click();await allWidths('coach-assessment');
  await page.getByRole('radio',{name:'Hadir',exact:true}).check();
  await page.getByRole('radio',{name:/ A$/}).check();
  await page.getByLabel('Catatan coach (opsional)',{exact:true}).fill('Siswi mengikuti kegiatan dengan baik dan dapat melanjutkan latihan pada pertemuan berikutnya.');
  await page.getByRole('button',{name:'Simpan absensi & penilaian',exact:true}).click();
  await page.getByRole('status').filter({hasText:'berhasil disimpan'}).waitFor();await inspect('coach-saved-assessment',390);
  await page.getByRole('button',{name:'Keluar akun',exact:true}).click();await page.getByRole('button',{name:'Ya, keluar',exact:true}).click();
  await page.getByRole('heading',{name:'Portal Coach',exact:true}).waitFor();
  await page.goto('http://localhost:3033/admin');
  await allWidths('admin-gateway');
  await page.getByRole('button',{name:'Masuk sebagai admin',exact:true}).click();
  await page.getByLabel('Username',{exact:true}).fill('admin');await page.getByLabel('Password',{exact:true}).fill('Fixture-Password-123!');await page.getByRole('button',{name:'Masuk',exact:true}).click();
  await page.getByRole('button',{name:'Manajemen coach',exact:true}).waitFor();await page.waitForFunction(()=>!document.querySelector('dialog[open]'));
  await allWidths('admin-home');
  await page.getByRole('button',{name:'Manajemen coach',exact:true}).click();
  for(const [name,label]of [['Akun coach','admin-coaches'],['Pengaturan ekskul','admin-activities'],['Laporan penilaian','admin-reporting'],['Rekap sesi','admin-sessions']]){
    await page.getByRole('button',{name,exact:true}).click();await allWidths(label);
    if(label==='admin-reporting'){
      await page.getByRole('button',{name:'Buat laporan',exact:true}).click();await page.getByLabel('Pilih slide laporan',{exact:true}).waitFor();
      await inspect('admin-report-cover',320);await inspect('admin-report-cover',390);
      await page.getByLabel('Pilih slide laporan',{exact:true}).selectOption('3');await inspect('admin-report-assessment',320);await inspect('admin-report-assessment',390);
    }
    if(label==='admin-sessions'){
      await page.getByRole('button',{name:'Tampilkan rekap',exact:true}).click();await page.getByRole('region',{name:'Hasil rekap sesi',exact:true}).waitFor();await inspect('admin-session-result',320);
    }
  }
  await page.getByRole('button',{name:'← Menu admin',exact:true}).click();
  await page.getByRole('button',{name:'Manajemen laporan pendamping',exact:true}).click();
  await allWidths('admin-companions');
  assert.deepEqual(errors,[]);
  assert.deepEqual(failures,[],JSON.stringify(failures,null,2));
  console.log('PASS responsive landing, dashboard, calendar/list, public reports, portals/login/forms, short landscape navigation and all five admin menus at 320/390/768/1280px');
}finally{await browser.close();}
