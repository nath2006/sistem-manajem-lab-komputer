# Initialisasi SLA untuk database review

## Penyebab dan batas perbaikan

Clone **schema-only** menyalin tabel tetapi tidak menyalin empat baris referensi `ticket_sla_policies`. Membuka server dengan `node index.js` tidak menjalankan seed. Pembuatan tiket tetap menolak kebijakan yang tidak tersedia atau tidak valid; tidak ada fallback tenggat tersembunyi.

Target berikut adalah kebijakan awal lokal aplikasi, bukan angka yang diwajibkan ISO: P1 15/240, P2 60/480, P3 240/1440, P4 480/4320 menit (respons/resolusi).

## Prosedur yang didukung

Dari direktori `backend`, setelah schema/migrasi review tersedia:

```sh
# Memeriksa schema saja, tanpa penulisan
node scripts/start-review.mjs --database=simlab_review_YYYYMMDDHHmmss --port=5001 --check

# Memulai review: menambahkan kebijakan yang belum ada sebelum API menerima request
node scripts/start-review.mjs --database=simlab_review_YYYYMMDDHHmmss --port=5001

# Memperbaiki SLA pada review yang sudah berjalan, tanpa restart API
node scripts/initialize-review-sla.mjs --database=simlab_review_YYYYMMDDHHmmss

# Membaca ulang kebijakan tanpa penulisan
node scripts/initialize-review-sla.mjs --database=simlab_review_YYYYMMDDHHmmss --check
```

Ganti placeholder dengan nama review aktual berakhiran tepat 14 digit. Inisialisasi menolak nama asli/non-review, nama kosong, dan ketidakcocokan `SELECT DATABASE()`. Hanya empat prioritas yang hilang ditambahkan. Kebijakan kustom yang ada tidak ditimpa, termasuk yang tidak valid; Admin harus memeriksa dan memperbaikinya melalui **Kebijakan SLA**. Tidak ada reset akun, tiket, event, perangkat, maupun data lain. Tidak mengubah `.env`. Jangan gunakan broad Prisma seed untuk perbaikan ini karena seed tersebut mereset password akun existing.

Startup biasa (`node index.js`) dan GET API tidak menulis default secara diam-diam. Pengguna review wajib memakai prosedur startup review di atas. Pemeriksaan schema `--check` tidak menjamin isi kebijakan siap.

UI menampilkan pesan kesiapan berbahasa Indonesia dan menonaktifkan pembuatan tiket bila kebijakan P1–P4 tidak lengkap/tidak valid. Tombol **Muat ulang SLA** mengambil ulang options setelah perbaikan. Admin tetap dapat membuka editor kebijakan. Validasi backend dan snapshot SLA historis tetap menjadi otoritas; perbaikan referensi tidak mengubah tenggat tiket existing.

## Verifikasi

```sh
node --test tests/review-start.test.js tests/review-sla.test.mjs
```

Regresi mencakup clone kosong, preservasi nilai kustom parsial, idempotensi, guard database dan `--check` read-only. Pengujian HTTP terisolasi harus membuat clone baru, memulai melalui `start-review.mjs`, melakukan login/create/readback/actions, dan membandingkan fingerprint database asli sebelum/sesudah. Jangan menulis tiket contoh ke database review yang sedang dipakai pengguna.
