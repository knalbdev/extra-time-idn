# Setup Supabase dan Vercel untuk Extra Tracker

> Pembaruan: integrasi Auth/database sudah tersedia. Ikuti `docs/supabase-integration.md` dan jalankan migration `202610170003_portal_runtime.sql` untuk mengaktifkannya pada project yang sudah disiapkan. Keterangan mode demo di bawah merupakan konteks versi sebelumnya.
Panduan ini menyiapkan layanan dan environment, bukan mengaktifkan integrasi secara otomatis. Aplikasi saat ini masih menggunakan password demo dan localStorage. Paket Supabase, session server, migrasi nilai, dan username mapping belum terhubung ke aplikasi. File SQL skema/RLS serta seed roster kini tersedia; jalankan sesuai `docs/supabase-database-ready.md` untuk menyiapkan database.

## 1. Buat akun dan project

1. Buka https://supabase.com/dashboard dan daftar/login.
2. Buat organization jika diminta, lalu pilih New Project.
3. Isi nama seperti `extra-tracker-dev`. Pilih region dekat pengguna Indonesia yang tersedia.
4. Buat database password yang kuat. Simpan di password manager; ini berbeda dari password akun coach dan API key.
5. Pilih paket sesuai kebutuhan, lalu Create Project. Tunggu provisioning selesai.
6. Untuk penggunaan nyata, pisahkan project development/preview dan production agar percobaan tidak menulis data siswi produksi.

## 2. Ambil URL dan API keys

1. Buka project, lalu dialog Connect untuk Project URL dan publishable key. API keys juga tersedia melalui Settings > API Keys; nama menu bisa sedikit berbeda.
2. Catat Project URL (`https://....supabase.co`).
3. Catat publishable key (`sb_publishable_...`).
4. Pada Settings > API Keys, buat/salin secret key (`sb_secret_...`) untuk operasi admin di server jika diperlukan.

Publishable key dirancang untuk client; keamanan data ditegakkan oleh login dan RLS. Secret key memiliki akses istimewa/bypass RLS dan hanya boleh digunakan di server yang memvalidasi role admin terlebih dahulu. Key legacy `anon` dan `service_role` berbeda dari pasangan key baru; tutorial ini memakai publishable/secret. Jangan mengambil JWT secret atau database password untuk mengisi API keys.

Sumber: https://supabase.com/docs/guides/getting-started/api-keys

## 3. Isi environment lokal

Dari folder proyek, jalankan sekali jika `.env.local` belum ada:

```sh
cp -n .env.example .env.local
```

Buka `.env.local` di editor dan ganti placeholder:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_ISI_DARI_SUPABASE
SUPABASE_SECRET_KEY=sb_secret_ISI_DARI_SUPABASE
```

File ini berada di root, sejajar `package.json`, bukan di `src`. Ketiga nilai harus berasal dari project yang sama. Secret key belum dibutuhkan untuk sekadar membuka UI; nantinya dipakai untuk provisioning akun melalui server. Alur query biasa memakai identitas pengguna dan RLS, bukan secret key.

Restart development server setelah mengubah environment:

```sh
npm run dev
```

Menambahkan environment saja tidak akan mengubah login demo menjadi login Supabase. Jangan membagikan isi `.env.local` melalui chat, screenshot, atau commit.

## 4. Periksa Git

`.gitignore` sudah berisi:

```gitignore
.env*
!.env.example
.vercel
```

Template `.env.example` hanya berisi placeholder dan boleh masuk Git. Periksa:

```sh
git check-ignore -v .env.local
git check-ignore .env.example
git ls-files '.env*'
```

Perintah pertama harus menunjukkan aturan ignore. Perintah kedua seharusnya tidak menghasilkan output dan keluar dengan status 1, artinya template boleh ditrack. Perintah terakhir tidak boleh menampilkan file credential nyata; `.env.example` boleh muncul setelah ditambahkan ke Git.

Jika file rahasia terlanjur ditrack, `gitignore` tidak otomatis menghapusnya dari Git. Hentikan tracking file tersebut (`git rm --cached .env.local`) dan rotasi key bila pernah ter-push. Menghapus file dari commit terbaru tidak membersihkan riwayatnya.

## 5. Siapkan login tanpa registrasi publik

1. Buka Authentication > Sign In / Providers atau pengaturan konfigurasi Auth.
2. Aktifkan metode Email + Password.
3. Matikan **Allow new users to sign up**. Ini harus dilakukan di Supabase, bukan sekadar menyembunyikan tombol Register.
4. Gunakan Authentication > Users > Add user/Create user untuk membuat akun awal memakai email yang kamu kontrol dan password kuat. Ini langkah persiapan; akun belum bisa dipakai di form demo aplikasi.
5. Simpan password akun secara aman; setiap akun memiliki credential sendiri, bukan `coach-demo`.

Supabase password auth memakai email/nomor telepon. Form username seperti `coach.renang` akan membutuhkan pemetaan username unik ke identitas Auth di server, dengan validasi dan pembatasan percobaan login. Username tidak otomatis bekerja dengan `signInWithPassword`.

Role `admin`, `coach`, dan `pendamping` perlu disimpan pada tabel role/penugasan yang tidak bisa diedit pengguna biasa. Jangan mengandalkan `user_metadata` yang dapat diedit pengguna untuk menetapkan role admin. Label tampilan coach tetap nama ekskul; identitas akun dapat tetap unik untuk audit.

Sumber: https://supabase.com/docs/guides/auth/general-configuration dan https://supabase.com/docs/guides/auth/passwords

## 6. Database dan aturan akses

SQL awal, seed 137 siswi, serta template pembuatan profil dan penugasan sekarang tersedia di `supabase/migrations` dan `supabase/setup`. Ikuti `docs/supabase-database-ready.md` untuk urutan eksekusi. Jangan mengimpor data siswi ke tabel publik tanpa aturan akses. Rancangan konseptual datanya meliputi:

| Data | Tujuan |
| --- | --- |
| profiles, user_roles | Username dan role akun |
| coach_assignments | Ekskul/kelas/jenjang yang ditangani |
| students, classes | Roster siswi |
| meetings, meeting_materials | Materi, kelas, tanggal, standar predikat |
| attendance, assessments | Absensi, predikat A–E, catatan per siswi/pertemuan |
| documentation | Nama pendamping, kelas, ekskul, pertemuan, path file |

Gunakan nama tabel aktual pada migration, bukan nama konseptual pada tabel ringkasan ini. Skema belum aktif di Supabase sampai SQL dijalankan. Aktifkan Row Level Security (RLS) dan buat policies:

- Tanpa login: tidak membaca data privat siswi, absensi, nilai, atau dokumentasi.
- Admin: mengelola akun/penugasan dan generate laporan.
- Coach: membaca/mengisi materi, absensi dan nilai hanya sesuai penugasan.
- Pendamping: mengunggah dokumentasi sesuai penugasan, tanpa akses menulis nilai.

Data localStorage tidak otomatis masuk Supabase. Migrasi roster dan nilai lama perlu proses impor tersendiri. Jangan mengganti pembatasan akses dengan policy `using (true)` untuk data privat.

## 7. Storage dokumentasi

Saat siap menyiapkan penyimpanan, buka Storage > New bucket dan beri nama `dokumentasi-eskul`.

- Biarkan **Public bucket** nonaktif.
- Mulai dengan batas ukuran file misalnya 10 MB dan jenis `image/jpeg`, `image/png`, `image/webp`; angka ini usulan awal, bisa disesuaikan.
- Buat policies yang membatasi upload/read sesuai role dan penugasan. Bucket privat tanpa policy bukan berarti upload langsung berfungsi.
- Simpan file di Storage, path/metadata-nya di database. Aplikasi nantinya memakai signed URL atau akses terautentikasi untuk menampilkan foto.

Portal Pendamping saat ini masih halaman pengembangan, belum ada fitur upload.

Sumber: https://supabase.com/docs/guides/storage/buckets/creating-buckets

## 8. Hubungkan kode aplikasi — pekerjaan terpisah

Setelah project/environment siap, integrasi memerlukan:

1. Paket `@supabase/supabase-js` dan `@supabase/ssr`.
2. Client browser dan client server, pengelolaan session cookie, serta proxy yang sesuai Next.js 16 di proyek ini.
3. Endpoint login username/password dan logout yang benar-benar memverifikasi akun.
4. Migrasi database, RLS dan pembuatan admin pertama melalui proses server tepercaya.
5. Penggantian operasi localStorage dengan query database yang terotorisasi.
6. Pengujian role dan penugasan melalui server/database, bukan hanya menu tersembunyi.

Panduan resmi: https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs

## 9. Masukkan environment ke Vercel

Jika project belum ada di Vercel:

1. Login https://vercel.com, pilih Add New > Project.
2. Import repository Git proyek ini dan pilih framework Next.js.
3. Pastikan Root Directory menunjuk folder yang berisi `package.json`.
4. Masukkan environment berikut pada formulir sebelum deploy, atau Project > Settings > Environment Variables setelah project dibuat.

| Name | Value | Scope yang disarankan |
| --- | --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | URL project Supabase produksi | Production |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Publishable key produksi | Production |
| SUPABASE_SECRET_KEY | Secret key produksi, server only | Production; tandai Sensitive jika tersedia |

Untuk Preview dan Development, tambahkan nama variable yang sama tetapi gunakan URL/keys project Supabase pengembangan. Jangan mencampur URL satu project dengan keys project lain. Tanpa project pengembangan, jangan aktifkan preview yang bisa menulis ke data produksi.

Isi value saja, tanpa `NAMA=`, komentar atau tanda kutip tambahan. Tidak perlu upload `.env.local` ke GitHub atau Vercel. Tidak perlu `DATABASE_URL`/database password untuk penggunaan melalui Supabase client API ini.

Klik Save. Untuk project baru, lanjutkan Deploy. Untuk deployment yang sudah ada, buka Deployments > deployment terkait > Redeploy. Perubahan environment tidak memperbarui deployment lama; variable `NEXT_PUBLIC_` dimasukkan saat build.

Sumber: https://vercel.com/docs/environment-variables

## 10. Atur URL Auth

Setelah mendapat domain Vercel, buka Supabase > Authentication > URL Configuration:

1. Site URL produksi: `https://NAMA-PROJECT.vercel.app`, atau domain kustom jika sudah ada.
2. Redirect URLs: tambahkan tujuan yang benar-benar dipakai alur Auth aplikasi (misalnya rute reset password/callback setelah rute itu diimplementasikan).
3. Untuk project Supabase development, gunakan alamat development yang ditampilkan `npm run dev`, biasanya `http://localhost:3000`. Sesuaikan bila port berbeda.
4. Allowlist preview deployment hanya bila dipakai dan terhubung ke data development. Gunakan domain spesifik atau pola yang dibatasi project/team, bukan semua domain Vercel.

Login password biasa tidak membutuhkan rute OAuth callback tersendiri. URL allowlist tidak membuat rute callback/reset password secara otomatis.

Sumber: https://supabase.com/docs/guides/auth/redirect-urls

## 11. Verifikasi sebelum penggunaan nyata

Setelah kode integrasi selesai, cek login akun yang disediakan admin, penolakan registrasi publik, penolakan akses tanpa login, pembatasan coach antar-ekskul, laporan khusus admin, dan pembatasan pendamping. Simpan nilai lalu buka dari perangkat lain untuk membuktikan database digunakan. Pastikan foto tetap privat dan secret key tidak muncul pada bundle/network browser.

Sampai tahap integrasi tersebut selesai, aplikasi tetap pratinjau; environment dan deployment saja belum mengaktifkan role management sebenarnya.
