# Penarikan jadwal setelah revisi spreadsheet 18 Oktober 2026

Sumber tetap workbook Google Sheets `1-GI5Qt_pDLMV3Gty8Cc2X9u12VY_q9upN_6hr0V-VP8`. Tidak diperlukan migration database atau environment variable baru.

## Tab sumber

- **Renang, Panahan, Berkuda, Taekwondo, Pramuka**: tanggal, kelas, status pelaksanaan aktual, pendamping, catatan, dokumentasi, serta identitas baris/pertemuan.
- **Jadwal Gabungan**: waktu tiap agenda revisi dan penggabungan perjalanan Berkuda yang mencakup dua angkatan. Data dicocokkan berdasarkan kegiatan, tanggal, kelas, dan jam mulai untuk Panahan.
- Tab Ringkasan, Rekap per Kelas, Panduan Revisi, dan Audit & Validasi dibaca saat audit, tetapi tidak digunakan sebagai bukti bahwa kegiatan telah terlaksana.

Header tidak harus berada pada baris pertama. Parser mencari baris kolom setelah judul dan keterangan, lalu membaca nama kolom. Bentuk CSV lama dengan header langsung di baris pertama tetap didukung.

## Perilaku penting

- Panahan memakai **Status Sesi 1/2**, bukan **Status Jadwal**. Pada snapshot audit, beberapa rencana masa depan tertulis `Selesai` di Status Jadwal, sedangkan status sesi masih kosong; web mempertahankan status aktual yang kosong.
- Empat sesi pengganti Panahan 11.30–12.30 tetap agenda tersendiri, tanpa identitas yang bertabrakan dengan sesi reguler pada tanggal yang sama.
- Taekwondo historis tetap 09.00–11.00; rencana revisi memakai 11.30–13.30 sesuai kalender gabungan.
- `Seluruh kelas SMP` hanya mencakup enam kelas SMP; `Seluruh kelas SMK` hanya empat kelas SMK. Pramuka seluruh jenjang mencakup sepuluh kelas.
- Lima perjalanan gabungan Berkuda dihitung sebagai satu agenda per perjalanan, dengan seluruh kelas peserta. Pendamping, catatan, dan dokumentasi dari kedua baris tetap disertakan. Jika status aktual kedua angkatan berbeda, baris dipertahankan terpisah agar status tidak tertimpa.
- Riwayat Ahad yang Libur/Ditiadakan dipertahankan. Revisi tanggal/hari tidak menghapus sejarah pelaksanaan.
- Kegiatan nonaktif tetap mengikuti pengaturan admin. Tab eskul nonaktif tidak dimuat; data kegiatan tersebut dari kalender gabungan tidak ditampilkan.
- Cache browser memakai versi baru (`extratime:schedule-cache:v2`) agar cache dari parser lama tidak menampilkan waktu/kelas/identitas jadwal yang keliru. Refresh mengambil CSV terbaru tanpa cache HTTP, dengan batas tunggu 20 detik per permintaan.
- Kegagalan koneksi, respons HTML/login, CSV rusak, identitas ganda, atau ketidaksesuaian antar-tab ditampilkan sebagai kegagalan pemuatan; hasil parsial tidak diklaim sebagai jadwal lengkap.

Saat mengubah tanggal, kelas, atau waktu, pastikan tab eskul dan **Jadwal Gabungan** tetap sejalan. Perubahan status pelaksanaan dilakukan pada tab eskul terkait. Parser tidak memakai ringkasan status dari kalender gabungan untuk menimpa status aktual.

## Hasil audit langsung

| Ekstrakurikuler | Agenda | Sudah Terlaksana |
| --- | ---: | ---: |
| Renang | 46 | 9 |
| Panahan | 50 | 8 |
| Berkuda | 31 | 1 |
| Taekwondo | 13 | 2 |
| Pramuka | 21 | 1 |
| Total | 161 | 21 |

Rentang: 4 Agustus 2026–29 Juni 2027. Semua identitas agenda unik. Jika Pramuka nonaktif, hasilnya 140 agenda dan 20 sesi terlaksana. Angka ini merupakan snapshot saat audit, bukan batas jumlah agenda yang dikunci pada aplikasi.

## Verifikasi

`node --test tests/coach-sessions.test.mjs` menguji parser menggunakan snapshot CSV yang judul/header, tanggal, kelas, waktu, status, dan catatan jadwalnya mengikuti sumber; nama pendamping dan isi dokumentasi pada fixture disamarkan. Cakupan termasuk sesi pengganti, perjalanan gabungan, batas jenjang, riwayat, status kosong, serta respons gagal.

`node tests/spreadsheet-sync.e2e.mjs` memakai snapshot tersebut dan fixture akun lokal. `LIVE_SHEETS=1 node tests/spreadsheet-sync.e2e.mjs` memeriksa CSV Google yang sebenarnya melalui browser, termasuk CORS publik tanpa login Google, filter bulan/kelas, refresh, tampilan ponsel, dan rekap admin. Angka ekspektasi tes mengikuti snapshot audit; perlu diperbarui jika isi workbook kemudian berubah.

Ikuti prosedur fixture dalam `docs/supabase-integration.md` untuk build/start pengujian pada port 3033. Tes tidak mengubah spreadsheet atau data Supabase produksi.
