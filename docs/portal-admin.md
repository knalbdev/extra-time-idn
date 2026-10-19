# Portal Admin

Admin masuk melalui `/admin`, terpisah dari `/coach` dan `/pendamping`. Tautan **Portal Admin** tersedia pada landing page dan menu dashboard. Halaman coach hanya menyediakan pilihan ekstrakurikuler untuk coach.

Gunakan username dan password admin yang sudah ada. Pemindahan halaman tidak membutuhkan akun baru, migration SQL, atau environment variable tambahan. Setelah source terbaru di-deploy, akun admin yang masih masuk akan diarahkan ke `/admin` ketika membuka beranda, halaman coach, atau halaman pendamping.

## Dua pilihan pada halaman awal

**Manajemen coach** berisi:

- **Akun coach**: kelas, ekstrakurikuler penugasan, dan status akun.
- **Pengaturan ekskul**: mengaktifkan atau menjeda ekstrakurikuler.
- **Laporan penilaian**: menyusun laporan kehadiran, predikat, dan catatan siswi; unduh CSV, PDF, atau PowerPoint.
- **Rekap sesi**: menghitung jadwal spreadsheet berstatus Sudah Terlaksana dan mengunduh rekap PNG.

**Manajemen laporan pendamping** menampilkan laporan yang dikirim pendamping. Admin dapat memfilter berdasarkan nama, kelas, atau ekstrakurikuler, membuka tautan dokumentasi, mengoreksi nama/catatan/tautan, dan menghapus laporan dengan konfirmasi. File Google Drive tetap tersimpan ketika catatan portal dihapus.

Gunakan **← Menu admin** untuk kembali ke dua kartu pilihan. Jika ada koreksi laporan yang belum disimpan, portal meminta konfirmasi sebelum kembali. **Perbarui data** mengambil perubahan dari perangkat lain; **Keluar akun** tetap memakai konfirmasi.

## Batas akses

Halaman `/admin` memverifikasi akun dan role pada server. Coach yang membuka alamat tersebut diarahkan ke `/coach`, sedangkan pendamping diarahkan ke `/pendamping`. Server Actions dan aturan RLS yang sudah ada tetap memeriksa izin setiap pembacaan atau perubahan data. Menyembunyikan menu bukan dasar pemberian akses.

## Pengujian lokal

Dengan fixture dan server pengujian lokal seperti panduan `supabase-integration.md`, jalankan:

```sh
node tests/admin-portal.e2e.mjs
node tests/portal-navigation.e2e.mjs
```

Tes menggunakan akun simulasi dan tidak mengubah data produksi. Jalankan sebelum pengujian `portal-login.e2e.mjs` yang menonaktifkan salah satu akun coach uji. `responsive-layout.e2e.mjs` memeriksa landing page, seluruh portal, dua kartu admin, submenu, dan pratinjau laporan pada lebar 320–1280 piksel.
