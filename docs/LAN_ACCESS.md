# Akses dari HP pada jaringan lokal

## Penyebab warna kembali merah

Frontend sebelumnya mengirim `VITE_BASE_URL=http://localhost:5500/api` langsung ke browser. Pada HP, localhost menunjuk HP, bukan komputer yang menjalankan backend. Request pengaturan gagal dan SettingsProvider memakai warna bawaan `#800000`; kegagalan ini tidak membuktikan perubahan warna gagal tersimpan ke database.

## Perbaikan development

`frontend/vite.config.js` kini menyediakan proxy development:

- Browser meminta `/api/...` pada origin frontend yang sedang dibuka.
- Vite meneruskan request tersebut ke backend sesuai `VITE_BASE_URL` di konfigurasi lokal, termasuk prefix path dan query string.
- File `/uploads/...` diteruskan ke origin asset/API yang dikonfigurasi.
- URL asset yang diterima browser menggunakan `window.location.origin`, sehingga fallback komponen tidak kembali ke localhost.
- Konfigurasi `.env` dan data database tidak ditulis ulang oleh perbaikan ini.

Contoh: buka `http://IP-KOMPUTER:5174/login` dari HP. Frontend dan backend harus tetap berjalan; Vite harus listen pada jaringan lokal (`host: true`, sudah dikonfigurasi). HP hanya perlu menjangkau port frontend. Jika IP komputer berubah, gunakan IP barunya untuk membuka frontend; URL API mengikuti origin itu.

Jika `VITE_BASE_URL` berupa path relatif, upstream development default adalah `http://127.0.0.1:5000`; `VITE_DEV_PROXY_TARGET` dapat menentukan upstream alternatif. Nilai URL absolut `VITE_BASE_URL` tetap digunakan sebagai tujuan proxy server, bukan alamat localhost yang harus diakses HP.

## Batasan production

Perbaikan ini khusus alur development Vite. Production build tetap menggunakan URL API/asset yang dikonfigurasi saat build. Untuk deployment gunakan domain/IP yang dapat diakses pengguna atau path relatif dengan reverse proxy; jangan membangun aplikasi production yang mengarah ke localhost browser.

## Verifikasi

- Endpoint backend aktual mengembalikan HTTP 200 dan warna tersimpan `#245799`.
- Endpoint yang sama melalui origin frontend LAN mengembalikan HTTP 200.
- Browser pada origin LAN berhasil memuat pengaturan dan menerapkan CSS `--color-maroon: #245799`.
- Tiga tes regresi lulus: config same-origin development, config production tidak ditimpa, dan HTTP proxy Vite aktual meneruskan prefix/query/biner dengan benar.
- Lint 0 error / 6 warning lama; production build berhasil.
- Full suite saat pemeriksaan: 126 dari 127 tes lulus. Satu assertion lama pada `frontend/tests/login.test.js:24` masih mengharapkan nama sekolah pada judul login; perubahan lokal terpisah di `authLoginCover.jsx` sudah menghapus nama itu dari judul. Perubahan lokal tersebut dipertahankan, tidak ditimpa oleh perbaikan jaringan.

Pengujian browser menggunakan alamat LAN pada mesin yang sama dan emulasi viewport HP, bukan verifikasi langsung browser perangkat fisik pengguna. Refresh halaman HP setelah Vite selesai restart agar modul lama tidak tetap dipakai.
