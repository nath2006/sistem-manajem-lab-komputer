# Aset IT Sekolah — FITUR 1

## Batas implementasi

Menu **Aset IT Sekolah** (`/aset-it`) menambah inventaris Pembelajaran dan Operasional. Ini hanya FITUR 1: tidak menambah QR/barcode, halaman verifikasi publik, referensi/login GLPI, perubahan fitur bantuan, atau dashboard Admin baru.

Identitas tetap `perangkat.perangkat_id`. Tidak ada tabel aset duplikat: inspeksi, temuan, perbaikan, tiket dan deep link `/kelola-perangkat` tetap menunjuk perangkat yang sama.

## Data dan izin

- Penggunaan: **Pembelajaran** harus mempunyai laboratorium valid; **Operasional** mempunyai `lab_id = NULL`. Input lab yang bertentangan ditolak, bukan dibuang diam-diam. `lokasi`/ruangan boleh kosong.
- Kategori: Komputer, Laptop, Monitor, **Printer**, **Perangkat Jaringan** (router/switch/AP), Proyektor, Lainnya. Migrasi memberi aset lama kategori **Lainnya**, bukan menebak bahwa semua perangkat adalah komputer; penggunaan lama Pembelajaran.
- `tahun_pengadaan`, `sumber_dana`, `harga_beli` opsional. Null, string kosong dan whitespace menjadi SQL NULL. PUT yang menghilangkan field mempertahankan nilai; explicit null/kosong menghapus nilainya. UI menampilkan `-` untuk tidak diketahui.
- Harga dikirim/diterima sebagai **string desimal**, tidak melalui float. `"0"` valid, disimpan/dibaca `"0.00"`, ditampilkan `Rp 0,00`. Batas DECIMAL(15,2): `9999999999999.99`, non-negatif, maksimal dua angka desimal. Notasi eksponen dan JSON number ditolak.
- Tahun berupa integer/desimal digit integer 1900 sampai tahun server saat ini. Nama 100 karakter, inventaris 50, lokasi/sumber dana 150, spesifikasi 16000. Inventaris unik, kosong menjadi null; duplikat menghasilkan 409.
- Semua role yang login dapat membaca aset, termasuk pengadaan. **Admin** dapat menulis semua aset. **Kepala Lab** hanya dapat menulis Pembelajaran pada lab yang ditugaskan; update memeriksa lab asal dan tujuan. Koordinator Lab, Teknisi dan Guru hanya baca.
- Status kondisi tidak dapat diedit melalui API/form aset. Aset baru menggunakan default Baik; perubahan kondisi tetap melalui pemeriksaan/perbaikan. Foto lama tidak diubah oleh API aset. Upload foto baru bukan bagian dari menu ini.

## API

| Method | Path | Respons berhasil |
|---|---|---|
| GET | `/api/assets` | 200 `{data: [...], message}` |
| GET | `/api/assets/:id` | 200 `{data: {...}, message}` |
| POST | `/api/assets` | 201 `{data: {...}, message}` |
| PUT | `/api/assets/:id` | 200 `{data: {...}, message}` |
| DELETE | `/api/assets/:id` | 200 `{message}` |

Field tulis: `nama_perangkat`, `nomor_inventaris`, `spesifikasi`, `penggunaan`, `kategori`, `lab_id`, `lokasi`, `tahun_pengadaan`, `sumber_dana`, `harga_beli`. POST mewajibkan nama, penggunaan, kategori, serta lab untuk Pembelajaran. PUT boleh parsial. GET juga mengembalikan `perangkat_id`, `status`, `foto_perangkat`, `nama_lab`.

400: field tidak valid/tidak dikenal (termasuk `status`, foto dan identitas actor). 401: token invalid/kedaluwarsa. 403: token tidak ada atau tidak memiliki izin. 404: aset tidak ada. 409: inventaris duplikat, konflik lock, atau masih memiliki keterkaitan. 500: error internal terkontrol tanpa detail DB. 503: `{code:"ASSET_SCHEMA_REQUIRED",message}` bila skema belum siap.

Preview penghapusan memakai `GET /api/deletion/perangkat/:id`. DELETE menggunakan `createDeletionService` yang sama: pemeriksaan ulang dependensi/izin dalam transaksi dan parent-row lock, tidak menghapus otomatis pemeriksaan, temuan, perbaikan maupun referensi tiket. Cleanup foto setelah commit bersifat best effort; kegagalan filesystem tidak mengubah hasil commit.

Kontrak importable: `docs/openapi.json`, tervalidasi OpenAPI 3.0.3. Ringkasan: `docs/API.md`. Tidak ada URL Swagger baru.

## Kompatibilitas legacy

- API perangkat lama dan alias router laporan mempertahankan proyeksi identitas/spesifikasi/status/lab/foto/inventaris, **tanpa field pengadaan**. Create/update sekarang memeriksa izin Kepala Lab terhadap lab asal/tujuan; tidak cukup menyembunyikan tombol frontend.
- API legacy menolak perubahan status manual (409 pada update; create hanya Baik). Status yang sama masih diterima agar multipart lama kompatibel. Form legacy menampilkan status read-only dengan penjelasan.
- Form edit perangkat mempertahankan null lab Operasional; konversi penggunaan dilakukan melalui Aset IT. Filter lab tidak lagi memanggil `toString()` pada null.
- Pemeriksaan, daftar/detail temuan, antrean teknisi dan SQL detail laporan memakai LEFT JOIN lab agar aset Operasional tidak hilang. Aturan Kepala Lab dan lifecycle repair/tiket tetap dipertahankan.
- Upload **foto perangkat legacy** kini mempunyai suffix acak, agar nama/tanggal sama tidak menimpa foto lama lalu terhapus ketika validasi gagal. Upload lab/pengumuman tidak diubah.
- UI memakai shell persisten, dynamic school brand, icon rail desktop, Drawer mobile, Tooltip, tombol aksi 44px biru/amber/merah, native table dengan header dan scroll lokal. Tidak ada transformasi tabel menjadi kartu atau hint geser yang terlihat.

## Migrasi dan menjalankan review

`backend/migrations/20261114_school_assets.sql` adalah **review-only**, tidak dijalankan pada startup. SHOW CREATE TABLE sumber ditinjau sebelum menulis SQL: `lab_id` signed INT, index/FK `fk_perangkat_lab`, ON DELETE RESTRICT / ON UPDATE CASCADE. Migrasi membuatnya nullable tanpa menghapus FK/index, lalu menambah enum, lokasi, tahun SMALLINT, sumber dana, harga DECIMAL(15,2). Guard information_schema/prepared DDL kompatibel MySQL 8; tidak menggunakan sintaks ADD COLUMN IF NOT EXISTS. Migrasi diuji dua kali pada clone.

**Target konfigurasi normal saat verifikasi adalah `simlab_review_20261114181000`, bukan database original `sistem-manajemen-lab-fix`.** Metadata read-only melalui config module menunjukkan skema aset sudah tersedia pada target normal. Tidak diketahui siapa/kapan konfigurasi tersebut diubah; pekerjaan koreksi runner ini tidak mengubah `.env`, kredensial, atau konfigurasi DB. Jangan menganggap backend normal saat ini akan merespons 503. Original dan configured source diperiksa terpisah dengan fingerprint read-only sebelum/sesudah; keduanya tidak berubah selama verifikasi ini.

Dari direktori `backend`, Git Bash:

```bash
TMPDIR='C:/Users/LOQ/AppData/Local/hermes/cache/scratch' node scripts/assets-review.mjs --create-isolated
node scripts/start-review.mjs --database=simlab_review_20261114180235 --port=5002 --check
node scripts/start-review.mjs --database=simlab_review_20261114180235 --port=5002
```

Runner membuat nama baru `^simlab_review_\d{14}$`, menyalin **skema saja**, mengisi data sintetis, mengarahkan **DB_NAME dan DATABASE_URL** pada child process, memeriksa fingerprint skema+data sumber sebelum/sesudah, lalu menghentikan hanya server miliknya. Clone dipertahankan untuk review. Seeder guarded menginisialisasi akun review standar lima role; gunakan prosedur akun lokal di `docs/LOCAL_REVIEW.md`, bukan akun produksi. Tidak ada password/token pada bukti.

Mode `--create-isolated --browser` mempertahankan child server sementara untuk browser terisolasi; session sintetis hanya ada sementara di scratch, tidak dicetak, dan dihapus setelah selesai. Browser harus menulis completion marker yang cocok dengan nama database; timeout menghentikan server. Frontend fixture: `frontend/tests/fixtures/assets-server.mjs` memakai port 5197, cache Vite unik di TMPDIR, JSX runtime aktual dan loader asset Vite, bukan cache server 5174. Matrix memakai adapter sintetis untuk state/layout; mode real memakai komponen halaman aktual terhadap API/MySQL clone, tanpa adapter respons sintetis.

## Koreksi review independen (bukti terbaru terpisah)

- Inventaris pada edit legacy sekarang opsional, termasuk submit multipart foto saja; guard nama/status/lab tetap berlaku. Regresi menjalankan handler submit aktual dan memeriksa FormData, bukan hanya teks sumber.
- Muat ulang halaman aset juga meminta ulang `/lab` untuk Admin/Kepala Lab. Regresi membuktikan endpoint lab dipanggil lagi dan lab hasil pemulihan diteruskan ke form tambah.
- Pemeriksaan skema menolak harga selain DECIMAL(15,2), kolom opsional NOT NULL, dan definisi enum penggunaan/kategori yang berbeda dengan 503 terkontrol. Migrasi tidak memperbaiki kolom aset yang sudah ada secara destruktif; perubahan nullability lab dibatasi pada signed INT yang diharapkan.
- Verifikasi terbaru: backend **115/115**, frontend **162/162**, lint **0 error / 6 warning lama**, production build ke direktori scratch berhasil. RED diamati sebelum perbaikan: dua regresi perilaku FE, delapan kasus metadata, dan guard tipe migrasi.
- Runner existing dijalankan ulang dengan `--create-isolated` dan TMPDIR scratch: clone baru `simlab_review_20261114183534`, **gagal pada precondition unmigrated** (mengharapkan 503, menerima 200 karena clone skema sumber sudah kompatibel). Hanya dua check awal selesai; ini **bukan** independent-review pass atau HTTP suite pass baru. Fingerprint sumber sebelum/sesudah sama, server milik runner dihentikan di finally. Runner tidak diubah untuk menyamarkan kegagalan.
- Bukti HTTP/browser di bawah adalah **bukti sebelumnya**, bukan pengujian browser ulang atas koreksi ini. Unit/component harness menguji handler aktual dengan adapter batas API/hooks; tidak menggantikan real-browser UAT. Konfigurasi startup normal tidak diubah; pernyataan historis tentang sumber unmigrated tidak diverifikasi ulang sebagai kondisi saat ini.

## Runner deterministik — verifikasi terbaru

Root cause kegagalan precondition di atas: clone skema configured source sudah dimigrasikan. Runner sekarang menyiapkan baseline legacy **hanya pada clone kosong yang baru berhasil CREATE DATABASE**, sebelum seed: menghapus enam kolom aset yang dikenal jika ada, mengembalikan lab_id NOT NULL memakai tipe signed INT metadata tervalidasi, tanpa menghapus FK/index. Guard nama allowlist, selected database persis, fresh-create dan berbeda dari source diperiksa sebelum DDL. Metadata tak dikenal ditolak. Regresi migrasi/legacy/guard diamati RED lalu GREEN; tidak ada perubahan source app/UI.

Dua full HTTP run terbaru lulus **27/27** masing-masing: `simlab_review_20261114184037` dan `simlab_review_20261114184054`. Keduanya memverifikasi 503 sebelum migrasi, migrasi dua kali, SQL NULL, akses role, workflow lama, delete guards, dan seed akun review. Fingerprint configured source `simlab_review_20261114181000` dan original `sistem-manajemen-lab-fix` masing-masing unchanged=true; owned server stopped=true. Tidak ada authenticated request ke source/original. Bukti HTTP terbaru disimpan terpisah dari browser historis dalam assets-evidence; browser tidak dijalankan ulang atas koreksi ini. Full suite setelah tambahan tiga test runner: backend **118/118** (115 sebelumnya + 3), frontend **162/162**. Log terbaru dilampirkan ke manifest. Independent re-review berikutnya masih terpisah.

## Bukti dan batas verifikasi (sebelum koreksi review; historis)

Primary browser/API review: **`simlab_review_20261114180235`**, 28 named integration checks lulus, `completed`, `source_unchanged`, `server_stopped`, `verified` semuanya true. Fingerprint sumber sebelum/sesudah sama. Real browser 320px menambah aset dengan pengadaan null, mengedit harga nol, menghapus nilai eksplisit, reload dan membuka detail; runner memverifikasi kembali SQL NULL di clone.

Bukti di `C:/Users/LOQ/AppData/Local/hermes/cache/scratch/assets-evidence/`: matrix JSON (64 kombinasi: 40 role × viewport × brand populated, 24 state empty/loading/error), interaksi, navigasi (lima Drawer role + rail/deep-link), real-browser JSON, HTTP/MySQL JSON, preview desktop biru/mobile hijau/detail mobile nyata, hasil suite/lint/build. Viewport 320/390/768/1440; brand biru/hijau; native display table/header/row/cell, coarse pointer, target 44px, tidak ada document overflow dan tidak ada error JS terverifikasi.

TDD diamati: API aset belum tersedia, validasi opsional/angka/partial-update, form/detail/route belum tersedia, null inspection/temuan/queue, bypass status/cross-lab legacy, SQL laporan inner join, serta collision foto terlebih dahulu gagal; perubahan dibuat setelah kegagalan relevan, kemudian diuji ulang.

Batas yang disengaja:

- Browser real memakai AuthContext fixture dengan session sintetis hasil login HTTP, bukan uji UI halaman login produksi; autentikasi semua role diuji melalui HTTP nyata.
- SQL laporan null-lab diuji pada boundary controller; mismatch schema legacy `laporan.periode` yang sudah ada bukan diperbaiki oleh fitur ini, sehingga bukan klaim UAT laporan end-to-end.
- Enam warning lint lama dan warning harness SSR/import.meta lama dipisahkan dari hasil fitur. Tidak ada perubahan fitur 2–5, release/tag, secrets, commit atau push oleh implementasi ini.
