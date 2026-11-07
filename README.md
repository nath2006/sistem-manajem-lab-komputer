# Sistem Informasi Manajemen Lab Komputer

Aplikasi Express/React untuk laboratorium, perangkat, jadwal, pemeriksaan/perbaikan, dan ticketing layanan.

## Versi dan dokumentasi

- [Riwayat v1, pembagian branch, dan pengecualian file privat](docs/VERSION_HISTORY.md)
- [Dokumentasi API](docs/API.md) dan [OpenAPI](docs/openapi.json)
- [Onboarding tooltip Driver.js](docs/ONBOARDING_TOUR.md)
- [Panduan review UI/UX](docs/UI_UX_REVIEW.md)
- [Skeleton dan navigasi persisten](docs/LOADING_NAVIGATION.md)
- [Workflow ticketing pendukung ISO/IEC 20000-1](docs/TICKETING_ISO20000.md)

Konfigurasi lokal menggunakan `backend/.env.example` sebagai contoh. `.env`, upload pengguna, dan dump SQL berisi data tidak dipublikasikan pada tree versi baru. Jangan menggunakan akun/seeder review pada database produksi.

## Catatan awal yang dipertahankan

Daftar berikut adalah backlog historis, bukan daftar bug yang seluruhnya masih terbuka pada versi terbaru. Lihat dokumentasi dan hasil pengujian tiap fitur untuk implementasi saat ini.

# Tanggal cek : 13/10/2026

# Bug
## Jadwal Lab 
- Kalo ada guru yang mengajukan jadwal di jam yang menjaadi akhir dari jam lain, maka jam yang guru baru ajukan ini akan maju 1 jam. (misal ada jadwal A (07.00-09.00) lalu ada jadwal B (09.00 - 10.00) jadwal B akan muncul jadi jam 10.00 - 11.00)
- Kalo ada guru yang mengajukan jadwal di antara jam jam yang sudah di take,
make jadwal yg di depannya akan hilang.
(misal ada jadwal di jam 07.00-11.00 dan di jam 13.00-16.00. Lalu ada guru
mau mengajukan di jam 11.00-12.00 dia akan hilang jadwal di jam 13.00 - 16.00)
-Tampilan di halaman login ada tombol buat show password

# Perubahan fitur
- Untuk jadwal lab saya mau di buat sesuai jam pelajaran (bisa manual, 45menit, 30menit dll dan bisa di config oleh admin sistem) (poin 1 - perubahan fitur)
- Untuk logo nama sekolah dan color Based UI bisa di custome sendiri takut takut ada rebranding sklh. (poin 2 - perubahan fitur)

# Penambahan Fitur
- Untuk menu pengecekan perangkat, saya mau ketika kepala lab memeriksa perangkat dan menemukan masalah (membuat status pemeriksaan menjadi bermasalah ini akan otomatis masuk ke dashboard teknisi), disana ketika sudah di benerin sama teknisi statusnya harus ikut berubah juga, dan juga ada juga history pemeriksaan sama teknsii dan tampilannya juga muncul baik di menu teknisi (untuk history perbaikan dan troubleshoot baru) dan untuk kepala lab datanya jadi history. Untuk UInya pakai milestone.
- Menambahakn halaman dan UI untuk menu (poin 2 - perubahan fitur)
- Ada log untuk semua aktivitas user