# Portal coach — pratinjau lokal

> Pembaruan: integrasi Auth/database sudah tersedia. Ikuti `docs/supabase-integration.md` dan jalankan migration `202610170003_portal_runtime.sql` untuk mengaktifkannya pada project yang sudah disiapkan. Keterangan mode demo di bawah merupakan konteks versi sebelumnya.
Buka `/coach`, atau tautan Portal Coach di beranda/sidebar.

## Lingkup versi ini

- 137 siswi: 79 SMP dan 58 SMK, tersebar pada 10 kelas.
- Nama mengikuti data yang diberikan; spasi dan karakter tak terlihat dibersihkan.
- Simulasi admin mengatur profil coach, status aktif, ekskul dan jenjang penugasan.
- Kartu per coach/ekskul menggantikan dropdown profil. Setelah kartu dipilih, popup password simulasi muncul (fokus terkunci di dialog, Escape/klik luar/tombol tutup untuk kembali). Password demo: `coach-demo`.
- Workspace coach hanya menyediakan pertemuan, absensi dan penilaian. Generate laporan, CSV serta cetak/PDF tersedia pada menu Laporan penilaian di admin, dengan pilihan coach dan ekskul. Data historis coach nonaktif atau berganti penugasan tetap dapat dilaporkan oleh admin.
- Setiap pertemuan memiliki tanggal, semester, satu kelas, materi/skill inti dan standar umum predikat A–E yang disediakan otomatis. Coach tidak perlu membuat kriteria/deskripsi sendiri.
- Kehadiran: hadir, izin, sakit, alpa. Belum dicatat tetap berbeda dari alpa. Hanya siswi hadir yang dinilai pada tiap kriteria.
- Pertemuan/rubrik dikunci setelah ada catatan siswi untuk menjaga makna penilaian. Teknik berikutnya dibuat sebagai pertemuan baru.
- Reporting digenerate berdasarkan periode, jenjang, kelas, dan rentang tanggal. Menampilkan rekap kehadiran dan detail rubrik, nilai, serta catatan per siswi/pertemuan. Ekspor CSV dan cetak/simpan PDF tersedia. Laporan berupa snapshot data tersimpan; generate ulang setelah mengubah nilai.
- Persentase hadir menggunakan seluruh pertemuan kelas pada laporan sebagai penyebut; belum dicatat ditampilkan terpisah. Nilai huruf untuk skill berbeda tidak dirata-ratakan.
- Penilaian baru per siswi dan pertemuan: predikat A–E untuk materi inti serta catatan hingga 2.000 karakter. Catatan siswi opsional. Penilaian semester versi lama tetap dipertahankan pada key sebelumnya. Pertemuan lama dengan rubrik khusus tetap mempertahankan deskripsi dan nilai A–D; standar E ditambahkan tanpa mengubah arti nilai lama.
- Label awal: A Sangat baik, B Baik, C Cukup, D Perlu bimbingan, E Perlu pendampingan intensif.
- Nilai disimpan secara eksplisit; perubahan yang belum disimpan memicu konfirmasi saat konteks diganti.
- Penyimpanan profil dan nilai lama menggunakan localStorage `extratime:coach-preview:v1`; pertemuan, rubrik, nilai dan absensi menggunakan `extratime:coach-sessions:v1` pada browser yang sama. Kegagalan penyimpanan ditampilkan dan tidak diklaim berhasil.

## Batas akses

Form password merupakan simulasi UI, bukan autentikasi atau otorisasi. Password demo terbuka dan dibandingkan di client; tidak ada akun nyata, kata sandi privat, atau database bersama. Direktori siswi ada dalam source/bundle pratinjau. Jangan memublikasikan pratinjau sebagai portal privat dengan data nyata sebelum backend akses dibuat.

## Tahap integrasi berikutnya

Tentukan penyedia autentikasi dan database. Pindahkan roster serta nilai ke database terlindungi sebelum produksi; jangan mengandalkan bundle client untuk privasi. Provisioning admin pertama dilakukan melalui prosedur server tepercaya; pengguna tidak boleh memilih sendiri role admin.

Matriks akses yang harus ditegakkan di server/database:

| Aksi | Admin | Coach |
| --- | --- | --- |
| Kelola akun, status, role dan penugasan | Ya | Tidak |
| Baca daftar siswi | Semua | Jenjang/kelas penugasan |
| Baca/tulis nilai | Semua | Ekskul dan siswi penugasan |
| Akses tanpa login | Tidak | Tidak |

Server harus memvalidasi identitas, status aktif, role, penugasan, ID siswi, periode, predikat, dan panjang catatan pada setiap operasi. Tambahkan audit perubahan, kebijakan konflik antarcoach, serta aturan publikasi/finalisasi nilai sesuai keputusan sekolah. Data pratinjau tidak otomatis dipindahkan ke database.

## Verifikasi

`node --test tests/coach-sessions.test.mjs` menguji pemisahan absensi/nilai, rekap per kelas, validasi penyimpanan, dan pengamanan formula pada ekspor CSV.

## Label dan portal pendamping

Coach ditampilkan sebagai label ekskul (misalnya Coach Renang), tanpa nama pribadi. Properti nama lama tetap disimpan untuk kompatibilitas; form penugasan baru membentuk label otomatis dari ekskul.

Menu Portal Pendamping tersedia di beranda/sidebar pada `/pendamping`, berstatus Dalam pengembangan. Halaman belum menerima unggahan; rencana fitur mencakup nama pendamping, kelas, ekskul, tanggal/pertemuan dan dokumentasi foto beserta keterangan.
