# Integrasi aplikasi dengan Supabase

Kode portal kini memakai Supabase Auth dan database. Tidak ada fallback ke password demo atau penyimpanan nilai localStorage. Data demo lama di browser tidak dihapus dan tidak diimpor otomatis.

## Langkah aktivasi untuk project yang sudah menjalankan migration awal

1. Bila secret key pernah terlihat pada chat/screenshot, buat secret key pengganti melalui dashboard Supabase, perbarui `.env.local` dan Vercel, lalu nonaktifkan key lama. Jangan mengubah/membagikan secret key melalui Git atau chat.
2. Buka SQL Editor Supabase sebagai pemilik database (`postgres`).
3. Salin SELURUH isi `supabase/migrations/202610170003_portal_runtime.sql`, lalu Run satu kali. Migration ini menambahkan limiter login persisten, RPC penugasan coach yang transaksional, dan memperbaiki SELECT policy agar INSERT ... RETURNING berhasil. Jangan menjalankan ulang migration 001 atau menghapus tabel yang sudah ada.
4. Pastikan environment `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` berasal dari project yang sama. Secret key hanya digunakan server untuk lookup username / operasi admin Auth; operasi nilai memakai session pengguna dan RLS.
5. Restart `npm run dev`. Buka `/coach`, pilih kartu ekskul atau Masuk admin, lalu isi username dari `profiles` dan password akun Auth terkait. Tidak ada registrasi publik.
6. Uji coach: buat pertemuan untuk salah satu kelas penugasan, pilih siswi, isi absensi dan predikat, simpan, reload. Nilai harus tetap ada.
7. Uji admin: masuk akun admin, buka Reporting ekskul dan generate laporan. Pada Manajemen coach, pilih Ubah untuk mengganti status aktif serta kelas/ekskul. Kelas yang dipilih diterapkan ke SELURUH ekskul yang dicentang. Akun Auth baru tetap dibuat melalui dashboard Supabase dan template profil; belum ada form provisioning akun baru di web.
8. Deploy source terbaru ke Vercel; pastikan ketiga environment sudah tersimpan, lalu redeploy. File `.env.local` tidak diunggah ke Git.

Login dibatasi 10 percobaan per username per 15 menit dan 60 per IP per 15 menit pada Vercel. Host lokal/non-Vercel memakai bucket IP bersama. Jika migration runtime belum dipasang, login ditolak dengan pesan konfigurasi; aplikasi tidak beralih ke mode demo.

## Perilaku akses

- Session disimpan dalam cookie HttpOnly dengan SameSite Lax; Secure pada production.
- Proxy Next.js memperbarui session; page/server actions memverifikasi user dan profil aktif kembali.
- Roster tidak dibundel pada halaman publik. Bootstrap data hanya dimuat sesudah login dan mengikuti RLS.
- Coach hanya memilih kelas yang ditugaskan untuk ekskul terkait. Actor ID dan class pada catatan ditentukan server, bukan dipercaya dari client.
- Predikat wajib saat hadir; izin/sakit/alpa tidak memiliki predikat. Belum dicatat tetap berbeda dari alpa.
- Materi pertemuan dikunci database setelah ada catatan.
- Admin mengelola penugasan/status dan laporan. Coach tidak mendapat menu laporan atau endpoint mutasi admin yang terotorisasi.
- Portal pendamping tetap dalam pengembangan, belum menerima login/upload.
- Tombol Refresh data memuat perubahan perangkat lain. Belum memakai realtime subscriptions.
- Akun nonaktif kehilangan akses pada pemeriksaan server/RLS berikutnya. Data yang sudah dilihat sebelumnya tidak bisa ditarik kembali dari perangkat pengguna.

## Pengujian

- `node --test tests/coach-sessions.test.mjs`: model laporan, grade E, data legacy, validasi input server.
- `supabase/tests/portal-rls.mjs`: initial + runtime migration dan seed, RLS lintas role/kelas/ekskul, grade/attendance, larangan promosi role sendiri, record actor, limiter login, penugasan transaksional. Memakai PGlite sementara; bukan project Supabase asli.
- `tests/fixtures/mock-supabase.mjs`: adapter protokol Auth/PostgREST lokal dengan database PostgreSQL-compatible untuk tes browser tanpa credential asli. Tidak boleh dideploy.
- Pengujian jaringan project asli dilakukan read-only: classes, students dan profiles. Login dengan password akun asli belum diuji karena password tidak dibagikan ke agen.

Untuk tes database lokal tanpa mengubah dependency aplikasi:

```sh
npm install --prefix /tmp/extra-tracker-db-check --no-audit --no-fund @electric-sql/pglite
PGLITE_MODULE=/tmp/extra-tracker-db-check/node_modules/@electric-sql/pglite/dist/index.js node supabase/tests/portal-rls.mjs
```

Sumber resmi: [Supabase SSR Next.js](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs), [Password sign-in](https://supabase.com/docs/reference/javascript/auth-signinwithpassword), [Vercel request headers](https://vercel.com/docs/headers/request-headers).

Tes browser fixture dapat direproduksi setelah memasang PGlite sementara dan mengisi path Chrome melalui `CHROME_PATH` jika diperlukan:

1. Jalankan fixture pada terminal terpisah: `PGLITE_MODULE=/tmp/extra-tracker-db-check/node_modules/@electric-sql/pglite/dist/index.js node tests/fixtures/mock-supabase.mjs`.
2. Build pengujian dengan override dummy (bukan credential asli):

```sh
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:3088 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_fixture SUPABASE_SECRET_KEY=sb_secret_fixture npm run build -- --webpack
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:3088 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_fixture SUPABASE_SECRET_KEY=sb_secret_fixture npm run start -- --port 3033
```

3. Pada terminal lain, jalankan `node tests/portal-login.e2e.mjs`. Fixture dibuat fresh setiap proses server fixture dimulai; reset fixture sebelum mengulang tes.
4. Hentikan server pengujian, lalu build ulang tanpa override dummy sebelum menjalankan atau deploy versi biasa. Jangan memasukkan dummy credentials ke Vercel.

Next.js diperbarui ke 16.4.2 untuk advisori keamanan runtime. Audit runtime (`npm audit --omit=dev`) bersih saat verifikasi; audit lengkap masih melaporkan dependency transitif dev ESLint/braces yang belum memiliki perbaikan nonbreaking. Tidak dilakukan downgrade/force fix.
