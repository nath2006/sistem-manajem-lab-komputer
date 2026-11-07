# Riwayat versi dan pembagian branch

## Baseline v1 yang terkonfirmasi

- Commit: `92633b3f1780857afe79c9a341f2a2a979cc8536` — `feat(ui): improve UX`.
- Branch arsip: `archive/v1-92633b3`.
- Pada audit, `main` lokal dan `origin/main` sama-sama menunjuk commit ini.
- Ini adalah snapshot terakhir yang benar-benar tercatat di Git, bukan rekonstruksi pasti seluruh isi folder sebelum pekerjaan AI pertama. Perubahan lama yang belum pernah di-commit tidak dapat dipisahkan secara kronologis hanya dari Git.
- File tracked yang tidak berubah tetap diwariskan dari baseline. File baru/berubah dikelompokkan berdasarkan tanggung jawab aplikasi, bukan tanggal dugaan.

## Branch v2

| Urutan merge | Branch | Isi |
|---|---|---|
| 1 | `feat/backend-v2` | Backend Express/Prisma, settings dan upload logo, audit aktivitas, maintenance, ticketing, guarded deletion, migrasi schema-only, review scripts, tes backend, serta helper jadwal bersama |
| 2 | `feat/frontend-v2` | React UI, tema dinamis, mobile UX, skeleton, persistent layout, form settings, ticketing, penghapusan dengan preview, onboarding tooltip Driver.js, serta tes frontend |
| 3 | `docs/v2` | Dokumentasi API/OpenAPI, proses ISO pendukung, panduan review, dokumentasi onboarding dan riwayat versi ini |

Branch bersifat berurutan: frontend dibangun di atas hasil merge backend; dokumentasi dibangun di atas hasil merge frontend. Setiap tahap menggunakan merge commit dengan dua parent. Tidak ada rebase, force-push, atau pembuatan tanggal/riwayat seolah-olah fitur pernah di-commit terpisah sebelumnya.

## File yang sengaja tidak dipublikasikan pada tree v2

- `.env` dan kredensial lokal; contoh nonfungsional tersedia pada `backend/.env.example`.
- `backend/DB-COBA.sql` dan `backend/Sistem Infromasi Manajemen Lab FIX-2.sql`: dump lama berisi INSERT akun/hash; asal fixture belum terkonfirmasi. Gunakan schema/migrasi tanpa data privat.
- Upload pengguna, dependency terpasang, build output, database lokal.
- `backend/ayam.js`: eksperimen pengecekan koneksi lokal.
- Log, JSON hasil review lokal, serta screenshot hasil pengujian di `docs/onboarding-tour/`.

File lokal tersebut tidak dihapus. Menghapus file dari tree v2 **tidak menghapus salinannya dari commit v1/riwayat Git yang sudah ada**. Bila kredensial nyata pernah masuk Git, pemilik perlu merotasinya. Pembersihan history memerlukan keputusan terpisah; pekerjaan ini tidak melakukannya.

## Pemeriksaan sebelum publikasi

- Backend: 94 tes lulus.
- Frontend: 124 tes lulus; lint 0 error / 6 warning yang sudah ada; production build berhasil.
- Audit publikasi mencakup file source baru/berubah, data-bearing SQL, file konfigurasi, dan artefak review. Pemeriksaan pola bukan jaminan absolut tidak ada secret yang tidak dikenal.
- Pengujian browser onboarding terdahulu menggunakan Driver.js aktual pada fixture autentikasi sintetis, bukan UAT login penuh.

Untuk membandingkan v1 terhadap versi baru di GitHub, bandingkan `archive/v1-92633b3...main`. Untuk meninjau satu kelompok, lihat commit pada branch fitur dan merge terkait melalui `git log --graph --oneline --all`.
