# Integrasi aplikasi dengan Supabase

Kode portal kini memakai Supabase Auth dan database. Tidak ada fallback ke password demo atau penyimpanan nilai localStorage. Data demo lama di browser tidak dihapus dan tidak diimpor otomatis.

## Langkah aktivasi untuk project yang sudah menjalankan migration awal

1. Bila secret key pernah terlihat pada chat/screenshot, buat secret key pengganti melalui dashboard Supabase, perbarui `.env.local` dan Vercel, lalu nonaktifkan key lama. Jangan mengubah/membagikan secret key melalui Git atau chat.
2. Buka SQL Editor Supabase sebagai pemilik database (`postgres`).
3. Salin SELURUH isi `supabase/migrations/202610170003_portal_runtime.sql`, lalu Run satu kali. Migration ini menambahkan limiter login persisten, RPC penugasan coach yang transaksional, dan memperbaiki SELECT policy agar INSERT ... RETURNING berhasil. Jangan menjalankan ulang migration 001 atau menghapus tabel yang sudah ada.
   Setelah migration 003, jalankan `supabase/migrations/202610180004_extracurricular_visibility.sql` satu kali untuk pengaturan aktif/nonaktif ekstrakurikuler. Jika 003 sudah pernah berhasil, cukup jalankan file 004 yang baru.
4. Pastikan environment `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` berasal dari project yang sama. Secret key hanya digunakan server untuk lookup username, operasi Auth, dan pengiriman laporan pendamping yang sudah diverifikasi; operasi nilai dan pembacaan/koreksi laporan admin memakai session pengguna dan RLS.
5. Restart `npm run dev`. Buka `/coach`, pilih kartu ekskul atau Masuk admin, lalu isi username dari `profiles` dan password akun Auth terkait. Tidak ada registrasi publik.
6. Uji coach: buat pertemuan untuk salah satu kelas penugasan, pilih siswi, isi absensi dan predikat, simpan, reload. Nilai harus tetap ada.
7. Uji admin: masuk akun admin, buka Reporting ekskul dan generate laporan. Pada Manajemen coach, pilih Ubah untuk mengganti status aktif serta kelas/ekskul. Kelas yang dipilih diterapkan ke SELURUH ekskul yang dicentang. Akun Auth baru tetap dibuat melalui dashboard Supabase dan template profil; belum ada form provisioning akun baru di web.
8. Deploy source terbaru ke Vercel; pastikan ketiga environment sudah tersimpan, lalu redeploy. File `.env.local` tidak diunggah ke Git.

Login coach/admin dibatasi 10 percobaan per username per 15 menit dan 60 per IP per 15 menit pada Vercel. Setelah migration 005, akun pendamping aktif mendapat batas 30 per username untuk penggunaan bersama. Host lokal/non-Vercel memakai bucket IP bersama. Jika migration runtime belum dipasang, login ditolak dengan pesan konfigurasi; aplikasi tidak beralih ke mode demo.

## Perilaku akses

- Session disimpan dalam cookie HttpOnly dengan SameSite Lax; Secure pada production.
- Proxy Next.js memperbarui session; page/server actions memverifikasi user dan profil aktif kembali.
- Roster tidak dibundel pada halaman publik. Bootstrap data hanya dimuat sesudah login dan mengikuti RLS.
- Coach hanya memilih kelas yang ditugaskan untuk ekskul terkait. Actor ID dan class pada catatan ditentukan server, bukan dipercaya dari client.
- Predikat wajib saat hadir; izin/sakit/alpa tidak memiliki predikat. Belum dicatat tetap berbeda dari alpa.
- Materi pertemuan dikunci database setelah ada catatan.
- Admin mengelola penugasan/status dan laporan. Coach tidak mendapat menu laporan atau endpoint mutasi admin yang terotorisasi.
- Portal pendamping memakai satu akun bersama, pilihan 12 nama, sesi spreadsheet, catatan, dan tautan Drive. Aktivasi membutuhkan migration 005 serta satu profil pendamping; ikuti [panduan portal pendamping](portal-pendamping.md). Laporan diperiksa pada menu admin; tidak ada unggahan foto ke website.
- Tombol Refresh data memuat perubahan perangkat lain. Belum memakai realtime subscriptions.
- Akun nonaktif kehilangan akses pada pemeriksaan server/RLS berikutnya. Data yang sudah dilihat sebelumnya tidak bisa ditarik kembali dari perangkat pengguna.

## Pengujian

- `node --test tests/coach-sessions.test.mjs`: model laporan, grade E, data legacy, validasi input server.
- `supabase/tests/portal-rls.mjs`: initial + runtime migration dan seed, RLS lintas role/kelas/ekskul, grade/attendance, larangan promosi role sendiri, record actor, limiter login, penugasan transaksional. Memakai PGlite sementara; bukan project Supabase asli.
- `tests/fixtures/mock-supabase.mjs`: adapter protokol Auth/PostgREST lokal dengan database PostgreSQL-compatible untuk tes browser tanpa credential asli. Tidak boleh dideploy.
- Pengujian jaringan project asli dilakukan read-only: classes, students dan profiles. Pengguna sudah mengonfirmasi login admin/coach dan penyimpanan penilaian ke database berhasil; agen tidak memakai password akun asli untuk pengujian.

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

## Pembaruan pengalaman portal

- Pesan proses dan hasil menggunakan bahasa pengguna tanpa menyebut layanan database atau konfigurasi teknis.
- Login, simpan pertemuan/nilai, refresh, ubah penugasan, dan persiapan laporan/ekspor menggunakan dialog loading di tengah layar. Dialog memblokir interaksi dan Escape selama proses; hasil muncul sebagai notifikasi tetap di bawah layar.
- Konfirmasi keluar akun dan meninggalkan draft memakai dialog UI dengan fokus awal di Batal. Peringatan menutup tab/reload browser tetap ditangani browser melalui beforeunload.
- Daftar siswi menampilkan kehadiran, predikat, dan catatan. Hadir hijau, izin kuning, sakit oranye, alpa merah. Tampilan ponsel memakai kartu.
- Laporan admin memakai bahasa formal dengan cover berlogo IDN, ringkasan predikat A–E, rekap per kelas, dan satu slide penilaian yang memuat seluruh siswi per kelas/pertemuan. Tabel berisi kehadiran, predikat, keterangan predikat, serta catatan singkat. Catatan panjang dan keterangan khusus dirujuk ke lampiran L1, L2, dan seterusnya; isinya tetap lengkap. Standar rubrik khusus tetap dipertahankan maknanya.
- Unduh PDF membuat file langsung tanpa membuka dialog cetak browser. Unduh PowerPoint (.pptx) membuat presentasi 16:9 dengan teks dan bentuk yang dapat diedit untuk digabungkan ke laporan lain. Keduanya memakai data snapshot, isi, dan pengukuran tata letak yang sama. CSV tetap tersedia; nilai tersimpan tidak berubah.
- Pengujian browser memakai data uji lokal, termasuk catatan 2.000 karakter, pemulihan refresh gagal, warna absensi, dialog, layout ponsel, dan unduhan PDF/PPTX. Tes model memverifikasi seluruh 16 siswi pada satu slide, keterangan predikat, rujukan lampiran, dan batas tata letak ekspor. Pemeriksaan manual file hasil unduhan memverifikasi teks PDF tidak kosong serta isi PowerPoint tetap dapat diedit.

## Perbaikan scroll dan navigasi workspace

Bug scroll direproduksi pada browser uji: setelah login berhasil, tidak ada dialog terbuka tetapi `body` masih memiliki `overflow: hidden`. Popup login dan loading sebelumnya menyimpan/mengembalikan pengaturan overflow masing-masing. Saat keduanya dilepas dalam urutan berbeda, snapshot milik loading dapat mengunci halaman kembali.

Semua dialog portal kini memakai `src/lib/use-modal-dialog.ts`: kepemilikan scroll lock dibagi melalui token, pengaturan awal body/html hanya dipulihkan setelah pemilik terakhir selesai. Dialog ditutup dalam cleanup layout effect sebelum halaman lain ditampilkan agar modal browser tidak menyisakan penguncian interaksi.

Judul kiri atas workspace berupa identitas, tanpa tautan keluar. Beranda `/` memeriksa akun aktif di server dan mengarahkan coach/admin yang masih masuk ke `/coach`, termasuk akses langsung atau Back. Login/logout juga membatalkan cache halaman beranda. Pengguna yang belum masuk tetap dapat membuka landing page/dashboard publik. Proxy memperbarui sesi pada beranda dan portal; tidak ada perubahan schema SQL.

Regresi `node tests/portal-navigation.e2e.mjs` memakai fixture lokal yang sama dengan tes login. Jalankan pada fixture baru SEBELUM `tests/portal-login.e2e.mjs` (tes login menonaktifkan coach renang sebagai bagian dari pengujiannya). Cakupan desktop 1280px dan ponsel 390px: masuk dari dashboard, buka/tutup dialog berulang, login dengan dua modal bertumpuk, scroll menggunakan roda mouse, refresh, Batal/keluar, Back/akses langsung beranda, dan kembali ke portal tanpa reload. Tes login juga memeriksa bahwa login tidak meninggalkan scroll lock.

## Implementasi ekspor laporan

`src/lib/report-export.ts` memuat jsPDF dan PptxGenJS hanya saat unduhan diminta. PDF berisi teks langsung dan PPTX berisi text box/bentuk yang dapat diedit, bukan gambar tangkapan layar slide. Logo IDN dimuat dari `/idn.png`; data laporan diproses pada browser admin tanpa dikirim ke layanan ekspor lain.

PDF kosong sebelumnya disebabkan prioritas selector `body:has(#coach-report) *` yang mengalahkan selector penampil isi. Selector penampil cetak kini diperbaiki. Tombol utama PDF menggunakan generator file langsung agar hasil tidak bergantung pada status modal atau aturan cetak browser.

PptxGenJS menyertakan import Node khusus ekspor filesystem di samping jalur browser. Konfigurasi client Webpack/Turbopack mengarahkannya ke stub browser; kode server tetap memakai modul Node asli. Dependency transitif `image-size` diberi override ke versi yang sudah diperbaiki. Audit runtime bersih setelah instalasi; audit dev mengikuti catatan di atas. `npm run build` (Turbopack) dan build Webpack sudah diverifikasi.

## Rekap sesi terlaksana dari spreadsheet (admin)

Menu admin **Rekap sesi** memakai `getAllEvents()` untuk membaca tab spreadsheet ekstrakurikuler aktif yang juga digunakan dashboard. Data pertemuan/penilaian Supabase tidak menjadi sumber perhitungan ini. Pilih tanggal mulai/akhir (keduanya inklusif), pilih semua/satu ekstrakurikuler, lalu **Tampilkan rekap**. Setiap permintaan memuat ulang spreadsheet; tidak memakai cache jadwal browser.

Hanya nilai status **Sudah Terlaksana** yang dihitung, dengan toleransi huruf besar/kecil dan spasi. Status lain, termasuk Belum Terlaksana dan Sudah dibatalkan, tidak dihitung meskipun normalisasi status dashboard dapat berbeda. Satu jadwal dengan beberapa kelas tetap satu sesi. Dua slot Panahan pada hari yang sama tetap dua sesi; jumlah hari dihitung berdasarkan tanggal unik. Rincian seluruh sesi langsung ditampilkan di dalam kartu rekap, beserta kelas peserta, status, tanggal, dan jam; tidak perlu membuka bagian terpisah.

Unduhan **rekap PNG** memiliki lebar 1920 piksel, dengan tinggi minimal 1080 piksel yang bertambah sesuai jumlah sesi dan panjang rincian. Satu gambar mencantumkan logo IDN, rentang, filter ekstrakurikuler, jumlah sesi/hari, rekap per ekstrakurikuler, seluruh rincian sesi (termasuk kelas, status, tanggal, dan jam), sumber, aturan hitung, dan waktu pembaruan WIB. Teks panjang dibungkus ke baris berikutnya agar tidak dipotong. Mengubah filter menghapus hasil sebelumnya agar PNG tidak memakai rentang lama. Jika salah satu tab spreadsheet gagal dimuat, rekap tidak ditampilkan sebagai hasil parsial; admin dapat mencoba kembali. Rekap nol tetap ditampilkan secara eksplisit.

`tests/session-recap.e2e.mjs` menguji CSV spreadsheet dengan dua slot Panahan dan kelas gabungan, filter tanggal/ekskul, angka nol, kegagalan koneksi, ukuran PNG, tampilan ponsel, serta menu yang hanya tersedia pada admin. Tes memakai fixture Supabase untuk akun dan mock CSV; tidak mengubah spreadsheet atau data produksi. Jalankan sebelum tes login yang menonaktifkan coach uji. Tidak ada perubahan schema atau credential tambahan.

## Mengaktifkan atau menjeda ekstrakurikuler

1. Buka Supabase → SQL Editor → New query. Salin seluruh isi `supabase/migrations/202610180004_extracurricular_visibility.sql`, lalu pilih **Run** satu kali. File ini dijalankan setelah 001–003; tidak perlu menjalankan ulang file lama. Kondisi awal: Renang, Panahan, Berkuda, dan Taekwondo aktif; Pramuka nonaktif.
2. Deploy source terbaru ke Vercel, atau restart server lokal. Environment variable tetap sama.
3. Masuk sebagai admin → **Pengaturan ekskul**. Gunakan sakelar pada kartu kegiatan, lalu konfirmasi. Status disimpan pada `extracurriculars.is_active` dan berlaku bersama untuk semua pengguna.
4. Kegiatan nonaktif disembunyikan dari beranda, dashboard, jadwal, filter, ruang coach, pilihan penugasan, laporan penilaian, serta rekap sesi/PNG. Jadwal tetap bersumber dari spreadsheet; tab yang nonaktif tidak dimuat. Jadwal lama di cache browser juga disaring sebelum ditampilkan.
5. Halaman yang sedang terbuka memeriksa status setiap 30 detik saat terlihat, saat tab mendapat fokus kembali, dan melalui Refresh data. RLS langsung menolak penilaian/pertemuan untuk kegiatan nonaktif meskipun coach masih memiliki sesi login. Login baru ke ruang tersebut ditolak. Admin tetap bisa masuk meskipun semua kegiatan dinonaktifkan.
6. Mengaktifkan kembali kegiatan menampilkan data sebelumnya. Tidak ada penghapusan atau perubahan jadwal spreadsheet, akun coach, penugasan, maupun nilai. Penugasan kegiatan nonaktif tetap disimpan ketika penugasan lain diedit.

Pengecekan opsional di SQL Editor:

```sql
select id, name, is_active from public.extracurriculars order by name;
select public.get_enabled_extracurriculars();
```

API publik hanya mengembalikan ID kegiatan aktif; akses anonim ke delapan tabel tetap tidak diberikan. Hanya admin yang dapat mengubah status. Jika pengaturan tidak dapat dimuat, jadwal disembunyikan sementara dan pemberitahuan untuk mencoba kembali ditampilkan, agar kegiatan yang sudah dijeda tidak muncul dari data lama. Jalankan migration 004 sebelum deploy: tanpa migration ini, daftar kegiatan dan data portal belum dapat dimuat.

`tests/extracurricular-settings.e2e.mjs` menguji konfirmasi/batal, penyimpanan lintas muat ulang dan pengguna, cache, pengambilan spreadsheet, filter laporan, pause/aktivasi akun coach yang sedang masuk, dan layout ponsel. `supabase/tests/portal-rls.mjs` juga menguji larangan perubahan oleh coach, penolakan penilaian saat dijeda, dan pemulihan data sesudah aktivasi. Keduanya memakai database uji lokal. Jalankan tes browser pengaturan, navigasi, dan rekap sebelum tes login yang menonaktifkan akun coach uji.
