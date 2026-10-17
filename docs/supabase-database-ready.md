# Dari user Auth pertama sampai database portal siap

> Pembaruan: integrasi Auth/database sudah tersedia. Ikuti `docs/supabase-integration.md` dan jalankan migration `202610170003_portal_runtime.sql` untuk mengaktifkannya pada project yang sudah disiapkan. Keterangan mode demo di bawah merupakan konteks versi sebelumnya.
Target: project Supabase baru dengan 8 tabel, 137 siswi, profil akun/username dan penugasan, serta RLS. Aplikasi masih demo/localStorage sampai integrasi server dibuat. Jangan menyalin password atau secret key ke SQL/file yang di-commit.

## 1. Selesaikan pembuatan user Auth pertama

Di Authentication > Users > Add user/Create user, buat satu akun admin memakai email yang kamu kontrol dan password kuat. Gunakan pembuatan akun langsung jika tersedia, bukan undangan bila tidak ingin alur email undangan.

Buka detail user setelah dibuat. Salin User UID (UUID), bukan API key atau password. Pastikan email terkonfirmasi. Jika status masih pending, selesaikan konfirmasi email melalui alur yang tersedia, atau konfirmasi akun dengan Admin Auth API pada tahap provisioning. Jangan mengubah tabel internal auth secara manual. Kamu tidak harus menemukan atau mematikan toggle Confirm Email global untuk memakai akun yang sudah dikonfirmasi.

User Auth belum otomatis menjadi admin portal. Role aplikasi ditetapkan pada langkah 4.

## 2. Buat tabel dan aturan akses

Pada project Supabase yang sama:

1. Buka SQL Editor.
2. Buat New query/New snippet.
3. Buka file `supabase/migrations/202610170001_initial_portal.sql` dari repo ini.
4. Salin seluruh isi file ke query editor, bukan path filenya.
5. Jalankan sebagai role `postgres`/role pemilik default SQL Editor.
6. Tunggu hasil Success. Ini file satu kali untuk project baru.

Jangan membuat tabel-tabel tersebut manual sebelum menjalankan file. File memakai transaksi: bila ada error, jangan lanjut ke seed atau menghapus tabel untuk mengakalinya. Catat errornya dahulu. Jika sudah berhasil, jangan jalankan file pertama lagi.

Tabel yang dibuat:

| Tabel | Isi |
| --- | --- |
| profiles | User UID, username, role, label tampilan, status aktif; tanpa password |
| classes | 10 kelas SMP/SMK |
| extracurriculars | 5 ekskul |
| students | Siswi dan kelas |
| assignments | Penugasan akun per ekskul dan kelas |
| meetings | Coach, kelas, tanggal, semester, materi inti, snapshot deskripsi A–E |
| meeting_records | Absensi, predikat, catatan per siswi/pertemuan |
| documentation | Metadata dokumentasi pendamping; belum fitur upload |

Schema `app_private` berisi helper untuk policies dan trigger. Jangan tambahkan schema ini ke daftar Exposed schemas Data API.

Aturan sudah dibuat: semua tabel memakai RLS, `anon` tidak diberi akses, coach hanya mengisi pertemuan miliknya sesuai penugasan, pendamping tidak dapat membaca nilai/roster, dan hanya admin mengelola role/penugasan. Nilai hanya diisi jika hadir; tidak hadir harus bernilai NULL. Tidak ada row berarti belum dicatat, bukan alpa. Referensi kelas mencegah siswi kelas lain dinilai pada pertemuan tersebut.

## 3. Masukkan 137 siswi

Buat query baru. Salin seluruh isi `supabase/migrations/202610170002_seed_students.sql` dan Run.

Expected: 137 siswi, 79 SMP dan 58 SMK. Nama dan ID mengikuti roster di proyek. Seed tidak membuat nilai atau absensi palsu. Jika dijalankan ulang, ID yang sudah ada tidak ditimpa.

Cek melalui Table Editor > schema public > students. SQL Editor/Table Editor dengan akses pemilik dapat melihat seluruh data karena akses tersebut melewati RLS; ini bukan bukti coach boleh melihat seluruh roster.

## 4. Hubungkan akun pertama menjadi admin portal

Buka file `supabase/setup/01_create_profile.sql`, salin isinya ke query BARU. Pada query tersebut, ganti:

```sql
target_id uuid := 'GANTI_DENGAN_USER_UID_DARI_AUTHENTICATION_USERS';
desired_username text := 'admin';
desired_role text := 'admin';
desired_label text := 'Admin';
```

Ganti hanya placeholder UID dengan UUID akun dari langkah 1. Pertahankan tanda kutip tunggal. Contoh bentuk UUID: `00000000-0000-0000-0000-000000000001` (contoh format, bukan UID akunmu).

Run. Hasil akhir harus menampilkan profil dengan username `admin`, role `admin`, dan is_active `true`. Admin tidak membutuhkan row assignments untuk mengakses seluruh data.

Template sengaja memakai INSERT biasa, agar pengulangan tidak diam-diam mengganti role akun yang sudah ada. Jika mendapat duplicate key, cek profiles sebelum melakukan perubahan lain. Jangan membuat profile admin bagi user yang tidak kamu kendalikan.

## 5. Buat akun coach

Ulangi Authentication > Users > Add/Create user untuk setiap akun yang dibutuhkan, misalnya lima akun untuk Renang, Panahan, Berkuda, Taekwondo, dan Pramuka. Email identitas Auth harus unik dan password per akun sebaiknya berbeda. Label coach tetap ekskul, tanpa nama pribadi.

Setelah setiap user dibuat dan terkonfirmasi, salin lagi template `01_create_profile.sql` ke query baru. Contoh untuk Renang:

```sql
target_id uuid := 'UID_AKUN_COACH_RENANG';
desired_username text := 'coach.renang';
desired_role text := 'coach';
desired_label text := 'Coach Renang';
```

Run satu per satu dengan UID yang benar. Untuk akun berikutnya gunakan username seperti `coach.panahan`, `coach.berkuda`, `coach.taekwondo`, `coach.pramuka` dan label yang sesuai.

Usernames harus unik, huruf kecil, mulai dengan huruf, panjang 3–64 karakter; berikutnya boleh huruf, angka, titik, underscore atau tanda minus. Jangan memasukkan password pada profiles. Role ditetapkan pada profiles yang dilindungi RLS, bukan user_metadata.

Username di database BELUM otomatis dapat digunakan di form demo. Endpoint login berikutnya harus memetakan username ke auth.users melalui proses server tepercaya dan memverifikasi password dengan Supabase Auth. Jangan membuat tabel email/password sendiri atau endpoint pencarian email publik.

## 6. Tetapkan penugasan coach

Salin file `supabase/setup/02_assign_coach.sql` ke query baru. Ganti:

```sql
target_id uuid := 'UID_AKUN_COACH_RENANG';
target_eskul text := 'renang';
```

Default contoh memberikan akses Renang ke semua 10 kelas. Untuk membatasi hanya SMP, aktifkan baris `where c.level = 'SMP'`. Untuk kelas tertentu, gunakan baris `where c.id in ('7A', '7B')`. Pilih satu filter, bukan keduanya sekaligus.

Run. Ulangi sesuai coach/ekskul: `renang`, `panahan`, `berkuda`, `taekwondo`, `pramuka`. Daftar hasil memperlihatkan username, ekskul, dan kelas penugasan. Tanpa assignments, coach tidak dapat membaca roster atau membuat pertemuan. Penugasan merupakan tambahan, bukan penghapusan penugasan lama.

Pendamping belum wajib dibuat karena portalnya masih pengembangan. Jika nanti diperlukan, buat Auth user, profile role `pendamping` dengan nama aslinya sebagai display_name, lalu siapkan penugasan terpisah. Template penugasan saat ini secara eksplisit hanya menerima role coach.

## 7. Verifikasi seluruh fondasi

Salin `supabase/setup/03_verify_setup.sql` ke query baru dan Run. Expected:

- classes: 10; extracurriculars: 5; students: 137.
- Kelas 7A/7B/8A/8B/9A/9B: 13/14/12/13/13/14.
- Kelas 10 RPL/10 DKV/11 RPL/11 DKV: 13/14/15/16.
- Delapan tabel memiliki rowsecurity = true.
- Profil admin/coach aktif muncul dengan username dan role yang benar.
- Coach yang ditugaskan semua kelas memiliki 10 assignments per ekskul.
- Query privilege `anon` mengembalikan 0 rows.

Table Editor mungkin tetap menampilkan status RLS aktif; jangan mematikannya untuk mengatasi hasil query kosong dari aplikasi. Periksa profil, login dan penugasan terlebih dahulu.

## 8. Storage pendamping — opsional untuk tahap ini

Jika ingin menyiapkan tempat foto lebih dahulu: Storage > New bucket > `dokumentasi-eskul`, dengan Public bucket OFF. Belum ada policies Storage pada migration ini sehingga unggahan dari aplikasi belum diizinkan. Tabel documentation menyiapkan metadata saja. Jangan membuat policy public untuk membuka unggahan sementara.

## 9. Pastikan environment siap, tanpa membagikannya

`.env.local` cukup memuat Project URL, publishable key dan secret key dengan nama yang sudah ada di `.env.example`. Nilai harus dari project yang sama. `.env.local` sudah di-ignore; jangan masukkan email/password akun ke file SQL atau commit. Tidak perlu DATABASE_URL untuk client API yang direncanakan.

## 10. Batas kesiapan saat ini

Setelah langkah di atas, database/schema, roster, profil dan penugasan siap untuk integrasi. Yang belum otomatis aktif: login website sebenarnya, pemetaan username, session cookie server, penggantian localStorage, impor nilai lama, endpoint admin dan upload dokumentasi.

Skema memakai satu predikat A–E per materi inti per pertemuan, sesuai alur terbaru. Data demo lama yang memiliki banyak kriteria belum diimpor dan membutuhkan pemetaan saat migrasi; jangan menimpanya.

Migration dan seed sudah diuji secara lokal memakai PGlite (PostgreSQL-compatible) dengan stub Auth untuk anon/admin/coach/pendamping dan akun nonaktif. Pengujian itu tidak terhubung ke project Supabase-mu, tidak memverifikasi JWT/session jaringan, dan tidak menggantikan pengujian integrasi di project development.

## Sumber resmi

- https://supabase.com/docs/guides/auth/managing-user-data
- https://supabase.com/docs/reference/javascript/auth-admin-createuser
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/database/functions
