# Refactor FE/BE dan UX mobile

Verifikasi akhir: 4 November 2026, waktu lokal UTC+07:00. Hasil terstruktur: `docs/refactor-review-result.json`.

## Batas perubahan

Refactor terarah pada mekanisme bersama dan fitur utama, bukan rewrite seluruh file. Struktur Express/React, desain dan tema sekolah yang sudah ada dipertahankan. Endpoint, envelope API, hak akses, version payload tiket, perhitungan jadwal dan semantik transaksi maintenance tidak sengaja diubah. Refactor ini tidak menambahkan migrasi database.

Database asal tidak ditulis oleh pekerjaan ini. Pengujian HTTP/MySQL menggunakan database review baru. File lingkungan dan perubahan lokal yang sudah ada tidak direset; `.env` tidak ditulis pada tahap refactor. Tidak ada commit, push atau deployment.

## Perubahan utama

### Shared UI dan mobile

- `frontend/src/Layouts/Dashboard.jsx`: drawer tertutup awal di bawah 1024px, backdrop/dismiss, fokus dan scroll lock; desktop tetap memakai sidebar. Konten utama dan identitas panjang dibatasi agar tidak mendorong lebar halaman.
- `frontend/src/Layouts/Table.jsx`: data langsung tampil tanpa delay buatan, pencarian berlabel, pagination bounded, tabel berubah menjadi kartu berlabel di bawah 640px. Pagination tidak membangun array sebesar jumlah seluruh halaman.
- `frontend/src/Components/DetailModal/ModalContainer.jsx`: dialog berjudul aksesibel, ukuran berdasarkan `100dvh`, area isi dapat digulir, fokus masuk/trap/restore, Escape, dan pencegahan dismiss ketika menyimpan.
- `frontend/src/Components/FormContainer/index.jsx`: jarak dan tombol responsif, aksi bertumpuk pada layar kecil, `aria-busy` dan pesan error.
- `frontend/src/Components/DashboardTablePanel.jsx`: panel tabel bersama dengan tinggi alami pada mobile dan scroll lokal terbatas mulai breakpoint `md`.
- `frontend/src/index.css`: target tombol minimal 44px dan ukuran input 16px pada perangkat coarse pointer; aturan mobile-card tetap lokal pada tabel terkait. Jadwal tetap mempertahankan perbandingan kolom hari dan scroll horizontalnya.
- Dashboard tiap role, aksi user/lab dan kontrol troubleshooting mempertahankan tema dinamis; tombol ikon mendapat label aksesibel. Label sel ticketing tidak ditampilkan ganda pada desktop.

Helper lifecycle baru ada di `frontend/src/utils/scrollLock.js`, `useDialog.js`, `useMediaQuery.js`, `tableData.js` dan `useObjectUrl.js`. Scroll lock memakai ownership/refcount sehingga satu dialog tidak membuka scroll yang masih dimiliki overlay lain. Preview object URL lama dilepas pada pergantian/cleanup.

### FE: pemisahan tanggung jawab dan pemuatan

- `frontend/src/App.jsx` memuat fitur melalui lazy route; `RouteBoundary.jsx` menyediakan status pemuatan dan pemulihan error tanpa mengubah URL/role wrapper.
- Empat fitur cetak memakai `frontend/src/utils/loadPdfTools.js`: jsPDF/AutoTable baru dimuat saat cetak, dengan busy/failure/retry handling. Tes juga menjalankan library PDF nyata, bukan hanya stub import.
- Jadwal memakai settings provider bersama, tetap fail-closed jika konfigurasi belum berhasil dimuat. Satu hasil `buildScheduleGrid()` digunakan untuk slots dan grid.
- Ticketing dipisah menjadi form create/action/classification/SLA, field/display helpers dan `TicketList.jsx`. Page tetap mengatur fetch, konflik versi, detail dan refresh. Pagination tiket tetap server-side.
- Refresh opsi tidak lagi menimpa draft SLA pada setiap mutasi list; pencarian tiket memakai debounce.
- Request dashboard Admin yang independen dimulai bersama. Fallback saat salah satu gagal dipertahankan.
- Debug log token/decoded identity/full auth state di jalur yang diuji dihapus; tidak ada klaim bahwa semua logging seluruh aplikasi telah diaudit.
- Unused binding/import yang aman dibersihkan. Konfigurasi lint mengenali argumen komponen JSX seperti `Icon`, dengan regresi yang tetap menolak argumen lowercase yang benar-benar tidak digunakan. Alur statistik legacy yang belum ditampilkan tidak dihapus hanya demi lint.

### BE: service dan transaksi

- `backend/services/maintenanceStatusService.js` menyatukan sinkronisasi finding → inspection → device memakai connection transaksi yang sama. Lock, pemilihan hasil attempt terbaru, aturan finding aktif dan tanggal selesai tetap berada dalam alur semula.
- `backend/services/ticketWorkflowService.js` memisahkan workflow create/reclassification/policy/import dari controller HTTP. Guard, status/envelope, audit, locking dan optimistic version tetap dipertahankan.
- Kebijakan SLA di-cache satu kali per transaksi import, bukan cache global. Regresi tiga finding membuktikan policy read **3 → 1**, serta policy dibaca kembali pada transaksi berikutnya.
- Read dashboard yang independen dijalankan bersama; tidak mengklaim jumlah query dashboard berkurang ataupun latency produksi telah diukur.
- Ticketing tidak otomatis mengubah atau menutup lifecycle maintenance; prerequisite perbaikan dan verifikasi independen tetap berlaku.

## Hasil verifikasi

| Pemeriksaan | Hasil |
| --- | --- |
| Backend `npm test` | 59 lulus, 0 gagal |
| Frontend `npm test` | 60 lulus, 0 gagal |
| Frontend `npm run build` | Lulus |
| Frontend `npm run lint` | Exit 0; 0 error, 6 warning |
| Ticketing HTTP/MySQL terisolasi | 31/31 lulus |
| Legacy settings/audit/maintenance/jadwal HTTP/MySQL | 14/14 lulus |
| OpenAPI 3.0.3 validator dan route coverage | Lulus; 69 operasi, 66 path |
| Review startup `--check` | Lulus pada `simlab_review_20261103171601` |

### Bundle

Entry JavaScript production turun dari **1.221.232 byte menjadi 352.717 byte**, pengurangan **71,12%**. Angka ini ukuran entry JS tanpa kompresi, **bukan** pengurangan total seluruh asset, waktu load, atau latency API. PDF/features dipindahkan ke chunk yang dimuat saat dibutuhkan. Build terakhir tidak mengeluarkan warning chunk di atas 500kB.

### Browser

Pengujian menggunakan komponen shared yang sebenarnya dan fixture sintetis, bukan respons API palsu yang diklaim sebagai hasil integrasi.

| Viewport | Pointer | Sidebar awal | Data CRUD | Page overflow horizontal |
| --- | --- | --- | --- | --- |
| 320 × 568 | Coarse/touch | Tertutup | Kartu berlabel | Tidak |
| 390 × 844 | Coarse/touch | Tertutup | Kartu berlabel | Tidak |
| 768 × 1024 | Coarse/touch | Tertutup | Tabel | Tidak |
| 1366 × 900 | Fine/mouse | Terbuka | Tabel | Tidak |

Pada fixture touch, tinggi minimum tombol yang diukur 44px. Drawer mengunci scroll dan membuat main inert, Escape menutupnya serta mengembalikan fokus. Pada dialog 390 × 844, bounds berada di dalam viewport; Tab/Shift+Tab berputar di dalam dialog, Escape mengembalikan fokus ke pemicu dan melepaskan scroll lock. Tidak ada uncaught error/unhandled rejection yang terekam pada pemeriksaan tersebut. Server fixture port 5190 sudah dihentikan dan port diverifikasi tertutup.

### Isolasi database

- Ticketing: `simlab_review_20261103182315`; detail `docs/ticketing-review-result.json`.
- Legacy: `simlab_review_20261103182317`; detail `docs/local-review-result.json`.
- Keduanya menyatakan `source_unchanged: true` dan `server_stopped: true` setelah pengujian.
- Kedua client mysql2/Prisma diarahkan ke review melalui environment proses, bukan dengan menulis `.env`.
- Nama database memakai timestamp UTC; waktu pembuatan 3 November pada JSON ekuivalen dengan 4 November dini hari di UTC+07:00.

## Menjalankan review secara eksplisit

Database review interaktif sebelumnya tetap tersedia dan startup check telah berhasil. Jangan menggunakan database integrasi sintetis sebagai data operasional.

Terminal pertama, dari root repo:

```bash
cd backend
node scripts/start-review.mjs --database=simlab_review_20261103171601 --port=5001
```

Terminal kedua, dari root repo, menggunakan Bash seperti lingkungan pengujian:

```bash
cd frontend
VITE_BASE_URL=http://localhost:5001/api VITE_ASSET_BASE_URL=http://localhost:5001 npm run dev
```

Gunakan alamat yang dicetak Vite. Tidak perlu mengubah `.env`, menjalankan migrasi atau mereset akun untuk menerapkan refactor ini. Startup biasa tetap mengikuti konfigurasi lokal yang sudah ada; override di atas hanya berlaku pada proses review tersebut. Semua server pengujian dihentikan setelah verifikasi, bukan dibiarkan berjalan untuk pengguna.

## Batas dan tindak lanjut

- Belum merupakan UAT browser terautentikasi seluruh halaman/lima role. HTTP/MySQL menguji role dan workflow; browser terpisah menguji shared UI. Keduanya tidak disamakan dengan full-stack browser E2E.
- Belum diuji pada perangkat fisik/soft keyboard nyata, semua browser, atau pixel-perfect hasil cetak tiap laporan. Smoke PDF nyata dan callback cetak Perbaikan sudah diuji.
- Enam warning lint tersisa: dua unused eslint-disable directive, hook dependencies pada PengecekanStatus/AddPerangkat/login carousel, dan aturan Fast Refresh pada AuthContext. Warning bukan error build; tidak disembunyikan dengan menonaktifkan semua lint.
- `git diff --check` global belum bersih pada working tree campuran ini: ada whitespace pada perubahan lama/pengguna dan beberapa file yang disentuh. File lingkungan dan perubahan di luar scope tidak diformat ulang massal.
- Tidak mengubah enum role/database, autentikasi refresh-cookie/CORS, aturan polling, query bulk import/existence, indeks/schema, atau route laporan legacy yang shadowed. Ini perlu pekerjaan terpisah dengan kontrak dan regresi khusus.
- Dukungan ticketing ISO/IEC 20000-1 tetap sebagaimana dijelaskan di `docs/TICKETING_ISO20000.md`; bukan klaim sertifikasi atau full conformity SMS.
