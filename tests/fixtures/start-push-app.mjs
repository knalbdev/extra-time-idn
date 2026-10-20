// Local test launcher. Every key below is temporary fixture data.
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import webpush from 'web-push';
const keys = webpush.generateVAPIDKeys();
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--port', '3033'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_OPTIONS: '--import ./tests/fixtures/google-csv-hook.mjs',
    NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:3088', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fixture', SUPABASE_SECRET_KEY: 'sb_secret_fixture',
    WEB_PUSH_PUBLIC_KEY: keys.publicKey, WEB_PUSH_PRIVATE_KEY: keys.privateKey, WEB_PUSH_SUBJECT: 'mailto:fixture@example.test', CRON_SECRET: randomBytes(32).toString('hex'),
  },
});
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
child.on('exit', code => process.exit(code ?? 0));
