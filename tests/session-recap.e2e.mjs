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
  await page.addInitScript(()=>{
    window.__recapText=[];
    const fill=CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText=function(value,x,y,...args){
      window.__recapText.push({value:String(value),x,y,width:this.measureText(value).width,height:this.canvas.height});
      return fill.call(this,value,x,y,...args);
    };
  });
  let requests=0,failNext=false,empty=false,longRecap=false;
  await page.route('https://docs.google.com/**',async route=>{
    requests++;await new Promise(resolve=>setTimeout(resolve,150));
    if(failNext){failNext=false;return route.abort('failed');}
    const sheet=new URL(route.request().url()).searchParams.get('sheet');
    const extended='Pekan,Tanggal,Kelas,Guru,Status,Hasil,Catatan\n'+Array.from({length:24},(_,i)=>`${i+1},31 Okt 2026,Semua kelas,Coach,Sudah Terlaksana,,`).join('\n');
    return route.fulfill({contentType:'text/csv',body:empty?'Header\n':longRecap&&sheet==='Renang'?extended:csv[sheet]});
  });
  async function login(card,username){await page.goto('http://localhost:3033/'+(username==='admin'?'admin':'coach'));await page.getByRole('button',{name:card}).click();await page.getByLabel('Username',{exact:true}).fill(username);await page.getByLabel('Password',{exact:true}).fill('Fixture-Password-123!');await page.getByRole('button',{name:'Masuk',exact:true}).click();await page.getByRole('button',{name:'Keluar akun',exact:true}).waitFor();}
  await page.goto('http://localhost:3033/coach',{waitUntil:'domcontentloaded'});
  await login('Masuk sebagai admin','admin');
  await page.getByRole('button',{name:'Manajemen coach',exact:true}).click();
  await page.getByRole('button',{name:'Rekap sesi',exact:true}).click();
  assert.equal(requests,0,'Do not fetch the spreadsheet before the admin requests a recap');
  await page.getByLabel('Tanggal mulai rekap',{exact:true}).fill('2026-10-01');
  await page.getByLabel('Tanggal akhir rekap',{exact:true}).fill('2026-10-31');
  await page.getByRole('button',{name:'Tampilkan rekap',exact:true}).click();
  await page.getByRole('dialog',{name:'Sedang memuat rekap dari spreadsheet…',exact:true}).waitFor();
  await page.getByRole('status').filter({hasText:'Terdapat 5 sesi terlaksana'}).waitFor();
  const recap=page.getByRole('region',{name:'Hasil rekap sesi',exact:true});
  assert.deepEqual(await recap.locator('dd').allTextContents(),['5','3','3']);
  assert.equal(await recap.locator('tbody tr').count(),4);
  const rows=await recap.locator('tbody tr').allTextContents();
  assert.ok(rows.find(row=>row.includes('Taekwondo')).includes('0'));
  assert.equal(requests,4);
  const details=recap.getByRole('region',{name:'Rincian sesi terlaksana',exact:true});
  assert.equal(await details.locator('li').count(),5);
  assert.equal(await details.getByText('Sudah Terlaksana',{exact:true}).count(),5);
  assert.ok((await details.innerText()).includes('31 Oktober 2026'));
  assert.ok((await details.innerText()).includes('13.00'));
  assert.ok((await details.innerText()).includes('7A, 7B, 8A, 8B, 9A, 9B'));
  assert.equal(await recap.locator('details').count(),0,'Details belong to the main card and do not require expanding');
  const file=page.waitForEvent('download');
  await page.getByRole('button',{name:'Unduh rekap PNG',exact:true}).click();
  const download=await file;await download.saveAs('/tmp/extra-tracker-session-recap.png');
  assert.equal(download.suggestedFilename(),'rekap-sesi-all-2026-10-01-2026-10-31.png');
  const bytes=await fs.readFile('/tmp/extra-tracker-session-recap.png');
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(bytes.readUInt32BE(16),1920);assert.ok(bytes.readUInt32BE(20)>1080);
  assert.ok(bytes.length>50000);
  const drawn=await page.evaluate(()=>window.__recapText);
  assert.equal(drawn.filter(t=>t.x===1500&&t.value==='Sudah Terlaksana').length,5);
  assert.ok(drawn.some(t=>t.x===1000&&t.value.includes('7A, 7B')));
  assert.ok(drawn.some(t=>t.x===734&&t.value==='13.00'));
  assert.ok(drawn.some(t=>t.x===424&&t.value==='31 Oktober 2026'));
  assert.ok(drawn.every(t=>t.x+t.width<=1920&&t.y+30<t.height),'All exported text fits inside the image');
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
  // A long recap wraps all classes and exports every row, including the last.
  await page.getByLabel('Ekstrakurikuler rekap',{exact:true}).selectOption('all');
  longRecap=true;
  await page.getByRole('button',{name:'Tampilkan rekap',exact:true}).click();
  await page.getByRole('status').filter({hasText:'Terdapat 27 sesi terlaksana'}).waitFor();
  assert.equal(await details.locator('li').count(),27);
  await page.evaluate(()=>{window.__recapText=[];});
  const longFile=page.waitForEvent('download');
  await page.getByRole('button',{name:'Unduh rekap PNG',exact:true}).click();
  await (await longFile).saveAs('/tmp/extra-tracker-session-recap-long.png');
  const longBytes=await fs.readFile('/tmp/extra-tracker-session-recap-long.png');
  assert.ok(longBytes.readUInt32BE(20)>3500);
  const longDrawn=await page.evaluate(()=>window.__recapText);
  assert.equal(longDrawn.filter(t=>t.x===1500&&t.value==='Sudah Terlaksana').length,27);
  assert.ok(longDrawn.some(t=>t.x===92&&t.value==='27'));
  assert.ok(longDrawn.some(t=>t.x===1000&&t.value.includes('11 DKV')),'All classes, including wrapped last class, are drawn');
  assert.ok(longDrawn.every(t=>t.x+t.width<=1920&&t.y+30<t.height));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  longRecap=false;
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
  await page.getByRole('button',{name:'Masuk sebagai admin',exact:true}).waitFor();
  await login(/Coach Renang/,'coach.renang');
  assert.equal(await page.getByRole('button',{name:'Rekap sesi',exact:true}).count(),0);
  assert.deepEqual(errors,[]);
  console.log('PASS complete recap card and PNG: all classes, statuses, dates and times, dynamic height, 27 sessions without clipping, mobile, filters, failure recovery and admin-only access');
}finally{await browser.close();}
