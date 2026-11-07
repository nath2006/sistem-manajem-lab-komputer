# Ticketing layanan — acuan ISO/IEC 20000-1

## Batas klaim

Modul ini mendukung pengelolaan **insiden** dan **permintaan layanan** dalam aplikasi lab. Ini **bukan sertifikasi**, bukan bukti bahwa seluruh organisasi memenuhi ISO/IEC 20000-1, dan bukan implementasi seluruh service management system (SMS).

Acuan rancangan: ISO/IEC 20000-1:2018 beserta konteks Amendment 1:2024. Angka SLA, matriks prioritas, nama status, dan pilihan peran di bawah adalah kebijakan lokal contoh, **bukan angka atau workflow wajib yang ditentukan ISO**. Sekolah perlu menyetujui ruang lingkup layanan, target, tanggung jawab, dan SOP sebelum pemakaian operasional.

Halaman aplikasi: **`/ticketing`**, menu **Tiket Layanan**, setelah login. Referensi endpoint: `docs/API.md` dan `docs/openapi.json`.

## Pemetaan dukungan aplikasi

Pemetaan berikut menyatakan area yang didukung, bukan hasil audit persyaratan normatif.

| Area acuan | Dukungan modul | Batasnya |
|---|---|---|
| 8.6.1, incident management | Nomor tiket, kategori, dampak/urgensi, prioritas, penugasan, catatan tindakan, eskalasi, resolusi, verifikasi penutupan | SOP insiden mayor, komunikasi di luar aplikasi, serta koordinasi pemasok tetap tanggung jawab sekolah |
| 8.6.2, service request management | Jenis tiket permintaan layanan dengan alur penugasan dan pemenuhan yang terlacak | Hanya permintaan rutin; persetujuan khusus, katalog layanan lengkap, dan change management belum diotomatisasi |
| 8.3.3, service level management | Target respons/resolusi, deadline tersimpan per tiket, indikator pelanggaran, kebijakan target per prioritas | Target contoh harus disepakati sekolah; belum ada kalender kerja/libur atau kontrak SLA pelanggan |
| 7.5, documented information | Riwayat event bertimestamp dan beraktor; perubahan tiket dan event disimpan dalam satu transaksi | Append-only melalui API, bukan penyimpanan WORM atau bukti anti-tamper terhadap administrator database |
| 9.1, monitoring | Ringkasan antrean, keterlambatan, menunggu verifikasi, dan eskalasi | Bukan laporan SMS lengkap; belum ada MTTR, laporan tren atau rapat tinjauan manajemen otomatis |
| 8.6.3, problem management | Kolom akar penyebab membantu investigasi | Bukan modul problem/known-error, pengelompokan masalah berulang, atau jaminan pemenuhan klausul |

## Alur kerja

```text
new -> assigned -> in_progress -> resolved -> closed
                       |    ^
                       v    |
                     pending

resolved / closed -> reopen -> assigned (atau new jika belum ada teknisi)
nonterminal -> cancel -> cancelled
```

1. Pelapor mencatat jenis, judul, uraian, kategori, dampak, urgensi, dan perangkat jika relevan. Identitas pelapor berasal dari sesi, bukan input bebas.
2. Sistem memberi nomor dan prioritas berdasarkan matriks. Admin/Koordinator dapat mengoreksi klasifikasi dengan alasan tercatat.
3. Admin/Koordinator menugaskan teknisi. Teknisi dapat mengambil tiket yang belum ditugaskan kepada siapa pun.
4. Teknisi yang ditugaskan mulai mengerjakan tiket. Menunggu komponen/pihak lain harus memakai status `pending` dengan alasan, lalu `resume` untuk melanjutkan.
5. Teknisi mencatat hasil pada `resolution`; akar penyebab dapat ditambahkan. `resolved` berarti hasil penanganan menunggu verifikasi, **bukan otomatis closed**.
6. Pelapor memverifikasi kemudian menutup tiket. Jika pelapor juga teknisi yang menangani, penutupan memerlukan pengelola untuk menjaga verifikasi terpisah. Admin/Koordinator juga dapat menutup sebagai kewenangan pengelola, dengan catatan dan aktor yang terekam.
7. Jika solusi tidak berhasil, pelapor/pengelola dapat membuka kembali tiket dengan alasan. Riwayat lama tidak dihapus dan SLA tidak dimulai ulang.
8. Eskalasi disertai alasan dan timestamp. Ini penanda/timeline dalam aplikasi, **bukan notifikasi email/WhatsApp atau eskalasi otomatis terjadwal**.

Semua tindakan memerlukan catatan. Pembatalan adalah tindakan tercatat, bukan penghapusan data. Tidak ada endpoint hapus tiket/event.

## Matriks prioritas

| Dampak \ Urgensi | high | medium | low |
|---|---|---|---|
| high | P1 | P2 | P3 |
| medium | P2 | P3 | P4 |
| low | P3 | P4 | P4 |

Contoh penilaian: dampak `high` bila layanan satu lab/kelas terganggu; urgensi `high` bila praktikum sedang berlangsung tanpa alternatif. Penilaian riil perlu dikukuhkan dalam SOP sekolah. Pelapor mengisi penilaian awal; pengelola melakukan triase.

## Kebijakan target layanan contoh

| Prioritas | Respons (menit) | Resolusi (menit) |
|---|---:|---:|
| P1 | 15 | 240 |
| P2 | 60 | 480 |
| P3 | 240 | 1440 |
| P4 | 480 | 4320 |

- Waktu dihitung **24×7 elapsed time**, termasuk status pending. Ini bukan jam kerja sekolah dan tidak otomatis mengecualikan libur.
- Respons pertama dicatat saat penugasan/pengambilan tiket sebagai pengakuan penanganan yang dapat dilihat pelapor pada riwayat.
- Deadline disimpan pada tiket. Perubahan kebijakan Admin berlaku untuk tiket baru, tidak menggeser deadline tiket lama secara diam-diam.
- Koreksi prioritas memakai kebijakan yang berlaku untuk prioritas baru, tetapi tetap berpatokan pada waktu pembuatan awal, bukan waktu koreksi.
- Reopen tidak menghapus event terdahulu atau mengulang waktu SLA dari nol. Respons pertama yang sudah tercatat tetap dipertahankan.
- Tiket yang baru di-resolve setelah deadline tetap menampilkan pelanggaran meski kemudian ditutup.
- Perubahan kebijakan harus memiliki alasan. Contoh target harus disetujui pemilik layanan sebelum dipakai menilai kinerja seseorang.

## Hak akses

| Peran | Cakupan |
|---|---|
| Admin, Koordinator Lab | Semua tiket, triase, penugasan dan pengelolaan alur; hanya Admin mengubah kebijakan SLA |
| Teknisi | Antrean semua tiket; mengambil tiket belum ditugaskan; mengerjakan tiket miliknya, bukan mengambil alih pekerjaan teknisi lain |
| Kepala Lab | Tiket yang dilaporkan sendiri atau terkait perangkat di lab yang dipimpinnya; kewenangan pelapor hanya untuk tiket yang dilaporkannya sendiri |
| Guru | Tiket yang dilaporkan sendiri |

Otorisasi ditegakkan backend, bukan hanya menyembunyikan tombol. Setiap pembaruan memakai `version`; perubahan bersamaan/stale ditolak `409` dan pengguna perlu memuat ulang detail.

## Hubungan dengan pemeriksaan dan perbaikan yang sudah ada

- Tombol **Impor Temuan Pemeriksaan** tersedia untuk Admin, Koordinator, dan Teknisi. Ini mengimpor pengecekan aktif secara eksplisit dan idempoten, bukan membuat duplikat pada setiap klik.
- Tautan `pengecekan_id` dan pelapor asal dipertahankan. Temuan tetap dapat dilihat pada riwayat pemeriksaan/perbaikan lama.
- Timestamp legacy tanpa informasi zona waktu diperlakukan sebagai UTC saat impor. Jika data lama sebenarnya memakai waktu lokal, tetapkan dan lakukan konversi yang disetujui sebelum penggunaan produksi; metadata lama tidak cukup untuk menebak zona waktu secara aman.
- **Status perbaikan perangkat dan status verifikasi tiket berbeda.** Untuk tiket yang terhubung temuan, catat perbaikan berhasil di menu Perbaikan Perangkat terlebih dahulu. Baru tandai tiket resolved agar pelapor memverifikasi.
- Penandaan resolved ditolak jika sumber pengecekan belum ditangani. Menutup tiket tidak membuat catatan perbaikan fiktif dan tidak langsung mengubah perangkat menjadi Baik.
- Pembuatan temuan baru pada menu lama tidak otomatis menambah baris service ticket; lakukan impor. Otomatisasi dua-arah penuh belum diaktifkan.

## Persiapan operasional di luar perubahan kode

Sekolah tetap perlu menetapkan pemilik layanan dan SOP, menyepakati SLA dan jam layanan, melatih penangan, menentukan proses insiden mayor dan komunikasi, menentukan retensi/backup/akses data, mengelola pemasok dan perubahan, mengevaluasi laporan, melakukan internal audit dan tinjauan manajemen, serta mencatat tindakan perbaikan berkelanjutan. Penilaian relevansi perubahan iklim dalam konteks SMS (Amendment 1:2024) juga bukan sesuatu yang dipenuhi otomatis oleh halaman tiket.

Jangan masukkan password, bearer token, atau data pribadi yang tidak perlu ke uraian/catatan tiket. Database administrator tetap dapat mengubah data di luar API; pembatasan akses database, backup dan kontrol operasional harus diterapkan terpisah.

## Review lokal tanpa mengubah database asal

### Hasil verifikasi implementasi

- Backend: **55 tes lulus**; frontend: **24 tes lulus**.
- Pemeriksaan HTTP + MySQL nyata: **31 lulus**, mencakup siklus tiket, pembatasan akses, SLA, rollback/konflik versi, dua update bersamaan, dan sumber perbaikan.
- Lint modul/frontend tests ticketing bersih; build production berhasil. Warning ukuran bundle Vite dan experimental SQLite pada tes lama masih ada.
- Database review terbaru: **`simlab_review_20261103171601`**. `source_unchanged: true` dan `server_stopped: true` pada hasil integrasi. Database percobaan pertama `simlab_review_20261103170130` juga masih tersedia; tidak dihapus otomatis.
- Seeder akun review yang sudah ada dijalankan hanya pada database terbaru, dan akun Admin dibaca ulang untuk verifikasi. Sandi mengikuti seeder review lokal yang sebelumnya diminta, bukan sandi produksi.
- Startup review dengan `--check` berhasil memverifikasi database dan tabel. Tidak ada migrasi pada database asal dan tidak ada perubahan `.env` oleh pekerjaan ini.
- Tes frontend mencakup helper, SSR dan wiring; ini bukan UAT browser interaktif seluruh halaman.

Dari folder `backend`:

```bash
node scripts/ticketing-review.mjs --create-isolated
```

Perintah membuat database baru `simlab_review_YYYYMMDDHHmmss`, menyalin **struktur saja**, membuat fixture sintetis dengan password acak, menerapkan migrasi di database baru, menjalankan pemeriksaan HTTP/MySQL, membandingkan fingerprint database asal, dan menghentikan server uji. Nama database dan bukti terbaru disimpan di `docs/ticketing-review-result.json`. Fixture integrasi bukan akun produksi dan password acaknya tidak dicetak.

Untuk memeriksa atau memulai API review setelah itu, ganti placeholder nama database dengan hasil di JSON:

```bash
node scripts/start-review.mjs --database=simlab_review_YYYYMMDDHHmmss --check
node scripts/start-review.mjs --database=simlab_review_YYYYMMDDHHmmss --port=5001
```

Script startup hanya menerima nama database review, memeriksa tabel yang diperlukan, dan mengarahkan **mysql2 dan Prisma** melalui environment proses. Tidak mengedit `.env`, tidak membuat atau memigrasi database. Gunakan seeder review yang sudah ada jika memerlukan akun interaktif; arahkan `SEED_REVIEW_DATABASE` ke database baru secara eksplisit, jangan menjalankan reset akun pada database asal.

Frontend review perlu diarahkan ke API review. Contoh terminal Bash, dari `frontend`:

```bash
VITE_BASE_URL=http://localhost:5001/api npm run dev
```

Tutup kedua server manual dengan Ctrl+C setelah review. Menjalankan backend biasa yang masih menunjuk database lama tidak otomatis menerapkan migrasi ticketing; API tiket akan meminta migrasi jika tabel baru belum tersedia.

## Rujukan resmi

- ISO, halaman standar dan cakupan SMS: https://www.iso.org/standard/70636.html
- ISO, Amendment 1:2024: https://www.iso.org/standard/88434.html
- ISO/IEC JTC 1/SC 40, pemetaan area klausul pada publikasi *Updated Comparison of ISO/IEC 20000-1 and CMMI for Services V2* (pembaruan 2023): https://committee.iso.org/files/live/sites/jtc1sc40/files/ISO20KandCMMIpaper20230831.pdf
- ISO/IEC JTC 1/SC 40, penjelasan amandemen iklim: https://committee.iso.org/files/live/sites/jtc1sc40/files/news/Impact%20of%20climate%20action%20amendment%202024%20on%20ISO_IEC%2020000%20%2020240701.pdf

Referensi publik membantu pemetaan cakupan. Penilaian kepatuhan penuh harus menggunakan teks standar berlisensi dan bukti proses organisasi; dokumen ini tidak menggantikannya.
