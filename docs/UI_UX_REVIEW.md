# Review UI dan UX: tema, logo, onboarding, dan penghapusan

## Perubahan

- Modal perangkat memakai tema sekolah melalui token `maroon`/`--color-maroon`. Konfirmasi hapus memakai warna utama, termasuk hover satu tone; warna status/error semantik tetap dipertahankan.
- Tujuh layar penghapusan memakai `useDeletionDialog`: pengguna, laboratorium, perangkat, pemeriksaan, pengecekan, perbaikan, dan pengumuman. Dialog meminta preview read-only terlebih dahulu. Ketika ada keterkaitan, dialog menampilkan jumlah/alasan dan tautan peninjauan, tanpa tombol konfirmasi hapus.
- Tabel kelola yang memiliki pemetaan relasi memfilter foreign key secara eksak, menampilkan konteks, dan menyediakan **Tampilkan semua**. Tautan `/ticketing` dan `/jadwal-lab` merupakan peninjauan umum, bukan janji bahwa kedua layar itu memfilter seluruh relasi.
- Backend mengulang pemeriksaan keterkaitan dalam transaksi pada koneksi yang sama, dengan parent row lock dan locking reads. CASCADE/SET NULL tidak digunakan untuk menyederhanakan penghapusan. Penulis ticket memvalidasi ulang dan mengunci parent user/perangkat pada transaksi penulisan; histori maintenance/ticket tidak dihapus.
- Pengaturan menerima URL lama atau satu file `logo` lewat multipart pada `PUT /api/settings`. PNG/JPG/GIF/WebP dibatasi 2 MiB; tipe, ekstensi, nama file, dan signature byte diperiksa. Ini bukan pemindaian antivirus atau pembuktian decode lengkap seluruh gambar. SVG/data URL tidak didukung.
- File dipilih dan dipratinjau sebelum disimpan; membatalkan pilihan tidak mengunggah file. Penyimpanan gagal membersihkan hanya file baru. File logo lama yang berhasil disimpan tidak dihapus otomatis, untuk menghindari menghapus file yang masih direferensikan.
- URL upload disimpan kanonis sebagai `/uploads/branding/<nama-acak>.ext`. Context menyediakan `logoSrc` terpisah untuk dashboard, login, dan onboarding; URL kanonis tidak ditulis ulang menjadi URL tampilan.
- Onboarding tersedia untuk Admin, Guru, Kepala Lab, Koordinator Lab, dan Teknisi. Ada Berikutnya/Kembali/Lewati/Selesai dan replay **Panduan awal** melalui menu profil. Penyelesaian disimpan per ID akun + role + versi di browser, bukan sinkronisasi lintas perangkat. Shell dashboard tetap persisten.

## Perilaku penghapusan yang perlu dipahami

1. Klik Hapus untuk melihat dampak, bukan langsung menjalankan DELETE.
2. Jika perangkat masih berada di lab yang ingin dihapus, gunakan tautan untuk memindahkan perangkat melalui Edit Perangkat.
3. Jika akun masih menjadi penanggung jawab lab, alihkan penanggung jawab melalui edit terlebih dahulu.
4. Histori pemeriksaan/temuan/perbaikan dan ticket tidak dihapus otomatis. Penghapusan yang akan merusak relasi ditolak dengan HTTP 409.
5. Pengalihan penulis pengumuman belum tersedia pada formulir edit. Dialog menyebutkan keterbatasan tersebut, bukan menyuruh pengguna menghapus pengumuman/histori.
6. Preview bukan otorisasi final: jika data berubah sebelum konfirmasi, backend memeriksa ulang dan dialog menampilkan keterkaitan terbaru.

## Verifikasi

| Pemeriksaan | Hasil |
|---|---|
| Frontend `npm test` | 121 lulus, termasuk 4 tes onboarding yang kini masuk glob utama |
| Backend `npm test` | 93 lulus |
| Frontend lint | 0 error, 6 warning yang sudah ada |
| Frontend production build | Berhasil |
| HTTP/MySQL pada database baru | 30 pemeriksaan lulus |
| Browser fixture komponen aktual | 58 pemeriksaan unik lulus |
| OpenAPI | Valid; 70 operasi, 67 path |
| Fingerprint database sumber sebelum/sesudah integrasi | Sama |
| Server pengujian | Dihentikan; port fixture 5193 dan 5197 diverifikasi tertutup |

Browser memeriksa onboarding lima role, next/back/skip/done/replay, fokus/Tab/Escape, empat viewport (320x568, 390x844, 768x1024, 1366x900), preview/cancel/save file, state penghapusan, dan computed normal/hover tema biru/hijau. Transport API browser sengaja dimock; ini bukan UAT browser login penuh. HTTP/MySQL terpisah menguji login nyata, upload/persistensi/readback raster, role/ownership, relasi/cascade yang dilindungi dan penghapusan aman. Race HTTP bergantung scheduler; bukan bukti exhaustif semua interleaving/deadlock.

Bukti terstruktur: `docs/ux-http-review-result.json` dan `docs/ux-browser-review-result.json`. API dijelaskan pada `docs/API.md` dan `docs/openapi.json`; tidak ada Swagger UI baru.

## Menjalankan review tanpa mengganti database asal

Database terbaru: **`simlab_review_20261106113837`**. Schema-only clone, migrasi additive, fixture sintetis, dan seeder review sudah dijalankan di sana. Ada 10 akun review yang mencakup lima role; kredensial mengikuti seeder review yang sudah ada, tidak dicetak pada laporan ini. Logo review dikembalikan ke bawaan sebelum file tes dibersihkan.

Dari root repository, terminal Git Bash pertama:

```bash
cd backend
node scripts/start-review.mjs --database=simlab_review_20261106113837 --port=5001 --check
node scripts/start-review.mjs --database=simlab_review_20261106113837 --port=5001
```

Pada terminal Git Bash lain, dari root repository:

```bash
cd frontend
VITE_BASE_URL=http://localhost:5001/api npm run dev
```

`--check` pada database ini telah dijalankan dan berhasil. Runner integrasi telah menjalankan backend aktual dengan kedua koneksi mysql2/Prisma diarahkan ke database review, lalu menghentikannya. Startup normal tanpa wrapper tetap mengikuti konfigurasi yang sebelumnya ada; file `.env` tidak diubah oleh pekerjaan ini. Hentikan server dengan Ctrl+C setelah review.

Mengulang seluruh integrasi akan membuat database review baru lagi, bukan memakai database asal:

```bash
cd backend
node scripts/ux-review.mjs --create-isolated
```

Tidak ada commit, push, deploy, migrasi, atau penulisan pengujian ke database sumber.
