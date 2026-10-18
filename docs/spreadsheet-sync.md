# Sumber jadwal Google Sheets

Sumber aktif: [Jadwal Ekstrakurikuler IDNA 26/27](https://docs.google.com/spreadsheets/d/1nDi_YLMmoKWGvUf920GDVsPCIE4J7z_phaxsLwKSu3E/edit).

## Pengaturan Google Sheets

Tidak memerlukan Apps Script, deployment di Google Sheets, Google API key, atau environment variable tambahan. Web membaca CSV publik melalui endpoint `gviz/tq?tqx=out:csv&sheet=...`. Akses tanpa login telah diuji pada 18 Oktober 2026. Pertahankan izin berbagi **Siapa saja yang memiliki link → Pelihat**. Tidak perlu memberi hak edit atau memakai menu Publish to web untuk metode ini.

- **Jadwal Induk** adalah tempat mengelola tanggal, kelas peserta, waktu, dan **Status pelaksanaan** (kolom J saat audit).
- Tab **Renang, Panahan, Berkuda, Taekwondo, Pramuka** mengikuti Jadwal Induk secara otomatis. Web membaca tab-tab tersebut berdasarkan nama dan hanya memuat eskul yang aktif.
- Tab ringkasan/audit tidak dipakai untuk menentukan apakah kegiatan telah terlaksana.
- Hindari mengganti nama tab atau menghapus formula penghubung. Jika susunan spreadsheet berubah lagi, sesuaikan parser dan jalankan verifikasi.

## Pembacaan data

Header dicari setelah judul/keterangan; Google CSV kadang menggabungkan judul dengan sel header tanggal. Kolom dipetakan berdasarkan nama, bukan posisi tetap. Format workbook aktif memiliki **satu sesi per baris**, termasuk Panahan. Kelas dibaca dari **Kelas peserta**, waktu dari **Mulai** dan **Selesai***, status dari **Status**, dan catatan dari **Catatan**. Jam selesai pada sumber merupakan estimasi. Catatan keberangkatan Berkuda dipertahankan.

Sesi Panahan pada tanggal yang sama tetap terpisah menurut waktu dan kelas. Satu perjalanan Berkuda untuk dua kelas dihitung satu sesi. Identitas sesi mengikuti kegiatan, tanggal, jam, dan kelas, sehingga urutan baris dapat diubah tanpa mengganti identitasnya. Kolom yang tidak tersedia, seperti guru/hasil dokumentasi, dibiarkan kosong.

Status tidak disimpulkan dari tanggal. `Terjadwal`, status kosong, `Libur`, dan `Ditiadakan` tidak dihitung sebagai kegiatan terlaksana. Rekap admin menghitung hanya label **Sudah Terlaksana**, sesuai rentang tanggal inklusif.

Cache browser menyertakan versi parser dan ID workbook agar data spreadsheet lama tidak digunakan kembali setelah perpindahan sumber. Refresh membaca CSV terbaru tanpa cache HTTP; batas tunggu 20 detik per permintaan. Kegagalan akses, HTML halaman login, CSV rusak, atau identitas ganda menghasilkan pesan gagal. Riwayat cache dari sumber yang sama dapat ditampilkan ketika koneksi bermasalah.

Parser format workbook sebelumnya dipertahankan sebagai kompatibilitas dan diuji dengan fixture terpisah. Workbook aktif tidak membutuhkan tab Jadwal Gabungan.

## Snapshot audit 18 Oktober 2026

| Ekstrakurikuler | Agenda | Sudah Terlaksana |
| --- | ---: | ---: |
| Renang | 46 | 9 |
| Panahan | 50 | 8 |
| Berkuda | 26 | 1 |
| Taekwondo | 13 | 2 |
| Pramuka | 14 | 1 |
| Total | 149 | 21 |

Rentang 4 Agustus 2026–29 Juni 2027. Seluruh 149 baris sesuai dengan Jadwal Induk untuk tanggal, kegiatan, jam, kelas, dan status; identitas unik. Jika Pramuka nonaktif, tersedia 135 agenda dan 20 sesi terlaksana. Angka ini snapshot, bukan batas di aplikasi.

## Pengujian dan penerapan

- `node --test tests/coach-sessions.test.mjs`: parser format lama dan baru, kecocokan seluruh baris dengan Jadwal Induk, identitas tetap setelah baris diurutkan ulang, kelas, status, rekap, serta penanganan kegagalan.
- `node tests/spreadsheet-sync.e2e.mjs`: snapshot CSV workbook aktif, dashboard/jadwal, filter, refresh, ponsel, dan rekap admin menggunakan akun fixture lokal.
- `LIVE_SHEETS=1 node tests/spreadsheet-sync.e2e.mjs`: CSV Google langsung melalui browser, termasuk akses tanpa login dan CORS. Ekspektasi jumlah mengikuti snapshot audit; perbarui jika data sumber berubah.

Ikuti prosedur build/start fixture pada `docs/supabase-integration.md` untuk port 3033. Pengujian tidak mengubah spreadsheet atau Supabase produksi.

Setelah perubahan source diterapkan, deploy source terbaru ke Vercel. Tidak perlu mengubah konfigurasi Supabase atau menjalankan migration database untuk pergantian spreadsheet ini. Pembaruan isi spreadsheet berikutnya dapat diambil lewat **Refresh data** tanpa deploy ulang selama struktur dan nama tab tetap sama.
