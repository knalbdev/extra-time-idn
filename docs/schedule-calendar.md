# Kalender jadwal

Menu **Jadwal** membuka kalender bulanan. Filter kelas, pilihan ekstrakurikuler, dan tombol Kalender/Daftar berada dalam container jadwal. Kalender tidak memakai dropdown bulan; perpindahan bulan menggunakan panah dan tombol Hari ini. Tampilan **Daftar** tetap menyediakan filter bulan, termasuk pilihan Semua Bulan. Filter kelas dan ekstrakurikuler berlaku pada kedua tampilan.

- Pekan dimulai Senin. Tanggal ditempatkan berdasarkan perhitungan kalender, bukan teks nama hari di spreadsheet.
- **Hari ini** mengikuti Asia/Jakarta (WIB), memakai waktu perangkat. Penanda diperiksa setiap 30 detik dan saat tab kembali aktif. Perubahan tanggal tidak memerlukan request spreadsheet atau Supabase tambahan.
- Tombol panah berpindah bulan; tombol **Hari ini** kembali ke bulan dan tanggal saat ini. Bulan tanpa agenda tetap ditampilkan sebagai bulan kosong.
- Klik tanggal membuka pop-up ringkas di dekat sel tanggal, diurutkan berdasarkan jam mulai. Pop-up menampilkan seluruh kelas peserta, jam lengkap, status aktual, pendamping, dan catatan. Rincian tidak lagi menambah bagian di bawah kalender.
- Sel kalender menampilkan hingga tiga pratinjau beserta kelas peserta, serta jumlah kegiatan tambahan. Pada ponsel, label kelas diringkas untuk kelompok SMP/SMK; daftar kelas lengkap tersedia di pop-up. Semua kegiatan tanggal tersebut tetap ditampilkan dalam pop-up, termasuk tanggal dengan empat sesi atau lebih.
- Pop-up menyesuaikan posisi saat layar berubah dan dapat digulir di dalamnya. Tutup lewat tombol ×, klik di luar, atau Escape. Tidak ada penguncian scroll halaman. Tombol tutup dan Escape mengembalikan fokus ke tanggal pemicu.
- Identitas Taekwondo menggunakan indigo, termasuk ikon, label, dan warna rekap. Warna status tetap mengikuti arti pelaksanaan, terpisah dari warna eskul.
- Warna status mengikuti status spreadsheet. Kalender tidak mengubah sesi menjadi terlaksana berdasarkan waktu. Jadwal baru dari spreadsheet tetap dimuat melalui **Perbarui data**.
- Ringkasan status menjadi bagian ringkas di bawah kalender/daftar, dengan jumlah dan persentase menurut periode serta filter yang sedang dipakai. Tidak ada kartu progres terpisah.
- Kartu **Jadwal terdekat** tersedia di dashboard, di samping agenda pekan ini pada layar lebar. Sumbernya seluruh jadwal aktif dari hari ini dan seterusnya, tanpa dipengaruhi filter halaman Jadwal. Sesi selesai, libur, atau ditiadakan dilewati; beberapa sesi pada tanggal yang sama diurutkan berdasarkan jam mulai.

Tidak memerlukan library kalender, layanan kalender eksternal, migration Supabase, atau environment variable tambahan.

Verifikasi tanggal dan aritmetika kalender: `node --test tests/calendar.test.mjs`. Pengujian browser: `node tests/schedule-calendar.e2e.mjs` dengan fixture lokal sesuai `docs/supabase-integration.md`. Cakupannya meliputi tanggal/hari yang benar, beberapa sesi dalam satu hari, filter, navigasi, pergantian tanggal WIB di browser zona waktu Amerika, ponsel, keyboard, tampilan daftar, dan refresh.
