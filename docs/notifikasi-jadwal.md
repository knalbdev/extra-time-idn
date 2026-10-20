# Notifikasi jadwal pukul 08.00 WIB

Semua pengunjung dapat mengaktifkan pengingat melalui tombol lonceng **Pengingat jadwal**, tanpa login. Izin berlaku untuk satu browser pada satu perangkat. Setiap perangkat menerima satu rangkuman jadwal hari itu, berisi eskul, waktu, dan kelas peserta. Sumbernya tetap Google Spreadsheet yang digunakan website. Eskul yang dinonaktifkan serta sesi berstatus Libur atau Ditiadakan tidak dikirim. Hari tanpa kegiatan tidak menghasilkan notifikasi.

Ini berbeda dari pengingat pengisian laporan di portal pendamping. Pengingat laporan tetap bekerja seperti sebelumnya.

## 1. Siapkan tabel di Supabase

1. Pastikan migrasi 001 sampai 006 sudah dijalankan.
2. Buka **SQL Editor → New query** di Supabase.
3. Salin seluruh isi [migrasi 007](../supabase/migrations/202610190007_web_push.sql), lalu klik **Run** sekali.
4. Jalankan [verifikasi notifikasi](../supabase/setup/07_verify_web_push.sql). Tiga tabel harus menampilkan `rowsecurity = true`; pemeriksaan akses anonim dan pengguna login harus menghasilkan nol baris.

Tidak perlu membuat akun Auth baru, bucket Storage, atau mengaktifkan Realtime. Tabel notifikasi bersifat privat. API server menangani pendaftaran perangkat menggunakan token acak milik perangkat, pembatasan permintaan, dan validasi alamat layanan push.

## 2. Buat kunci di komputer

Di terminal proyek, jalankan:

```sh
npm install
npm run push:keys
```

Perintah kedua menambahkan empat variabel langsung ke `.env.local`, tanpa mencetak nilainya ke terminal dan tanpa mengubah variabel Supabase. Perintah berhenti jika kunci notifikasi sudah ada, agar perangkat yang telah berlangganan tetap menggunakan pasangan kunci yang sama.

Di `.env.local`, ganti hanya `YOUR_ADMIN_EMAIL` dengan alamat email pengelola yang valid:

```dotenv
WEB_PUSH_PUBLIC_KEY=nilai_yang_dibuat_otomatis
WEB_PUSH_PRIVATE_KEY=nilai_yang_dibuat_otomatis
WEB_PUSH_SUBJECT=mailto:email-pengelola@sekolah.sch.id
CRON_SECRET=nilai_yang_dibuat_otomatis
```

Jangan tambahkan awalan `NEXT_PUBLIC_`. Public key diberikan ke browser melalui `/api/push/config`; private key dan secret penjadwal tetap di server. `.env.local` sudah diabaikan oleh `.gitignore`; `.env.example` hanya berisi contoh.

## 3. Masukkan variabel ke Vercel dan deploy

1. Buka proyek Vercel → **Settings → Environment Variables**.
2. Tambahkan keempat variabel di atas, dengan nilai yang sama persis dari `.env.local`. Variabel Supabase yang sudah ada tetap diperlukan.
3. Pilih environment **Production**. Jangan menyalakan penjadwal pada deployment Preview. Pengujian Preview sebaiknya memakai proyek Supabase dan pasangan kunci tersendiri agar tidak berbagi antrean produksi.
4. Simpan private key dan `CRON_SECRET` sebagai variabel sensitif jika tersedia. Jangan menyalin tanda kutip atau baris baru ke nilainya.
5. Deploy source terbaru melalui alur Git/Vercel yang biasa digunakan. Jika source sudah terdeploy sebelum variabel ditambahkan, lakukan **Redeploy** sesudah menyimpan variabel.
6. Buka domain produksi dengan HTTPS. Klik lonceng → **Aktifkan notifikasi jadwal** → **Izinkan**. Lalu pilih **Kirim notifikasi uji**. Uji dibatasi satu kali per menit per perangkat.

Fitur pengingat tidak aktif sampai konfigurasi server lengkap. Menu lain tetap dapat digunakan. Tidak perlu mengubah konfigurasi Google Spreadsheet atau Apps Script.

## 4. Atur penjadwal eksternal

Paket Hobby Vercel memiliki penjadwal dengan ketepatan per jam. Implementasi ini memakai endpoint terlindungi yang bisa dipanggil penjadwal eksternal seperti [cron-job.org](https://cron-job.org/en/), sehingga tidak bergantung pada ketepatan tersebut.

1. Masuk ke cron-job.org dan pilih **Create cronjob**.
2. Judul: `Pengingat jadwal IDN`.
3. URL: `https://DOMAIN-PRODUKSI/api/push/daily`.
4. Pilih zona waktu **Asia/Jakarta**.
5. Gunakan jadwal kustom: setiap hari, jam **08**, menit **00, 05, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55**. Jika memakai ekspresi cron: `*/5 8 * * *`, tetap dengan zona waktu Asia/Jakarta.
6. Pada pengaturan lanjutan, pilih metode **POST**. Tambahkan header:

   ```text
   Authorization: Bearer NILAI_CRON_SECRET_DARI_VERCEL
   ```

7. Body boleh kosong. Jangan letakkan secret di URL.
8. Jika pilihan batas waktu tersedia, pilih 60 detik. Beberapa layanan penjadwal dapat menutup koneksi lebih awal; periksa riwayat eksekusi dan hasil verifikasi database bila terjadi timeout.
9. Aktifkan job. Jangan menggunakan URL Preview dan jangan memasang job yang sama di beberapa layanan.

Pemanggilan pukul 08.00 memulai pengiriman. Pemanggilan berikutnya membantu melanjutkan antrean atau mencoba ulang kegagalan sementara; perangkat yang berhasil dikirimi tidak dikirimi ulang pada hari yang sama. Maksimal tiga percobaan per perangkat/hari. Jika pengguna baru mengaktifkan pengingat antara 08.00–08.59, perangkatnya dapat menerima rangkuman pada pemanggilan berikutnya. Aktivasi setelah waktu itu mulai berlaku untuk pagi berikutnya.

Endpoint mengabaikan pemanggilan di luar 08.00–08.59 WIB dan menolak permintaan tanpa header yang benar. Pengujian manual di luar waktu tersebut menghasilkan respons `skipped`; gunakan **Kirim notifikasi uji** untuk menguji perangkat kapan saja. Jika semua pengiriman sudah tercatat, pemanggilan selanjutnya menghasilkan `sent: 0`. Jika spreadsheet tidak dapat dibaca, pengiriman ditunda sampai pembacaan berikutnya berhasil.

Setiap notifikasi memakai penanda tanggal yang sama agar browser mengganti pemberitahuan hari itu saat terjadi percobaan ulang. Seperti pengiriman melalui jaringan pada umumnya, bila layanan menerima pesan tetapi koneksi terputus sebelum konfirmasinya tercatat, sistem dapat mencoba mengirim kembali; jaminan mutlak satu kali penerimaan tidak tersedia.

## 5. Periksa pada perangkat

- **Android/laptop:** buka melalui browser yang mendukung, aktifkan pengingat dan izinkan notifikasi. Setelan sistem operasi juga harus mengizinkan notifikasi browser.
- **iPhone/iPad:** gunakan iOS/iPadOS 16.4+, buka website di Safari → Bagikan → **Tambah ke Layar Utama**. Buka dari ikon tersebut, kemudian aktifkan pengingat di website.
- Halaman tidak harus tetap terbuka, tetapi penerimaan tetap dipengaruhi koneksi, browser, sistem operasi, mode Jangan Ganggu, dan kondisi perangkat. Pukul 08.00 adalah waktu mulai pengiriman, bukan jaminan waktu tampil di layar.
- **Nonaktifkan pada perangkat ini** menghapus langganan perangkat tersebut. Perangkat lain tetap aktif. Langganan yang dinyatakan kedaluwarsa oleh layanan push akan dibersihkan otomatis.
- Jika izin browser dicabut, aktifkan lagi melalui pengaturan browser lalu buka menu pengingat. Jika data browser dihapus atau menggunakan browser lain, aktifkan kembali pengingat.
- Notifikasi membuka tab baru agar formulir penilaian atau laporan yang belum dikirim tidak tertimpa. Pengunjung umum diarahkan ke kalender pada tanggal terkait; akun yang sedang login tetap mengikuti aturan akses portal masing-masing.

## Pemantauan dan biaya

Jalankan `supabase/setup/07_verify_web_push.sql` untuk melihat jumlah perangkat serta ringkasan pengiriman selama tujuh hari terakhir. Status `sent` berarti layanan push menerima pesan, bukan bukti bahwa pengguna telah melihatnya. `failed` berarti tiga percobaan tidak berhasil. Baris antrean lama dibersihkan saat pengiriman harian berikutnya berjalan; langganan aktif disimpan sampai dinonaktifkan atau kedaluwarsa.

Tidak ada polling notifikasi yang berjalan terus-menerus di browser. Beban database berasal dari aktivasi/status perangkat dan antrean harian. Penggunaan tetap masuk kuota Supabase, Vercel Functions, dan penjadwal; fitur ini tidak menjamin biaya selalu nol.

Referensi: [Next.js PWA](https://nextjs.org/docs/app/guides/progressive-web-apps), [Vercel Cron](https://vercel.com/docs/cron-jobs/usage-and-pricing), [WebKit iOS Web Push](https://webkit.org/blog/13878/), [web-push](https://github.com/web-push-libs/web-push).
