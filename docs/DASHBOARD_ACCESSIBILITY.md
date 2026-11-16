# Dashboard accessibility — verifikasi akhir langkah 7

## Perubahan terfokus

- `Footer.jsx`: kedua baris memakai `--dashboard-accent` yang sudah dikoreksi ke kontras AA. **Footer tetap ditampilkan**, termasuk versi. Di luar scope dashboard, fallback mempertahankan primary sekolah dan alpha 80% untuk versi; tidak mengubah tampilan halaman lain.
- Kartu statistik Teknisi: hapus kombinasi `bg-blue-500`/`bg-green-500` + `text-white`; pakai `data-tone="info"`/`"success"`, `--dashboard-tone` dan foreground otomatis `--dashboard-on-tone`. Label dan ikon tetap ada. Data statistik, guard/loading, refresh, antrian, riwayat dan aksi tidak diganti.
- Utility pusat: semantic info/success/warning/danger memadukan 15% primary dengan warna keluarga status, lalu dikoreksi untuk surface terang. Setiap perubahan primary kini mengubah kartu semantic juga, bukan hanya kartu primary dan seri grafik. Pilihan foreground hitam/putih dihitung kembali. Ikon + label tetap membawa arti status tanpa bergantung pada hue saja. Tidak ada literal warna baru di komponen.
- Tidak mengubah API, permission, navigasi/sidebar, onboarding, native table, konfigurasi environment atau data sumber.

## Test-first (RED → GREEN)

Regresi browser merender **komponen halaman sebenarnya**, bukan tiruan kartu/footer, melalui fixture Vite dan API/MySQL clone:

1. `dashboard-accessibility.py::assert_footer_contrast`: sebelum perbaikan, versi Footer pada primary kuning gagal **1.071220706:1**, expected 4.5. Sesudah perbaikan lulus.
2. `assert_teknisi_contrast`: setelah Footer diperbaiki, kedua label statistik asli masih gagal **3.612384680:1** dan **3.385412233:1**. Sesudah token semantic + automatic foreground, lulus. Pengujian memastikan dua paragraf Footer dan kedua statistik benar-benar terpasang agar selector kosong tidak lolos.
3. `dashboard-semantic-theme.test.mjs`: RED karena semantic `info` menghasilkan **1 warna, expected 7** saat primary berubah. Sesudah perubahan utility, seluruh empat tone menghasilkan tujuh nilai berbeda, teks ≥4.5 dan grafik ≥3. Regresi utility lama tetap lulus.

`dashboard-hover.py` juga memeriksa kondisi normal dan **mouse hover aktual** tanpa klik/mutasi workflow. Pengujian ini mengonfirmasi perilaku yang telah aman, bukan alasan mengubah navigasi.

## Hasil pengukuran final

Evidence lokal: `C:/Users/LOQ/AppData/Local/hermes/cache/scratch/letris-dashboard/`.

| Cakupan | Hasil |
|---|---|
| Matriks utama | **105 kasus unik**: 5 role × 360/768/1280 × 7 primary |
| Primary | `#ffff00`, `#f8fafc`, `#000000`, `#07152e`, `#ff0000`, `#2563eb`, `#15803d` |
| Teks gagal | **0 kasus**; rasio minimum **4.554002209:1** |
| Grafik gagal | **0 kasus**; rasio minimum **4.529088923:1** |
| Bounds kartu/grafik, overflow horizontal dokumen | **0 / 0 kasus** |
| Pointer coarse | **105/105**, touch emulation diaktifkan dan media query diverifikasi |
| Tambahan 320/360 | **70 kasus** normal/hover; 0 kegagalan teks/grafik/bounds/overflow |
| Hover nyata | **98 observasi**; Admin tidak memiliki aksi di dalam scope konten pada data fixture ini |
| Native table | Seluruh tabel yang dirender tetap `table`, header `table-header-group`, termasuk mobile |
| Live blue → green | Warna computed seluruh kartu yang dirender berubah untuk **5 role**, tanpa reload halaman |
| Error browser | 0 `error`/`unhandledrejection` pada pemeriksaan live lima role dengan collector yang dipasang sebelum navigasi |
| Suite backend | **133/133 lulus** |
| Suite frontend | **215/215 lulus**, termasuk suite sibling yang ada saat eksekusi |
| ESLint frontend | **0 error, 7 warning yang sudah ada**; tidak menambah warning DashboardInsights |
| Build produksi | Lulus, **2333 module**, dibuat pada salinan scratch terisolasi |

Penghitungan/deduplikasi dilakukan dengan Python berdasarkan `(role, requestedWidth, theme)`, bukan perkiraan jumlah file. Baseline `stable-*.json` **tidak ditimpa**: tetap 105 kasus dengan 81 kasus teks legacy gagal. File hasil final terpisah:

- `final-step7-{Role}.json`, `final-step7-all.json`, `final-step7-summary.json`;
- `final-step7-hover-{Role}.json`;
- `final-step7-live-colors.json` dan lima screenshot `final-step7-{Role}-360-green.png`;
- `final-step7-{frontend,backend,lint,build}.log`, `final-step7-mysql-report.json`;
- manifest `step7-files.json` dan SHA-256/evidence `step7-verification.json`.

Tujuh warning ESLint tetap berada pada Footer (disable tak terpakai), PengecekanStatus, AddPerangkat, AuthContext, TeknisiDashboard, authLoginCover dan fixture dashboard. Tidak menekan warning dengan perubahan konfigurasi atau mengubah hook/data workflow di luar hardening ini. Backend tidak menyediakan script lint; angka lint di atas adalah frontend. Suite frontend juga masih mengeluarkan peringatan harness `react-test-renderer` deprecated dan esbuild `import.meta` dalam bundle CJS; assertion tetap lulus, bukan klaim output sepenuhnya tanpa warning.

## Isolasi database dan server

Runner dijalankan dari `backend` dengan override eksplisit, bukan mengedit `.env`:

```sh
DB_NAME=simlab_review_20261114181000 'C:/Program Files/nodejs/node.exe' scripts/dashboard-review.mjs --create-isolated --browser
```

Clone baru: **`simlab_review_20261114220238`**, hanya skema disalin dan fixture sintetis ditambahkan. `reviewEnvironment` mengarahkan **DB_NAME dan DATABASE_URL** proses anak ke clone. Dua source `simlab_review_20261114181000` dan `sistem-manajemen-lab-fix` memiliki fingerprint before/after yang identik. **20 assertion** review lulus; token session scratch dihapus saat runner selesai. API fixture memakai port 61820 dan Vite 5199; keduanya sudah dihentikan, listener closure diverifikasi. Listener biasa 5500 dan 5174 tetap berjalan dan tidak dihentikan/restart.

## Mengulang browser checks

Jalankan runner MySQL di atas, kemudian `node tests/fixtures/dashboard-server.mjs` dari `frontend`. Gunakan Browser Use dengan **browser context baru dan CDP session yang dipin**, bukan tab aktif bersama. Implementasi yang sudah dieksekusi tersedia di scratch `step7-browser-runner.py` dan `step7-live-checks.py`.

Untuk setiap batch, buat `Target.createBrowserContext`, `Target.createTarget` dengan `browserContextId`, `Target.attachToTarget(flatten=True)`, lalu kirim semua `Page`, `Runtime`, `Emulation`, `Input` dan screenshot commands dengan `session_id` tersebut. Enable `Page` dan `Runtime` sebelum registrasi collector new-document. Bungkus pekerjaan dalam `try/finally` yang memanggil `Target.disposeBrowserContext` hanya untuk context milik batch.

Muat `dashboard-browser.py` dengan `__name__` bukan `__main__`, lalu bind ulang `cdp`, `js` dan `goto_url` ke session tersebut. Untuk hasil final, ganti prefix output `'stable-'` menjadi `'final-step7-'` **di salinan source harness dalam memori**, tidak mengubah baseline. Panggil `run_dashboard_matrix(roles)`; sesudahnya muat `dashboard-accessibility.py` dan jalankan kedua assertion. Muat `dashboard-hover.py` dan panggil `run_hover_and_narrow(roles)` untuk 320/360 dan hover. Batasi satu/dua role per batch bila timeout, simpan tiap kasus sebelum screenshot dan deduplikasi file sesudahnya.

Jangan menjalankan build bersamaan dengan matriks Vite. Perubahan test milik worker lain/Flowbite class-list dapat memicu reload; bila precondition `ready/width/coarse/primary` gagal, bedakan reload fixture dari kegagalan aplikasi dan ulangi kasus/batch. Build final memakai `final-step7-scratch-build.mjs`, yang menyalin src/public/config/shared ke scratch dengan node_modules junction, bukan mengganti cache/dev server biasa.

Setelah browser selesai, buat marker `browser-done.json`, tunggu runner menyimpan fingerprint after, dan hentikan hanya server fixture milik sendiri.

## Batas klaim

Aplikasi tidak memiliki toggle/state dark mode sekolah. Pengujian primary hitam/biru tua **bukan** pengujian dark mode; dashboard mempertahankan boundary surface terang dengan token eksplisit. Matriks memakai halaman/shell/API nyata tetapi data **sintetis pada clone**, bukan UAT akun pengguna atau semua kemungkinan status bisnis. Hover mencakup aksi yang benar-benar tampil pada data tersebut; tidak mengklaim modal/aksi workflow yang tidak dibuka. Probe mencakup konten `.dashboard-theme`, bukan audit ulang seluruh sidebar/global UI. Tidak ada commit/push oleh worker langkah 7; parent melakukan independent review dan commit terpisah.
