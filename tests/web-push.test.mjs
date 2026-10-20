import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { createHash, randomUUID } from 'node:crypto';
import ts from 'typescript';
import { mkdtemp, mkdir, copyFile, symlink, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

const external = createRequire(import.meta.url), cache = new Map();
function load(file, mocks = {}) {
  const full = path.resolve(file);
  if (!Object.keys(mocks).length && cache.has(full)) return cache.get(full);
  const code = ts.transpileModule(fs.readFileSync(full, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const mod = { exports: {} };
  new Function('exports', 'module', 'require', code)(mod.exports, mod, id => {
    if (id in mocks) return mocks[id];
    if (id === 'server-only') return {};
    return id.startsWith('.') ? load(path.resolve(path.dirname(full), id + '.ts')) : external(id);
  });
  if (!Object.keys(mocks).length) cache.set(full, mod.exports);
  return mod.exports;
}
const { isPushEndpoint, pushRequestSchema, pushClock, dailyPush } = load('src/lib/push.ts');
const make = (id, overrides = {}) => ({ id, date: '2026-10-20', eskul: 'renang', eskulLabel: 'Renang', time: '15.30 - 17.00', classes: ['7A'], statusNormalized: 'terjadwal', ...overrides });

test('morning window and dates follow Jakarta, independent of server timezone', () => {
  assert.deepEqual(pushClock(new Date('2026-10-20T00:59:59Z')), { day: '2026-10-20', inWindow: false });
  assert.deepEqual(pushClock(new Date('2026-10-20T01:00:00Z')), { day: '2026-10-20', inWindow: true });
  assert.equal(pushClock(new Date('2026-10-20T01:59:59Z')).inWindow, true);
  assert.equal(pushClock(new Date('2026-10-20T02:00:00Z')).inWindow, false);
  assert.equal(pushClock(new Date('2026-12-31T17:00:00Z')).day, '2027-01-01');
});

test('one daily digest includes classes, excludes paused/canceled/other dates, preserves completed sessions and deduplicates', () => {
  const events = [make('one'), make('duplicate'), make('cancel', { statusNormalized: 'ditiadakan' }), make('holiday', { statusNormalized: 'libur' }), make('paused', { eskul: 'pramuka' }), make('tomorrow', { date: '2026-10-21' }), make('morning', { eskul: 'panahan', eskulLabel: 'Panahan', time: '10.00 - 11.30', classes: ['7B'], statusNormalized: 'selesai' })];
  const payload = dailyPush(events, ['renang', 'panahan'], '2026-10-20');
  assert.match(payload.title, /2 sesi/);
  assert.ok(payload.body.startsWith('Panahan · 10.00 - 11.30 WIB · 7B'));
  assert.match(payload.body, /Renang · 15.30 - 17.00 WIB · 7A/);
  assert.equal(payload.tag, 'jadwal-2026-10-20');
  assert.match(payload.url, /scheduleDate=2026-10-20/);
  assert.equal(dailyPush(events, [], '2026-10-20'), null);
  assert.equal(dailyPush(events, ['renang'], '2026-10-22'), null);
  const many = dailyPush(Array.from({ length: 20 }, (_, i) => make(String(i), { classes: [String(i)] })), ['renang'], '2026-10-20');
  assert.match(many.body, /\+16 sesi lainnya/);
  assert.ok(Buffer.byteLength(JSON.stringify(many)) < 4000);
});

test('anonymous subscriptions cannot turn the sender into an arbitrary HTTP/SSRF client', () => {
  for (const endpoint of ['https://fcm.googleapis.com/fcm/send/test', 'https://updates.push.services.mozilla.com/wpush/v2/test', 'https://web.push.apple.com/Q/test', 'https://wns2-par02p.notify.windows.com/w/test']) assert.equal(isPushEndpoint(endpoint), true, endpoint);
  for (const endpoint of ['http://fcm.googleapis.com/send/test', 'https://fcm.googleapis.com.evil.test/send', 'https://fcm.googleapis.com@127.0.0.1/x', 'https://user:secret@fcm.googleapis.com/x', 'https://fcm.googleapis.com:8443/x', 'https://127.0.0.1/x', 'https://169.254.169.254/latest/meta-data', 'https://example.com/x', 'https://fcm.googleapis.com/x#fragment']) assert.equal(isPushEndpoint(endpoint), false, endpoint);
  const input = { action: 'subscribe', endpoint: 'https://fcm.googleapis.com/fcm/send/fixture', token: 'a'.repeat(64), keys: { p256dh: 'B' + 'A'.repeat(86), auth: 'A'.repeat(22) }, user_id: 'forged' };
  assert.equal(pushRequestSchema.safeParse(input).success, true);
  assert.equal('user_id' in pushRequestSchema.parse(input), false);
  assert.equal(pushRequestSchema.safeParse({ ...input, token: 'weak' }).success, false);
  assert.equal(pushRequestSchema.safeParse({ ...input, keys: { ...input.keys, p256dh: 'invalid' } }).success, false);
});

test('real PostgreSQL enforces device ownership, private access, leases, retry limits and once-per-day receipts', async () => {
  const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
  const db = new PGlite();
  const owner = 'a'.repeat(64), other = 'b'.repeat(64), client = 'c'.repeat(64);
  const endpoint = 'https://fcm.googleapis.com/fcm/send/fixture';
  try {
    await db.exec('create role anon; create role authenticated; create role service_role bypassrls; create schema app_private;');
    // Freeze only the DB clock; execute the actual migration/policies/functions.
    const migration = fs.readFileSync('supabase/migrations/202610190007_web_push.sql', 'utf8').replace(/\bnow\(\)/g, "'2026-10-20T01:00:00Z'::timestamptz");
    await db.exec(migration);
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set role ${role}`);
      await assert.rejects(db.query('select * from app_private.push_subscriptions'));
      await assert.rejects(db.query("select public.claim_daily_push('2026-10-20')"));
      await assert.rejects(db.query('select public.manage_push_subscription($1,$2,$3,$4,$5,$6)', ['subscribe', endpoint, owner, client, 'B' + 'A'.repeat(86), 'A'.repeat(22)]));
      await db.exec('reset role');
    }
    const asService = () => db.exec('reset role; set role service_role');
    const manage = async (operation, token = owner, url = endpoint) => (await db.query('select public.manage_push_subscription($1,$2,$3,$4,$5,$6) as result', [operation, url, token, client, 'B' + 'A'.repeat(86), 'A'.repeat(22)])).rows[0].result;
    const claim = async (day = '2026-10-20') => (await db.query('select * from public.claim_daily_push($1)', [day])).rows;
    const finish = (job, status, lease = job.lease) => db.query('select public.finish_daily_push($1,$2,$3,$4)', [job.subscription_id, '2026-10-20', lease, status]);
    await asService();
    assert.deepEqual(await manage('subscribe'), { enabled: true });
    assert.deepEqual(await manage('status', other), { enabled: false });
    assert.deepEqual(await manage('subscribe', other), { enabled: false });
    await manage('unsubscribe', other);
    assert.deepEqual(await manage('status'), { enabled: true });
    assert.equal((await manage('test', other)).subscription, null);
    assert.equal((await manage('test')).subscription.endpoint, endpoint);
    assert.equal((await manage('test')).subscription, null, 'test sends are limited per device');
    assert.deepEqual(await claim('2026-10-19'), []);
    const [job] = await claim(); assert.ok(job.lease);
    assert.deepEqual(await claim(), [], 'an overlapping invocation cannot claim a leased device');
    await finish(job, 201, randomUUID());
    await db.exec('reset role');
    assert.equal((await db.query('select state from app_private.push_deliveries')).rows[0].state, 'sending');
    await asService(); await finish(job, 201);
    assert.deepEqual(await claim(), [], 'a sent device cannot be claimed again today');
    const expired = endpoint + '-expired';
    await manage('subscribe', owner, expired); const [expiredJob] = await claim();
    await finish(expiredJob, 410);
    assert.deepEqual(await manage('status', owner, expired), { enabled: false });
    const flaky = endpoint + '-flaky'; await manage('subscribe', owner, flaky);
    for (let attempt = 1; attempt <= 3; attempt++) {
      const [retry] = await claim(); assert.ok(retry, 'failed device can be retried');
      await finish(retry, 503);
      await db.exec("reset role;update app_private.push_deliveries set available_at='2026-10-20T00:00:00Z' where state='pending'");
      await asService();
    }
    assert.deepEqual(await claim(), [], 'no fourth attempt');
    await db.exec('reset role');
    assert.equal((await db.query("select count(*) as n from app_private.push_deliveries where state='failed' and attempts=3")).rows[0].n, 1);
    await asService(); await manage('unsubscribe'); assert.deepEqual(await manage('status'), { enabled: false });
    let limited = false;
    for (let i = 0; i < 121; i++) if ((await manage('status')).limited) limited = true;
    assert.equal(limited, true, 'anonymous mutations are rate limited');
  } finally { await db.close(); }
});

test('service worker displays notifications, restricts click URLs, and preserves existing form tabs', async () => {
  const listeners = {}, shown = [], opened = [];
  const self = { location: { origin: 'https://portal.example.test' }, addEventListener: (name, handler) => listeners[name] = handler, registration: { showNotification: async (...args) => shown.push(args) }, clients: { openWindow: async url => opened.push(url) } };
  vm.runInNewContext(fs.readFileSync('public/sw.js', 'utf8'), { self, URL });
  let done;
  listeners.push({ data: { json: () => ({ title: 'Jadwal', body: 'Renang', tag: 'jadwal-2026-10-20', url: '/?view=dashboard' }) }, waitUntil: value => done = value });
  await done; assert.equal(shown[0][0], 'Jadwal'); assert.equal(shown[0][1].body, 'Renang');
  for (const url of ['https://evil.example.test/phish', 'javascript:alert(1)', '/?view=dashboard&scheduleDate=2026-10-20']) {
    listeners.notificationclick({ notification: { close() {}, data: { url } }, waitUntil: value => done = value }); await done;
    assert.ok(opened.at(-1).startsWith('https://portal.example.test/'));
  }
  assert.match(opened.at(-1), /scheduleDate=2026-10-20/);
});

test('scheduled route verifies authorization/window before reading schedules, and aborts on source failure', async () => {
  let window = false, broken = false, claims = 0, sent = 0;
  const jobs = [{ subscription_id: randomUUID(), lease: randomUUID(), endpoint: 'https://fcm.googleapis.com/send/fixture', p256dh: 'key', auth_key: 'secret' }];
  const mocks = {
    '@/lib/push': { ...load('src/lib/push.ts'), pushClock: () => ({ day: '2026-10-20', inWindow: window }) },
    '@/lib/push-server': { pushConfig: () => ({ cronSecret: 'fixture' }), validCronAuthorization: value => value === 'Bearer fixture', pushErrorStatus: () => 503, sendPush: async () => { sent++; return { statusCode: 201 }; } },
    '@/lib/supabase/server': { adminClient: () => ({ rpc(name) { return { async abortSignal() {
      if (name === 'get_enabled_extracurriculars') return { data: ['renang'], error: null };
      if (name === 'claim_daily_push') return { data: claims++ ? [] : jobs, error: null };
      return { data: null, error: null };
    } }; } }) },
    '@/lib/sheets': { getAllEvents: async () => { if (broken) throw Error('Sheet unavailable'); return [make('one')]; } },
    '@/lib/constants': { ESKUL_ORDER: ['renang'] },
  };
  const { POST } = load('src/app/api/push/daily/route.ts', mocks);
  const request = token => new Request('https://portal.example.test/api/push/daily', { method: 'POST', headers: { Authorization: token } });
  assert.equal((await POST(request('Bearer wrong'))).status, 401); assert.equal(claims, 0);
  assert.match((await (await POST(request('Bearer fixture'))).json()).skipped, /Outside/); assert.equal(claims, 0);
  window = true; broken = true;
  assert.equal((await POST(request('Bearer fixture'))).status, 503); assert.equal(claims, 0);
  broken = false;
  const response = await POST(request('Bearer fixture')); assert.equal(response.status, 200); assert.equal((await response.json()).sent, 1); assert.equal(sent, 1);
});

test('scheduler secret comparison and ownership hashes never depend on plaintext device/IP storage', () => {
  const { validCronAuthorization, subscriptionHashes } = load('src/lib/push-server.ts', { './supabase/server': { hasSupabaseConfig: () => false } });
  assert.equal(validCronAuthorization('Bearer ' + 'x'.repeat(64), 'x'.repeat(64)), true);
  assert.equal(validCronAuthorization('Bearer short', 'x'.repeat(64)), false);
  assert.equal(validCronAuthorization('Bearer ' + 'y'.repeat(64), 'x'.repeat(64)), false);
  const hashes = subscriptionHashes('a'.repeat(64), '127.0.0.1', 'fixture');
  assert.equal(hashes.owner, createHash('sha256').update('a'.repeat(64)).digest('hex'));
  assert.match(hashes.client, /^[a-f0-9]{64}$/);
  assert.notEqual(hashes.client, subscriptionHashes('a'.repeat(64), '127.0.0.1', 'different-secret').client);
});

test('key setup replaces template values, preserves Supabase settings and never overwrites existing VAPID keys', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'extra-tracker-push-keys-'));
  try {
    await mkdir(path.join(dir, 'scripts'));
    await symlink(path.resolve('node_modules'), path.join(dir, 'node_modules'));
    const script = path.join(dir, 'scripts/generate-push-keys.mjs');
    await copyFile('scripts/generate-push-keys.mjs', script);
    await writeFile(path.join(dir, '.env.local'), 'SUPABASE_SECRET_KEY=fixture-only\nWEB_PUSH_PUBLIC_KEY=REPLACE_WITH_PUBLIC_KEY\nWEB_PUSH_PRIVATE_KEY=REPLACE_WITH_PRIVATE_KEY\nWEB_PUSH_SUBJECT=mailto:YOUR_ADMIN_EMAIL\nCRON_SECRET=REPLACE_WITH_RANDOM_SECRET\n');
    const output = execFileSync(process.execPath, [script], { encoding: 'utf8' });
    const env = await readFile(path.join(dir, '.env.local'), 'utf8');
    assert.match(env, /^SUPABASE_SECRET_KEY=fixture-only/m);
    const privateKey = env.match(/^WEB_PUSH_PRIVATE_KEY=(.+)$/m)[1];
    assert.match(env, /^WEB_PUSH_PUBLIC_KEY=B[A-Za-z0-9_-]{86}$/m);
    assert.match(env, /^CRON_SECRET=[a-f0-9]{64}$/m);
    assert.equal(output.includes(privateKey), false);
    assert.throws(() => execFileSync(process.execPath, [script], { stdio: 'pipe' }));
    assert.equal(await readFile(path.join(dir, '.env.local'), 'utf8'), env);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
