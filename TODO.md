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

Catatan: pengujian browser lokal dengan fixture sudah lulus. Pengujian tersebut belum membuktikan deployment produksi dan akun asli siap. Portal pendamping masih dalam pengembangan.
