# Catatan review lokal

## Batas pekerjaan

Implementasi mengikuti daftar README dan struktur Express controller/router/service serta React Components/features/Layouts yang sudah ada. Tidak ada commit/push/deploy. Pengujian lokal selesai; server yang dijalankan oleh pengujian dihentikan.

## Database terisolasi

- Database pengujian: `simlab_review_20261102112805`.
- Hanya struktur tabel database asal yang disalin, bukan data/akun asli. Data uji sintetis dibuat terpisah.
- Migrasi `backend/migrations/20261102_school_settings_activity_logs.sql` diterapkan hanya di database pengujian.
- Koneksi mysql2 **dan** Prisma pada proses uji diarahkan ke database baru melalui environment proses, tanpa mengedit `.env`.
- Schema/checksum database asal dibandingkan sebelum/sesudah pengujian; hasil `source_unchanged: true`.
- Satu database percobaan awal, `simlab_review_20261102112720`, juga tersisa dari percobaan setup yang gagal sebelum server dijalankan. Tidak dihapus otomatis. Database utama untuk review adalah nama pertama di atas.
- Akun fixture menggunakan password acak per run, tidak dicetak atau disimpan dalam dokumentasi. Ini bukan akun untuk pemakaian produksi.

## Perubahan untuk diperiksa

1. **Jadwal:** batas jam akhir eksklusif, jadwal bersebelahan tidak bergeser, sisipan tidak menghilangkan jadwal selanjutnya, konfigurasi durasi dan jam operasional.
2. **Login:** tombol tampil/sembunyikan password yang tidak men-submit form.
3. **Pengaturan admin:** menu `/pengaturan`, nama sekolah, URL logo, warna utama, dan durasi pelajaran; identitas ditampilkan di login/header/footer. Durasi kustom dimasukkan sebagai menit.
4. **Perawatan:** pemeriksaan bermasalah membuat tiket teknisi dalam transaksi; upaya perbaikan gagal/berhasil tetap tersimpan; hasil perbaikan menyinkronkan tiket, pemeriksaan, dan perangkat. Riwayat tampil melalui milestone. Jika masih ada tiket aktif lain, perangkat tidak dianggap baik.
5. **Audit:** menu `/log-aktivitas`; aktivitas API pengguna yang teridentifikasi dan kejadian autentikasi disimpan tanpa body, password, token atau query string. Penyimpanan bersifat best-effort dan tidak menggagalkan respons utama.
6. **API:** `docs/API.md` dan `docs/openapi.json`.

## Verifikasi

- Backend `npm test`: 25 tes lulus, termasuk transaksi, rollback, otorisasi dan integrasi SQL in-memory.
- Frontend `npm test`: 10 tes lulus, termasuk regresi jadwal, render login, halaman pengaturan/log, serta milestone dan integrasi komponen teknisi/kepala lab. Script mencakup berkas `.test.js` dan `.test.mjs`.
- Frontend `npm run build`: berhasil; Vite memberikan peringatan ukuran bundle >500 kB.
- Integrasi HTTP + MySQL terisolasi: 14 pemeriksaan lulus. Bukti mesin: `docs/local-review-result.json`.
- Pengujian di atas bukan UAT visual browser untuk seluruh halaman.
- `npm run lint` seluruh frontend belum lulus. Terdapat error unused variables/hooks/config yang masih perlu ditinjau; tidak dilakukan refactor massal di luar lingkup fitur.
- Node memberikan ExperimentalWarning untuk `node:sqlite` yang dipakai tes in-memory; pengujian MySQL terpisah juga telah dijalankan.

## Menjalankan ulang pengujian

Dari folder `backend`:

```bash
npm test
node scripts/local-review.mjs --create-isolated
```

Perintah kedua membuat database baru lagi dengan prefix `simlab_review_` dan menulis hasil terbaru ke `docs/local-review-result.json`. Ini membutuhkan izin CREATE DATABASE di MySQL lokal. Database sumber hanya dibaca. Script menghentikan proses API sesudah pengujian, termasuk pada kegagalan. Jangan menjalankannya untuk memulai aplikasi produksi.

Dari folder `frontend`:

```bash
npm test
npm run build
```

## Hal yang sengaja belum diperluas

- Mekanisme refresh-token lama masih tidak konsisten antara cookie dan client; lihat catatan di dokumentasi API.
- Router laporan lama berbagi instance router perangkat sehingga beberapa route tertutup handler lebih awal; lihat dokumentasi API.
- Logo diatur menggunakan URL HTTP(S), bukan fitur upload logo baru.
- Log aktivitas mencatat request API, bukan klik UI atau aktivitas di luar aplikasi. Penulisan audit dibatasi dan best-effort; bukan audit compliance yang menjamin setiap event tersimpan.

Sesuai arahan, pekerjaan dihentikan pada tahap pengujian lokal untuk review sebelum perubahan lanjutan atau migrasi database lama.
