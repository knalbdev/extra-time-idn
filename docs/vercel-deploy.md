# Deploy source terbaru ke Vercel

Repository lokal ini memakai branch `main` dan remote `origin` ke `https://github.com/knalbdev/extra-time-idn.git`. Langkah berikut dilakukan pemilik repo; tidak ada push atau deployment yang dijalankan agen.

## 1. Pastikan perubahan ada di GitHub

Vercel membangun source dari GitHub, bukan langsung dari folder VS Code. Save All terlebih dahulu.

Cek melalui terminal proyek:

```sh
git status --short
git check-ignore -v .env.local
git ls-files '.env*'
```

`.env.local` harus di-ignore dan tidak muncul pada tracked files. `.env.example` boleh di-commit karena hanya berisi placeholder.

Review perubahan. Untuk memasukkan perubahan portal/UI/Supabase yang sudah dikerjakan pada repo ini:

```sh
git add src supabase docs tests package.json package-lock.json .gitignore .env.example
git diff --cached --stat
git status --short
git commit -m "Connect coach portal to Supabase and refine login UI"
git push origin main
```

Jangan sertakan credential asli; jangan memakai `git add -f .env.local`. Jika push ditolak karena remote lebih baru, jangan force push: selesaikan sinkronisasi branch dahulu. Bila branch main dilindungi, push branch kerja dan merge melalui PR.

Buka repo di GitHub dan pastikan commit terbaru serta file portal sudah muncul. SQL di repo tidak dijalankan otomatis oleh Vercel. Migration runtime 003 dijalankan sekali melalui SQL Editor Supabase jika belum diterapkan.

## 2. Pastikan project Vercel terhubung ke repository yang benar

Buka Dashboard Vercel, pilih project website, lalu Settings > Git. Periksa connected repository `knalbdev/extra-time-idn`. Untuk branch produksi, buka Settings > Environments > Production > Branch Tracking dan pastikan `main`.

Jika belum ada project Vercel, Add New > Project > import repo tersebut. Framework Preset: Next.js; Root Directory: folder berisi package.json (root untuk repo ini). Gunakan build/install default framework. Jangan membuat project kedua jika project yang benar sudah ada.

## 3. Periksa environment SEBELUM deployment produksi

Project > Settings > Environment Variables (atau menu Environment Variables pada sidebar project):

| Name | Value | Environment | Type |
| --- | --- | --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | Project URL Supabase | Production | Config |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Publishable key dari project yang sama | Production | Config |
| SUPABASE_SECRET_KEY | Secret key dari project yang sama | Production | Secret / Sensitive |

Isi value saja, tanpa nama variable, `=`, atau tanda kutip tambahan. `.env.local` tidak otomatis terkirim dari komputer ke Vercel. Preview/Development sebaiknya memakai project Supabase development terpisah.

## 4. Tunggu deployment dari commit terbaru

Jika Git integration aktif, push ke production branch memicu deployment otomatis. Buka Deployments dan pastikan deployment memakai commit SHA/pesan commit yang baru saja kamu push. Tunggu status Ready, lalu Visit.

Redeploy dari deployment lama membangun ulang commit LAMA tersebut; tidak mengambil perubahan yang belum di-push. Untuk source terbaru, pilih deployment/commit terbaru. Jika perlu, gunakan Create Deployment dan branch main atau SHA commit terbaru.

## 5. Jika environment diubah setelah build, redeploy

Setelah Save environment, buka deployment terbaru yang sesuai source yang diinginkan, klik menu tiga titik > Redeploy. Pilih Production bila diminta. Tunggu Ready dan buka domain Production.

Push sudah membuat build baru setelah environment disimpan? Tidak perlu redeploy kedua kali. Redeploy dibutuhkan jika environment diubah setelah build tersebut atau kamu ingin mengulang deployment commit yang sama.

## 6. Cek hasil di domain live

- Buka /coach dan coba ikon tampilkan/sembunyikan password.
- Login memakai username profiles dan password Auth.
- Buat pertemuan uji, simpan absensi/nilai, lalu reload.
- Login admin, cek data pada Reporting ekskul.
- Klik Keluar akun; Batal mempertahankan session, OK menjalankan logout. Jika ada draft, konfirmasi menyebut perubahan belum disimpan.
- Bila build gagal, buka Build Logs. Bila login gagal hanya di live, cek Runtime Logs dan kecocokan environment; jangan membagikan secret/password melalui screenshot log.

Pengaturan Site URL Supabase dapat diarahkan ke domain production untuk alur email/reset password saat fitur tersebut dipakai. Login username/password saat ini menggunakan server action, tidak membutuhkan callback OAuth terpisah.

Sumber resmi:
- https://vercel.com/docs/git
- https://vercel.com/docs/deployments/managing-deployments
- https://vercel.com/docs/environment-variables/managing-environment-variables
