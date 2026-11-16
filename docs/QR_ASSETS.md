# QR Aset dan Verifikasi — FITUR 2

## Model dan batas keamanan

Identitas aset tetap `perangkat.perangkat_id`. Satu kolom nullable `qr_public_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin` dengan **unique index satu kolom** menyimpan UUIDv4 kriptografis dari `node:crypto.randomUUID()`. Tidak ada tabel aset duplikat, URL DB, ID publik berurutan saja, atau ketergantungan secret JWT. Rotasi signing key tidak mengubah QR yang telah diterbitkan.

Aset lama **dan baru** diterbitkan melalui mutasi eksplisit **Terbitkan QR** di Detail Aset IT → QR dan label. Create/list/detail FITUR 1 tidak membutuhkan skema QR; tidak ada backfill tersembunyi pada GET atau startup. Admin dapat menerbitkan semua aset; Kepala Lab hanya Pembelajaran di lab tanggung jawabnya. Role lain dapat membaca QR yang sudah terbit dan mencetaknya. Reissue mengembalikan UUID yang sama. Transaksi mengunci row perangkat, lalu memeriksa penanggung jawab lab di koneksi yang sama. Unique constraint menjadi guard collision; generator mencoba ulang collision maksimal tiga kali. Konflik/DB error di-rollback; koneksi rusak tidak dikembalikan ke pool.

QR bukan sertifikat keaslian fisik atau bukti kepemilikan; ia menunjuk catatan inventaris sekolah. Mengganti nama/inventaris tidak mengubah token. Menghapus aset membuat URL lama 404. Tidak ada fitur rotasi/revoke QR pada tahap ini; jangan mengedit kolom secara manual.

## API terpasang

| Method | Endpoint | Akses dan data |
|---|---|---|
| GET | `/api/asset-qr/:publicId` | Publik, **selalu** proyeksi identitas/spesifikasi aman |
| GET | `/api/asset-qr/:publicId/private` | Semua role login: hanya `tahun_pengadaan`, `sumber_dana`, `harga_beli` |
| GET | `/api/asset-qr/identity/:id` | Semua role login: `{perangkat_id, public_id}`; public_id null jika belum terbit |
| POST | `/api/asset-qr/issue/:id` | Admin / Kepala Lab yang berwenang; `{perangkat_id, public_id}` stabil |

Envelope sukses `{data:...}`. PublicId wajib UUIDv4 lowercase kanonis; id aset integer 1–2147483647. 400 invalid; 404 unknown/unissued; 401 token invalid/expired; 403 token hilang / scope issuer ditolak; 500 internal terkontrol. Skema QR hilang/tidak kompatibel: 503 `{code:"QR_SCHEMA_REQUIRED",message}`. Guard memeriksa tipe/collation/nullability dan single-column uniqueness, tidak menganggap nama index saja cukup. Semua respons QR dan endpoint aset berpengadaan memakai `Cache-Control: no-store`, termasuk kegagalan autentikasi.

Proyeksi publik SQL **dan** whitelist respons hanya: `perangkat_id`, `nama_perangkat`, `spesifikasi`, `nomor_inventaris`, `status`, `penggunaan`, `kategori`, `lokasi`, `nama_lab`. Tidak ada `SELECT *`, foto, pengadaan, creator, email, token, role, user atau auth metadata. Query `?include=financial&private=true` maupun header Authorization tidak mengubah respons. Endpoint publik tidak menjalankan authentication middleware; middleware audit yang ada hanya menulis ketika actor terautentikasi dipasang ke request, sehingga GET publik tetap read-only termasuk ketika pemindai mengirim Authorization. Private/identity GET dan POST issuer tetap mengikuti audit login yang ada; verifikasi sumber memakai hanya SQL read-only, bukan authenticated HTTP ke sumber.

Spesifikasi/status dirender sebagai React text, bukan HTML. Halaman publik `/verifikasi-aset/:publicId` berada **di luar protected dashboard layout**. UUIDv4 divalidasi sebelum request publik maupun privat; segmen valid di-encode. ID malformed, termasuk separator ter-encode, tidak memicu request. Pengadaan diminta melalui request authenticated terpisah; data request publik tidak pernah dipakai sebagai pengadaan. Loading/skeleton, error/retry, invalid dan not-found terpisah. Hasil privat dimiliki identitas state sesi AuthContext: logout, perubahan akun, maupun penggantian sesi akun yang sama menyembunyikan hasil lama dan mengabaikan callback usang.

## URL, LAN, dan cetak

Default base QR = origin frontend saat ini + Vite `BASE_URL`. Opsional build-time `VITE_QR_PUBLIC_ORIGIN` berisi alamat frontend yang dapat dibuka pemindai, termasuk base path deployment. Ini bukan konfigurasi DB; implementasi tidak mengubah `.env`. Field **Alamat publik sekolah** boleh diisi operator sebelum cetak. Hanya HTTP/HTTPS, tanpa credentials/query/fragment. URL dibangun dari base terkontrol dan UUID; tidak berasal dari URL tersimpan dalam database.

Contoh dokumentasi saja: `https://sekolah.example/letris/verifikasi-aset/<UUID>`. Domain contoh bukan server hidup. Untuk prefix deployment, bangun Vite dengan base yang sama dan konfigurasi SPA fallback reverse proxy agar deep link dipulangkan ke index frontend. BrowserRouter memakai Vite base. Pertahankan domain/base path atau pasang redirect permanen setelah label ditempel.

**Jangan mencetak localhost untuk inventaris**: kamera HP membuka localhost HP, bukan komputer server. UI menolak cetak untuk localhost, 127/8, `::1`, `0.0.0.0`, dan subdomain `.localhost`, termasuk trailing DNS dot dan IPv4-mapped IPv6 loopback, kecuali checkbox eksplisit **pratinjau localhost saja**; PDF preview ditandai demikian. Gunakan LAN/domain frontend yang benar dan dapat dijangkau ponsel; implementasi tidak menebak IP. Lihat `LAN_ACCESS.md`. HTTP LAN hanya sesuai jaringan review tepercaya; gunakan HTTPS untuk deployment.

Detail aset menyediakan QR hitam-putih dengan quiet zone 4 modul, nama, inventaris, kategori dan UUID terbaca. **Cetak label PDF** menghasilkan PDF A4 sungguhan dengan 10 label 90 × 50 mm per halaman; 1–24 salinan aset per job, tanpa pengadaan. PDF dibuka dalam pop-up dari klik pengguna, berisi print action; jika viewer mengabaikan print action, gunakan tombol Cetak viewer. Cetak pada **100% / ukuran aktual**, bukan fit-to-page. Ini bukan janji layout sticker vendor tertentu. Popup diblokir/build gagal menampilkan error dan dapat dicoba ulang; satu job aktif menekan duplicate clicks. QR/PDF di-lazy-load agar initial page tidak menarik library cetak.

Paket runtime `qrcode@1.5.4`; decoder independen hanya dev `jsqr@1.4.0`, pembaca PNG `pngjs@7.0.0`. API browser encoder diverifikasi pada dokumentasi maintainer `github.com/soldair/node-qrcode/blob/master/README.md`; decoder pada `github.com/cozmo/jsQR`. PDF memakai jsPDF existing, tidak menambah library PDF kedua. Manifest dan lockfile diperbarui. Instalasi melaporkan 36 temuan audit dependency (3 low, 6 moderate, 24 high, 3 critical); ini bukan security remediation dependency seluruh aplikasi, tidak menjalankan audit fix/upgrade paksa.

## Migrasi review terisolasi

`backend/migrations/20261115_asset_qr.sql` **review-only**, additive, idempotent MySQL 8 information_schema + prepared DDL. Semua DDL no-op di luar allowlist `^simlab_review_[0-9]{14}$`. Tidak mengganti/menghapus kolom lama; tidak backfill token. Kolom/index existing yang salah tidak diperbaiki destruktif: readiness menolak 503. DDL auto-commit; jangan gunakan pada sumber/original atau mengasumsikan rollback transaksi dapat membatalkan ALTER.

Konfigurasi review yang diverifikasi adalah **simlab_review_20261114181000**. Original terpisah **sistem-manajemen-lab-fix**. Setelah pemilik menyetujui aktivasi QR, backend 5500 dimulai dengan kode terbaru dan migrasi QR diterapkan hanya pada database review tersebut; schema/checksum original sebelum/sesudah tetap sama. Vite 5174 tidak dihentikan. Route QR sudah diverifikasi langsung dan melalui proxy frontend; pengujian mutasi sintetis tetap memakai backend dan clone terpisah. File environment tidak diubah oleh aktivasi ini.

Dari `backend` (Git Bash):

```bash
TMPDIR='C:/Users/LOQ/AppData/Local/hermes/cache/scratch' node scripts/qr-review.mjs --create-isolated
```

Runner membuat clone **schema-only baru** `simlab_review_YYYYMMDDHHmmss`, memverifikasi nama allowlist/fresh CREATE/selected DB/berbeda dari configured source dan original, mengisi data sintetis, mengarahkan **DB_NAME dan DATABASE_URL** pada child process saja. Bila schema source sudah mempunyai QR, baseline pre-QR dihapus **hanya pada clone fresh kosong**, tidak pada source. Menguji FITUR 1 sebelum migrasi QR, migrasi dua kali, izin, delapan concurrent issuer, constraint unik, proyeksi/read-only/audit publik, private semua role, dan stable reissue. Clone dipertahankan untuk review. Fingerprint schema+data configured source dan original diperiksa sebelum/sesudah; owned child dihentikan di finally. Windows signal exits dinilai melalui signalCode juga, bukan exitCode saja.

Untuk browser reproducible:

```bash
# Terminal backend, tahan fixture maksimal 10 menit:
TMPDIR='C:/Users/LOQ/AppData/Local/hermes/cache/scratch' node scripts/qr-review.mjs --create-isolated --browser
# Terminal frontend:
TMPDIR='C:/Users/LOQ/AppData/Local/hermes/cache/scratch' node tests/fixtures/qr-server.mjs
```

Frontend fixture terpisah `127.0.0.1:5198/tests/fixtures/qr.html` memakai cache Vite baru di scratch, tidak cache 5174. Session sintetis sementara hanya scratch `qr-evidence/session.json`; jangan salin atau cetak token. Query `?auth` menguji private real HTTP, `?page=label` komponen Detail Aset aktual; `?state=loading|error|notfound` adalah **adapter respons sintetis** untuk matrix visual, bukan bukti kegagalan API nyata. Tulis `browser-done.json` dengan database matching untuk menutup runner, atau runner timeout/finally menghapus session. Stop hanya listener fixture milik review setelah selesai. Fixture bukan endpoint produksi dan tidak boleh dipublikasikan.

## Bukti dan batas

Bukti dibatasi di scratch **qr-evidence**, termasuk manifest hash file yang berubah, hasil suite/lint/build/schema/OpenAPI, HTTP/MySQL, matrix 320/390/768/1440 × biru/hijau × populated/loading/error/notfound, screenshot, QR PNG browser, decode **independen** jsQR, dan PDF dari callback UI cetak aktual. Private fetch/logout dan localhost print guard diuji di browser. Klik print gagal popup → retry → duplicate click menghasilkan satu PDF; delivery popup diintersepsi oleh fixture agar test tidak membuka dialog OS. PDF/QR adalah hasil library nyata, bukan SVG placeholder. Tidak mengklaim uji printer fisik, kamera ponsel, dialog print OS, UI login produksi, atau deployment domain nyata.

### Hasil verifikasi pekerjaan ini

- Suite terakhir setelah perbaikan review: **127/127 backend**, **172/172 frontend**, dijalankan ulang oleh parent. Lint **0 error / 6 warning existing** dan production build ke scratch berhasil. Validasi OpenAPI 3.0.3 dan `prisma validate` berhasil pada revisi sebelumnya; follow-up hanya mengubah frontend/test/dependency dev. Regresi mencakup image-encoder retry, basename SSR, UUID invalid tanpa request, normalisasi loopback, serta respons privat tertunda setelah penggantian sesi. Review independen atas follow-up lulus tanpa penghambat. Mounted tests memakai dev dependency `react-test-renderer@19.1.0`, yang mengeluarkan warning deprecation; ini bukan uji UI login produksi.
- Run HTTP/MySQL + browser pertama: **simlab_review_20261114190234**, **15 checks** termasuk completion marker; configured source dan original mempunyai fingerprint sebelum/sesudah yang sama. Delapan concurrent issue mengembalikan UUID sama; unique constraint nyata menolak duplikat. Matrix browser **32 kasus**; computed blue/green, coarse pointer, target 44px, no document overflow dan no JS errors. PNG QR browser berhasil didecode decoder independen; callback UI menghasilkan PDF **1,053,217 byte** pada preview localhost.
- Raw `http-browser-initial.json` pertama melaporkan `server_stopped:false` karena runner lama hanya membaca numeric exitCode; child yang berakhir karena signal mempunyai signalCode. Regresi cleanup ditambahkan dan helper diperbaiki. Inspeksi listener akhir secara independen memastikan port fixture API **56400** dan Vite **5198** tidak listening; server normal **5500/5174** tetap listening. Raw bukti awal tidak ditulis ulang untuk menyembunyikan metadata tersebut.
- **Batas final integration rerun:** setelah browser selesai, MySQL tidak lagi listening di 3306 dan tidak ada proses/service MySQL terdeteksi. Rerun final gagal pada fingerprint awal `ECONNREFUSED 127.0.0.1:3306`, **sebelum CREATE database/migrasi/seed**. `http.json` menyimpan failure tersebut; bukti sukses awal terpisah di `http-browser-initial.json`. Tidak me-restart DB/service/config. Karena itu final additive allowlist guard, cleanup reporting fix, no-store FITUR 1, basename fallback, dan image-retry follow-up mendapat unit/build/static validation, **bukan HTTP/browser rerun pada revisi final**. Ulangi runner setelah pemilik memulihkan MySQL sebelum acceptance integration final.
- Scratch session telah dihapus. Tidak ada authenticated HTTP ke configured source/original. Bukti public/private memakai session login HTTP sintetis dan AuthContext fixture, bukan UI login produksi. Tidak ada klaim physical-printer/camera/OS print-dialog UAT.
- **Rerun setelah MySQL pulih:** clone **simlab_review_20261114203548**, **14/14 pemeriksaan HTTP lulus**, `complete`, fingerprint configured source/original tetap sama, dan owned fixture berhenti. Ini menutup blokir HTTP pada revisi final; matrix browser awal tetap bukti historis, bukan matrix browser yang dijalankan ulang. Runner dipanggil dengan `DB_NAME=simlab_review_20261114181000` sebagai override proses agar target sumber review eksplisit; tidak mengubah file konfigurasi.

FITUR 3–5, referensi GLPI, perubahan bantuan/dashboard, commit/push/ref/tag tidak dikerjakan di sini. Shell persisten, rail desktop, Drawer, dan native mobile tables tidak didesain ulang.
