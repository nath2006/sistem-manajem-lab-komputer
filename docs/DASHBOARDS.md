# Dashboard semua role

## Kontrak dan visibilitas

`GET /api/dashboard/insights` menggunakan Bearer token yang sama dengan API lain. Respons sukses mempertahankan bentuk `{ message, data }`:

```json
{
  "message": "Ringkasan dashboard berhasil diambil.",
  "data": {
    "tickets": { "available": true, "rows": [{ "label": "new", "count": 3 }] },
    "assets": {
      "categories": [{ "label": "Printer", "count": 2 }],
      "conditions": [{ "label": "Baik", "count": 2 }]
    }
  }
}
```

- Admin, Koordinator Lab, Teknisi: seluruh tiket yang memang terlihat pada menu Bantuan.
- Kepala Lab: tiket yang dilaporkan sendiri **atau** terkait perangkat pada lab yang dipimpinnya.
- Guru: hanya tiket yang dilaporkan sendiri; `assets: null` (tidak mengirim inventaris sekolah yang tidak diperlukan grafik Guru).
- Semua agregasi tiket memakai `createTicketService(db).scope(actor)` dan `.joins`, bukan policy/SQL visibilitas baru. Tidak ada pagination sebelum agregasi.
- Grafik aset mencakup data yang sama dengan API baca aset yang sudah tersedia untuk pengguna terautentikasi. Kepala Lab tetap tidak memperoleh hak edit tambahan.
- Metadata kategori/kondisi lama yang kosong/tidak tersedia masuk **Lainnya** dengan `COUNT(*)` sebenarnya. Skema ticketing yang belum lengkap menghasilkan `{ available: false, rows: [], reason: "Skema ticketing belum tersedia." }`, bukan angka nol rekaan atau fallback query tanpa scope.
- Kesalahan koneksi/query tetap 500, bukan data sukses kosong. Role tidak dikenal ditolak 403; middleware auth lama tetap menangani token hilang/tidak valid. Respons `Cache-Control: no-store`.
- Tidak mengubah envelope endpoint dashboard lama; tidak menambah migrasi.

## UI dan tema

Kelima halaman dashboard memasang `DashboardInsights` di dalam `DashboardTheme`. Target onboarding baru: `[data-tour="dashboard-charts"]`, tersedia untuk semua role termasuk loading/error. Target shell lama tidak diubah.

Grafik horizontal SVG dipilih walaupun `react-chartjs-2` dan `chart.js` tersedia: label HTML dapat membungkus tanpa terpotong, angka tetap terlihat, SVG memakai CSS variables sehingga tema berubah langsung tanpa manajemen warna canvas atau dependency tambahan. Data grafik juga merupakan daftar label/angka yang bisa dibaca pembaca layar; status memiliki ikon + label, tidak bergantung warna saja. Tabel dashboard lama tetap tabel native di viewport scroll lokal.

`utils/dashboardTheme.js` adalah satu-satunya palette literal untuk komponen baru: primary, on-primary otomatis hitam/putih, surface/canvas/text/muted/border/track, success/warning/danger/info dan empat seri. Aksen didasarkan pada primary lalu digelapkan sampai kontras 4.5 terhadap surface putih; warna seri juga mencapai 4.5. `DashboardTheme` membaca `SettingsContext.settings.primary_color` yang juga memasok root `--color-maroon`. CSS dashboard diimpor dari `index.css`, bukan komponen JSX, agar harness SSR lama tetap dapat membundel halaman tanpa CSS output.

Batas mode: aplikasi saat ini tidak memiliki state/toggle dark mode sekolah. Dashboard memakai surface terang eksplisit; primary sangat gelap bukan dark mode. Tidak menambahkan toggle mode palsu.

## Pengujian terisolasi

Unit/regresi:

```sh
cd backend && npm test
cd ../frontend && npm test && npm run build
```

Review MySQL opt-in (jalankan dari `backend`, tidak mengubah `.env`):

```sh
DB_NAME=simlab_review_20261114181000 TMPDIR=C:/Users/LOQ/AppData/Local/hermes/cache/scratch node scripts/dashboard-review.mjs --create-isolated
```

Tambahkan `--browser` untuk mempertahankan server API clone sampai marker scratch `letris-dashboard/browser-done.json` dibuat, maksimum 30 menit. Runner membuat database `simlab_review_<UTC timestamp>` baru, menyalin **skema saja**, memberi fixture sintetis, mengarahkan **DB_NAME dan DATABASE_URL** pada proses server anak menggunakan `reviewEnvironment`, serta memverifikasi fingerprint source dan `sistem-manajemen-lab-fix` sebelum/sesudah. Hanya clone baru yang menerima seed/DDL legacy-test. Runner tidak memerlukan migrasi dashboard. Token fixture scratch dihapus saat selesai; tidak ada akun/password sumber yang disalin.

Selama runner browser aktif, dari `frontend` jalankan `node tests/fixtures/dashboard-server.mjs` (port khusus 5199). `tests/fixtures/dashboard.html?role=Admin` merender **halaman role dan shell sebenarnya**, memakai API clone. Empat nama role lain: Guru, Kepala Lab, Koordinator Lab, Teknisi. `dashboard-browser.py` dapat dieksekusi melalui Browser Use `browser_exec`; ukurannya 360/768/1280 dan 7 primary ekstrem/non-merah. `dashboard-probe.js` mengukur warna DOM/SVG computed, background aktual/alpha compositing, WCAG ratio, native table display, coarse pointer, dan overflow dokumen/kartu. Jangan menjalankan build bersamaan dengan matriks Vite: perubahan `.flowbite-react/class-list.json` memicu reload fixture; tunggu API settings dan animasi shell selesai sebelum probe. Fixture API/backend tidak memakai server normal 5500/5174.

## Evidence base langkah 5 / batas commit langkah 7

Evidence lokal: `C:/Users/LOQ/AppData/Local/hermes/cache/scratch/letris-dashboard/`.

- Backend suite: 133/133; frontend suite: 185/185; build dan scoped ESLint komponen baru lulus.
- Review MySQL terakhir: `simlab_review_20261114212236`; review browser: `simlab_review_20261114210220`. Masing-masing 20 assertion termasuk lima role HTTP, scope Guru/Kepala, exact counts, legacy fallback dan dua fingerprint unchanged. Server milik fixture dihentikan.
- Matriks base **105 kasus unik** = 5 role × 3 lebar × 7 warna. Semua coarse pointer; grafik 0 kegagalan kontras, overflow dokumen 0, bounds kartu/grafik 0. Tabel Admin tetap `display: table` pada 360px.
- **Bukan klaim langkah 7 selesai**: probe sengaja mencatat 81 kasus yang masih memiliki masalah teks legacy. Footer `text-maroon/80` gagal pada 5 warna × 3 lebar × 5 role (rasio sekitar 1.04–3.64); dua label kartu Teknisi lama `bg-blue-500`/`bg-green-500` memiliki 3.61/3.39, perlu token semantic dan foreground aman. Baseline tersimpan di `stable-all.json`; parent mengerjakan hardening ini **setelah commit onboarding**, lalu menjalankan ulang matriks. Source sidebar dan row actions tidak disentuh oleh pekerjaan dashboard.
- Test-first assertion failures telah dijalankan sebelum implementasi service, legacy fallback, router HTTP, shared chart, wiring lima halaman, shared card opt-in dan utility kontras. Pengujian ulang penuh menangkap import CSS JSX yang tidak kompatibel dengan harness SSR; dipindahkan ke stylesheet entry sebelum suite hijau.

Commit dashboard/base dapat mencakup semua file dashboard baru, lima halaman role, `CardStatAdmin`, import CSS `index.css`, dua baris mount/import `backend/index.js`, docs ini serta tests/fixtures dashboard. Jangan memasukkan perubahan ticketing/onboarding milik worker lain. Tidak ada commit/push otomatis dari worker ini.

## Verifikasi final langkah 7

Hasil base di atas adalah bukti historis, bukan hasil akhir. Hardening Footer dan kartu Teknisi serta semantic tones yang mengikuti primary sudah selesai dengan RED → GREEN; lihat [DASHBOARD_ACCESSIBILITY.md](DASHBOARD_ACCESSIBILITY.md) untuk perubahan, reproduksi dan batas cakupan.

Matriks final terdeduplikasi: **105/105 kasus** (5 role × 3 ukuran × 7 warna), **0 kegagalan teks/grafik/bounds/overflow**; minimum teks **4.554:1**, grafik **4.529:1**. Tambahan **70 kasus** coarse 320/360 dan **98 hover nyata** juga lulus. Native table dipertahankan. Live blue/green mengubah warna kartu kelima role. Source database dan protected original fingerprint tidak berubah pada review clone baru `simlab_review_20261114220238`; server fixture berhenti, server biasa tidak disentuh.

Suite live-tree final: backend **133/133**, frontend **215/215**, build scratch lulus; lint **0 error / 7 warning yang sudah ada**. Evidence `final-step7-*` terpisah dari baseline `stable-*`, dengan manifest dan hashes `step7-files.json` / `step7-verification.json`. Tidak mengklaim dark mode: aplikasi belum memiliki state/toggle tersebut dan surface dashboard tetap terang.
