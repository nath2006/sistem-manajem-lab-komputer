# Skeleton Flowbite dan navigasi React persisten

Hasil verifikasi tahap ini: `docs/skeleton-navigation-result.json`. Tahap ini hanya menyentuh frontend dan dokumentasi; backend, database, `.env`, dan dependency project tidak diubah. Tidak ada commit atau deployment.

## Skeleton

Komponen bersama: `frontend/src/Components/Loading/Skeleton.jsx`.

Implementasi mengikuti pola HTML/Tailwind skeleton Flowbite: `animate-pulse`, bidang placeholder abu-abu, `role="status"`, dan teks `sr-only`. Referensi resmi: `https://flowbite.com/docs/components/skeleton/`. Tidak mengasumsikan adanya export `Skeleton` dari package React yang terpasang.

Varian: `page`, `table`, `form`, `detail`, `cards`, dan `text`. `SkeletonRows` menghasilkan row/cell yang valid untuk `<tbody>`. Jumlah placeholder dibatasi, animasi menghormati prefers-reduced-motion, dan placeholder statistik mempunyai intrinsic width agar tidak hilang di heading shrink-to-fit.

### Cakupan yang diperiksa

- Semua **28 file features/pages** dicocokkan dengan inventory aktual: **18 halaman/fitur** diperbarui pada jalur loading dan **10 file** merupakan view/helper sinkron tanpa request awal sendiri.
- Semua **34 caller components** diperiksa: **13** memakai compatibility wrapper `DetailModal/LoadingSpinner.jsx` yang sekarang merender skeleton, **6** memakai skeleton langsung, dan **15** tidak mempunyai request awal.
- Lima komponen bersama di luar inventory caller juga diperiksa: `DashboardTablePanel`, `LoadingSpinner`, `FormContainer`, `Loading/Skeleton`, dan `RouteBoundary`. Tidak ada caller yang belum diklasifikasikan.
- Delapan tabel CRUD dihubungkan dengan `isLoading` pada shared Table, bukan melalui loading children yang sebelumnya tidak dirender.
- Mencakup detail/edit dialog, opsi lab/user/perangkat, jadwal/status, riwayat maintenance, ticket list/detail, dashboard, settings, audit, serta pengumuman publik/login.
- Route/auth loading menggunakan skeleton bersama, termasuk halaman sinkron saat chunk/session belum siap. Komponen sinkron tidak diberi delay atau loading palsu. Dashboard Kepala Lab tidak menampilkan placeholder statistik yang memang tidak ditampilkan pada UI akhirnya.
- Data yang sudah tampil tetap terlihat selama background refresh. Loading tidak disamakan dengan hasil kosong atau error. Indikator menyimpan/mencetak dan disabled submit tetap dipertahankan.

## Penyebab scroll kembali ke atas

Menu sudah menggunakan React Router Link. Bukti browser sebelum perbaikan menunjukkan dokumen tetap sama, tetapi elemen sidebar diganti: scroll **406 → 0 px**, dan seluruh sidebar hilang ketika lazy route menunggu. Penyebabnya adalah Dashboard dimiliki setiap leaf page, ditambah error boundary yang di-key pathname di atas shell.

Perbaikan:

- `frontend/src/Layouts/DashboardLayout.jsx` menjadi layout bersama untuk protected routes.
- Navbar/sidebar berada pada shell yang tetap mounted, sedangkan Outlet dan boundary loading/error berada di dalam area isi.
- `frontend/src/Context/DashboardContext.js` memungkinkan wrapper Dashboard pada halaman lama hanya meneruskan konten dan memperbarui judul, tanpa membuat shell kedua.
- Boundary yang di-key pathname hanya mereset isi route, bukan navbar/sidebar.
- Posisi scroll tidak disimpan paksa atau dipulihkan dengan timer; node scroll yang sama dipertahankan.
- Link recovery login dan link ke menu Perbaikan dari ticketing memakai React Router Link. Link download/file tetap merupakan anchor biasa. Tombol reload eksplisit pada error recovery tetap tersedia sebagai tindakan pengguna, bukan navigasi normal.

## Bukti pengujian

| Pemeriksaan | Hasil akhir |
| --- | --- |
| Frontend `npm test` | **103 lulus, 0 gagal** |
| Frontend `npm run lint` | **0 error, 6 warning**, exit 0 |
| Frontend `npm run build` | Lulus |
| App route/role | JSX App sebenarnya dengan guard/layout sebenarnya diuji terhadap matriks role/path; lazy page dan auth state diisolasi untuk tes routing |
| Skeleton browser | 320, 390, 768, 1366px; semua varian mempunyai lebar nyata dan tidak menyebabkan page overflow horizontal |
| Reduced motion | Computed animation menjadi `none` |
| Sidebar desktop, viewport 1100 × 420 | **554 → 554 px**, node sidebar dan dokumen sama |
| Sidebar touch mobile, viewport 390 × 700 | **335 → 335 px**, termasuk setelah drawer ditutup dan dibuka lagi |
| Navigasi ketika lazy route pending | Shell tetap ada, skeleton hanya pada isi, active menu diperbarui, satu sidebar saja |

Uji navigasi akhir menggunakan klik pointer pada menu terbawah, bukan hanya memanggil handler. Penyelesaian lazy route dikendalikan oleh promise fixture, tanpa menambahkan delay produksi. Skeleton counter yang semula berlebar nol ditemukan lewat pengukuran browser dan diperbaiki menjadi 96px pada fixture heading.

Regresi utama tersedia di:

- `frontend/tests/shared-skeleton.test.js`
- `frontend/tests/page-skeletons.test.mjs`
- `frontend/tests/component-skeletons.test.js`
- `frontend/tests/persistent-routing.test.js`
- `frontend/tests/route-boundary.test.mjs`
- `frontend/tests/ticketing-forms.test.js`

Enam warning lint yang masih ada berkaitan dengan unused eslint-disable Footer, dependensi hook PengecekanStatus/AddPerangkat/Teknisi/login carousel, serta Fast Refresh AuthContext. Warning tersebut tidak disembunyikan dan bukan error build.

## Batas verifikasi

Pengujian browser memakai komponen sebenarnya dengan fixture role/data sintetis, bukan UAT browser terautentikasi setiap workflow. SSR caller tests sebagian mengisolasi context/layout/skeleton contract; tes shared dan browser terpisah memverifikasi implementasi skeleton sebenarnya. Tidak ada klaim setiap workflow API sudah diulang melalui browser.

Tidak ada request atau penulisan database pada tahap ini. Server fixture port **5192** telah dihentikan dan port diverifikasi tertutup. File laporan refactor sebelumnya merupakan hasil tahap sebelumnya; hasil terbaru untuk perubahan loading/navigasi ada pada laporan ini.
