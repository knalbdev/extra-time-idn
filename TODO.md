# TODO

## Keamanan — ditunda atas permintaan pengguna

- [ ] Rotasi `SUPABASE_SECRET_KEY` yang pernah ikut terkirim melalui konteks IDE di percakapan. Buat key baru di Supabase tanpa menonaktifkan key lama terlebih dahulu.
- [ ] Perbarui `.env.local` dan variable Vercel dengan key baru. Simpan variable Vercel sebagai Sensitive/Secret untuk Production (dan Preview bila digunakan); jangan commit nilai credential.
- [ ] Redeploy source terbaru, restart server lokal, dan verifikasi login. Setelah semua aplikasi yang menggunakan key tersebut sudah diperbarui, hapus key lama di Supabase.

## Verifikasi sebelum membagikan akses ke coach

- [x] Pengguna mengonfirmasi login admin/coach berhasil dan data penilaian sudah masuk ke database.

- [ ] Pastikan domain produksi memakai source terbaru dan ketiga environment variable dari project Supabase yang benar.
- [ ] Uji akun coach asli di domain produksi: kelas/ekskul sesuai penugasan, simpan pertemuan serta absensi/nilai/catatan, lalu reload dan pastikan data tetap ada.
- [ ] Uji admin di domain produksi: hasil pencatatan coach muncul pada laporan; pastikan akun coach tidak memiliki menu laporan admin.

Catatan: pengujian browser lokal dengan fixture sudah lulus. Pengujian tersebut belum membuktikan deployment produksi dan akun asli siap. Portal pendamping sudah diimplementasikan; aktivasi produksi mengikuti daftar di bawah.

## Aktivasi portal pendamping

- [x] Jalankan migration `202610190005_companion_reports.sql` satu kali setelah 004.
- [x] Buat satu akun Auth terkonfirmasi, lalu profil `pendamping.eskul` melalui `supabase/setup/04_create_shared_companion.sql`; tidak perlu assignments.
- [ ] Jalankan verifikasi `supabase/setup/05_verify_companion.sql`, deploy source terbaru, dan uji pengiriman di domain produksi serta pembacaan/koreksi laporan oleh admin.

Panduan: [Portal pendamping](docs/portal-pendamping.md). Tidak ada environment variable atau bucket Storage tambahan.

## Pembaruan pendamping: nama manual dan pengingat

- [x] Pengguna mengonfirmasi akun bersama sudah dapat digunakan dan laporan masuk ke database.
- [ ] Jalankan migration `202610190006_companion_reminders.sql` satu kali setelah 005; tanggal pengingat dimulai pada tanggal WIB ketika migration ini dijalankan.
- [ ] Deploy source terbaru dan uji nama manual serta pengingat sesi pada domain produksi.
