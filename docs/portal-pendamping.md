# Portal pendamping: satu akun bersama

Portal memakai satu akun `pendamping.eskul`. Setelah masuk, pendamping memilih namanya atau mengisi nama manual, sesi dari jadwal spreadsheet, catatan bila ada, dan tautan dokumentasi Google Drive. Tidak ada pendaftaran akun atau unggahan foto ke website.

## Pembaruan untuk portal yang sudah aktif

Jika migration 005 dan akun bersama sudah berhasil digunakan, cukup lakukan langkah berikut. **Jangan menjalankan ulang 005 atau membuat ulang akun.**

1. Buka SQL Editor Supabase → New query.
2. Salin seluruh isi `supabase/migrations/202610190006_companion_reminders.sql` dan Run satu kali sebagai `postgres`.
3. Migration mempertahankan laporan lama, membuka nama manual (2–120 karakter), dan menetapkan tanggal mulai pengingat berdasarkan tanggal WIB saat migration dijalankan. Tanggal ini tetap disimpan agar sesi yang belum dilaporkan terus muncul setelah berganti hari.
4. Jalankan `supabase/setup/06_verify_companion_reminders.sql` untuk memeriksa tanggal mulai, batasan nama, dan izin akses.
5. Deploy source terbaru ke Vercel/restart server lokal. Tidak perlu environment variable, layanan notifikasi, atau cron tambahan.
6. Uji pilihan **Nama lainnya — isi manual**, lalu periksa kirimannya di menu admin. Untuk sesi pada/ setelah tanggal aktivasi yang sudah lewat satu jam dari jam mulai, pengingat harus tampil bila belum ada laporan.

## 1. Tambahkan tabel laporan

Untuk project yang sudah menjalankan migration 001–004:

1. Buka project Supabase yang digunakan website, lalu SQL Editor → New query.
2. Buka `supabase/migrations/202610190005_companion_reports.sql` di proyek ini.
3. Salin seluruh isinya, lalu Run sebagai pemilik database (`postgres`). Jalankan satu kali; tidak perlu menjalankan ulang migration lama.
4. Setelah 005 berhasil, jalankan `supabase/migrations/202610190006_companion_reminders.sql` satu kali.
5. Pastikan hasilnya berhasil sebelum lanjut. Migration 005 menambahkan tabel `companion_reports`, aturan akses, pencatatan koreksi admin, dan pengiriman yang aman untuk percobaan ulang. Data jadwal, coach, nilai, dan absensi sebelumnya tetap tersimpan.

## 2. Buat satu akun Auth

1. Buka Authentication → Users. Gunakan Add user/Create user untuk membuat akun langsung, bukan mengundang setiap pendamping.
2. Isi email yang kamu kendalikan dan password untuk akun bersama. Email ini dipakai sebagai identitas Supabase Auth; pengguna website cukup memasukkan username dan password.
3. Pastikan akun berstatus email terkonfirmasi. Metode Email + Password tetap digunakan. Pendaftaran publik tetap dinonaktifkan.
4. Salin **User UID** akun yang baru dibuat. Jangan menyalin password atau API key ke file SQL.
5. Buka `supabase/setup/04_create_shared_companion.sql`, salin isinya ke query baru.
6. Ganti `GANTI_DENGAN_USER_UID_PENDAMPING_DARI_AUTH` dengan UID tersebut; pertahankan tanda kutip. Run satu kali.
7. Hasil harus menunjukkan username `pendamping.eskul`, role `pendamping`, dan `is_active = true`.

Tidak perlu membuat 12 akun, mengisi assignments, atau membuat bucket Storage. Password dibagikan secara terpisah melalui saluran internal yang dipilih admin; tidak disimpan di kode, Git, atau daftar nama.

## 3. Verifikasi dan deploy

1. Jalankan `supabase/setup/05_verify_companion.sql` di SQL Editor.
2. Pastikan profil ditemukan, RLS tabel aktif, dan akses fungsi pengiriman menunjukkan `false`, `false`, `true` untuk anon, authenticated, service_role. Pengiriman berjalan melalui server yang memeriksa sesi login dan spreadsheet.
3. Restart server lokal dan buka `/pendamping`. Masuk dengan username `pendamping.eskul` serta password akun Auth tadi.
4. Deploy source terbaru ke project Vercel yang sama. Ketiga environment variable yang sudah digunakan tetap berlaku; tidak ada variable tambahan. Lakukan redeploy bila source terbaru belum terpasang.
5. Uji sekali lagi di domain produksi. Kirim laporan, lalu buka **Laporan pendamping** melalui `/admin` → **Manajemen laporan pendamping** pada browser/profil lain. Pastikan nama, tanggal, jam, kelas, catatan, dan tautan sesuai.

Jika belum menjalankan migration 005, pengiriman laporan belum dapat digunakan meskipun login berhasil. Verifikasi SQL bukan pengganti pengujian login dan pengiriman di domain produksi.

## Alur untuk pendamping

1. Buka Portal Pendamping melalui dashboard dan masuk menggunakan akun bersama.
2. Pilih nama pendamping yang benar dari daftar. Jika belum tersedia, pilih **Nama lainnya — isi manual**, lalu masukkan nama lengkap (2–120 karakter).
3. Pilih bulan dan ekstrakurikuler untuk mempersempit pilihan sesi. Pilihan **Semua bulan** tersedia.
4. Pilih sesi yang didampingi. Periksa tanggal, jam, dan kelas yang ditampilkan otomatis.
5. Centang **Ada kendala atau catatan pelaksanaan** bila ingin menambahkan catatan; jika tidak dicentang, laporan dicatat tanpa kendala.
6. Tempel tautan file/folder Google Drive dan pastikan admin memiliki izin membuka tautan tersebut. Website tidak mengubah izin berbagi file.
7. Pilih **Kirim laporan pendampingan** dan tunggu pemberitahuan berhasil. Nama serta isian dikosongkan setelah pengiriman; gunakan **Kirim laporan lain** untuk sesi berikutnya.
8. Pilih **Keluar akun** setelah selesai. Keluar pada satu perangkat tidak mengeluarkan pengguna lain yang memakai akun bersama.

Sesi berasal dari spreadsheet yang sama dengan dashboard. Hanya kegiatan aktif dengan kelas peserta yang tersedia; sesi berstatus libur atau ditiadakan tidak dapat dipilih. Tanggal, jam, kelas, dan ekstrakurikuler diperiksa kembali oleh server ketika laporan dikirim. Perubahan spreadsheet selanjutnya tidak mengubah rincian laporan yang sudah masuk. Pengiriman ulang isian yang sama setelah gangguan koneksi tidak membuat salinan kedua; laporan baru yang sengaja dikirim tetap menjadi laporan terpisah.

## Daftar nama

1. Astiana Utami
2. Icha Oktaviana
3. Marwiyah Annafisah
4. Nabilah Rahmah
5. Syelvi Amelia Suryana
6. Rahimatul Hikmah
7. Intan Ayu Radeansyach
8. Nusaibah Zata
9. Annida Mar’athus Shaleha
10. Cahya Camila Hamidah
11. Alma Zakaria
12. Shofiyyah

Daftar pilihan awal ada di `src/lib/companions.ts`. Setelah migration 006, guru tambahan dapat mengisi nama langsung tanpa perubahan kode atau akun baru. Nama manual tersimpan pada laporan dan otomatis tersedia pada filter nama di admin; tidak ditambahkan otomatis ke 12 pilihan awal.

## Pengingat laporan

- Pengingat ditampilkan di bagian atas halaman pendamping dengan warna kuning, jumlah sesi, nama ekstrakurikuler, tanggal lengkap, jam, serta seluruh kelas peserta.
- Batasnya **satu jam setelah jam mulai sesi**, mengikuti WIB. Contoh: Renang mulai 15.30 → pengingat mulai 16.30, selama belum ada laporan. Waktu mengacu ke server; jam/tanggal perangkat tidak menentukan tenggat.
- Pengingat hanya mencakup sesi pada atau setelah tanggal aktivasi migration 006. Riwayat sebelum tanggal tersebut tidak ditagih.
- Sesi yang belum dilaporkan tetap tampil setelah berganti hari. Beberapa sesi ditampilkan sebagai kartu terpisah; dua slot Panahan pada hari yang sama tetap dihitung masing-masing.
- Satu laporan untuk satu sesi sudah cukup. Pengingat hilang setelah salah satu pendamping mengirim laporan, termasuk bagi perangkat lain pada pembaruan berikutnya. Jika laporan dihapus admin dan tidak ada laporan lain untuk sesi itu, pengingat muncul kembali.
- Tombol **Isi laporan sekarang** membuka formulir dengan bulan, ekstrakurikuler, dan sesi yang sesuai. Jika ada isian untuk sesi lain yang belum dikirim, portal meminta konfirmasi sebelum menggantinya.
- Jadwal dan status laporan diperbarui setiap menit saat halaman terlihat, serta ketika pengguna kembali ke tab setelah jeda. Perhitungan waktu diperiksa setiap 15 detik. Tombol **Perbarui jadwal** tetap tersedia. Pembaruan otomatis mempertahankan draft formulir.
- Sesi libur/ditiadakan dan kegiatan yang dijeda tidak ditagih. Sesi tanpa jam mulai yang jelas (misalnya hanya “Ba’da Ashar”) diberi keterangan agar jamnya dilengkapi di spreadsheet; portal tidak menebak tenggat.
- Pencocokan laporan memakai sumber spreadsheet, ekstrakurikuler, tanggal, jam mulai, dan daftar kelas. Urutan baris/kelas serta perubahan estimasi jam selesai tidak membuat pengingat baru. Perubahan tanggal, jam mulai, atau kelas dianggap sesi berbeda.
- Pengingat berada **di dalam halaman website**, bukan push notification ketika browser ditutup. Tidak perlu mengizinkan notifikasi browser.
- Bila sinkronisasi gagal, portal menampilkan pemberitahuan untuk mencoba kembali dan tidak menganggap semua sesi sudah dilaporkan. Nama, catatan, dan tautan dokumentasi tetap hanya dapat dibaca admin; pendamping hanya menerima status kelengkapan sesi.

## Pemeriksaan oleh admin

Buka `/admin`, masuk sebagai admin → **Manajemen laporan pendamping**. Filter berdasarkan nama (termasuk nama manual), ekstrakurikuler, atau kelas. Setiap kartu memuat rincian sesi, catatan, waktu pengiriman, dan tombol membuka dokumentasi Drive. **Muat ulang laporan** mengambil kiriman terbaru dari perangkat lain.

Admin dapat mengoreksi nama, catatan, dan tautan dokumentasi. Tanggal, jam, kelas, dan ekstrakurikuler tetap mengikuti sesi saat dikirim. Koreksi mencatat waktu serta akun admin yang melakukan perubahan. Penghapusan memakai konfirmasi dan hanya menghapus catatan portal; file Drive tetap tersimpan.

## Batas akses

- Akun bersama hanya mengirim laporan dan memilih jadwal publik. Akun ini tidak memiliki akses nilai/absensi siswi maupun daftar laporan yang pernah dikirim.
- Pendamping tidak dapat mengoreksi atau menghapus kiriman; hubungi admin jika ada kesalahan.
- Nama dropdown adalah pilihan pengisi formulir, bukan verifikasi identitas pribadi. Semua pengiriman tetap memakai UID akun bersama.
- Foto/video tetap berada di Google Drive. Database hanya menyimpan nama, rincian sesi, catatan, tautan, dan metadata pengiriman/koreksi.
- Batas percobaan login akun pendamping aktif adalah 30 per 15 menit; coach/admin tetap 10. Batas per jaringan pada Vercel tetap 60 per 15 menit.

## Pengujian lokal dengan data uji

Pengujian tidak memakai akun, password, spreadsheet, atau file Drive produksi.

```sh
PGLITE_MODULE=/tmp/extra-tracker-db-check/node_modules/@electric-sql/pglite/dist/index.js node --test tests/companion-reports.test.mjs
```

Untuk pengujian browser, siapkan PGlite sementara seperti panduan `docs/supabase-integration.md`, lalu jalankan fixture pada terminal pertama:

```sh
PGLITE_MODULE=/tmp/extra-tracker-db-check/node_modules/@electric-sql/pglite/dist/index.js node tests/fixtures/mock-supabase.mjs
```

Terminal kedua, build dan jalankan aplikasi dengan kredensial palsu:

```sh
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:3088 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_fixture SUPABASE_SECRET_KEY=sb_secret_fixture npm run build -- --webpack
NODE_OPTIONS='--import ./tests/fixtures/google-csv-hook.mjs' NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:3088 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_fixture SUPABASE_SECRET_KEY=sb_secret_fixture npm run start -- --port 3033
```

Terminal ketiga:

```sh
node tests/companion-portal.e2e.mjs
```

Hook CSV hanya untuk server uji lokal. Jangan memasangnya di Vercel. Setelah selesai, hentikan kedua server dan jalankan `npm run build -- --webpack` tanpa override atau `NODE_OPTIONS` untuk mengembalikan build biasa.


Untuk skenario browser pengingat yang terkontrol, jalankan kedua server uji di atas dengan tambahan `COMPANION_REMINDER_FIXTURE=1` pada masing-masing perintah, lalu jalankan `node tests/companion-reminders.e2e.mjs`. Mode ini memakai jadwal simulasi sekitar tanggal WIB saat pengujian dan waktu server uji 09.59.50; jangan memasang variable ini pada server biasa atau Vercel.
