// Uses the local Supabase fixture for authentication and mocked spreadsheet CSVs.
import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const csv={
  Renang:'Pekan,Tanggal,Kelas,Guru,Status,Hasil,Catatan\n1,1 Okt 2026,7A,Coach,Sudah Terlaksana,,\n2,31 Okt 2026,7B,Coach,Sudah Terlaksana,,\n3,15 Okt 2026,7A,Coach,Belum Terlaksana,,\n0,30 Sep 2026,7A,Coach,Sudah Terlaksana,,\n5,1 Nov 2026,7A,Coach,Sudah Terlaksana,,',
  Panahan:'Pekan,Tanggal,Kelas1,Jam1,Guru1,Status1,Kelas2,Jam2,Guru2,Status2,Hasil,Catatan\n1,15 Okt 2026,7A,10.00,Coach,Sudah Terlaksana,7B,13.00,Coach,Sudah Terlaksana,,',
  Berkuda:'Pekan,Semester,Tanggal,Jenjang,Kelas,Status,Hasil,Catatan\n1,1,31 Okt 2026,SMP,SMP,Sudah Terlaksana,,',
  Taekwondo:'Pekan,Semester,Tanggal,Jenjang,Kelas,Status,Hasil,Catatan\n1,1,18 Okt 2026,SMP,7A,Sudah dibatalkan,,',
  Pramuka:'Pekan,Tanggal,Kelas,Status,Hasil,Catatan\n1,18 Okt 2026,SMP,Sudah Terlaksana,,',
};
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  page.setDefaultTimeout(15000);
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  let requests=0,failNext=false,empty=false;
  await page.route('https://docs.google.com/**',async route=>{
    requests++;await new Promise(resolve=>setTimeout(resolve,150));
    if(failNext){failNext=false;return route.abort('failed');}
    const sheet=new URL(route.request().url()).searchParams.get('sheet');
    return route.fulfill({contentType:'text/csv',body:empty?'Header\n':csv[sheet]});
  });
  async function login(card,username){await page.getByRole('button',{name:card}).click();await page.getByLabel('Username',{exact:true}).fill(username);await page.getByLabel('Password',{exact:true}).fill('Fixture-Password-123!');await page.getByRole('button',{name:'Masuk workspace',exact:true}).click();await page.getByRole('button',{name:'Keluar akun',exact:true}).waitFor();}
  await page.goto('http://localhost:3033/coach',{waitUntil:'domcontentloaded'});
  await login('Masuk admin','admin');
  await page.getByRole('button',{name:'Rekap sesi',exact:true}).click();
  assert.equal(requests,0,'Do not fetch the spreadsheet before the admin requests a recap');
  await page.getByLabel('Tanggal mulai rekap',{exact:true}).fill('2026-10-01');
  await page.getByLabel('Tanggal akhir rekap',{exact:true}).fill('2026-10-31');
  await page.getByRole('button',{name:'Tampilkan rekap',exact:true}).click();
  await page.getByRole('dialog',{name:'Sedang memuat rekap dari spreadsheet…',exact:true}).waitFor();
  await page.getByRole('status').filter({hasText:'Terdapat 6 sesi terlaksana'}).waitFor();
  const recap=page.getByRole('region',{name:'Hasil rekap sesi',exact:true});
  assert.deepEqual(await recap.locator('dd').allTextContents(),['6','4','4']);
  assert.equal(await recap.locator('tbody tr').count(),5);
  const rows=await recap.locator('tbody tr').allTextContents();
  assert.ok(rows.find(row=>row.includes('Taekwondo')).includes('0'));
  assert.equal(requests,5);
  const file=page.waitForEvent('download');
  await page.getByRole('button',{name:'Unduh rekap PNG',exact:true}).click();
  const download=await file;await download.saveAs('/tmp/extra-tracker-session-recap.png');
  assert.equal(download.suggestedFilename(),'rekap-sesi-all-2026-10-01-2026-10-31.png');
  const bytes=await fs.readFile('/tmp/extra-tracker-session-recap.png');
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(bytes.readUInt32BE(16),1920);assert.equal(bytes.readUInt32BE(20),1080);
  assert.ok(bytes.length>50000);
  await page.getByRole('status').filter({hasText:'Rekap PNG telah disiapkan'}).waitFor();
  assert.equal(await page.locator('dialog[open]').count(),0);
  assert.notEqual(await page.evaluate(()=>getComputedStyle(document.body).overflowY),'hidden');
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:'/tmp/extra-tracker-session-recap-mobile.png',fullPage:true});
  await page.getByLabel('Ekstrakurikuler rekap',{exact:true}).selectOption('panahan');
  assert.equal(await page.getByRole('button',{name:'Unduh rekap PNG',exact:true}).count(),0,'Changing filters must invalidate the old export');
  await page.getByRole('button',{name:'Tampilkan rekap',exact:true}).click();
  await page.getByRole('status').filter({hasText:'Terdapat 2 sesi terlaksana'}).waitFor();
  assert.deepEqual(await recap.locator('dd').allTextContents(),['2','1','1']);
  await page.getByLabel('Tanggal akhir rekap',{exact:true}).fill('2026-09-30');
  assert.equal(await page.getByRole('button',{name:'Tampilkan rekap',exact:true}).isDisabled(),true);
  await page.getByLabel('Tanggal akhir rekap',{exact:true}).fill('2026-10-31');
  failNext=true;
  await page.getByRole('button',{name:'Tampilkan rekap',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'Data jadwal belum dapat dimuat'}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Unduh rekap PNG',exact:true}).count(),0);
  empty=true;
  await page.getByRole('button',{name:'Tampilkan rekap',exact:true}).click();
  await page.getByRole('status').filter({hasText:'Tidak ada sesi berstatus'}).waitFor();
  assert.deepEqual(await recap.locator('dd').allTextContents(),['0','0','0']);
  await page.getByRole('button',{name:'Keluar akun',exact:true}).click();
  await page.getByRole('button',{name:'Ya, keluar',exact:true}).click();
  await page.getByRole('button',{name:'Masuk admin',exact:true}).waitFor();
  await login(/Coach Renang/,'coach.renang');
  assert.equal(await page.getByRole('button',{name:'Rekap sesi',exact:true}).count(),0);
  assert.deepEqual(errors,[]);
  console.log('PASS spreadsheet-only exact status, inclusive range, two time slots, grouped classes, zero counts, 1920x1080 PNG, mobile, invalid filters, failure recovery, admin-only menu');
}finally{await browser.close();}
