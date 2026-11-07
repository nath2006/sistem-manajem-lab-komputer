# Dokumentasi API — Sistem Informasi Manajemen Lab Komputer

## Ruang lingkup dan sumber

Dokumen ini diturunkan dari `backend/index.js`, semua file `backend/router/*.js`, controller yang dirujuk, `middleware/authMiddleware.js`, `utils/multer.js`, `services/UserService.js`, `repositories/UserRepository.js`, `services/settingsService.js`, dan `shared/schedule.mjs`. Sumber spesifik dicantumkan pada setiap operasi; literal route dari kode mengungguli komentar route. Contoh memakai data ilustratif, bukan keluaran server yang direkam. Endpoint legacy di dokumen awal ditelaah secara statis; validasi JSON/OpenAPI/coverage bukan pengujian runtime legacy. Bukti pengujian HTTP/MySQL nyata khusus ticketing pada database terisolasi tersedia di `docs/ticketing-review-result.json` (nama database, waktu, daftar checks, `source_unchanged`, `server_stopped`); bukti itu bukan bukti semua endpoint legacy. Contoh dokumen tetap ilustratif, bukan rekaman respons.

## Koneksi, auth, role, dan error

- Base URL default `http://localhost:5000` (variabel PORT dapat mengubah port). JSON: `Content-Type: application/json`; upload: `multipart/form-data`. Header otorisasi yang dianjurkan: `Authorization: Bearer <ACCESS_TOKEN_DARI_LOGIN>`. Semua placeholder bertanda `<...>` harus diganti sendiri; tidak ada token/password siap pakai dalam dokumen ini.
- Login memakai username/password dan mengembalikan token akses (kedaluwarsa 1 jam). Refresh token 7 hari disetel lewat cookie HttpOnly `refreshToken`, SameSite=Strict, Secure pada production. Logout menghapus cookie dan menandai offline; tidak ada daftar pencabutan access token di source.
- Role middleware dibandingkan persis: `Admin`, `Guru`, `Kepala Lab`, `Koordinator Lab`, `Teknisi`. Prisma user memakai enum `Kepala_Lab`/`Koordinator_Lab`; create menormalisasi, update tidak. Jangan mengasumsikan string enum Prisma identik dengan label JWT.
- Token tidak ada: **403** `{ "msg": "No token provided." }`; kosong: **403** `{ "msg": "Token missing." }`; kedaluwarsa: **401** `{ "msg": "Token expired. Silakan Login Lagi." }`; invalid: **401** `{ "msg": "Unauthorized atau token salah" }`; role salah: **403** `{ "message": "Akses ditolak. Role tidak diizinkan." }`.
- Envelope tidak seragam: kebanyakan `{data,message}`, pengajuan daftar berupa array langsung, statistik pengajuan objek langsung, jadwal `{success,message,data}`. Error memakai `message`, `msg`, atau `error`/`details`; jangan mengharuskan satu envelope global. Handler error index memakai status `err.status || 500`, `{message,error}`; stack hanya pada development. Error controller dapat menyertakan pesan DB. Route yang tidak cocok memakai fallback Express, bukan JSON 404 khusus.
- Sumber auth: `backend/controllers/authController.js`, `backend/middleware/authMiddleware.js`, `backend/index.js`.

### Keterbatasan integrasi yang teramati pada snapshot

1. `laporanPerangkat.js` memakai instance router perangkat yang sama. Akibatnya kedua prefix `/api/perangkat` dan `/api/laporan/perangkat` berisi route perangkat **dan** route laporan. Method/path yang sama dimenangkan handler perangkat yang didaftarkan lebih dulu. Detail laporan `/{id}/detail` tetap terjangkau. Jangan gunakan create/delete prefix laporan seolah-olah aman untuk laporan: saat ini menuju handler perangkat.
2. `/api/jadwal-lab` terpasang sebagai GET dengan `verifyToken`; tanpa middleware authorizeRoles pada mount aktual. File `jadwalLabRoutes.js` tetap tidak dipasang.
3. Refresh membaca `req.cookies.refreshToken`, tetapi snapshot index tidak memasang cookie parser: refresh berpotensi gagal sebelum blok try. CORS snapshot juga belum mengaktifkan credentials. Perlu integrasi sebelum mengandalkan cookie lintas origin.
4. Modul user memakai Prisma sementara mayoritas modul memakai mysql2. Skema Prisma laporan tidak memiliki `periode` yang dipakai controller laporan. Keberhasilan DB/migrasi tidak diverifikasi.
5. Settings dan activity logs sudah di-mount pada index (`x-mounted: true`). Pemeriksaan detail memuat pengecekan/perbaikan; pengecekan detail memuat perbaikan. Dashboard teknisi memuat antrian dan riwayat. Ini verifikasi source, bukan pengujian HTTP/DB.

## Upload dan file publik

`backend/utils/multer.js`: satu file opsional per request pada route create/update lab (`foto_lab`), perangkat (`foto_perangkat`), pengumuman (`file_pengumuman`). Batas **10 MiB**. Foto menerima `.jpg,.jpeg,.png,.gif,.webp`; pengumuman juga `.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt`. Filter berdasarkan ekstensi, bukan pemeriksaan MIME/isi. Kirim field teks sebelum file agar nama file memakai judul/nama. Nama tersanitasi + tanggal, tanpa suffix acak; nama sama pada hari sama dapat bertabrakan. File disimpan relatif cwd `uploads/{labs|perangkat|pengumuman}`; static index relatif folder backend. Jalankan dari backend agar lokasi konsisten. URL publik: `/uploads/labs/{nama_file}`, `/uploads/perangkat/{nama_file}`, `/uploads/pengumuman/{nama_file}`. Nilai DB umumnya basename, bukan URL penuh. Tidak ada endpoint upload laporan/ekspor PDF/Excel khusus. Kesalahan Multer tanpa err.status jatuh ke error global **500**, jangan mengasumsikan 413/415.

Contoh upload (placeholder wajib diganti):
```bash
curl -X POST http://localhost:5000/api/lab/create \
  -H "Authorization: Bearer <ACCESS_TOKEN_DARI_LOGIN>" \
  -F "nama_lab=Lab Komputer 1" -F "lokasi=Gedung A" -F "kapasitas=30" \
  -F "kepala_lab_id=2" -F "status=Tersedia" -F "jam_buka=07:00" -F "jam_tutup=17:00" \
  -F "foto_lab=@<PATH_FILE_GAMBAR>"
```

## Inventaris operasi

| Method | Path | Akses aktual / kontrak | Handler |
|---|---|---|---|
| GET | `/api/settings/public` | Publik / tanpa middleware auth | `controller.get` |
| GET | `/api/settings` | Admin | `controller.get` |
| PUT | `/api/settings` | Admin | `controller.update` |
| GET | `/api/deletion/:resource/:id` | Token + role per resource, cakupan Kepala Lab | `service.preview` |
| GET | `/api/activity-logs` | Admin | `createActivityLogController(database)` |
| GET | `/api/user` | Token; semua role | `getAllUser` |
| GET | `/api/user/detail/:id` | Token; semua role | `getUserById` |
| POST | `/api/user/create` | Admin | `createUser` |
| PUT | `/api/user/update/:id` | Admin | `updateUser` |
| DELETE | `/api/user/delete/:id` | Admin | `deleteUser` |
| POST | `/api/auth/login` | Publik / tanpa middleware auth | `login` |
| POST | `/api/auth/logout` | Token; semua role | `logout` |
| POST | `/api/auth/refresh-token` | Publik / tanpa middleware auth | `refreshToken` |
| GET | `/api/lab` | Token; semua role | `getAllLab` |
| GET | `/api/lab/:id` | Token; semua role | `getLabById` |
| POST | `/api/lab/create` | Admin, Koordinator Lab | `createLab` |
| PUT | `/api/lab/update/:id` | Admin, Koordinator Lab | `updateLab` |
| DELETE | `/api/lab/delete/:id` | Admin, Koordinator Lab | `deleteLab` |
| GET | `/api/perangkat` | Token; semua role | `getAllDevice` (route duplikat tertutup) |
| GET | `/api/perangkat/:id` | Token; semua role | `getDeviceById` |
| POST | `/api/perangkat/create` | Admin, Kepala Lab | `createDevice` (route duplikat tertutup) |
| PUT | `/api/perangkat/update/:id` | Admin, Kepala Lab | `updateDevice` |
| DELETE | `/api/perangkat/delete/:id` | Admin, Kepala Lab | `deleteDevice` (route duplikat tertutup) |
| GET | `/api/perangkat/:id/detail` | Admin, Teknisi | `getDetailLaporanPerangkat` |
| GET | `/api/pemeriksaan` | Token; semua role | `getAllPemeriksaan` |
| GET | `/api/pemeriksaan/:id` | Token; semua role | `getPemeriksaanById` |
| POST | `/api/pemeriksaan/create` | Admin, Kepala Lab | `createPemeriksaan` |
| PUT | `/api/pemeriksaan/update/:id` | Admin, Kepala Lab | `updatePemeriksaan` |
| DELETE | `/api/pemeriksaan/delete/:id` | Admin, Kepala Lab | `deletePemeriksaan` |
| GET | `/api/pengumuman` | Publik / tanpa middleware auth | `getAllAnnouncements` |
| GET | `/api/pengumuman/:id` | Publik / tanpa middleware auth | `getAnnouncementById` |
| DELETE | `/api/pengumuman/delete/:id` | Admin, Koordinator Lab | `deleteAnnouncement` |
| POST | `/api/pengumuman/create` | Admin, Koordinator Lab | `createAnnouncement` |
| PUT | `/api/pengumuman/update/:id` | Admin, Koordinator Lab | `updateAnnouncement` |
| GET | `/api/pengecekan` | Admin, Teknisi | `getAllPengecekan` |
| GET | `/api/pengecekan/:id` | Admin, Teknisi | `getPengecekanById` |
| POST | `/api/pengecekan/create` | Admin, Teknisi | `createPengecekan` |
| PUT | `/api/pengecekan/update/:id` | Admin, Teknisi | `updatePengecekan` |
| DELETE | `/api/pengecekan/delete/:id` | Admin, Teknisi | `deletePengecekan` |
| GET | `/api/laporan/perangkat` | Token; semua role | `getAllDevice` (route duplikat tertutup) |
| GET | `/api/laporan/perangkat/:id` | Token; semua role | `getDeviceById` |
| POST | `/api/laporan/perangkat/create` | Admin, Kepala Lab | `createDevice` (route duplikat tertutup) |
| PUT | `/api/laporan/perangkat/update/:id` | Admin, Kepala Lab | `updateDevice` |
| DELETE | `/api/laporan/perangkat/delete/:id` | Admin, Kepala Lab | `deleteDevice` (route duplikat tertutup) |
| GET | `/api/laporan/perangkat/:id/detail` | Admin, Teknisi | `getDetailLaporanPerangkat` |
| GET | `/api/perbaikan` | Admin, Teknisi | `getAllPerbaikan` |
| GET | `/api/perbaikan/:id` | Admin, Teknisi | `getPerbaikanById` |
| POST | `/api/perbaikan/create` | Admin, Teknisi | `createPerbaikan` |
| PUT | `/api/perbaikan/update/:id` | Admin, Teknisi | `updatePerbaikan` |
| DELETE | `/api/perbaikan/delete/:id` | Admin, Teknisi | `deletePerbaikan` |
| POST | `/api/pengajuan/create` | Guru, Kepala Lab, Admin | `createPengajuan` |
| GET | `/api/pengajuan/menunggu` | Kepala Lab, Admin | `getPengajuanMenunggu` |
| GET | `/api/pengajuan/status` | Guru, Kepala Lab, Admin | `getPengajuanByGuru` |
| POST | `/api/pengajuan/:id/approve` | Kepala Lab, Admin | `approvePengajuan` |
| POST | `/api/pengajuan/:id/reject` | Kepala Lab, Admin | `rejectPengajuan` |
| GET | `/api/pengajuan/statistik` | Kepala Lab, Admin | `getStatistikPengajuan` |
| GET | `/api/dashboard/admin/stats` | Admin | `getDashboardStats` |
| GET | `/api/dashboard/admin/labs-with-heads` | Admin | `getLabsWithHeads` |
| GET | `/api/dashboard/admin/users-with-roles` | Admin | `getUsersWithRoles` |
| GET | `/api/dashboard/teknisi/stats` | Teknisi, Admin | `getTeknisiDashboardStats` |
| GET | `/` | Publik / tanpa middleware auth | `data: {
      message: "System is healthy!"
    }
  });
}` |
| GET | `/api/jadwal-lab` | Token; semua role | `getJadwalLabMingguan` |

## Preview penghapusan dan guard retensi

### GET `/api/deletion/:resource/:id`

Sumber: `backend/index.js` mount `/api/deletion` → `backend/router/deletionRoutes.js#createDeletionRouter` → `backend/services/deletionService.js#preview`, `validate`, `inspect`, `blocker`, `sendDeletionError`; auth `backend/middleware/authMiddleware.js#verifyToken`. Operasi mounted, bukan kontrak router yang belum dipasang. Request tanpa body/query wajib.

| resource literal | Role persis | Batas tambahan |
|---|---|---|
| perangkat | Admin, Kepala Lab | Kepala Lab hanya perangkat di lab dengan kepala_lab_id = JWT id |
| laboratorium | Admin, Koordinator Lab | Tidak ada filter kepemilikan tambahan |
| user | Admin | Akun JWT id yang sama diberi blocker self |
| pemeriksaan | Admin, Kepala Lab | Cakupan lab lewat perangkat pemeriksaan; di luar cakupan 403 |
| pengecekan | Admin, Teknisi | Existing record selalu blocker retention |
| perbaikan | Admin, Teknisi | Existing record selalu blocker retention |
| pengumuman | Admin, Koordinator Lab | Preview tersedia; DELETE legacy tidak memakai service guard |

`id` wajib cocok `^[1-9]\d*$`, safe integer dan maksimum 2147483647. Urutan service: actor → resource → role → ID → record → cakupan → dependensi. Status: **200** termasuk ketika terblokir; **400** ID invalid; **401/403** auth middleware; **403** role service / cakupan; **404** resource atau record tidak ada; **500** kegagalan tak terduga. Service tanpa actor memiliki 401 `Silakan login terlebih dahulu.`, tetapi mount normal melewati verifyToken terlebih dahulu. Error service `{message}` (bukan `{msg}`): 400 `ID harus berupa bilangan bulat positif yang valid.`, 403 `Anda tidak memiliki izin menghapus data ini.` atau `Data berada di luar laboratorium Anda.`, 404 `Jenis data tidak ditemukan.` atau `Data tidak ditemukan.`, 500 `Gagal memproses penghapusan. Silakan coba kembali.`

Respons **200 `{data}`** berisi `resource`, `id`, `label`, `can_delete`, `retained`, `blockers`, `message`. `retained` bernilai true tepat bila blocker tidak kosong, bukan hasil soft-delete. Label pemeriksaan/pengecekan/perbaikan dibentuk `Pemeriksaan #ID` / `Temuan #ID` / `Perbaikan #ID`; lainnya label SQL (dapat null). Setiap blocker `{key,label,count,message,path,action}`; count adalah jumlah baris keterkaitan per edge, bukan total record unik lintas edge. Preview read-only/advisory dan tidak memegang lock untuk DELETE berikutnya.

Contoh ilustratif untuk Admin, bukan hasil HTTP nyata:

```json
{
  "data": {
    "resource": "perangkat",
    "id": 1,
    "label": "PC-01",
    "can_delete": false,
    "retained": true,
    "blockers": [
      {
        "key": "pemeriksaan.perangkat_id",
        "label": "pemeriksaan",
        "count": 1,
        "message": "Data terkait dipertahankan untuk menjaga riwayat. Jangan hapus riwayat untuk melanjutkan penghapusan ini.",
        "path": "/kelola-pemeriksaan-perangkat",
        "action": "Lihat data terkait"
      }
    ],
    "message": "Data tidak dapat dihapus karena masih terhubung. Data dan riwayat terkait tetap dipertahankan."
  }
}
```

Dependensi eksplisit: perangkat → pemeriksaan, pengecekan, perbaikan.perangkat_id_snapshot, service_tickets; laboratorium → perangkat, jadwal_lab, pengajuan_lab; user → laboratorium.kepala_lab_id, jadwal_lab.guru_id, pengajuan_lab.guru_id/disetujui_oleh, laporan.dibuat_oleh, pemeriksaan/pengecekan/perbaikan.user_id, pengumuman.created_by, service_tickets.reporter_id/assignee_id, ticket_events/ticket_policy_events.actor_id; pemeriksaan → pengecekan; pengecekan → perbaikan dan service_tickets. Service juga menemukan FK aktual via information_schema dan deduplikasi table.column. Tabel ticket opsional hanya diperiksa bila ada; ini pembacaan metadata saat runtime, bukan perubahan skema oleh docs.

Navigasi aman: `path` hanya hint route frontend yang role-nya diizinkan, bukan URL API/izin tambahan. `null` berarti tidak ada tujuan yang diizinkan; action umumnya `Hubungi administrator`. Destinasi terpetakan: perangkat `/kelola-perangkat` (Admin/Kepala Lab), laboratorium `/kelola/data-lab` (Admin/Koordinator Lab), jadwal `/jadwal-lab` dan pengajuan `/kelola-jadwal-lab` (Admin/Kepala Lab), pemeriksaan `/kelola-pemeriksaan-perangkat` (Admin/Kepala Lab), pengecekan `/kelola-pengecekan` dan perbaikan `/kelola-perbaikan` (Admin/Teknisi), pengumuman `/kelola-pengumuman` (Admin/Koordinator Lab), service_tickets `/ticketing` (Admin/Kepala Lab/Teknisi/Koordinator Lab), ticket events/policy events `/ticketing` (Admin). Referensi user tanpa mapping tetap `path:null`. Self blocker `path:null`, action `Gunakan akun administrator lain`; retention blocker memakai route riwayat. Pemindahan perangkat dari lab memakai `Pindahkan perangkat`; penanggung jawab lab memakai `Alihkan penanggung jawab`. Penulis pengumuman diminta dipertahankan dan pengalihan ditinjau Admin karena belum ada form pengalihan; jangan menghapus pengumuman/riwayat agar parent bisa dihapus.

Guard DELETE yang benar-benar terintegrasi: user, laboratorium, perangkat (termasuk alias `/api/laporan/perangkat/delete/:id` yang shadowed), pemeriksaan. 409 mengembalikan `{message,data}` untuk menampilkan blocker yang sama. DELETE pengecekan/perbaikan tetap **409 `{message}` saja**, tanpa `data`, tanpa validasi ID/lookup record; jangan mengasumsikan envelope preview. DELETE pengumuman masih handler legacy 200/404/500 dan bukan service protected-409. Jangan memperluas jaminan guard ke semua tujuh resource hanya karena preview tersedia.

Guard memakai transaksi SERIALIZABLE, parent lock, current/next-key reads serta rollback saat blocker/error; FK race 1451 menjadi 409 generik. Ini bukan jaminan lintas writer tanpa FK: writer yang sudah memvalidasi parent harus lock/revalidate parent pada transaksinya sendiri (lihat komentar service dan implementasi writer), bukan mengandalkan preview. Dokumentasi/preview/logo tidak memerlukan migrasi source DB baru; tabel aplikasi/additive migration yang sudah dibutuhkan fitur lama tetap prasyarat deployment. Pekerjaan docs ini tidak membaca env, membuka DB, atau menjalankan migrasi.

## Detail operasi

Contoh respons berikut bersifat ilustratif/parsial; ekspresi respons dan field SELECT di bawah adalah rujukan bentuk aktual. Field hasil SQL `*` dapat mengikuti versi database; schema respons sengaja terbuka agar tidak mengarang kontrak kolom yang belum diketahui. Input tanpa penanda wajib tidak berarti pasti lolos constraint DB. Semua operasi terautentikasi juga dapat menghasilkan 401/403 middleware.

### GET `/api/settings/public`

Sumber: backend/router/settingsRoutes.js → backend/controllers/settingsController.js#controller.get. Akses: Tanpa middleware auth. GET public dan Admin memberi enam field settings yang sama; Cache-Control: no-store. Default jika tabel tidak memiliki id=1: Sekolah Anda, logo kosong, #800000, 07:00–17:00, durasi 60.

- Akses: **Tanpa middleware auth**.
- Status yang didokumentasikan: `200`.

Contoh respons 200 (ilustratif, dapat parsial):
```json
{
  "data": {
    "school_name": "Sekolah Contoh",
    "logo_url": "",
    "primary_color": "#800000",
    "schedule_start": "07:00",
    "schedule_end": "17:00",
    "lesson_duration": 60
  }
}
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 200
{ data: await service.get() }
```

### GET `/api/settings`

Sumber: backend/router/settingsRoutes.js → backend/controllers/settingsController.js#controller.get. Akses: Admin. GET public dan Admin memberi enam field settings yang sama; Cache-Control: no-store. Default jika tabel tidak memiliki id=1: Sekolah Anda, logo kosong, #800000, 07:00–17:00, durasi 60.

- Akses: **Admin**.
- Status yang didokumentasikan: `200`, `401`, `403`.

Contoh respons 200 (ilustratif, dapat parsial):
```json
{
  "data": {
    "school_name": "Sekolah Contoh",
    "logo_url": "",
    "primary_color": "#800000",
    "schedule_start": "07:00",
    "schedule_end": "17:00",
    "lesson_duration": 60
  }
}
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 200
{ data: await service.get() }
```

### PUT `/api/settings`

Sumber: `backend/router/settingsRoutes.js` → `backend/controllers/settingsController.js#update` → `backend/services/settingsService.js` dan `backend/services/logoUpload.js`; tampilan URL: `frontend/src/utils/resolveLogoUrl.js`.

Admin; JSON or multipart/form-data. Five non-logo settings fields required. Optional file field logo: one PNG/JPG/GIF/WebP, maximum 2 MiB (2097152 bytes), matching extension, MIME and header/signature checks (not a full image decoder); unsafe filenames rejected. Multipart lesson_duration digit text converted to number. logo_url accepts empty string, supported public HTTP(S) raster link, or the exact current server-owned canonical /uploads/branding/<32 lowercase hex>.(png|jpg|gif|webp) path; arbitrary local paths are rejected. Upload wins over validated logo_url. Do not persist a frontend display-origin URL as a canonical local logo value. logo_url is optional. Without a file, omitting logo_url retains the current validated logo; explicit empty string restores the default logo. With a file, omission is allowed and the uploaded file becomes the canonical logo.

- Status: **200, 400, 401, 403, 500**; body `application/json` atau `multipart/form-data`.
- Field non-logo wajib: `school_name`, `primary_color`, `schedule_start`, `schedule_end`, `lesson_duration`. Nama sekolah trim 1–150 tanpa kontrol/<>; warna #RRGGBB; jam HH:mm, akhir setelah awal; durasi integer 1 sampai rentang menit. Field tidak dikenal diabaikan setelah parsing; batas Multer tetap berlaku.
- URL remote tidak di-fetch server; tanpa kredensial, IP/local host, query atau fragment. Upload disimpan ke `backend/uploads/branding` dengan nama acak milik server, static `/uploads` sudah di-mount. URL untuk tampilan dapat diberi origin asset/API frontend; nilai simpan lokal tetap path kanonis, bukan display URL.
- Multer membatasi 1 file `logo`, 6 field teks, 7 parts, 8192 byte per field. MulterError: 400 `{message:"Unggah satu logo gambar, maksimal 2 MB."}`. Gambar tidak valid: 400 `{message:"Logo harus PNG/JPG/WebP/GIF asli, maksimal 2 MB."}`. Error tak terduga: 500 `{message:"Gagal memproses pengaturan."}`.

Contoh field body (JSON; untuk multipart gunakan field teks yang sama):
```json
{
  "school_name": "Sekolah Contoh",
  "logo_url": "",
  "primary_color": "#800000",
  "schedule_start": "07:00",
  "schedule_end": "17:00",
  "lesson_duration": 60
}
```

Contoh respons 200 (ilustratif, dapat parsial):
```json
{
  "data": {
    "school_name": "Sekolah Contoh",
    "logo_url": "",
    "primary_color": "#800000",
    "schedule_start": "07:00",
    "schedule_end": "17:00",
    "lesson_duration": 60
  },
  "message": "Pengaturan berhasil disimpan."
}
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 200
{ data: await service.update(validatedBody, req.file), message: 'Pengaturan berhasil disimpan.' } // validatedBody: multipart lesson_duration digit text → number; JSON unchanged
// HTTP 400
{ message: error.message }
// HTTP 500
{ message: 'Gagal memproses pengaturan.' }
```

Proyeksi SQL yang menentukan field hasil controller (varian list/detail bisa berbeda):
```sql
school_name, logo_url, primary_color, schedule_start, schedule_end, lesson_duration
```

### GET `/api/activity-logs`

Sumber: backend/router/activityLogRoutes.js → backend/controllers/activityLogController.js#createActivityLogController(database). Akses: Admin. Admin saja. page string integer positif sampai 7 digit, default 1; limit 1–100, default 20. Urut id DESC. Data: id,user_id,username,role,method,path,action,status_code,duration_ms,created_at; pagination: page,limit,total,total_pages.

- Akses: **Admin**.
- Status yang didokumentasikan: `200`, `400`, `401`, `403`, `500`.
- Parameter: `limit` (query, opsional); `page` (query, opsional).

Contoh respons 200 (ilustratif, dapat parsial):
```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "total_pages": 0
  }
}
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 400
{ message: 'page harus positif; limit 1–100.' }
// HTTP 200
{ data, pagination: { page, limit, total: Number(count.total), total_pages: Math.ceil(Number(count.total) / limit) } }
```

Proyeksi SQL yang menentukan field hasil controller (varian list/detail bisa berbeda):
```sql
COUNT(*) AS total

id, user_id, username, role, method, path, action, status_code, duration_ms, created_at
```

### GET `/api/user`

Sumber: backend/router/userRoutes.js → backend/controllers/userController.js#getAllUser. Akses: Token; semua role. Data user tidak memuat password; daftar tidak memilih is_online, sedangkan detail/create/update memilih is_online.

- Akses: **Token; semua role**.
- Status yang didokumentasikan: `200`, `401`, `403`, `500`.

Contoh respons 200 (ilustratif, dapat parsial):
```json
{
  "message": "Berhasil Mengambil Data User",
  "data": [
    {
      "user_id": 1,
      "username": "guru.contoh",
      "nama_lengkap": "Guru Contoh",
      "email": "guru@example.com",
      "role": "Guru"
    }
  ]
}
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 200
{ data: rows, message: 'Berhasil Mengambil Data User' }
```

### GET `/api/user/detail/:id`

Sumber: backend/router/userRoutes.js → backend/controllers/userController.js#getUserById. Akses: Token; semua role.

- Akses: **Token; semua role**.
- Status yang didokumentasikan: `200`, `400`, `401`, `403`, `404`, `500`.
- Parameter: `id` (path, wajib).

Contoh respons 200 (ilustratif, dapat parsial):
```json
{
  "message": "Berhasil Mengambil Data User",
  "data": {
    "user_id": 1,
    "username": "guru.contoh",
    "nama_lengkap": "Guru Contoh",
    "email": "guru@example.com",
    "role": "Guru",
    "is_online": false
  }
}
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 200
{ data: row, message: 'Berhasil Mengambil Data User' }
```

### POST `/api/user/create`

Sumber: backend/router/userRoutes.js → backend/controllers/userController.js#createUser. Akses: Admin. Field wajib yang kosong menghasilkan 409 (bukan 400). Username/email duplikat 409. Role create dinormalisasi ke enum Prisma: Guru, Admin, Teknisi, Kepala_Lab, Koordinator_Lab. Role JWT/otorisasi memakai label DB dengan spasi.

- Akses: **Admin**.
- Status yang didokumentasikan: `201`, `400`, `401`, `403`, `409`, `500`.
- Body: `application/json`.
- Wajib oleh validasi aplikasi: `username`, `password`, `nama_lengkap`, `email`, `role`.

Contoh field body (JSON; untuk multipart gunakan field teks yang sama):
```json
{
  "username": "guru.contoh",
  "password": "<PASSWORD_PENGGUNA>",
  "nama_lengkap": "Guru Contoh",
  "email": "guru@example.com",
  "role": "Guru"
}
```

Contoh respons 201 (ilustratif, dapat parsial):
```json
{
  "message": "User Berhasil Ditambahkan",
  "data": {
    "username": "guru.contoh",
    "nama_lengkap": "Guru Contoh",
    "email": "guru@example.com",
    "role": "Guru"
  }
}
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 201
{ data: created, message: 'User Berhasil Ditambahkan' }
```

### PUT `/api/user/update/:id`

Sumber: backend/router/userRoutes.js → backend/controllers/userController.js#updateUser. Akses: Admin. Update parsial. Password kosong tidak diganti. is_online dikonversi dengan !!nilai; gunakan boolean JSON, bukan string. Role update tidak melalui coerceUserRole.

- Akses: **Admin**.
- Status yang didokumentasikan: `200`, `400`, `401`, `403`, `404`, `409`, `500`.
- Parameter: `id` (path, wajib).
- Body: `application/json`.
- Wajib oleh validasi aplikasi: tidak ada pemeriksaan wajib eksplisit pada controller ini; constraint DB tetap berlaku.

Contoh field body (JSON; untuk multipart gunakan field teks yang sama):
```json
{
  "nama_lengkap": "Guru Contoh",
  "email": "guru@example.com",
  "role": "Guru",
  "is_online": false
}
```

Contoh respons 200 (ilustratif, dapat parsial):
```json
{
  "message": "User Berhasil Diupdate",
  "data": {
    "nama_lengkap": "Guru Contoh",
    "email": "guru@example.com",
    "role": "Guru",
    "is_online": false
  }
}
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 200
{ data: updated, message: 'User Berhasil Diupdate' }
```

### DELETE `/api/user/delete/:id`

Sumber: backend/router/userRoutes.js → backend/controllers/userController.js#deleteUser. Akses: Admin. Sumber guard: `backend/services/deletionService.js#remove` dan `sendDeletionError`.

- Status: **200, 400, 401, 403, 404, 409, 500**. ID desimal positif tanpa nol awal, maksimum 2147483647.
- Kepala Lab pada perangkat/pemeriksaan di luar lab miliknya: **403**, bukan 404.
- Sukses 200 `{"message": "User Berhasil Dihapus"}`.
- 400 `{message:"ID harus berupa bilangan bulat positif yang valid."}`; 404 `{message:"Data tidak ditemukan."}`; 500 `{message:"Gagal memproses penghapusan. Silakan coba kembali."}`. Error auth tetap `{msg}`/`{message}` sesuai middleware.
- **409 `{message,data}`**: `data` sama bentuknya dengan preview (lihat bagian deletion di bawah). Self-delete akun aktif dan semua dependensi memblokir; tidak ada cascade/unlink otomatis. FK conflict 1451 juga 409 dengan blocker generik `dependency`, `path:null`, `action:"Muat ulang rincian"`.
- Penghapusan mengulang inspeksi dalam transaksi SERIALIZABLE, memakai lock/current reads; preview bukan reservasi/jaminan hasil DELETE. Foto lab/perangkat dibersihkan best-effort hanya sesudah commit.


### POST `/api/auth/login`

Sumber: backend/router/authRoutes.js → backend/controllers/authController.js#login. Akses: Tanpa middleware auth.

- Akses: **Tanpa middleware auth**.
- Status yang didokumentasikan: `200`, `400`, `401`, `500`.
- Body: `application/json`.
- Wajib oleh validasi aplikasi: `username`, `password`.

Contoh field body (JSON; untuk multipart gunakan field teks yang sama):
```json
{
  "username": "guru.contoh",
  "password": "<PASSWORD_PENGGUNA>"
}
```

Contoh respons 200 (ilustratif, dapat parsial):
```json
{
  "msg": "Login successful",
  "userId": 1,
  "token": "<ACCESS_TOKEN_DARI_LOGIN>",
  "username": "guru.contoh",
  "fullName": "Guru Contoh",
  "email": "guru@example.com",
  "role": "Guru"
}
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 400
{ message: 'Username dan Password wajib diisi.' }
// HTTP 401
{ message: 'Username atau Password Salah' }
// HTTP 401
{ message: 'Username atau Password Salah' }
// HTTP 200
responsePayload
// HTTP 500
{
        msg: "Login Failed",
        error: error.message,
      }
```

Proyeksi SQL yang menentukan field hasil controller (varian list/detail bisa berbeda):
```sql
*

lab_id
```

### POST `/api/auth/logout`

Sumber: backend/router/authRoutes.js → backend/controllers/authController.js#logout. Akses: Token; semua role.

- Akses: **Token; semua role**.
- Status yang didokumentasikan: `200`, `401`, `403`, `500`.

Contoh respons 200 (ilustratif, dapat parsial):
```json
{
  "message": "Logout successful"
}
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 200
{ message: 'Logout successful' }
// HTTP 500
{
      msg: "Logout Failed",
      error: error.message,
    }
```

### POST `/api/auth/refresh-token`

Sumber: backend/router/authRoutes.js → backend/controllers/authController.js#refreshToken. Akses: Tanpa middleware auth.

- Akses: **Tanpa middleware auth**.
- Status yang didokumentasikan: `200`, `401`, `403`, `500`.

Contoh respons 200 (ilustratif, dapat parsial):
```json
{
  "token": "<ACCESS_TOKEN_BARU>",
  "userId": 1,
  "username": "guru.contoh",
  "fullName": "Guru Contoh",
  "role": "Guru"
}
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 401
{ message: 'Refresh token tidak ditemukan' }
// HTTP 403
{ message: 'User tidak lagi valid.' }
// HTTP 200
responsePayload
// HTTP 403
{ message: 'Refresh token kedaluwarsa, silakan login kembali.' }
// HTTP 403
{ message: 'Refresh token tidak valid.' }
```

Proyeksi SQL yang menentukan field hasil controller (varian list/detail bisa berbeda):
```sql
*

lab_id
```

### GET `/api/lab`

Sumber: backend/router/labRoutes.js → backend/controllers/labController.js#getAllLab. Akses: Token; semua role.

- Akses: **Token; semua role**.
- Status yang didokumentasikan: `200`, `401`, `403`, `500`.

Contoh respons 200 (ilustratif, dapat parsial):
```json
{
  "message": "Berhasil Mengambil Data Lab",
  "data": [
    {
      "lab_id": 1,
      "nama_lab": "Lab Komputer 1",
      "lokasi": "Gedung A",
      "kapasitas": 30,
      "kepala_lab_id": 2,
      "deskripsi": "Laboratorium komputer",
      "status": "Tersedia",
      "jam_buka": "07:00",
      "jam_tutup": "17:00",
      "foto_lab": null,
      "nama_kepala_lab": "Kepala Lab Contoh",
      "kepala_lab": {
        "user_id": 2,
        "nama_lengkap": "Kepala Lab Contoh"
      }
    }
  ]
}
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 200
{
      data: formattedData,
      message: 'Berhasil Mengambil Data Lab'
    }
// HTTP 500
{ 
      message: 'Mengambil Data Lab Gagal',
      error: error.message,
    }
```

Proyeksi SQL yang menentukan field hasil controller (varian list/detail bisa berbeda):
```sql
l.lab_id,
        l.nama_lab,
        l.lokasi,
        l.kapasitas,
        l.kepala_lab_id,
        u.nama_lengkap AS nama_kepala_lab, -- Nama kepala lab dari tabel user
        l.deskripsi,
        l.status,
        l.jam_buka,
        l.jam_tutup,
        l.foto_lab
```

### GET `/api/lab/:id`

Sumber: backend/router/labRoutes.js → backend/controllers/labController.js#getLabById. Akses: Token; semua role.

- Akses: **Token; semua role**.
- Status yang didokumentasikan: `200`, `401`, `403`, `404`, `500`.
- Parameter: `id` (path, wajib).

Contoh respons 200 (ilustratif, dapat parsial):
```json
{
  "message": "Berhasil Mengambil Data Lab",
  "data": {
    "lab_id": 1,
    "nama_lab": "Lab Komputer 1",
    "lokasi": "Gedung A",
    "kapasitas": 30,
    "kepala_lab_id": 2,
    "deskripsi": "Laboratorium komputer",
    "status": "Tersedia",
    "jam_buka": "07:00",
    "jam_tutup": "17:00",
    "foto_lab": null,
    "nama_kepala_lab": "Kepala Lab Contoh",
    "kepala_lab": {
      "user_id": 2,
      "nama_lengkap": "Kepala Lab Contoh"
    }
  }
}
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 404
{ 
        message: 'Data Lab Tidak Ditemukan' 
      }
// HTTP 200
{
      data: formattedData,
      message: 'Berhasil Mengambil Data Lab'
    }
// HTTP 500
{ 
      message: 'Mengambil Data Lab Gagal',
      error: error.message,
    }
```

Proyeksi SQL yang menentukan field hasil controller (varian list/detail bisa berbeda):
```sql
l.lab_id,
        l.nama_lab,
        l.lokasi,
        l.kapasitas,
        l.kepala_lab_id,
        u.nama_lengkap AS nama_kepala_lab, -- Nama kepala lab
        l.deskripsi,
        l.status,
        l.jam_buka,
        l.jam_tutup,
        l.foto_lab
```

### POST `/api/lab/create`

Sumber: backend/router/labRoutes.js → backend/controllers/labController.js#createLab. Akses: Admin, Koordinator Lab. Semua field selain deskripsi dan foto diperiksa truthy. Foto opsional.

- Akses: **Admin, Koordinator Lab**.
- Status yang didokumentasikan: `201`, `400`, `401`, `403`, `500`.
- Body: `multipart/form-data` (file opsional) atau `application/json`.
- Wajib oleh validasi aplikasi: `nama_lab`, `lokasi`, `kapasitas`, `kepala_lab_id`, `status`, `jam_buka`, `jam_tutup`.

Contoh field body (JSON; untuk multipart gunakan field teks yang sama):
```json
{
  "nama_lab": "Lab Komputer 1",
  "lokasi": "Gedung A",
  "kapasitas": 30,
  "kepala_lab_id": 2,
  "deskripsi": "Laboratorium komputer",
  "status": "Tersedia",
  "jam_buka": "07:00",
  "jam_tutup": "17:00"
}
```
File opsional: `foto_lab` (binary).

Contoh respons 201 (ilustratif, dapat parsial):
```json
{
  "message": "Data Lab Berhasil Ditambahkan",
  "data": {
    "lab_id": 1,
    "nama_lab": "Lab Komputer 1",
    "lokasi": "Gedung A",
    "kapasitas": 30,
    "kepala_lab_id": 2,
    "deskripsi": "Laboratorium komputer",
    "status": "Tersedia",
    "jam_buka": "07:00",
    "jam_tutup": "17:00",
    "foto_lab": null,
    "nama_kepala_lab": "Kepala Lab Contoh"
  }
}
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 400
{ message: "Semua field yang wajib diisi harus lengkap." }
// HTTP 201
{ 
      data: newLabData.length > 0 ? newLabData[0] : { id: newLabId, ...req.body, foto_lab: foto_lab_filename }, // Fallback jika join gagal
      message: 'Data Lab Berhasil Ditambahkan'
    }
// HTTP 500
{ 
      message: 'Membuat Data Lab Baru Gagal',
      error: error.message,
    }
```

Proyeksi SQL yang menentukan field hasil controller (varian list/detail bisa berbeda):
```sql
l.*, u.nama_lengkap AS nama_kepala_lab
```

### PUT `/api/lab/update/:id`

Sumber: backend/router/labRoutes.js → backend/controllers/labController.js#updateLab. Akses: Admin, Koordinator Lab. Semua field wajib harus dikirim ulang. Foto lama dipertahankan bila tidak ada upload baru.

- Akses: **Admin, Koordinator Lab**.
- Status yang didokumentasikan: `200`, `400`, `401`, `403`, `404`, `500`.
- Parameter: `id` (path, wajib).
- Body: `multipart/form-data` (file opsional) atau `application/json`.
- Wajib oleh validasi aplikasi: `nama_lab`, `lokasi`, `kapasitas`, `kepala_lab_id`, `status`, `jam_buka`, `jam_tutup`.

Contoh field body (JSON; untuk multipart gunakan field teks yang sama):
```json
{
  "nama_lab": "Lab Komputer 1",
  "lokasi": "Gedung A",
  "kapasitas": 30,
  "kepala_lab_id": 2,
  "deskripsi": "Laboratorium komputer",
  "status": "Tersedia",
  "jam_buka": "07:00",
  "jam_tutup": "17:00"
}
```
File opsional: `foto_lab` (binary).

Contoh respons 200 (ilustratif, dapat parsial):
```json
{
  "message": "Data Lab Berhasil Diupdate",
  "data": {
    "lab_id": 1,
    "nama_lab": "Lab Komputer 1",
    "lokasi": "Gedung A",
    "kapasitas": 30,
    "kepala_lab_id": 2,
    "deskripsi": "Laboratorium komputer",
    "status": "Tersedia",
    "jam_buka": "07:00",
    "jam_tutup": "17:00",
    "foto_lab": null,
    "nama_kepala_lab": "Kepala Lab Contoh"
  }
}
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 400
{ message: "Semua field yang wajib diisi harus lengkap." }
// HTTP 404
{ message: "Data Lab Tidak Ditemukan" }
// HTTP 404
{ message: "Data Lab Tidak Ditemukan saat update" }
// HTTP 200
{
      data: updatedLabData.length > 0 ? updatedLabData[0] : { id, ...req.body, foto_lab: newFotoLabBasename }, // Fallback
      message: "Data Lab Berhasil Diupdate",
    }
// HTTP 500
{
      message: "Mengupdate Data Lab Gagal",
      error: error.message,
    }
```

Proyeksi SQL yang menentukan field hasil controller (varian list/detail bisa berbeda):
```sql
foto_lab

l.*, u.nama_lengkap AS nama_kepala_lab
```

### DELETE `/api/lab/delete/:id`

Sumber: backend/router/labRoutes.js → backend/controllers/labController.js#deleteLab. Akses: Admin, Koordinator Lab. Sumber guard: `backend/services/deletionService.js#remove` dan `sendDeletionError`.

- Status: **200, 400, 401, 403, 404, 409, 500**. ID desimal positif tanpa nol awal, maksimum 2147483647.
- Kepala Lab pada perangkat/pemeriksaan di luar lab miliknya: **403**, bukan 404.
- Sukses 200 `{"message": "Data Lab Berhasil Dihapus"}`.
- 400 `{message:"ID harus berupa bilangan bulat positif yang valid."}`; 404 `{message:"Data tidak ditemukan."}`; 500 `{message:"Gagal memproses penghapusan. Silakan coba kembali."}`. Error auth tetap `{msg}`/`{message}` sesuai middleware.
- **409 `{message,data}`**: `data` sama bentuknya dengan preview (lihat bagian deletion di bawah). Self-delete akun aktif dan semua dependensi memblokir; tidak ada cascade/unlink otomatis. FK conflict 1451 juga 409 dengan blocker generik `dependency`, `path:null`, `action:"Muat ulang rincian"`.
- Penghapusan mengulang inspeksi dalam transaksi SERIALIZABLE, memakai lock/current reads; preview bukan reservasi/jaminan hasil DELETE. Foto lab/perangkat dibersihkan best-effort hanya sesudah commit.


### GET `/api/perangkat`

Sumber: backend/router/deviceRoutes.js → backend/controllers/deviceController.js#getAllDevice. Akses: Token; semua role.  Route duplikat berikut terdaftar tetapi tertutup handler ini: getAllLaporanPerangkat.

- Akses: **Token; semua role**.
- Status yang didokumentasikan: `200`, `401`, `403`, `500`.

Contoh respons 200 (ilustratif, dapat parsial):
```json
{
  "message": "Berhasil Mengambil Data Perangkat",
  "data": [
    {
      "perangkat_id": 1,
      "nama_perangkat": "PC-01",
      "spesifikasi": "RAM 8 GB",
      "status": "Baik",
      "lab_id": 1,
      "nomor_inventaris": "INV-CONTOH-01",
      "foto_perangkat": null,
      "nama_lab": "Lab Komputer 1"
    }
  ]
}
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 200
{
      data: rows,
      message: 'Berhasil Mengambil Data Perangkat'
    }
// HTTP 500
{ 
      message: 'Mengambil Data Perangkat Gagal' , // Pesan disesuaikan sedikit
      error: error.message,
    }
```

Proyeksi SQL yang menentukan field hasil controller (varian list/detail bisa berbeda):
```sql
p.perangkat_id,
         p.nama_perangkat,
         p.spesifikasi,
         p.status,
         p.lab_id,
         p.foto_perangkat,
         p.nomor_inventaris,
         l.nama_lab -- Tambahkan kolom nama_lab dari tabel laboratorium
```

Handler tertutup `getAllLaporanPerangkat` — sumber `backend/controllers/laporanPerangkatController.js`; **bukan respons operasi aktif di atas**.
BUG ROUTER: laporanPerangkat mengimpor router deviceRoutes, bukan Router baru. GET / pertama selalu ditangani getAllDevice sehingga handler daftar laporan tertutup pada kedua mount. Handler laporan sendiri memfilter jenis_laporan Bermasalah, berbeda dengan create/detail Perbaikan.

Ekspresi handler tertutup:
```js
// HTTP 200
{
      message: "Berhasil mengambil semua laporan perangkat",
      data: rows
    }
// HTTP 500
{
      message: "Gagal mengambil laporan perangkat",
      error: error.message
    }
```

### GET `/api/perangkat/:id`

Sumber: backend/router/deviceRoutes.js → backend/controllers/deviceController.js#getDeviceById. Akses: Token; semua role.

- Akses: **Token; semua role**.
- Status yang didokumentasikan: `200`, `401`, `403`, `404`, `500`.
- Parameter: `id` (path, wajib).

Contoh respons 200 (ilustratif, dapat parsial):
```json
{
  "message": "Berhasil Mengambil Data Perangkat",
  "data": {
    "perangkat_id": 1,
    "nama_perangkat": "PC-01",
    "spesifikasi": "RAM 8 GB",
    "status": "Baik",
    "lab_id": 1,
    "nomor_inventaris": "INV-CONTOH-01",
    "foto_perangkat": null,
    "nama_lab": "Lab Komputer 1"
  }
}
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 404
{ 
        message: 'Data Perangkat Tidak Ditemukan' // Pesan disesuaikan
      }
// HTTP 200
{
      data: rows[0],
      message: 'Berhasil Mengambil Data Perangkat'
    }
// HTTP 500
{ 
      message: 'Mengambil Data Perangkat Gagal' ,
      error: error.message,
    }
```

Proyeksi SQL yang menentukan field hasil controller (varian list/detail bisa berbeda):
```sql
p.perangkat_id,
         p.nama_perangkat,
         p.spesifikasi,
         p.status,
         p.lab_id,
         p.foto_perangkat,
         p.nomor_inventaris,
         l.nama_lab -- Tambahkan kolom nama_lab dari tabel laboratorium
```

### POST `/api/perangkat/create`

Sumber: backend/router/deviceRoutes.js → backend/controllers/deviceController.js#createDevice. Akses: Admin, Kepala Lab. Controller tidak memvalidasi field wajib secara eksplisit; kelengkapan/FK bergantung DB. Foto opsional. Route duplikat berikut terdaftar tetapi tertutup handler ini: createLaporanPerangkat.

- Akses: **Admin, Kepala Lab**.
- Status yang didokumentasikan: `201`, `401`, `403`, `500`.
- Body: `multipart/form-data` (file opsional) atau `application/json`.
- Wajib oleh validasi aplikasi: tidak ada pemeriksaan wajib eksplisit pada controller ini; constraint DB tetap berlaku.

Contoh field body (JSON; untuk multipart gunakan field teks yang sama):
```json
{
  "nama_perangkat": "PC-01",
  "spesifikasi": "RAM 8 GB",
  "status": "Baik",
  "lab_id": 1,
  "nomor_inventaris": "INV-CONTOH-01"
}
```
File opsional: `foto_perangkat` (binary).

Contoh respons 201 (ilustratif, dapat parsial):
```json
{
  "message": "Data Perangkat Baru Berhasil Ditambahkan",
  "data": {
    "perangkat_id": 1,
    "nama_perangkat": "PC-01",
    "spesifikasi": "RAM 8 GB",
    "status": "Baik",
    "lab_id": 1,
    "nomor_inventaris": "INV-CONTOH-01",
    "foto_perangkat": null,
    "nama_lab": "Lab Komputer 1"
  }
}
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 201
{
      data: newDeviceRows[0], // Mengirim data lengkap termasuk nama_lab
      message: "Data Perangkat Baru Berhasil Ditambahkan"
    }
// HTTP 500
{ 
      message: 'Membuat Perangkat Baru Gagal' ,
      error: error.message,
    }
```

Proyeksi SQL yang menentukan field hasil controller (varian list/detail bisa berbeda):
```sql
p.*, l.nama_lab
```

Handler tertutup `createLaporanPerangkat` — sumber `backend/controllers/laporanPerangkatController.js`; **bukan respons operasi aktif di atas**.
BUG ROUTER: POST /create telah ditangani createDevice lebih dulu; permintaan role Admin menuju handler perangkat, Teknisi ditolak otorisasi perangkat. Handler laporan ini tidak terjangkau melalui route ini. Jika diperbaiki, body adalah periode/file_path JSON (bukan upload), memakai req.user.user_id yang tidak sama dengan payload JWT id.

Body kontrak handler tertutup (tidak aktif):
```json
{
  "periode": "2026-11",
  "file_path": "laporan-contoh.pdf"
}
```
Ekspresi handler tertutup:
```js
// HTTP 201
{
      message: "Laporan perangkat berhasil dibuat",
      data: {
        laporan_id: result.insertId,
        periode,
        file_path,
        dibuat_oleh
      }
    }
// HTTP 500
{
      message: "Gagal membuat laporan perangkat",
      error: error.message
    }
```

### PUT `/api/perangkat/update/:id`

Sumber: backend/router/deviceRoutes.js → backend/controllers/deviceController.js#updateDevice. Akses: Admin, Kepala Lab. Bukan PATCH; kirim ulang field perangkat. Foto lama dipertahankan bila tidak ada upload baru.

- Akses: **Admin, Kepala Lab**.
- Status yang didokumentasikan: `200`, `401`, `403`, `404`, `500`.
- Parameter: `id` (path, wajib).
- Body: `multipart/form-data` (file opsional) atau `application/json`.
- Wajib oleh validasi aplikasi: tidak ada pemeriksaan wajib eksplisit pada controller ini; constraint DB tetap berlaku.

Contoh field body (JSON; untuk multipart gunakan field teks yang sama):
```json
{
  "nama_perangkat": "PC-01",
  "spesifikasi": "RAM 8 GB",
  "status": "Baik",
  "lab_id": 1,
  "nomor_inventaris": "INV-CONTOH-01"
}
```
File opsional: `foto_perangkat` (binary).

Contoh respons 200 (ilustratif, dapat parsial):
```json
{
  "message": "Data Perangkat Berhasil Diupdate",
  "data": {
    "perangkat_id": 1,
    "nama_perangkat": "PC-01",
    "spesifikasi": "RAM 8 GB",
    "status": "Baik",
    "lab_id": 1,
    "nomor_inventaris": "INV-CONTOH-01",
    "foto_perangkat": null,
    "nama_lab": "Lab Komputer 1"
  }
}
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 404
{ 
        message: 'Data Perangkat Tidak Ditemukan untuk diupdate' 
      }
// HTTP 404
{ message: "Data Perangkat tidak ditemukan setelah update." }
// HTTP 200
{
      data: updatedDeviceRows[0], // Mengirim data lengkap termasuk nama_lab
      message: 'Data Perangkat Berhasil Diupdate'
    }
// HTTP 500
{ 
      message: 'Mengupdate Data Perangkat Gagal' ,
      error: error.message,
    }
```

Proyeksi SQL yang menentukan field hasil controller (varian list/detail bisa berbeda):
```sql
foto_perangkat, lab_id

p.*, l.nama_lab
```

### DELETE `/api/perangkat/delete/:id`

Sumber: backend/router/deviceRoutes.js → backend/controllers/deviceController.js#deleteDevice. Akses: Admin, Kepala Lab. Sumber guard: `backend/services/deletionService.js#remove` dan `sendDeletionError`.

- Status: **200, 400, 401, 403, 404, 409, 500**. ID desimal positif tanpa nol awal, maksimum 2147483647.
- Kepala Lab pada perangkat/pemeriksaan di luar lab miliknya: **403**, bukan 404.
- Sukses 200 `{"message": "Data Perangkat Berhasil Dihapus"}`.
- 400 `{message:"ID harus berupa bilangan bulat positif yang valid."}`; 404 `{message:"Data tidak ditemukan."}`; 500 `{message:"Gagal memproses penghapusan. Silakan coba kembali."}`. Error auth tetap `{msg}`/`{message}` sesuai middleware.
- **409 `{message,data}`**: `data` sama bentuknya dengan preview (lihat bagian deletion di bawah). Self-delete akun aktif dan semua dependensi memblokir; tidak ada cascade/unlink otomatis. FK conflict 1451 juga 409 dengan blocker generik `dependency`, `path:null`, `action:"Muat ulang rincian"`.
- Penghapusan mengulang inspeksi dalam transaksi SERIALIZABLE, memakai lock/current reads; preview bukan reservasi/jaminan hasil DELETE. Foto lab/perangkat dibersihkan best-effort hanya sesudah commit.

Handler tertutup `deleteLaporanPerangkat` — sumber `backend/controllers/laporanPerangkatController.js`; **bukan respons operasi aktif di atas**.
BUG ROUTER: DELETE /delete/:id tertutup deleteDevice pada kedua mount. Jangan menganggap endpoint ini menghapus laporan; saat ini dapat menghapus perangkat.

Ekspresi handler tertutup:
```js
// HTTP 404
{ message: "Laporan tidak ditemukan" }
// HTTP 200
{
      message: "Laporan perangkat berhasil dihapus"
    }
// HTTP 500
{
      message: "Gagal menghapus laporan perangkat",
      error: error.message
    }
```


### GET `/api/perangkat/:id/detail`

Sumber: backend/router/laporanPerangkat.js → backend/controllers/laporanPerangkatController.js#getDetailLaporanPerangkat. Akses: Admin, Teknisi. Route /:id/detail tidak tertutup /:id karena jumlah segmen berbeda. Mengembalikan {data:{laporan,detail},message}; detail menggabungkan pemeriksaan, pengecekan, dan perbaikan berdasarkan periode laporan. Tidak ada ekspor PDF/Excel otomatis.

- Akses: **Admin, Teknisi**.
- Status yang didokumentasikan: `200`, `401`, `403`, `404`, `500`.
- Parameter: `id` (path, wajib).

Contoh respons 200 (ilustratif, dapat parsial):
```json
{
  "message": "Berhasil mengambil detail laporan perangkat",
  "data": {
    "laporan": {
      "laporan_id": 1,
      "periode": "2026-11",
      "jenis_laporan": "Perbaikan"
    },
    "detail": []
  }
}
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 404
{ message: "Laporan tidak ditemukan" }
// HTTP 200
{
      message: "Berhasil mengambil detail laporan perangkat",
      data: {
        laporan,
        detail: detailRows
      }
    }
// HTTP 500
{
      message: "Gagal mengambil detail laporan perangkat",
      error: error.message
    }
```

Proyeksi SQL yang menentukan field hasil controller (varian list/detail bisa berbeda):
```sql
l.*, u.nama_lengkap AS pembuat

d.nama_perangkat,
        l.nama_lab,
        p.tanggal_pemeriksaan,
        p.hasil_pemeriksaan,
        p.catatan AS catatan_pemeriksaan,
        u_p.nama_lengkap AS teknisi_pemeriksa,

        c.tanggal_pengecekan,
        c.ditemukan_kerusakan,
        u_c.nama_lengkap AS teknisi_pengecek,

        r.tanggal_perbaikan,
        r.tindakan,
        r.hasil_perbaikan,
        r.catatan_tambahan,
        u_r.nama_lengkap AS teknisi_perbaikan
```

### GET `/api/pemeriksaan`

Sumber: backend/router/pemerikasaanRouter.js → backend/controllers/pemeriksaanController.js#getAllPemeriksaan. Akses: Token; semua role. Kepala Lab hanya melihat laboratorium miliknya; urutan tanggal dan ID pemeriksaan menurun. Field SELECT bersama selectInspection ikut menentukan respons.

- Akses: **Token; semua role**.
- Status yang didokumentasikan: `200`, `401`, `403`, `500`.

Contoh respons 200 (ilustratif, dapat parsial):
```json
{
  "data": [
    {
      "pemeriksaan_id": 1,
      "tanggal_pemeriksaan": "2026-11-02",
      "hasil_pemeriksaan": "Bermasalah",
      "catatan": "Tidak menyala",
      "pemeriksa_user_id": 2,
      "nama_pemeriksa": "Pemeriksa Contoh",
      "perangkat_id": 1,
      "nama_perangkat": "PC-01",
      "nomor_inventaris": "INV-CONTOH-01",
      "lab_id": 1,
      "nama_lab": "Lab Komputer 1"
    }
  ]
}
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 200
{ data: rows }
// HTTP 500
{ message: 'Gagal mengambil pemeriksaan.', error: error.message }
```

### GET `/api/pemeriksaan/:id`

Sumber: backend/router/pemerikasaanRouter.js → backend/controllers/pemeriksaanController.js#getPemeriksaanById. Akses: Token; semua role. Kepala Lab dibatasi lab miliknya (404 bila tidak tersedia). data berisi kolom selectInspection beserta array pengecekan dan perbaikan; masing-masing diurutkan ID menaik. Array riwayat dapat kosong.

- Akses: **Token; semua role**.
- Status yang didokumentasikan: `200`, `401`, `403`, `404`, `500`.
- Parameter: `id` (path, wajib).

Contoh respons 200 (ilustratif, dapat parsial):
```json
{
  "data": {
    "pemeriksaan_id": 1,
    "tanggal_pemeriksaan": "2026-11-02",
    "hasil_pemeriksaan": "Bermasalah",
    "catatan": "Tidak menyala",
    "pemeriksa_user_id": 2,
    "nama_pemeriksa": "Pemeriksa Contoh",
    "perangkat_id": 1,
    "nama_perangkat": "PC-01",
    "nomor_inventaris": "INV-CONTOH-01",
    "lab_id": 1,
    "nama_lab": "Lab Komputer 1",
    "user_id": 2,
    "kepala_lab_id": 2,
    "spesifikasi_perangkat": "RAM 8 GB",
    "status_perangkat_saat_ini": "Perlu Perbaikan",
    "pengecekan": [
      {
        "pengecekan_id": 1,
        "perangkat_id": 1,
        "tanggal_pengecekan": "2026-11-02",
        "ditemukan_kerusakan": "Gangguan catu daya",
        "pemeriksaan_id": 1,
        "status_pengecekan": "Baru",
        "nama_user": "Teknisi Contoh",
        "nama_perangkat": "PC-01",
        "nama_lab": "Lab Komputer 1"
      }
    ],
    "perbaikan": [
      {
        "perbaikan_id": 1,
        "pengecekan_id": 1,
        "tanggal_perbaikan": "2026-11-02",
        "tindakan": "Perbaikan catu daya",
        "hasil_perbaikan": "Berhasil",
        "catatan_tambahan": "Pengujian ulang selesai",
        "user_id": 3,
        "nama_user": "Teknisi Contoh",
        "perangkat_id_snapshot": 1,
        "nama_perangkat": "PC-01",
        "nama_lab": "Lab Komputer 1"
      }
    ]
  }
}
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 404
{ message: 'Pemeriksaan tidak ditemukan.' }
// HTTP 200
{ data: { ...rows[0], pengecekan, perbaikan } }
// HTTP 500
{ message: 'Gagal mengambil pemeriksaan.', error: error.message }
```

Proyeksi SQL yang menentukan field hasil controller (varian list/detail bisa berbeda):
```sql
pc.*, u.nama_lengkap AS nama_user

pb.*, u.nama_lengkap AS nama_user
```

### POST `/api/pemeriksaan/create`

Sumber: backend/router/pemerikasaanRouter.js → backend/controllers/pemeriksaanController.js#createPemeriksaan. Akses: Admin, Kepala Lab. Identitas pemeriksa selalu req.user.id; user_id body tidak dipercaya. Perangkat ID integer positif, tanggal parseable, hasil Baik/Bermasalah wajib. Kepala Lab dibatasi lab miliknya (404 di luar cakupan). Temuan Bermasalah otomatis membuat pengecekan Baru dan perangkat Perlu Perbaikan dalam transaksi.

- Akses: **Admin, Kepala Lab**.
- Status yang didokumentasikan: `201`, `400`, `401`, `403`, `404`, `500`.
- Body: `application/json`.
- Wajib oleh validasi aplikasi: `perangkat_id`, `tanggal_pemeriksaan`, `hasil_pemeriksaan`.

Contoh field body (JSON; untuk multipart gunakan field teks yang sama):
```json
{
  "perangkat_id": 1,
  "tanggal_pemeriksaan": "2026-11-02",
  "hasil_pemeriksaan": "Bermasalah",
  "catatan": "Tidak menyala"
}
```

Contoh respons 201 (ilustratif, dapat parsial):
```json
{
  "message": "Pemeriksaan tersimpan. Temuan bermasalah otomatis masuk antrian teknisi.",
  "data": {
    "perangkat_id": 1,
    "tanggal_pemeriksaan": "2026-11-02",
    "hasil_pemeriksaan": "Bermasalah",
    "catatan": "Tidak menyala",
    "id": 1,
    "pemeriksaan_id": 1,
    "user_id": 2
  }
}
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 400
{ message: 'Perangkat, tanggal dan hasil pemeriksaan wajib valid.' }
// HTTP 404
{ message: 'Perangkat tidak ditemukan dalam laboratorium Anda.' }
// HTTP 201
{ data: { ...b, id: result.insertId, pemeriksaan_id: result.insertId, user_id: req.user.id }, message: 'Pemeriksaan tersimpan. Temuan bermasalah otomatis masuk antrian teknisi.' }
// HTTP 500
{ message: 'Gagal menyimpan pemeriksaan.', error: error.message }
```

Proyeksi SQL yang menentukan field hasil controller (varian list/detail bisa berbeda):
```sql
pr.perangkat_id, l.kepala_lab_id
```

### PUT `/api/pemeriksaan/update/:id`

Sumber: backend/router/pemerikasaanRouter.js → backend/controllers/pemeriksaanController.js#updatePemeriksaan. Akses: Admin, Kepala Lab. Tanggal dan hasil wajib valid. Pemeriksa/perangkat awal tetap. Jika sudah ada tiket, perubahan hasil ditolak 409 karena status dimiliki alur perbaikan. Bermasalah tanpa tiket membuat tiket Baru. Transaksi tidak lagi memakai variabel query yang tidak didefinisikan.

- Akses: **Admin, Kepala Lab**.
- Status yang didokumentasikan: `200`, `400`, `401`, `403`, `404`, `409`, `500`.
- Parameter: `id` (path, wajib).
- Body: `application/json`.
- Wajib oleh validasi aplikasi: `tanggal_pemeriksaan`, `hasil_pemeriksaan`.

Contoh field body (JSON; untuk multipart gunakan field teks yang sama):
```json
{
  "tanggal_pemeriksaan": "2026-11-02",
  "hasil_pemeriksaan": "Baik",
  "catatan": "Sudah diperiksa"
}
```

Contoh respons 200 (ilustratif, dapat parsial):
```json
{
  "message": "Pemeriksaan berhasil diperbarui.",
  "data": {
    "tanggal_pemeriksaan": "2026-11-02",
    "hasil_pemeriksaan": "Baik",
    "catatan": "Sudah diperiksa"
  }
}
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 400
{ message: 'Tanggal dan hasil pemeriksaan wajib valid.' }
// HTTP 404
{ message: 'Pemeriksaan tidak ditemukan.' }
// HTTP 409
{ message: 'Status temuan disinkronkan oleh perbaikan teknisi. Buat pemeriksaan baru untuk masalah baru.' }
// HTTP 200
{ data: { ...original, ...b }, message: 'Pemeriksaan berhasil diperbarui.' }
// HTTP 500
{ message: 'Gagal memperbarui pemeriksaan.', error: error.message }
```

Proyeksi SQL yang menentukan field hasil controller (varian list/detail bisa berbeda):
```sql
*
```

### DELETE `/api/pemeriksaan/delete/:id`

Sumber: backend/router/pemerikasaanRouter.js → backend/controllers/pemeriksaanController.js#deletePemeriksaan. Akses: Admin, Kepala Lab. Sumber guard: `backend/services/deletionService.js#remove` dan `sendDeletionError`.

- Status: **200, 400, 401, 403, 404, 409, 500**. ID desimal positif tanpa nol awal, maksimum 2147483647.
- Kepala Lab pada perangkat/pemeriksaan di luar lab miliknya: **403**, bukan 404.
- Sukses 200 `{"message": "Pemeriksaan berhasil dihapus."}`.
- 400 `{message:"ID harus berupa bilangan bulat positif yang valid."}`; 404 `{message:"Data tidak ditemukan."}`; 500 `{message:"Gagal memproses penghapusan. Silakan coba kembali."}`. Error auth tetap `{msg}`/`{message}` sesuai middleware.
- **409 `{message,data}`**: `data` sama bentuknya dengan preview (lihat bagian deletion di bawah). Self-delete akun aktif dan semua dependensi memblokir; tidak ada cascade/unlink otomatis. FK conflict 1451 juga 409 dengan blocker generik `dependency`, `path:null`, `action:"Muat ulang rincian"`.
- Penghapusan mengulang inspeksi dalam transaksi SERIALIZABLE, memakai lock/current reads; preview bukan reservasi/jaminan hasil DELETE. Foto lab/perangkat dibersihkan best-effort hanya sesudah commit.


### GET `/api/pengumuman`

Sumber: backend/router/pengumumanRoutes.js → backend/controllers/pengumumanController.js#getAllAnnouncements. Akses: Tanpa middleware auth. GET publik tidak memfilter is_active dalam SQL getAllAnnouncements, walaupun teks pesan menyebut aktif. created_by objek {user_id,nama_lengkap}. Fungsi getAllActiveAnnouncements tidak dipasang sebagai endpoint.

- Akses: **Tanpa middleware auth**.
- Status yang didokumentasikan: `200`, `500`.

Contoh respons 200 (ilustratif, dapat parsial):
```json
{
  "message": "Berhasil mengambil semua pengumuman aktif",
  "data": [
    {
      "id": 1,
      "judul": "Pemeliharaan lab",
      "content": "Laboratorium menjalani pemeliharaan.",
      "file_path": null,
      "created_at": "2026-11-02T07:00:00.000Z",
      "is_active": 1,
      "created_by": {
        "user_id": 1,
        "nama_lengkap": "Admin Contoh"
      }
    }
  ]
}
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 200
{
      data: formattedData, // Kirim data yang sudah diformat
      message: "Berhasil mengambil semua pengumuman aktif",
    }
// HTTP 500
{ message: "Gagal mengambil data pengumuman", error: error.message }
```

Proyeksi SQL yang menentukan field hasil controller (varian list/detail bisa berbeda):
```sql
p.id,
        p.judul,
        p.content,
        p.file_path,  -- Menggunakan file_path standar, frontend Anda menggunakan ini
        p.created_at,
        p.is_active,
        p.created_by AS created_by_user_id, -- ID user yang membuat pengumuman
        u.nama_lengkap AS creator_nama_lengkap -- Nama lengkap user dari tabel user
```

### GET `/api/pengumuman/:id`

Sumber: backend/router/pengumumanRoutes.js → backend/controllers/pengumumanController.js#getAnnouncementById. Akses: Tanpa middleware auth.

- Akses: **Tanpa middleware auth**.
- Status yang didokumentasikan: `200`, `404`, `500`.
- Parameter: `id` (path, wajib).

Contoh respons 200 (ilustratif, dapat parsial):
```json
{
  "message": "Berhasil mengambil pengumuman",
  "data": {
    "id": 1,
    "judul": "Pemeliharaan lab",
    "content": "Laboratorium menjalani pemeliharaan.",
    "file_path": null,
    "created_at": "2026-11-02T07:00:00.000Z",
    "is_active": 1,
    "created_by": {
      "user_id": 1,
      "nama_lengkap": "Admin Contoh"
    }
  }
}
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 404
{ message: "Pengumuman tidak ditemukan" }
// HTTP 200
{
      data: formattedData, // Kirim data pengumuman tunggal yang sudah diformat
      message: "Berhasil mengambil pengumuman",
    }
// HTTP 500
{ message: "Gagal mengambil pengumuman", error: error.message }
```

Proyeksi SQL yang menentukan field hasil controller (varian list/detail bisa berbeda):
```sql
p.id,
        p.judul,
        p.content,
        p.file_path,  -- Menggunakan file_path standar
        p.created_at,
        p.is_active,
        p.created_by AS created_by_user_id, -- ID user yang membuat pengumuman
        u.nama_lengkap AS creator_nama_lengkap -- Nama lengkap user dari tabel user
```

### DELETE `/api/pengumuman/delete/:id`

Sumber: backend/router/pengumumanRoutes.js → backend/controllers/pengumumanController.js#deleteAnnouncement. Akses: Admin, Koordinator Lab.

- Akses: **Admin, Koordinator Lab**.
- Status yang didokumentasikan: `200`, `401`, `403`, `404`, `500`.
- Parameter: `id` (path, wajib).

Contoh respons 200 (ilustratif, dapat parsial):
```json
{
  "message": "Pengumuman berhasil dihapus"
}
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 404
{ message: "Pengumuman tidak ditemukan" }
// HTTP 200
{ message: "Pengumuman berhasil dihapus" }
// HTTP 500
{ message: "Gagal menghapus pengumuman", error: error.message }
```

Proyeksi SQL yang menentukan field hasil controller (varian list/detail bisa berbeda):
```sql
file_path
```

### POST `/api/pengumuman/create`

Sumber: backend/router/pengumumanRoutes.js → backend/controllers/pengumumanController.js#createAnnouncement. Akses: Admin, Koordinator Lab. Judul/content wajib. File opsional; created_by berasal dari identitas token. is_active dikonversi oleh controller; gunakan 1/0 pada multipart.

- Akses: **Admin, Koordinator Lab**.
- Status yang didokumentasikan: `201`, `400`, `401`, `403`, `500`.
- Body: `multipart/form-data` (file opsional) atau `application/json`.
- Wajib oleh validasi aplikasi: `judul`, `content`.

Contoh field body (JSON; untuk multipart gunakan field teks yang sama):
```json
{
  "judul": "Pemeliharaan lab",
  "content": "Laboratorium menjalani pemeliharaan.",
  "is_active": "1"
}
```
File opsional: `file_pengumuman` (binary).

Contoh respons 201 (ilustratif, dapat parsial):
```json
{
  "message": "Pengumuman berhasil dibuat",
  "data": {
    "id": 1,
    "judul": "Pemeliharaan lab",
    "content": "Laboratorium menjalani pemeliharaan.",
    "file_path": null,
    "is_active": 1,
    "created_by": {
      "user_id": 1,
      "nama_lengkap": "Admin Contoh"
    }
  }
}
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 401
{ message: "Autentikasi pengguna gagal atau ID pengguna tidak ditemukan." }
// HTTP 400
{ message: "Judul dan Konten tidak boleh kosong." }
// HTTP 201
{
      data: {
        id: result.insertId,
        judul,
        content,
        file_path: filePathInDB, // Konsisten dengan GET
        created_by: creatorInfo, // Kirim objek user
        is_active: activeStatusForDB // Kirim status yang disimpan di DB
      },
      message: "Pengumuman berhasil dibuat",
    }
// HTTP 500
{ message: "Gagal membuat pengumuman", error: error.message }
```

Proyeksi SQL yang menentukan field hasil controller (varian list/detail bisa berbeda):
```sql
user_id, nama_lengkap
```

### PUT `/api/pengumuman/update/:id`

Sumber: backend/router/pengumumanRoutes.js → backend/controllers/pengumumanController.js#updateAnnouncement. Akses: Admin, Koordinator Lab. Judul/content wajib dikirim ulang. is_active aktif bila string 1, angka 1 atau true; nilai lain/nonaktif menjadi 0. Tidak ada file baru mempertahankan file lama.

- Akses: **Admin, Koordinator Lab**.
- Status yang didokumentasikan: `200`, `400`, `401`, `403`, `404`, `500`.
- Parameter: `id` (path, wajib).
- Body: `multipart/form-data` (file opsional) atau `application/json`.
- Wajib oleh validasi aplikasi: `judul`, `content`.

Contoh field body (JSON; untuk multipart gunakan field teks yang sama):
```json
{
  "judul": "Pemeliharaan lab",
  "content": "Laboratorium menjalani pemeliharaan.",
  "is_active": "1"
}
```
File opsional: `file_pengumuman` (binary).

Contoh respons 200 (ilustratif, dapat parsial):
```json
{
  "message": "Pengumuman berhasil diperbarui",
  "data": {
    "id": 1,
    "judul": "Pemeliharaan lab",
    "content": "Laboratorium menjalani pemeliharaan.",
    "file_path": null,
    "is_active": 1
  }
}
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 400
{ message: "Judul dan Konten tidak boleh kosong." }
// HTTP 404
{ message: "Pengumuman tidak ditemukan" }
// HTTP 200
{
      data: { 
        id: parseInt(id, 10), 
        judul, 
        content, 
        file_path: newFileBasename, // Konsisten dengan nama kolom DB dan GET
        is_active: activeStatus 
      },
      message: "Pengumuman berhasil diperbarui",
    }
// HTTP 500
{ message: "Gagal memperbarui pengumuman", error: error.message }
```

Proyeksi SQL yang menentukan field hasil controller (varian list/detail bisa berbeda):
```sql
file_path
```

### GET `/api/pengecekan`

Sumber: backend/router/pengecekanRoutes.js → backend/controllers/pengecekanController.js#getAllPengecekan. Akses: Admin, Teknisi.

- Akses: **Admin, Teknisi**.
- Status yang didokumentasikan: `200`, `401`, `403`, `500`.

Contoh respons 200 (ilustratif, dapat parsial):
```json
{
  "message": "Berhasil Mengambil Data Pengecekan",
  "data": [
    {
      "pengecekan_id": 1,
      "perangkat_id": 1,
      "tanggal_pengecekan": "2026-11-02",
      "ditemukan_kerusakan": "Gangguan catu daya",
      "pemeriksaan_id": 1,
      "status_pengecekan": "Baru",
      "nama_user": "Teknisi Contoh",
      "nama_perangkat": "PC-01",
      "nama_lab": "Lab Komputer 1"
    }
  ]
}
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 200
{
      data: rows,
      message: "Berhasil Mengambil Data Pengecekan"
    }
// HTTP 500
{
      message: "Mengambil Data Pengecekan Gagal",
      error: error.message
    }
```

Proyeksi SQL yang menentukan field hasil controller (varian list/detail bisa berbeda):
```sql
p.pengecekan_id,
         p.user_id,
         p.perangkat_id,
         p.pemeriksaan_id,
         p.tanggal_pengecekan,
         p.ditemukan_kerusakan,
         p.status_pengecekan,
         u.nama_lengkap AS nama_user, 
         d.nama_perangkat,
         l.nama_lab -- Kolom baru untuk nama lab
```

### GET `/api/pengecekan/:id`

Sumber: backend/router/pengecekanRoutes.js → backend/controllers/pengecekanController.js#getPengecekanById. Akses: Admin, Teknisi. data berisi field pengecekan dan array perbaikan (SELECT pb.* serta nama_user), diurutkan perbaikan_id menaik; dapat kosong.

- Akses: **Admin, Teknisi**.
- Status yang didokumentasikan: `200`, `401`, `403`, `404`, `500`.
- Parameter: `id` (path, wajib).

Contoh respons 200 (ilustratif, dapat parsial):
```json
{
  "message": "Berhasil Mengambil Detail Data Pengecekan",
  "data": {
    "pengecekan_id": 1,
    "perangkat_id": 1,
    "tanggal_pengecekan": "2026-11-02",
    "ditemukan_kerusakan": "Gangguan catu daya",
    "pemeriksaan_id": 1,
    "status_pengecekan": "Baru",
    "nama_user": "Teknisi Contoh",
    "nama_perangkat": "PC-01",
    "nama_lab": "Lab Komputer 1",
    "perbaikan": [
      {
        "perbaikan_id": 1,
        "pengecekan_id": 1,
        "tanggal_perbaikan": "2026-11-02",
        "tindakan": "Perbaikan catu daya",
        "hasil_perbaikan": "Berhasil",
        "catatan_tambahan": "Pengujian ulang selesai",
        "user_id": 3,
        "nama_user": "Teknisi Contoh",
        "perangkat_id_snapshot": 1,
        "nama_perangkat": "PC-01",
        "nama_lab": "Lab Komputer 1"
      }
    ]
  }
}
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 404
{ message: "Data Pengecekan tidak ditemukan" }
// HTTP 200
{
      data: { ...rows[0], perbaikan },
      message: "Berhasil Mengambil Detail Data Pengecekan"
    }
// HTTP 500
{
      message: "Mengambil Detail Data Pengecekan Gagal",
      error: error.message
    }
```

Proyeksi SQL yang menentukan field hasil controller (varian list/detail bisa berbeda):
```sql
p.pengecekan_id,
         p.user_id,
         p.perangkat_id,
         p.pemeriksaan_id,
         p.tanggal_pengecekan,
         p.ditemukan_kerusakan,
         p.status_pengecekan,
         u.nama_lengkap AS nama_user, 
         d.nama_perangkat,
         l.nama_lab

pb.*, u.nama_lengkap AS nama_user
```

### POST `/api/pengecekan/create`

Sumber: backend/router/pengecekanRoutes.js → backend/controllers/pengecekanController.js#createPengecekan. Akses: Admin, Teknisi. Troubleshoot manual memakai req.user.id, bukan user_id body. Perangkat integer positif, tanggal parseable, deskripsi nonkosong wajib. Perangkat tidak ditemukan 404. Transaksi membuat status Baru dan menandai perangkat Perlu Perbaikan. Respons data hanya pengecekan_id.

- Akses: **Admin, Teknisi**.
- Status yang didokumentasikan: `201`, `400`, `401`, `403`, `404`, `500`.
- Body: `application/json`.
- Wajib oleh validasi aplikasi: `perangkat_id`, `tanggal_pengecekan`, `ditemukan_kerusakan`.

Contoh field body (JSON; untuk multipart gunakan field teks yang sama):
```json
{
  "perangkat_id": 1,
  "tanggal_pengecekan": "2026-11-02",
  "ditemukan_kerusakan": "Gangguan catu daya"
}
```

Contoh respons 201 (ilustratif, dapat parsial):
```json
{
  "message": "Troubleshoot baru masuk antrian teknisi.",
  "data": {
    "pengecekan_id": 1
  }
}
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 400
{ message: 'Perangkat, tanggal dan deskripsi kerusakan wajib valid.' }
// HTTP 404
{ message: 'Perangkat tidak ditemukan.' }
// HTTP 201
{ data: { pengecekan_id: result.insertId }, message: 'Troubleshoot baru masuk antrian teknisi.' }
// HTTP 500
{ message: 'Gagal menyimpan pengecekan.', error: error.message }
```

Proyeksi SQL yang menentukan field hasil controller (varian list/detail bisa berbeda):
```sql
perangkat_id
```

### PUT `/api/pengecekan/update/:id`

Sumber: backend/router/pengecekanRoutes.js → backend/controllers/pengecekanController.js#updatePengecekan. Akses: Admin, Teknisi. Tanggal, deskripsi nonkosong dan status Baru/Menunggu Perbaikan wajib. Status Sudah Ditangani atau membuka kembali tiket selesai ditolak 409. Identitas pelapor, perangkat dan sumber pemeriksaan tidak berubah. Penutupan hanya melalui perbaikan.

- Akses: **Admin, Teknisi**.
- Status yang didokumentasikan: `200`, `400`, `401`, `403`, `404`, `409`, `500`.
- Parameter: `id` (path, wajib).
- Body: `application/json`.
- Wajib oleh validasi aplikasi: `tanggal_pengecekan`, `ditemukan_kerusakan`, `status_pengecekan`.

Contoh field body (JSON; untuk multipart gunakan field teks yang sama):
```json
{
  "tanggal_pengecekan": "2026-11-02",
  "ditemukan_kerusakan": "Gangguan catu daya",
  "status_pengecekan": "Menunggu Perbaikan"
}
```

Contoh respons 200 (ilustratif, dapat parsial):
```json
{
  "message": "Pengecekan berhasil diperbarui."
}
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 409
{ message: 'Gunakan hasil perbaikan untuk menyelesaikan temuan.' }
// HTTP 400
{ message: 'Tanggal, kerusakan dan status wajib valid.' }
// HTTP 404
{ message: 'Pengecekan tidak ditemukan.' }
// HTTP 409
{ message: 'Temuan selesai tidak dapat dibuka ulang. Buat pemeriksaan baru.' }
// HTTP 200
{ message: 'Pengecekan berhasil diperbarui.' }
// HTTP 500
{ message: 'Gagal memperbarui pengecekan.', error: error.message }
```

Proyeksi SQL yang menentukan field hasil controller (varian list/detail bisa berbeda):
```sql
*
```

### DELETE `/api/pengecekan/delete/:id`

Sumber: backend/router/pengecekanRoutes.js → backend/controllers/pengecekanController.js#deletePengecekan. Akses: Admin, Teknisi. Selalu 409: pengecekan adalah riwayat temuan dan tidak dapat dihapus.

- Akses: **Admin, Teknisi**.
- Status yang didokumentasikan: `401`, `403`, `409`, `500`.
- Parameter: `id` (path, wajib).

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 409
{
  message: 'Pengecekan adalah riwayat temuan dan tidak dapat dihapus. Catat hasil penanganan melalui perbaikan.'
}
```

### GET `/api/laporan/perangkat`

Sumber: backend/router/deviceRoutes.js → backend/controllers/deviceController.js#getAllDevice. Akses: Token; semua role.  Route duplikat berikut terdaftar tetapi tertutup handler ini: getAllLaporanPerangkat. Karena router bersama, endpoint prefix laporan ini sebenarnya mengakses/mengubah PERANGKAT; role mengikuti route perangkat.

- Akses: **Token; semua role**.
- Status yang didokumentasikan: `200`, `401`, `403`, `500`.

Contoh respons 200 (ilustratif, dapat parsial):
```json
{
  "message": "Berhasil Mengambil Data Perangkat",
  "data": [
    {
      "perangkat_id": 1,
      "nama_perangkat": "PC-01",
      "spesifikasi": "RAM 8 GB",
      "status": "Baik",
      "lab_id": 1,
      "nomor_inventaris": "INV-CONTOH-01",
      "foto_perangkat": null,
      "nama_lab": "Lab Komputer 1"
    }
  ]
}
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 200
{
      data: rows,
      message: 'Berhasil Mengambil Data Perangkat'
    }
// HTTP 500
{ 
      message: 'Mengambil Data Perangkat Gagal' , // Pesan disesuaikan sedikit
      error: error.message,
    }
```

Proyeksi SQL yang menentukan field hasil controller (varian list/detail bisa berbeda):
```sql
p.perangkat_id,
         p.nama_perangkat,
         p.spesifikasi,
         p.status,
         p.lab_id,
         p.foto_perangkat,
         p.nomor_inventaris,
         l.nama_lab -- Tambahkan kolom nama_lab dari tabel laboratorium
```

Handler tertutup `getAllLaporanPerangkat` — sumber `backend/controllers/laporanPerangkatController.js`; **bukan respons operasi aktif di atas**.
BUG ROUTER: laporanPerangkat mengimpor router deviceRoutes, bukan Router baru. GET / pertama selalu ditangani getAllDevice sehingga handler daftar laporan tertutup pada kedua mount. Handler laporan sendiri memfilter jenis_laporan Bermasalah, berbeda dengan create/detail Perbaikan.

Ekspresi handler tertutup:
```js
// HTTP 200
{
      message: "Berhasil mengambil semua laporan perangkat",
      data: rows
    }
// HTTP 500
{
      message: "Gagal mengambil laporan perangkat",
      error: error.message
    }
```

### GET `/api/laporan/perangkat/:id`

Sumber: backend/router/deviceRoutes.js → backend/controllers/deviceController.js#getDeviceById. Akses: Token; semua role.

- Akses: **Token; semua role**.
- Status yang didokumentasikan: `200`, `401`, `403`, `404`, `500`.
- Parameter: `id` (path, wajib).

Contoh respons 200 (ilustratif, dapat parsial):
```json
{
  "message": "Berhasil Mengambil Data Perangkat",
  "data": {
    "perangkat_id": 1,
    "nama_perangkat": "PC-01",
    "spesifikasi": "RAM 8 GB",
    "status": "Baik",
    "lab_id": 1,
    "nomor_inventaris": "INV-CONTOH-01",
    "foto_perangkat": null,
    "nama_lab": "Lab Komputer 1"
  }
}
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 404
{ 
        message: 'Data Perangkat Tidak Ditemukan' // Pesan disesuaikan
      }
// HTTP 200
{
      data: rows[0],
      message: 'Berhasil Mengambil Data Perangkat'
    }
// HTTP 500
{ 
      message: 'Mengambil Data Perangkat Gagal' ,
      error: error.message,
    }
```

Proyeksi SQL yang menentukan field hasil controller (varian list/detail bisa berbeda):
```sql
p.perangkat_id,
         p.nama_perangkat,
         p.spesifikasi,
         p.status,
         p.lab_id,
         p.foto_perangkat,
         p.nomor_inventaris,
         l.nama_lab -- Tambahkan kolom nama_lab dari tabel laboratorium
```

### POST `/api/laporan/perangkat/create`

Sumber: backend/router/deviceRoutes.js → backend/controllers/deviceController.js#createDevice. Akses: Admin, Kepala Lab. Controller tidak memvalidasi field wajib secara eksplisit; kelengkapan/FK bergantung DB. Foto opsional. Route duplikat berikut terdaftar tetapi tertutup handler ini: createLaporanPerangkat. Karena router bersama, endpoint prefix laporan ini sebenarnya mengakses/mengubah PERANGKAT; role mengikuti route perangkat.

- Akses: **Admin, Kepala Lab**.
- Status yang didokumentasikan: `201`, `401`, `403`, `500`.
- Body: `multipart/form-data` (file opsional) atau `application/json`.
- Wajib oleh validasi aplikasi: tidak ada pemeriksaan wajib eksplisit pada controller ini; constraint DB tetap berlaku.

Contoh field body (JSON; untuk multipart gunakan field teks yang sama):
```json
{
  "nama_perangkat": "PC-01",
  "spesifikasi": "RAM 8 GB",
  "status": "Baik",
  "lab_id": 1,
  "nomor_inventaris": "INV-CONTOH-01"
}
```
File opsional: `foto_perangkat` (binary).

Contoh respons 201 (ilustratif, dapat parsial):
```json
{
  "message": "Data Perangkat Baru Berhasil Ditambahkan",
  "data": {
    "perangkat_id": 1,
    "nama_perangkat": "PC-01",
    "spesifikasi": "RAM 8 GB",
    "status": "Baik",
    "lab_id": 1,
    "nomor_inventaris": "INV-CONTOH-01",
    "foto_perangkat": null,
    "nama_lab": "Lab Komputer 1"
  }
}
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 201
{
      data: newDeviceRows[0], // Mengirim data lengkap termasuk nama_lab
      message: "Data Perangkat Baru Berhasil Ditambahkan"
    }
// HTTP 500
{ 
      message: 'Membuat Perangkat Baru Gagal' ,
      error: error.message,
    }
```

Proyeksi SQL yang menentukan field hasil controller (varian list/detail bisa berbeda):
```sql
p.*, l.nama_lab
```

Handler tertutup `createLaporanPerangkat` — sumber `backend/controllers/laporanPerangkatController.js`; **bukan respons operasi aktif di atas**.
BUG ROUTER: POST /create telah ditangani createDevice lebih dulu; permintaan role Admin menuju handler perangkat, Teknisi ditolak otorisasi perangkat. Handler laporan ini tidak terjangkau melalui route ini. Jika diperbaiki, body adalah periode/file_path JSON (bukan upload), memakai req.user.user_id yang tidak sama dengan payload JWT id.

Body kontrak handler tertutup (tidak aktif):
```json
{
  "periode": "2026-11",
  "file_path": "laporan-contoh.pdf"
}
```
Ekspresi handler tertutup:
```js
// HTTP 201
{
      message: "Laporan perangkat berhasil dibuat",
      data: {
        laporan_id: result.insertId,
        periode,
        file_path,
        dibuat_oleh
      }
    }
// HTTP 500
{
      message: "Gagal membuat laporan perangkat",
      error: error.message
    }
```

### PUT `/api/laporan/perangkat/update/:id`

Sumber: backend/router/deviceRoutes.js → backend/controllers/deviceController.js#updateDevice. Akses: Admin, Kepala Lab. Bukan PATCH; kirim ulang field perangkat. Foto lama dipertahankan bila tidak ada upload baru. Karena router bersama, endpoint prefix laporan ini sebenarnya mengakses/mengubah PERANGKAT; role mengikuti route perangkat.

- Akses: **Admin, Kepala Lab**.
- Status yang didokumentasikan: `200`, `401`, `403`, `404`, `500`.
- Parameter: `id` (path, wajib).
- Body: `multipart/form-data` (file opsional) atau `application/json`.
- Wajib oleh validasi aplikasi: tidak ada pemeriksaan wajib eksplisit pada controller ini; constraint DB tetap berlaku.

Contoh field body (JSON; untuk multipart gunakan field teks yang sama):
```json
{
  "nama_perangkat": "PC-01",
  "spesifikasi": "RAM 8 GB",
  "status": "Baik",
  "lab_id": 1,
  "nomor_inventaris": "INV-CONTOH-01"
}
```
File opsional: `foto_perangkat` (binary).

Contoh respons 200 (ilustratif, dapat parsial):
```json
{
  "message": "Data Perangkat Berhasil Diupdate",
  "data": {
    "perangkat_id": 1,
    "nama_perangkat": "PC-01",
    "spesifikasi": "RAM 8 GB",
    "status": "Baik",
    "lab_id": 1,
    "nomor_inventaris": "INV-CONTOH-01",
    "foto_perangkat": null,
    "nama_lab": "Lab Komputer 1"
  }
}
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 404
{ 
        message: 'Data Perangkat Tidak Ditemukan untuk diupdate' 
      }
// HTTP 404
{ message: "Data Perangkat tidak ditemukan setelah update." }
// HTTP 200
{
      data: updatedDeviceRows[0], // Mengirim data lengkap termasuk nama_lab
      message: 'Data Perangkat Berhasil Diupdate'
    }
// HTTP 500
{ 
      message: 'Mengupdate Data Perangkat Gagal' ,
      error: error.message,
    }
```

Proyeksi SQL yang menentukan field hasil controller (varian list/detail bisa berbeda):
```sql
foto_perangkat, lab_id

p.*, l.nama_lab
```

### DELETE `/api/laporan/perangkat/delete/:id`

Sumber: backend/router/deviceRoutes.js → backend/controllers/deviceController.js#deleteDevice. Akses: Admin, Kepala Lab. Sumber guard: `backend/services/deletionService.js#remove` dan `sendDeletionError`.

- Status: **200, 400, 401, 403, 404, 409, 500**. ID desimal positif tanpa nol awal, maksimum 2147483647.
- Kepala Lab pada perangkat/pemeriksaan di luar lab miliknya: **403**, bukan 404.
- Sukses 200 `{"message": "Data Perangkat Berhasil Dihapus"}`.
- 400 `{message:"ID harus berupa bilangan bulat positif yang valid."}`; 404 `{message:"Data tidak ditemukan."}`; 500 `{message:"Gagal memproses penghapusan. Silakan coba kembali."}`. Error auth tetap `{msg}`/`{message}` sesuai middleware.
- **409 `{message,data}`**: `data` sama bentuknya dengan preview (lihat bagian deletion di bawah). Self-delete akun aktif dan semua dependensi memblokir; tidak ada cascade/unlink otomatis. FK conflict 1451 juga 409 dengan blocker generik `dependency`, `path:null`, `action:"Muat ulang rincian"`.
- Penghapusan mengulang inspeksi dalam transaksi SERIALIZABLE, memakai lock/current reads; preview bukan reservasi/jaminan hasil DELETE. Foto lab/perangkat dibersihkan best-effort hanya sesudah commit.

Handler tertutup `deleteLaporanPerangkat` — sumber `backend/controllers/laporanPerangkatController.js`; **bukan respons operasi aktif di atas**.
BUG ROUTER: DELETE /delete/:id tertutup deleteDevice pada kedua mount. Jangan menganggap endpoint ini menghapus laporan; saat ini dapat menghapus perangkat.

Ekspresi handler tertutup:
```js
// HTTP 404
{ message: "Laporan tidak ditemukan" }
// HTTP 200
{
      message: "Laporan perangkat berhasil dihapus"
    }
// HTTP 500
{
      message: "Gagal menghapus laporan perangkat",
      error: error.message
    }
```


### GET `/api/laporan/perangkat/:id/detail`

Sumber: backend/router/laporanPerangkat.js → backend/controllers/laporanPerangkatController.js#getDetailLaporanPerangkat. Akses: Admin, Teknisi. Route /:id/detail tidak tertutup /:id karena jumlah segmen berbeda. Mengembalikan {data:{laporan,detail},message}; detail menggabungkan pemeriksaan, pengecekan, dan perbaikan berdasarkan periode laporan. Tidak ada ekspor PDF/Excel otomatis.

- Akses: **Admin, Teknisi**.
- Status yang didokumentasikan: `200`, `401`, `403`, `404`, `500`.
- Parameter: `id` (path, wajib).

Contoh respons 200 (ilustratif, dapat parsial):
```json
{
  "message": "Berhasil mengambil detail laporan perangkat",
  "data": {
    "laporan": {
      "laporan_id": 1,
      "periode": "2026-11",
      "jenis_laporan": "Perbaikan"
    },
    "detail": []
  }
}
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 404
{ message: "Laporan tidak ditemukan" }
// HTTP 200
{
      message: "Berhasil mengambil detail laporan perangkat",
      data: {
        laporan,
        detail: detailRows
      }
    }
// HTTP 500
{
      message: "Gagal mengambil detail laporan perangkat",
      error: error.message
    }
```

Proyeksi SQL yang menentukan field hasil controller (varian list/detail bisa berbeda):
```sql
l.*, u.nama_lengkap AS pembuat

d.nama_perangkat,
        l.nama_lab,
        p.tanggal_pemeriksaan,
        p.hasil_pemeriksaan,
        p.catatan AS catatan_pemeriksaan,
        u_p.nama_lengkap AS teknisi_pemeriksa,

        c.tanggal_pengecekan,
        c.ditemukan_kerusakan,
        u_c.nama_lengkap AS teknisi_pengecek,

        r.tanggal_perbaikan,
        r.tindakan,
        r.hasil_perbaikan,
        r.catatan_tambahan,
        u_r.nama_lengkap AS teknisi_perbaikan
```

### GET `/api/perbaikan`

Sumber: backend/router/perbaikanRoutes.js → backend/controllers/perbaikanController.js#getAllPerbaikan. Akses: Admin, Teknisi.

- Akses: **Admin, Teknisi**.
- Status yang didokumentasikan: `200`, `401`, `403`, `500`.

Contoh respons 200 (ilustratif, dapat parsial):
```json
{
  "message": "Berhasil Mengambil Data Perbaikan",
  "data": [
    {
      "perbaikan_id": 1,
      "pengecekan_id": 1,
      "tanggal_perbaikan": "2026-11-02",
      "tindakan": "Perbaikan catu daya",
      "hasil_perbaikan": "Berhasil",
      "catatan_tambahan": "Pengujian ulang selesai",
      "user_id": 3,
      "nama_user": "Teknisi Contoh",
      "perangkat_id_snapshot": 1,
      "nama_perangkat": "PC-01",
      "nama_lab": "Lab Komputer 1"
    }
  ]
}
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 200
{ data: rows, message: "Berhasil Mengambil Data Perbaikan" }
// HTTP 500
{ message: "Gagal Mengambil Data Perbaikan: " + error.message, error: error.toString() }
```

Proyeksi SQL yang menentukan field hasil controller (varian list/detail bisa berbeda):
```sql
pb.perbaikan_id,
        pb.pengecekan_id,
        pb.user_id,
        u.nama_lengkap AS nama_user,
        pb.tanggal_perbaikan,
        pb.tindakan,
        pb.hasil_perbaikan,
        pb.catatan_tambahan,
        pb.perangkat_id_snapshot,
        pr.nama_perangkat, -- Nama perangkat dari join
        l.nama_lab -- Nama lab dari join
```

### GET `/api/perbaikan/:id`

Sumber: backend/router/perbaikanRoutes.js → backend/controllers/perbaikanController.js#getPerbaikanById. Akses: Admin, Teknisi.

- Akses: **Admin, Teknisi**.
- Status yang didokumentasikan: `200`, `401`, `403`, `404`, `500`.
- Parameter: `id` (path, wajib).

Contoh respons 200 (ilustratif, dapat parsial):
```json
{
  "message": "Berhasil Mengambil Data Perbaikan",
  "data": {
    "perbaikan_id": 1,
    "pengecekan_id": 1,
    "tanggal_perbaikan": "2026-11-02",
    "tindakan": "Perbaikan catu daya",
    "hasil_perbaikan": "Berhasil",
    "catatan_tambahan": "Pengujian ulang selesai",
    "user_id": 3,
    "nama_user": "Teknisi Contoh",
    "perangkat_id_snapshot": 1,
    "nama_perangkat": "PC-01",
    "nama_lab": "Lab Komputer 1"
  }
}
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 404
{ message: "Data Perbaikan Tidak Ditemukan" }
// HTTP 200
{ data: rows[0], message: "Berhasil Mengambil Data Perbaikan" }
// HTTP 500
{ message: "Gagal Mengambil Data Perbaikan: " + error.message, error: error.toString() }
```

Proyeksi SQL yang menentukan field hasil controller (varian list/detail bisa berbeda):
```sql
pb.perbaikan_id,
        pb.pengecekan_id, 
        pb.user_id,
        u.nama_lengkap AS nama_user,
        pb.tanggal_perbaikan,
        pb.tindakan,
        pb.hasil_perbaikan,
        pb.catatan_tambahan,
        pb.perangkat_id_snapshot,
        pr.nama_perangkat,
        l.nama_lab
```

### POST `/api/perbaikan/create`

Sumber: backend/router/perbaikanRoutes.js → backend/controllers/perbaikanController.js#createPerbaikan. Akses: Admin, Teknisi. Identitas pencatat memakai req.user.id, bukan user_id body. Hasil hanya Berhasil/Gagal/Perlu Penggantian Komponen; tanggal YYYY-MM-DD, tindakan tidak kosong. Pengecekan tidak ditemukan 404, sudah ditangani 409. Riwayat dipertahankan; hasil Berhasil menutup tiket dan mengubah pemeriksaan Baik, hasil lain mempertahankan Menunggu Perbaikan. Status perangkat dihitung dari tiket terbuka. tanggal_selesai_perbaikan diisi hanya jika berhasil.

- Akses: **Admin, Teknisi**.
- Status yang didokumentasikan: `201`, `400`, `401`, `403`, `404`, `409`, `500`.
- Body: `application/json`.
- Wajib oleh validasi aplikasi: `pengecekan_id`, `tanggal_perbaikan`, `tindakan`, `hasil_perbaikan`.

Contoh field body (JSON; untuk multipart gunakan field teks yang sama):
```json
{
  "pengecekan_id": 1,
  "tanggal_perbaikan": "2026-11-02",
  "tindakan": "Perbaikan catu daya",
  "hasil_perbaikan": "Berhasil",
  "catatan_tambahan": "Pengujian ulang selesai"
}
```

Contoh respons 201 (ilustratif, dapat parsial):
```json
{
  "message": "Data Perbaikan berhasil ditambahkan dan Data Pengecekan terkait telah diproses.",
  "data": {
    "perbaikan_id": 1,
    "pengecekan_id": 1,
    "tanggal_perbaikan": "2026-11-02",
    "tindakan": "Perbaikan catu daya",
    "hasil_perbaikan": "Berhasil",
    "catatan_tambahan": "Pengujian ulang selesai",
    "user_id": 3,
    "nama_user": "Teknisi Contoh",
    "perangkat_id_snapshot": 1,
    "nama_perangkat": "PC-01",
    "nama_lab": "Lab Komputer 1"
  }
}
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 400
{ message: "pengecekan_id wajib diisi." }
// HTTP 404
{
        message: `Data Pengecekan dengan ID ${pengecekan_id} tidak ditemukan. Perbaikan tidak dapat ditambahkan.`,
      }
// HTTP 409
{ message: 'Pengecekan sudah ditangani. Buat pemeriksaan baru untuk masalah baru.' }
// HTTP 201
{
      data: newPerbaikanData[0] || { id: perbaikanId },
      message: "Data Perbaikan berhasil ditambahkan dan Data Pengecekan terkait telah diproses."
    }
// HTTP 500
{ message: "Operasi Gagal: " + error.message, error: error.toString() }
```

Proyeksi SQL yang menentukan field hasil controller (varian list/detail bisa berbeda):
```sql
*

1

pb.perbaikan_id, pb.pengecekan_id, pb.user_id, u.nama_lengkap AS nama_user,
            pb.tanggal_perbaikan, pb.tindakan, pb.hasil_perbaikan, pb.catatan_tambahan,
            pb.perangkat_id_snapshot, pr.nama_perangkat, l.nama_lab
```

### PUT `/api/perbaikan/update/:id`

Sumber: backend/router/perbaikanRoutes.js → backend/controllers/perbaikanController.js#updatePerbaikan. Akses: Admin, Teknisi. Hanya Admin atau teknisi pencatat boleh koreksi (403 bila bukan pemilik). Input pengecekan_id/user_id diabaikan. Sinkronisasi status menggunakan perbaikan terakhir berdasarkan perbaikan_id.

- Akses: **Admin, Teknisi**.
- Status yang didokumentasikan: `200`, `400`, `401`, `403`, `404`, `500`.
- Parameter: `id` (path, wajib).
- Body: `application/json`.
- Wajib oleh validasi aplikasi: `tanggal_perbaikan`, `tindakan`, `hasil_perbaikan`.

Contoh field body (JSON; untuk multipart gunakan field teks yang sama):
```json
{
  "tanggal_perbaikan": "2026-11-02",
  "tindakan": "Perbaikan catu daya",
  "hasil_perbaikan": "Berhasil",
  "catatan_tambahan": "Koreksi catatan"
}
```

Contoh respons 200 (ilustratif, dapat parsial):
```json
{
  "message": "Perbaikan dan status terkait berhasil diperbarui.",
  "data": {
    "tanggal_perbaikan": "2026-11-02",
    "tindakan": "Perbaikan catu daya",
    "hasil_perbaikan": "Berhasil",
    "catatan_tambahan": "Koreksi catatan"
  }
}
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 400
{ message: 'Tanggal, tindakan dan hasil perbaikan wajib valid.' }
// HTTP 404
{ message: 'Data perbaikan tidak ditemukan.' }
// HTTP 403
{ message: 'Hanya teknisi pencatat atau admin dapat mengubah perbaikan.' }
// HTTP 200
{ data: saved[0], message: 'Perbaikan dan status terkait berhasil diperbarui.' }
// HTTP 500
{ message: 'Gagal memperbarui perbaikan.', error: error.message }
```

Proyeksi SQL yang menentukan field hasil controller (varian list/detail bisa berbeda):
```sql
*

hasil_perbaikan

1
```

### DELETE `/api/perbaikan/delete/:id`

Sumber: backend/router/perbaikanRoutes.js → backend/controllers/perbaikanController.js#deletePerbaikan. Akses: Admin, Teknisi. Selalu 409: riwayat perbaikan tidak dapat dihapus; gunakan edit untuk koreksi.

- Akses: **Admin, Teknisi**.
- Status yang didokumentasikan: `401`, `403`, `409`, `500`.
- Parameter: `id` (path, wajib).

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 409
{ message: 'Riwayat perbaikan tidak dapat dihapus. Gunakan edit untuk koreksi.' }
```

### POST `/api/pengajuan/create`

Sumber: backend/router/pengajuanLabRoutes.js → backend/controllers/pengajuanController.js#createPengajuan. Akses: Guru, Kepala Lab, Admin. Guru hanya boleh mengajukan untuk diri sendiri. Admin/Kepala Lab dapat mengirim guru_id pengguna yang ada. Jam harus valid, selesai setelah mulai, dalam jam operasional settings dan batas kelipatan lesson_duration. Bentrok pengajuan Menunggu/Disetujui atau jadwal Terisi menghasilkan 400.

- Akses: **Guru, Kepala Lab, Admin**.
- Status yang didokumentasikan: `201`, `400`, `401`, `403`, `500`.
- Body: `application/json`.
- Wajib oleh validasi aplikasi: `lab_id`, `tanggal_pakai`, `jam_mulai`, `jam_selesai`, `kelas`, `mata_pelajaran`, `kegiatan`.

Contoh field body (JSON; untuk multipart gunakan field teks yang sama):
```json
{
  "lab_id": 1,
  "tanggal_pakai": "2026-11-03",
  "jam_mulai": "07:00",
  "jam_selesai": "09:00",
  "kelas": "XI A",
  "mata_pelajaran": "Informatika",
  "kegiatan": "Praktikum"
}
```

Contoh respons 201 (ilustratif, dapat parsial):
```json
{
  "message": "Pengajuan jadwal berhasil dibuat dan sedang menunggu persetujuan."
}
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 401
{ error: "Unauthorized - Informasi pengguna tidak lengkap." }
// HTTP 400
{ error: "Semua field (lab, tanggal, jam, kelas, mapel, kegiatan) wajib diisi." }
// HTTP 400
{ error: "Guru ID yang diajukan tidak ditemukan." }
// HTTP 403
{ error: "Anda tidak memiliki izin untuk membuat pengajuan atas nama guru lain." }
// HTTP 500
{ error: "Kesalahan internal: ID Guru untuk pengajuan tidak dapat ditentukan." }
// HTTP 400
{ error: "Format jam mulai atau jam selesai tidak valid. Gunakan HH:MM." }
// HTTP 400
{ error: "Jam selesai harus setelah jam mulai." }
// HTTP 400
{ error: scheduleError }
// HTTP 201
{
      message: "Pengajuan jadwal berhasil dibuat dan sedang menunggu persetujuan.",
    }
// HTTP 500
{ error: "Server error", details: error.message }
```

Proyeksi SQL yang menentukan field hasil controller (varian list/detail bisa berbeda):
```sql
user_id, role

pengajuan_id

jadwal_id
```

### GET `/api/pengajuan/menunggu`

Sumber: backend/router/pengajuanLabRoutes.js → backend/controllers/pengajuanController.js#getPengajuanMenunggu. Akses: Kepala Lab, Admin. Mengembalikan array langsung (tanpa data). Admin dapat filter lab_id atau all; Kepala Lab hanya lab yang kepala_lab_id-nya identitas token.

- Akses: **Kepala Lab, Admin**.
- Status yang didokumentasikan: `200`, `401`, `403`, `500`.
- Parameter: `lab_id` (query, opsional).

Contoh respons 200 (ilustratif, dapat parsial):
```json
[
  {
    "pengajuan_id": 1,
    "lab_id": 1,
    "tanggal_pakai": "2026-11-03",
    "jam_mulai": "07:00",
    "jam_selesai": "09:00",
    "kelas": "XI A",
    "mata_pelajaran": "Informatika",
    "kegiatan": "Praktikum",
    "guru_id": 1,
    "guru_nama": "Guru Contoh",
    "nama_lab": "Lab Komputer 1",
    "status": "Menunggu",
    "tanggal_pengajuan": "2026-11-02T07:00:00.000Z"
  }
]
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 401
{ error: "Unauthorized - Informasi pengguna tidak lengkap dari token." }
// HTTP 403
{ error: "Akses ditolak untuk peran ini." }
// HTTP 200
pengajuan
// HTTP 500
{ error: "Server error", details: error.message }
```

Proyeksi SQL yang menentukan field hasil controller (varian list/detail bisa berbeda):
```sql
p.pengajuan_id, p.lab_id, p.guru_id, p.tanggal_pakai,
             TIME_FORMAT(p.jam_mulai, '%H:%i') AS jam_mulai,
             TIME_FORMAT(p.jam_selesai, '%H:%i') AS jam_selesai,
             p.kelas, p.mata_pelajaran, p.kegiatan, p.status,
             p.tanggal_pengajuan, 
             u.nama_lengkap AS guru_nama, l.nama_lab
```

### GET `/api/pengajuan/status`

Sumber: backend/router/pengajuanLabRoutes.js → backend/controllers/pengajuanController.js#getPengajuanByGuru. Akses: Guru, Kepala Lab, Admin. Mengembalikan array langsung milik guru_id = identitas pengguna, termasuk saat role Admin/Kepala Lab; bukan daftar semua pengajuan.

- Akses: **Guru, Kepala Lab, Admin**.
- Status yang didokumentasikan: `200`, `401`, `403`, `500`.

Contoh respons 200 (ilustratif, dapat parsial):
```json
[
  {
    "pengajuan_id": 1,
    "lab_id": 1,
    "tanggal_pakai": "2026-11-03",
    "jam_mulai": "07:00",
    "jam_selesai": "09:00",
    "kelas": "XI A",
    "mata_pelajaran": "Informatika",
    "kegiatan": "Praktikum",
    "guru_id": 1,
    "guru_nama": "Guru Contoh",
    "nama_lab": "Lab Komputer 1",
    "status": "Menunggu",
    "tanggal_pengajuan": "2026-11-02T07:00:00.000Z",
    "alasan_penolakan": null,
    "disetujui_oleh": null,
    "waktu_persetujuan": null,
    "nama_penyetuju": null
  }
]
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 200
pengajuan
// HTTP 500
{ error: "Server error", details: error.message }
```

Proyeksi SQL yang menentukan field hasil controller (varian list/detail bisa berbeda):
```sql
p.pengajuan_id, p.lab_id, p.guru_id, p.tanggal_pakai,
              TIME_FORMAT(p.jam_mulai, '%H:%i') AS jam_mulai,
              TIME_FORMAT(p.jam_selesai, '%H:%i') AS jam_selesai,
              p.kelas, p.mata_pelajaran, p.kegiatan, p.status, p.alasan_penolakan,
              p.disetujui_oleh, p.waktu_persetujuan, p.tanggal_pengajuan, 
              l.nama_lab,
              u.nama_lengkap AS guru_nama,
              approver.nama_lengkap AS nama_penyetuju
```

### POST `/api/pengajuan/:id/approve`

Sumber: backend/router/pengajuanLabRoutes.js → backend/controllers/pengajuanController.js#approvePengajuan. Akses: Kepala Lab, Admin. Hanya pengajuan Menunggu dapat diproses; status lain 400, ID tak ditemukan 404. Bentrok jadwal menghasilkan 409 sekaligus penolakan otomatis. Snapshot belum membatasi kepemilikan lab dalam controller approve.

- Akses: **Kepala Lab, Admin**.
- Status yang didokumentasikan: `200`, `400`, `401`, `403`, `404`, `500`.
- Parameter: `id` (path, wajib).

Contoh respons 200 (ilustratif, dapat parsial):
```json
{
  "message": "Pengajuan berhasil disetujui dan telah dimasukkan ke jadwal lab."
}
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 404
{ error: "Pengajuan tidak ditemukan." }
// HTTP 400
{ error: "Pengajuan ini sudah diproses (status bukan 'Menunggu')." }
// HTTP 200
{
      message: "Pengajuan berhasil disetujui dan telah dimasukkan ke jadwal lab.",
    }
// HTTP 500
{ error: "Server error", details: error.message }
```

Proyeksi SQL yang menentukan field hasil controller (varian list/detail bisa berbeda):
```sql
*

jadwal_id
```

### POST `/api/pengajuan/:id/reject`

Sumber: backend/router/pengajuanLabRoutes.js → backend/controllers/pengajuanController.js#rejectPengajuan. Akses: Kepala Lab, Admin. Alasan penolakan tidak kosong. Snapshot membaca req.user.user_id, sedangkan JWT login mengisi id: kemungkinan gagal menyimpan identitas penolak; perlu perbaikan integrasi. Status bukan Menunggu menghasilkan 400.

- Akses: **Kepala Lab, Admin**.
- Status yang didokumentasikan: `200`, `400`, `401`, `403`, `404`, `500`.
- Parameter: `id` (path, wajib).
- Body: `application/json`.
- Wajib oleh validasi aplikasi: `alasan_penolakan`.

Contoh field body (JSON; untuk multipart gunakan field teks yang sama):
```json
{
  "alasan_penolakan": "Laboratorium digunakan kegiatan sekolah."
}
```

Contoh respons 200 (ilustratif, dapat parsial):
```json
{
  "message": "Pengajuan berhasil ditolak."
}
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 400
{ error: "Alasan penolakan wajib diisi." }
// HTTP 404
{ error: "Pengajuan tidak ditemukan." }
// HTTP 400
{ error: "Pengajuan ini sudah diproses (status bukan 'Menunggu')." }
// HTTP 200
{ message: "Pengajuan berhasil ditolak." }
// HTTP 500
{ error: "Server error", details: error.message }
```

Proyeksi SQL yang menentukan field hasil controller (varian list/detail bisa berbeda):
```sql
status
```

### GET `/api/pengajuan/statistik`

Sumber: backend/router/pengajuanLabRoutes.js → backend/controllers/pengajuanController.js#getStatistikPengajuan. Akses: Kepala Lab, Admin. Objek langsung menunggu/disetujui/ditolak/total_filter. Admin dapat filter lab_id; Kepala Lab dibatasi lab yang dikelolanya. Agregat mysql dapat berupa angka atau string numerik.

- Akses: **Kepala Lab, Admin**.
- Status yang didokumentasikan: `200`, `401`, `403`, `500`.
- Parameter: `lab_id` (query, opsional).

Contoh respons 200 (ilustratif, dapat parsial):
```json
{
  "menunggu": 0,
  "disetujui": 0,
  "ditolak": 0,
  "total_filter": 0
}
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 401
{ error: "Unauthorized - Informasi pengguna tidak lengkap." }
// HTTP 403
{ error: "Akses ditolak untuk melihat statistik ini." }
// HTTP 200
resultStats
// HTTP 500
{ error: "Server error", details: error.message }
```

Proyeksi SQL yang menentukan field hasil controller (varian list/detail bisa berbeda):
```sql
SUM(CASE WHEN p.status = 'Menunggu' THEN 1 ELSE 0 END) AS menunggu,
                SUM(CASE WHEN p.status = 'Disetujui' THEN 1 ELSE 0 END) AS disetujui,
                SUM(CASE WHEN p.status = 'Ditolak' THEN 1 ELSE 0 END) AS ditolak,
                COUNT(p.pengajuan_id) AS total_filter
```

### GET `/api/dashboard/admin/stats`

Sumber: backend/router/dashboardAdminRoutes.js → backend/controllers/dashboardController.js#getDashboardStats. Akses: Admin.

- Akses: **Admin**.
- Status yang didokumentasikan: `200`, `401`, `403`, `500`.

Contoh respons 200 (ilustratif, dapat parsial):
```json
{
  "message": "Data statistik dashboard berhasil diambil",
  "data": {
    "totalOnlineUsers": 0,
    "totalPerangkat": 0,
    "totalLab": 0,
    "totalUser": 0,
    "totalPengumuman": 0,
    "latestAnnouncements": [],
    "perangkatByStatus": [],
    "labByStatus": []
  }
}
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 200
{
      message: "Data statistik dashboard berhasil diambil",
      data: {
        totalOnlineUsers,
        totalPerangkat,
        totalLab,
        totalUser,
        totalPengumuman,
        latestAnnouncements, // Mengirim juga beberapa pengumuman terbaru
        perangkatByStatus: perangkatByStatusRows, // Data perangkat berdasarkan status
        labByStatus: labByStatusRows, // Data lab berdasarkan status
      },
    }
// HTTP 500
{
      message: "Gagal mengambil data statistik dashboard",
      error: error.message,
    }
```

Proyeksi SQL yang menentukan field hasil controller (varian list/detail bisa berbeda):
```sql
COUNT(user_id) AS total_online_users

COUNT(perangkat_id) AS total_perangkat

COUNT(lab_id) AS total_lab

COUNT(user_id) AS total_user

COUNT(id) AS total_pengumuman

id, judul, content, DATE_FORMAT(created_at, '%d %M %Y %H:%i') AS tanggal_dibuat

status, COUNT(perangkat_id) AS jumlah

status, COUNT(lab_id) AS jumlah
```

### GET `/api/dashboard/admin/labs-with-heads`

Sumber: backend/router/dashboardAdminRoutes.js → backend/controllers/dashboardController.js#getLabsWithHeads. Akses: Admin.

- Akses: **Admin**.
- Status yang didokumentasikan: `200`, `401`, `403`, `500`.

Contoh respons 200 (ilustratif, dapat parsial):
```json
{
  "data": [
    {
      "lab_id": 1,
      "nama_lab": "Lab Komputer 1",
      "lokasi": "Gedung A",
      "nama_kepala_lab": "Kepala Lab Contoh",
      "kepala_lab_user_id": 2
    }
  ]
}
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 200
{
      message: rows.length === 0 ? "Tidak ada data laboratorium yang ditemukan." : "Berhasil mengambil data laboratorium beserta kepala lab.",
      data: rows, // rows akan berupa [] jika tidak ada data
    }
// HTTP 500
{
      message: "Gagal mengambil data laboratorium.",
      error: error.message,
    }
```

Proyeksi SQL yang menentukan field hasil controller (varian list/detail bisa berbeda):
```sql
l.lab_id, l.nama_lab, l.lokasi, 
        u.nama_lengkap AS nama_kepala_lab, 
        u.user_id AS kepala_lab_user_id
```

### GET `/api/dashboard/admin/users-with-roles`

Sumber: backend/router/dashboardAdminRoutes.js → backend/controllers/dashboardController.js#getUsersWithRoles. Akses: Admin.

- Akses: **Admin**.
- Status yang didokumentasikan: `200`, `401`, `403`, `404`, `500`.

Contoh respons 200 (ilustratif, dapat parsial):
```json
{
  "message": "Berhasil mengambil data pengguna beserta rolenya.",
  "data": [
    {
      "user_id": 1,
      "username": "guru.contoh",
      "nama_lengkap": "Guru Contoh",
      "email": "guru@example.com",
      "role": "Guru",
      "is_online": false
    }
  ]
}
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 404
{
        message: "Tidak ada data pengguna yang ditemukan.",
        data: [],
      }
// HTTP 200
{
      message: "Berhasil mengambil data pengguna beserta rolenya.",
      data: rows,
    }
// HTTP 500
{
      message: "Gagal mengambil data pengguna.",
      error: error.message,
    }
```

Proyeksi SQL yang menentukan field hasil controller (varian list/detail bisa berbeda):
```sql
user_id,
        username,
        nama_lengkap,
        email,
        role,
        is_online
```

### GET `/api/dashboard/teknisi/stats`

Sumber: backend/router/dashboardTeknisiRoutes.js → backend/controllers/dashboardTeknisiController.js#getTeknisiDashboardStats. Akses: Teknisi, Admin. data mencakup totalPengecekanAktif, totalRiwayatPerbaikan, antrian, riwayat. antrian: maksimal 20 tiket Baru/Menunggu Perbaikan, tanggal dan ID menaik; field pc.* ditambah nama_perangkat, nomor_inventaris, nama_lab, nama_pelapor. riwayat: maksimal 10 perbaikan terbaru menurut ID menurun, pb.* ditambah nama_perangkat, nama_lab, nama_user, pemeriksaan_id. Penghitung mencakup semua baris relevan, bukan hanya batas daftar.

- Akses: **Teknisi, Admin**.
- Status yang didokumentasikan: `200`, `401`, `403`, `500`.

Contoh respons 200 (ilustratif, dapat parsial):
```json
{
  "message": "Data statistik dashboard Teknisi berhasil diambil",
  "data": {
    "totalPengecekanAktif": 1,
    "totalRiwayatPerbaikan": 1,
    "antrian": [
      {
        "pengecekan_id": 1,
        "perangkat_id": 1,
        "tanggal_pengecekan": "2026-11-02",
        "ditemukan_kerusakan": "Gangguan catu daya",
        "pemeriksaan_id": 1,
        "status_pengecekan": "Baru",
        "nama_user": "Teknisi Contoh",
        "nama_perangkat": "PC-01",
        "nama_lab": "Lab Komputer 1",
        "nomor_inventaris": "INV-CONTOH-01",
        "nama_pelapor": "Teknisi Contoh"
      }
    ],
    "riwayat": [
      {
        "perbaikan_id": 1,
        "pengecekan_id": 1,
        "tanggal_perbaikan": "2026-11-02",
        "tindakan": "Perbaikan catu daya",
        "hasil_perbaikan": "Berhasil",
        "catatan_tambahan": "Pengujian ulang selesai",
        "user_id": 3,
        "nama_user": "Teknisi Contoh",
        "perangkat_id_snapshot": 1,
        "nama_perangkat": "PC-01",
        "nama_lab": "Lab Komputer 1",
        "pemeriksaan_id": 1
      }
    ]
  }
}
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 200
{
      message: "Data statistik dashboard Teknisi berhasil diambil",
      data: {
        totalPengecekanAktif,
        totalRiwayatPerbaikan,
        antrian,
        riwayat,
      },
    }
// HTTP 500
{
      message: "Gagal mengambil data statistik dashboard Teknisi",
      error: error.message,
    }
```

Proyeksi SQL yang menentukan field hasil controller (varian list/detail bisa berbeda):
```sql
COUNT(pengecekan_id) AS total_pengecekan_aktif

COUNT(perbaikan_id) AS total_riwayat_perbaikan

pc.*, pr.nama_perangkat, pr.nomor_inventaris,
      l.nama_lab, u.nama_lengkap AS nama_pelapor

pb.*, pr.nama_perangkat, l.nama_lab,
      u.nama_lengkap AS nama_user, pc.pemeriksaan_id
```

### GET `/`

Sumber: backend/router/indexRoutes.js → backend/router/indexRoutes.js#health. Akses: Tanpa middleware auth.

- Akses: **Tanpa middleware auth**.
- Status yang didokumentasikan: `200`.

Contoh respons 200 (ilustratif, dapat parsial):
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "message": "System is healthy!"
  }
}
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 200
{code:200,message:'success',data:{message:'System is healthy!'}}
```

### GET `/api/jadwal-lab`

Sumber: backend/index.js → backend/controllers/jadwalLabController.js#getJadwalLabMingguan. Akses: Token; semua role. Mount aktual app.get("/api/jadwal-lab", verifyToken, getJadwalLabMingguan): token wajib, tanpa authorizeRoles pada mount. Pembatasan cakupan di controller tetap berlaku. Router jadwalLabRoutes tidak dipakai; metode/subpath lain tidak otomatis menuju controller ini.

- Akses: **Token; semua role**.
- Status yang didokumentasikan: `200`, `400`, `401`, `403`, `404`, `500`.
- Parameter: `end_date` (query, wajib); `lab_id` (query, opsional); `start_date` (query, wajib).

Contoh respons 200 (ilustratif, dapat parsial):
```json
{
  "message": "Tidak ada jadwal laboratorium yang ditemukan untuk lab dan rentang tanggal yang diberikan.",
  "data": [],
  "success": true
}
```

Ekspresi respons aktual dari source (variabel/SQL bukan JSON literal):
```js
// HTTP 400
{
            success: false,
            message: "Parameter start_date dan end_date wajib diisi."
        }
// HTTP 400
{
            success: false,
            message: "Format tanggal tidak valid. Gunakan format YYYY-MM-DD."
        }
// HTTP 400
{
            success: false,
            message: "Tanggal akhir (end_date) tidak boleh lebih awal dari tanggal mulai (start_date)."
        }
// HTTP 400
{
            success: false,
            message: "lab_id yang diberikan tidak valid."
        }
// HTTP 400
{
                        success: false,
                        message: "Anda mengelola lebih dari satu laboratorium. Harap pilih lab spesifik (sertakan parameter lab_id)."
                    }
// HTTP 404
{
                        success: false,
                        message: "Tidak ditemukan laboratorium yang Anda kelola. Tidak dapat menampilkan jadwal."
                    }
// HTTP 400
{
                    success: false,
                    message: "Parameter lab_id wajib diisi untuk melihat jadwal laboratorium."
                }
// HTTP 403
{ success: false, message: "Anda tidak memiliki izin untuk mengakses data ini tanpa spesifikasi lab."}
// HTTP 500
{ success: false, message: "Kesalahan internal: Lab ID tidak dapat ditentukan." }
// HTTP 200
{
                success: true,
                message: "Tidak ada jadwal laboratorium yang ditemukan untuk lab dan rentang tanggal yang diberikan.",
                data: []
            }
// HTTP 200
{
            success: true,
            message: `Jadwal laboratorium untuk ${jadwalMingguan[0].nama_lab} berhasil diambil.`, // Pesan lebih spesifik
            data: jadwalMingguan
        }
// HTTP 500
{
            success: false,
            message: "Terjadi kesalahan pada server saat mengambil jadwal.",
            details: error.message
        }
```

Proyeksi SQL yang menentukan field hasil controller (varian list/detail bisa berbeda):
```sql
lab_id

jl.jadwal_id,
                jl.lab_id,
                lab.nama_lab,
                jl.guru_id,
                usr.nama_lengkap AS nama_guru,
                DATE_FORMAT(jl.tanggal, '%Y-%m-%d') AS tanggal,
                TIME_FORMAT(jl.jam_mulai, '%H:%i') AS jam_mulai,
                TIME_FORMAT(jl.jam_selesai, '%H:%i') AS jam_selesai,
                jl.kelas,
                jl.mata_pelajaran,
                jl.kegiatan,
                jl.status,
                jl.pengajuan_id_asal
```

## Route tidak dipasang dan pekerjaan integrasi

- `backend/router/jadwalLabRoutes.js`: `GET /` dengan token + role Admin/Kepala Lab/Guru, tetapi tidak dipakai index. Operasi aktual `/api/jadwal-lab` di atas mengikuti direct mount, bukan router ini.
- Settings: router baru memiliki GET `/public` publik, GET `/` dan PUT `/` Admin. Audit: GET `/` Admin. Flag `x-mounted` pada OpenAPI merekam apakah router sudah ditemukan pada mount index saat dokumentasi dibuat.
- Tidak ada route history terpisah: riwayat tertanam pada detail pemeriksaan (`pengecekan`, `perbaikan`) dan detail pengecekan (`perbaikan`); dashboard teknisi menyediakan `antrian` dan `riwayat`.
- Pemeriksaan bertiket tidak dapat dihapus (409); pengecekan dan perbaikan selalu menolak delete (409). Status temuan mengikuti alur perbaikan; identitas pencatat berasal dari token. Bug variabel query update pemeriksaan lama tidak ada pada source terbaru.


## Ticketing layanan — kontrak runtime

Sumber: `backend/index.js` (mount `/api/tickets`), `backend/router/ticketRoutes.js`, `backend/controllers/ticketController.js`, `backend/services/ticketService.js`, `backend/utils/ticketPolicy.js`, dan `backend/migrations/20261103_service_tickets.sql`. Panduan proses dan batas acuan standar: `docs/TICKETING_ISO20000.md`. Dukungan fitur bukan sertifikasi ISO atau bukti full compliance SMS. Kebijakan/status/angka SLA adalah pilihan lokal.

### Akses dokumentasi dan bukti

`docs/API.md` adalah Markdown; `docs/openapi.json` adalah spesifikasi OpenAPI 3.0.3 untuk diimpor ke tooling. Tidak ada Swagger UI/route `/api/docs` yang ditambahkan. Endpoint legacy tetap terdokumentasi secara statis dengan metadata `x-shadowed` dipertahankan; bukti HTTP/MySQL ticketing nyata berada di `docs/ticketing-review-result.json`, bukan pada contoh di sini. Baca check dan timestamp JSON tersebut untuk hasil run yang berlaku; sinkronisasi dokumentasi ini tidak menjalankan ulang integrasi DB.

### Auth, cakupan, dan envelope

Seluruh delapan operasi melewati `verifyToken`. Token absen/kosong: 403 `{msg}`; invalid/expired: 401 `{msg}`; JWT tanpa `id`: 401 `{message:"Authentication required."}`. Admin/Koordinator Lab dan Teknisi melihat semua tiket; Kepala Lab melihat tiket sendiri atau yang terkait perangkat lab pimpinannya; role terautentikasi lain termasuk Guru hanya tiket sendiri. Detail di luar scope menghasilkan 404, bukan membocorkan keberadaan tiket. Kewenangan membaca bukan kewenangan mengerjakan.

Error controller `{message}`: 400 input invalid (termasuk rentang tanggal SLA), 403 aksi/role ditolak, 404 tidak ditemukan/tidak terlihat, 409 konflik versi/transisi, 500 `Ticket operation failed.`, 503 `Ticket migration required.` jika tabel belum ada. Terapkan migrasi ticketing tersebut; jangan menganggap backend startup otomatis menerapkannya. Snapshot tanpa policy prioritas memberi 503 `Ticket SLA policies unavailable.`.

| Method | Path | Hak akses dan kontrak |
|---|---|---|
| GET | `/api/tickets/options` | options; `TicketOptionsEnvelope` |
| PUT | `/api/tickets/policies` | policies; `TicketPolicyEnvelope`; input `TicketPolicyUpdate` |
| POST | `/api/tickets/import-maintenance` | importMaintenance; `TicketImportEnvelope` |
| GET | `/api/tickets` | list; `TicketListEnvelope` |
| POST | `/api/tickets` | create; `TicketMutationEnvelope`; input `TicketCreate` |
| POST | `/api/tickets/:id/actions` | action; `TicketMutationEnvelope`; input `TicketAction` |
| PUT | `/api/tickets/:id` | reclassify; `TicketMutationEnvelope`; input `TicketReclassify` |
| GET | `/api/tickets/:id` | detail; `TicketDetailEnvelope` |

### Operasi, input dan output

#### GET `/api/tickets/options`

All authenticated users; technicians list only for managers/Teknisi, otherwise []. Devices and policies available to all.

Sukses 200 `{data:{technicians:[{user_id,nama_lengkap}], devices:[{perangkat_id,nama_perangkat,nama_lab}], policies:[{priority,response_minutes,resolution_minutes}], types, categories}}`.

#### PUT `/api/tickets/policies`

Admin only. Exactly four distinct P1–P4 policies, positive safe-integer minutes with response <= resolution and representable resulting dates, plus note. Existing snapshots unchanged; explicit reclassification uses current policies. Audit stored in internal persistent ticket_policy_events; no public policy-event API.

Body `{note,policies:[{priority,response_minutes,resolution_minutes}]}`. Note trim nonblank maksimal 5000. Array tepat empat, prioritas unik P1–P4. Menit harus JSON number positive safe integers (<=9007199254740991), respons <= resolusi; tanggal hasil wajib representable JS Date dan MySQL DATETIME UTC tahun 1000–9999, ditolak sebelum transaksi jika melampaui rentang. Tidak ada batas menit arbitrer dari ISO. Sukses 200 `{data: Policy[],message:"SLA policy updated for future tickets only."}`. Tidak memakai ticket version. `ticket_policy_events` persisten internal, bukan endpoint publik.

#### POST `/api/tickets/import-maintenance`

Explicit idempotent bridge for Admin/Koordinator Lab/Teknisi. Imports pengecekan with status Baru or Menunggu Perbaikan, skipping existing unique pengecekan_id. Preserves source reporter/device, original tanggal_pengecekan as created_at and source link; actor is importer. Creates incident/hardware/medium/medium (P3), title Maintenance finding #ID, description found damage or fallback. Uses current policy anchored to original source time, so historical findings may already be overdue. Does not mutate legacy inspection/device/repair states. Successful legacy repair must be recorded before linked ticket resolve; repair completion does not close ticket. No automatic bidirectional sync.

Tidak memerlukan body. Sukses 200 `{data:{imported:<jumlah baru>},message:"Active findings imported; legacy equipment and inspection states unchanged."}`.

#### GET `/api/tickets`

Admin/Koordinator Lab/Teknisi can read all tickets; Kepala Lab reads own reports or tickets linked to devices in a lab headed by that user; other authenticated roles (including Guru) read own reports. Invisible ID returns 404. JWT must contain id. Summary is scope-wide independent of filters, including historical breaches.

Query `status`, `priority` enum; `q` mencari judul/uraian/nomor (200 karakter awal, LIKE wildcard tetap aktif, parameterized). `page` default 1, clamp 1–1000000; `limit` default 20, clamp 1–100; nilai dikonversi Number/truncate, nonfinite memakai default. Sukses 200 `{data: Ticket[], pagination:{page,limit,total,pages}, summary:{total,open,awaiting_verification,escalated,overdue}}`. Total pagination mengikuti filter; summary **scope-wide dan independen dari seluruh filter/pagination**. Open tidak termasuk resolved/closed/cancelled; awaiting_verification = resolved; escalated menghitung timestamp terisi. Overdue mencakup pelanggaran historis, termasuk tiket yang kemudian resolved/closed/cancelled, bukan hanya antrean aktif.

#### POST `/api/tickets`

Any authenticated user. Reporter from JWT; derived priority, status new, version 1 and current SLA snapshot.

Body wajib `title` (trim nonblank, maksimal 200), `description` (trim nonblank, maksimal 5000), `type`, `category`, `impact`, `urgency`; opsional `perangkat_id` null atau ID perangkat yang ada. Sukses 201 `{data: Ticket, message: "Ticket created."}`.

#### POST `/api/tickets/{id}/actions`

All actions require current version and nonblank note. Manager = Admin/Koordinator Lab. Worker = manager or assigned Teknisi. assign: manager assigns any Teknisi, or Teknisi claims an unassigned ticket for self; nonterminal only (not resolved/closed/cancelled), same assignee 409, new becomes assigned otherwise status retained; first response recorded once. start: worker assigned -> in_progress. pending: worker assigned/in_progress -> pending. resume: worker pending -> in_progress. resolve: worker in_progress -> resolved, resolution required, root_cause optional; linked pengecekan must exist with status Sudah Ditangani else 409. close: resolved -> closed, manager or independent reporter (reporter must not also be assignee). reopen: manager/reporter resolved/closed -> assigned if assignee exists, else new; clears resolved_at/closed_at but keeps SLA/history. cancel: manager/reporter except closed/cancelled -> cancelled (resolved is allowed). escalate: any scoped reader on nonterminal ticket, once only; records timestamp without changing status, no automatic external notification. comment: any scoped reader, any status. Every success increments version, updates updated_at and appends an event atomically. Stale version, invalid transition, completed ticket, duplicate assignment/escalation or unresolved linked finding produce 409.

Body wajib `{action,version,note}`; note trim nonblank maksimal 5000 untuk **semua** aksi, termasuk pending/cancel/comment. `assign` opsional `assignee_id`; `resolve` wajib `resolution` trim nonblank maksimal 5000 dan opsional `root_cause` (falsy menjadi null, truthy wajib teks trim nonblank maksimal 5000). Sukses 200 `{data:Ticket,message:"Ticket action recorded."}`.

#### PUT `/api/tickets/{id}`

Admin/Koordinator Lab only. Full classification, note and version required. 409 for stale version or resolved/closed/cancelled. Recalculates current policy snapshot from original creation; preserves prior breaches, appends classified event and increments version.

Body wajib `{type,category,impact,urgency,version,note}`; note trim nonblank maksimal 5000. Bukan endpoint edit judul/deskripsi/pelapor/perangkat. Sukses 200 `{data:Ticket,message:"Classification updated; current policy snapshot anchored to original creation."}`.

#### GET `/api/tickets/{id}`

Admin/Koordinator Lab/Teknisi can read all tickets; Kepala Lab reads own reports or tickets linked to devices in a lab headed by that user; other authenticated roles (including Guru) read own reports. Invisible ID returns 404. JWT must contain id. Includes ordered event history by event_id, timestamps UTC.

Sukses 200 `{data: {...Ticket, events: TicketEvent[]}}`; event terurut event_id.

### Enum, version, field hasil, dan SLA

- `type`: incident/service_request; `category`: hardware/software/network/account/other; impact dan urgency: high/medium/low; status: new/assigned/in_progress/pending/resolved/closed/cancelled.
- ID dan version menerima bilangan bulat positif safe integer atau string desimal digit yang nilainya positive safe integer. `version` wajib pada **actions dan reclassify**, bukan create/import/policies; stale menghasilkan **409 Ticket version conflict.** Setiap aksi sukses termasuk comment menaikkan version; muat ulang detail sebelum retry.
- Prioritas turunan (baris impact, kolom urgency high/medium/low): high=P1/P2/P3; medium=P2/P3/P4; low=P3/P4/P4. Target default respons/resolusi menit: P1=15/240, P2=60/480, P3=240/1440, P4=480/4320. Ini contoh lokal, bukan angka wajib ISO.
- Semua timestamp output UTC ISO-8601 `Z`; DATETIME disimpan UTC. Jam SLA **24×7 elapsed**, pending/libur tidak menghentikan waktu. Deadline original creation + menit snapshot. Assign mencatat respons pertama sekali. Reopen mempertahankan original deadline/first response/history; reclassify menerapkan policy kini pada creation awal dan mempertahankan breach historis. Cancel membekukan perhitungan pada cancelled_at (fallback updated_at), tidak menghapus pelanggaran sebelumnya. Pembaruan kebijakan tidak menulis ulang snapshot tiket lama.
- `Ticket`: ticket_id, ticket_number (`TKT-` + ID minimal enam digit), title, description, type, category, impact, urgency, priority, status, reporter_id, assignee_id?, perangkat_id?, pengecekan_id?, version, response_minutes, resolution_minutes, created_at, updated_at, first_response_at?, response_due_at, resolution_due_at, resolved_at?, closed_at?, cancelled_at?, escalated_at?, resolution?, root_cause?, reporter_name?, assignee_name?, nama_perangkat?, nama_lab?, response_breached, resolution_breached. Tanda ? di daftar hasil berarti nullable, bukan field input bebas. Breach boolean menggabungkan flag persisten dan evaluasi deadline; terlambat lalu resolved tetap breached. Detail menambah events; mutasi/list tidak.
- `TicketEvent`: event_id, action, from_status nullable, to_status nullable, note, actor_name nullable, created_at UTC. Riwayat append-only melalui API, bukan jaminan anti-tamper DBA. Tidak ada DELETE tiket/event maupun endpoint policy events.

### Contoh request ilustratif — bukan output nyata

```json
{
  "title": "Koneksi lab terputus",
  "description": "Koneksi jaringan tidak tersedia saat praktikum.",
  "type": "incident",
  "category": "network",
  "impact": "high",
  "urgency": "medium",
  "perangkat_id": null
}
```

Contoh action setelah mengambil version terbaru (nilai ID/version hanya ilustrasi):

```json
{"action":"assign","version":1,"note":"Ditugaskan untuk pemeriksaan awal.","assignee_id":7}
```

```json
{"action":"resolve","version":3,"note":"Hasil siap diverifikasi pelapor.","resolution":"Koneksi pulih setelah penggantian kabel.","root_cause":"Kabel rusak."}
```

## Validasi dan cakupan

Coverage dihitung dari parser source lokal: mount literal `app.use`, registrasi `router.get/post/put/delete/...`, rantai router bersama, serta direct mount jadwal. Route duplikat disimpan sebagai `x-shadowed`, bukan ditimpa seolah handler terakhir yang aktif. GET health `/` dan file static `/uploads/...` didokumentasikan; file statis bukan operasi controller JSON. Parser mengikuti sintaks route literal pada repo ini, bukan evaluator Express umum.

- Registrasi method/path dibaca: **76** (termasuk duplikat dan kontrak router belum di-mount).
- Operasi unik OpenAPI: **70**.
- Registrasi aktif pada snapshot: **76**; kontrak belum di-mount: **0**.
- Validitas struktur OpenAPI dan kesamaan himpunan method/path dicek terpisah melalui tool validator; ini bukan klaim endpoint sudah diuji runtime.

Ticketing menambah **8** operasi unik pada **6** path; setelah tambahan satu preview deletion, total **70** operasi unik OpenAPI pada **67** path. Coverage delapan registrasi router ticketing diverifikasi exact terhadap Markdown dan OpenAPI, terpisah dari bukti runtime JSON. Metadata/operasi legacy dipertahankan.


### Verifikasi penambahan preview

Baseline dibaca programatis: 69 operasi / 66 path. Hanya `GET /api/deletion/{resource}/{id}` ditambahkan: **70 operasi / 67 path**, baseline method/path seluruhnya dipertahankan termasuk `x-shadowed`. Validasi spec: `uv run --offline --with openapi-spec-validator python -m openapi_spec_validator docs/openapi.json`. Hitungan/refs/coverage dibandingkan terpisah secara programatis terhadap router literal mounted; ini validasi statis, bukan HTTP/DB test. Markdown ini dokumen baca dan `docs/openapi.json` spec importable; tidak ada mount Swagger UI yang diiklankan.
