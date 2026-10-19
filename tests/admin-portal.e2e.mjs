// Uses only local fixture accounts. Run before tests that deactivate a coach.
import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try {
  const contexts=await Promise.all([browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'}),browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'})]);
  const [admin,coach]=await Promise.all(contexts.map(context=>context.newPage()));
  const errors=[];for(const page of [admin,coach]){page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));}
  await admin.goto('http://localhost:3033/');
  assert.equal(await admin.getByRole('link',{name:'Portal Admin',exact:true}).getAttribute('href'),'/admin');
  await admin.goto('http://localhost:3033/coach');
  assert.equal(await admin.getByRole('button',{name:'Masuk sebagai admin',exact:true}).count(),0);
  assert.equal(await admin.getByRole('button',{name:'Manajemen coach',exact:true}).count(),0);
  await admin.goto('http://localhost:3033/admin');
  assert.equal((await admin.content()).includes('Aini Rayhana Anwar'),false);
  await admin.getByRole('button',{name:'Masuk sebagai admin',exact:true}).click();
  await admin.getByLabel('Username',{exact:true}).fill('coach.renang');
  await admin.getByLabel('Password',{exact:true}).fill('Fixture-Password-123!');
  await admin.getByRole('button',{name:'Masuk',exact:true}).click();
  await admin.getByRole('alert').filter({hasText:'Username atau password'}).waitFor();
  assert.equal(await admin.getByRole('group',{name:'Pilihan pengelolaan admin',exact:true}).count(),0);
  await admin.getByLabel('Username',{exact:true}).fill('admin');
  await admin.getByLabel('Password',{exact:true}).fill('Fixture-Password-123!');
  await admin.getByRole('button',{name:'Tampilkan password',exact:true}).click();
  assert.equal(await admin.getByLabel('Password',{exact:true}).getAttribute('type'),'text');
  await admin.getByRole('button',{name:'Masuk',exact:true}).click();
  const cards=admin.getByRole('group',{name:'Pilihan pengelolaan admin',exact:true});await cards.waitFor();
  await admin.waitForFunction(()=>!document.querySelector('dialog[open]'));
  assert.equal(new URL(admin.url()).pathname,'/admin');assert.equal(await cards.getByRole('button').count(),2);
  for(const route of ['/','/coach','/pendamping']){await admin.goto('http://localhost:3033'+route);assert.equal(new URL(admin.url()).pathname,'/admin');await cards.waitFor();}
  for(const width of [320,390,768,1280]){
    await admin.setViewportSize({width,height:900});
    assert.equal(await admin.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await cards.getByRole('button',{name:'Manajemen coach',exact:true}).click();
    for(const name of ['Akun coach','Pengaturan ekskul','Laporan penilaian','Rekap sesi']){
      await admin.getByRole('button',{name,exact:true}).click();
      assert.equal(new URL(admin.url()).pathname,'/admin');
      assert.equal(await admin.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    }
    await admin.getByRole('button',{name:'← Menu admin',exact:true}).click();
    await cards.getByRole('button',{name:'Manajemen laporan pendamping',exact:true}).click();
    await admin.getByRole('heading',{name:'Manajemen laporan pendamping',exact:true}).waitFor();
    await admin.getByRole('button',{name:'Perbarui data',exact:true}).click();
    await admin.getByRole('status').filter({hasText:'Data sudah diperbarui'}).waitFor();
    assert.equal(await admin.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await admin.getByRole('button',{name:'← Menu admin',exact:true}).click();await cards.waitFor();
    if(width===390||width===1280)await admin.screenshot({path:`/tmp/extra-tracker-admin-home-${width}.png`,fullPage:true});
  }
  await admin.reload();await cards.waitFor();
  assert.ok((await contexts[0].cookies()).some(cookie=>cookie.name.startsWith('sb-')&&cookie.httpOnly));
  await admin.getByRole('button',{name:'Keluar akun',exact:true}).click();await admin.getByRole('button',{name:'Batal',exact:true}).click();await cards.waitFor();
  await admin.getByRole('button',{name:'Keluar akun',exact:true}).click();await admin.getByRole('button',{name:'Ya, keluar',exact:true}).click();
  await admin.getByRole('button',{name:'Masuk sebagai admin',exact:true}).waitFor();
  await admin.waitForFunction(()=>!document.querySelector('dialog[open]'));
  assert.notEqual(await admin.evaluate(()=>getComputedStyle(document.body).overflowY),'hidden');

  await coach.goto('http://localhost:3033/coach');await coach.getByRole('button',{name:/Coach Renang/}).click();
  await coach.getByLabel('Username',{exact:true}).fill('coach.renang');await coach.getByLabel('Password',{exact:true}).fill('Fixture-Password-123!');await coach.getByRole('button',{name:'Masuk',exact:true}).click();
  await coach.getByRole('heading',{name:'Ruang Renang',exact:true}).waitFor();
  await coach.goto('http://localhost:3033/admin');assert.equal(new URL(coach.url()).pathname,'/coach');
  assert.equal(await coach.getByRole('group',{name:'Pilihan pengelolaan admin',exact:true}).count(),0);
  assert.equal(await coach.getByRole('button',{name:'Laporan penilaian',exact:true}).count(),0);
  await coach.getByRole('button',{name:'Keluar akun',exact:true}).click();await coach.getByRole('button',{name:'Ya, keluar',exact:true}).click();
  await coach.getByRole('heading',{name:'Portal Coach',exact:true}).waitFor();
  assert.deepEqual(errors,[]);
  console.log('PASS dedicated /admin login, wrong-role denial, exactly two cards, all coach tools and companion management, route guards, session persistence, mobile/desktop, refresh and custom logout');
} finally {await browser.close();}
