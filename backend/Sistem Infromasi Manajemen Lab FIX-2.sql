-- Hapus tabel jika sudah ada (untuk development, agar bisa dijalankan ulang tanpa error)
-- HATI-HATI: Ini akan menghapus semua data di tabel-tabel ini!
DROP VIEW IF EXISTS `view_laporan_pemeriksaan_perbaikan`;
DROP TABLE IF EXISTS `pengumuman`;
DROP TABLE IF EXISTS `laporan`;
DROP TABLE IF EXISTS `perbaikan`;
DROP TABLE IF EXISTS `pengecekan`;
DROP TABLE IF EXISTS `pemeriksaan`;
DROP TABLE IF EXISTS `pengajuan_lab`;
DROP TABLE IF EXISTS `jadwal_lab`;
DROP TABLE IF EXISTS `perangkat`;
DROP TABLE IF EXISTS `laboratorium`;
DROP TABLE IF EXISTS `user`;

-- Membuat Tabel
CREATE TABLE `user` (
  `user_id` INT PRIMARY KEY AUTO_INCREMENT,
  `username` VARCHAR(50) UNIQUE NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `nama_lengkap` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) UNIQUE NOT NULL, -- Tambahkan UNIQUE untuk email
  `role` ENUM ('Guru', 'Kepala Lab', 'Koordinator Lab', 'Teknisi', 'Admin') NOT NULL,
  `is_online` BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE `laboratorium` (
  `lab_id` INT PRIMARY KEY AUTO_INCREMENT,
  `nama_lab` VARCHAR(100) NOT NULL,
  `lokasi` VARCHAR(100) NOT NULL,
  `kapasitas` INT NOT NULL,
  `kepala_lab_id` INT NULL, -- Diizinkan NULL jika kepala lab bisa belum ditentukan
  `deskripsi` TEXT,
  `status` ENUM ('Tersedia', 'Tidak Tersedia', 'Pemeliharaan') NOT NULL DEFAULT 'Tersedia',
  `jam_buka` TIME NOT NULL DEFAULT '07:00:00',
  `jam_tutup` TIME NOT NULL DEFAULT '16:00:00',
  `foto_lab` VARCHAR(255)
);

CREATE TABLE `perangkat` (
  `perangkat_id` INT PRIMARY KEY AUTO_INCREMENT,
  `nama_perangkat` VARCHAR(100) NOT NULL,
  `spesifikasi` TEXT,
  `status` ENUM ('Baik', 'Rusak', 'Perlu Perbaikan', 'Dalam Perbaikan') NOT NULL DEFAULT 'Baik', -- Tambah status 'Dalam Perbaikan'
  `lab_id` INT NOT NULL,
  `foto_perangkat` VARCHAR(255),
  `nomor_inventaris` VARCHAR(50) UNIQUE -- Tambahkan UNIQUE jika nomor inventaris harus unik
);

CREATE TABLE `jadwal_lab` (
  `jadwal_id` INT PRIMARY KEY AUTO_INCREMENT,
  `lab_id` INT NOT NULL,
  `guru_id` INT NOT NULL,
  `tanggal` DATE NOT NULL,
  `jam_mulai` TIME NOT NULL,
  `jam_selesai` TIME NOT NULL,
  `kelas` VARCHAR(50) NOT NULL,
  `mata_pelajaran` VARCHAR(100) NOT NULL,
  `kegiatan` VARCHAR(255),
  `status` ENUM ('Terisi', 'Selesai', 'Dibatalkan', 'Berlangsung') DEFAULT 'Terisi' -- Tambah status 'Berlangsung'
);

CREATE TABLE `pengajuan_lab` (
  `pengajuan_id` INT PRIMARY KEY AUTO_INCREMENT,
  `lab_id` INT NOT NULL,
  `guru_id` INT NOT NULL,
  `tanggal_pengajuan` DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  `tanggal_pakai` DATE NOT NULL,
  `jam_mulai` TIME NOT NULL,
  `jam_selesai` TIME NOT NULL,
  `kelas` VARCHAR(50) NOT NULL,
  `mata_pelajaran` VARCHAR(100) NOT NULL,
  `kegiatan` VARCHAR(255) NOT NULL,
  `status` ENUM ('Menunggu', 'Disetujui', 'Ditolak', 'Dibatalkan') NOT NULL DEFAULT 'Menunggu', -- Tambah status 'Dibatalkan'
  `alasan_penolakan` TEXT,
  `disetujui_oleh` INT NULL, -- Diizinkan NULL
  `waktu_persetujuan` DATETIME NULL -- Diizinkan NULL
);

CREATE TABLE `pemeriksaan` (
  `pemeriksaan_id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL, -- User yang melakukan pemeriksaan
  `perangkat_id` INT NOT NULL,
  `tanggal_pemeriksaan` DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP), -- Ganti ke DATETIME dan default
  `hasil_pemeriksaan` ENUM ('Baik', 'Bermasalah Ringan', 'Bermasalah Serius', 'Perlu Pengecekan Lanjut') NOT NULL, -- Perluas ENUM
  `catatan` TEXT
);

CREATE TABLE `pengecekan` (
  `pengecekan_id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL, -- User yang melakukan pengecekan (misal: Kepala Lab, Teknisi)
  `perangkat_id` INT NOT NULL,
  `pemeriksaan_id` INT NULL, -- Opsional: link ke pemeriksaan jika pengecekan berasal dari pemeriksaan
  `tanggal_pengecekan` DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP), -- Ganti ke DATETIME dan default
  `ditemukan_kerusakan` TEXT NOT NULL, -- Dibuat NOT NULL agar jelas ada kerusakan
  `status_pengecekan` ENUM('Baru', 'Sudah Ditangani', 'Menunggu Perbaikan') NOT NULL DEFAULT 'Baru' -- Tambah status
);

CREATE TABLE `perbaikan` (
  `perbaikan_id` INT PRIMARY KEY AUTO_INCREMENT,
  `pengecekan_id` INT NULL, -- Diubah menjadi NULLABLE
  `user_id` INT NOT NULL, -- User yang melakukan perbaikan (Teknisi)
  `perangkat_id_snapshot` INT NULL, -- KOLOM BARU untuk menyimpan ID perangkat
  `tanggal_perbaikan` DATE NOT NULL,
  `tindakan` TEXT NOT NULL, -- Dibuat NOT NULL
  `hasil_perbaikan` ENUM ('Berhasil', 'Gagal', 'Perlu Penggantian Komponen') NOT NULL, -- Perluas ENUM
  `catatan_tambahan` TEXT,
  `tanggal_selesai_perbaikan` DATE NULL -- Opsional: jika perbaikan butuh waktu
);

CREATE TABLE `laporan` (
  `laporan_id` INT PRIMARY KEY AUTO_INCREMENT,
  `jenis_laporan` ENUM ('Pemeriksaan', 'Pengecekan', 'Perbaikan', 'Penggunaan Lab', 'Inventaris Perangkat') NOT NULL, -- Tambah jenis laporan
  `periode_mulai` DATE NULL, -- Untuk rentang periode
  `periode_selesai` DATE NULL, -- Untuk rentang periode
  `deskripsi_laporan` TEXT NULL,
  `file_path` VARCHAR(255) NULL,
  `tanggal_dibuat` DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP), -- Ganti ke DATETIME dan default
  `dibuat_oleh` INT NOT NULL
);

CREATE TABLE `pengumuman` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `judul` VARCHAR(255) NOT NULL,
  `content` TEXT NOT NULL,
  `file_path` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT (CURRENT_TIMESTAMP),
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Tambah updated_at
  `created_by` INT NOT NULL,
  `is_active` BOOLEAN DEFAULT true
);

-- Membuat Unique Index
CREATE UNIQUE INDEX `no_schedule_overlap` ON `jadwal_lab` (`lab_id`, `tanggal`, `jam_mulai`); -- Cukup jam_mulai jika durasi bisa bervariasi
-- Atau jika jam_selesai juga penting untuk uniqueness:
-- CREATE UNIQUE INDEX `no_schedule_overlap` ON `jadwal_lab` (`lab_id`, `tanggal`, `jam_mulai`, `jam_selesai`);

CREATE UNIQUE INDEX `prevent_overlapping_requests` ON `pengajuan_lab` (`lab_id`, `tanggal_pakai`, `jam_mulai`);
-- Sama seperti jadwal_lab, pertimbangkan `jam_selesai` jika perlu.

-- Menambahkan Foreign Key
ALTER TABLE `laboratorium` ADD CONSTRAINT `fk_lab_kepala` FOREIGN KEY (`kepala_lab_id`) REFERENCES `user` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE; -- ON DELETE SET NULL jika kepala lab dihapus

ALTER TABLE `perangkat` ADD CONSTRAINT `fk_perangkat_lab` FOREIGN KEY (`lab_id`) REFERENCES `laboratorium` (`lab_id`) ON DELETE CASCADE ON UPDATE CASCADE; -- Jika lab dihapus, perangkat di dalamnya juga? Atau RESTRICT?

ALTER TABLE `jadwal_lab` ADD CONSTRAINT `fk_jadwal_lab` FOREIGN KEY (`lab_id`) REFERENCES `laboratorium` (`lab_id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `jadwal_lab` ADD CONSTRAINT `fk_jadwal_guru` FOREIGN KEY (`guru_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `pengajuan_lab` ADD CONSTRAINT `fk_pengajuan_lab` FOREIGN KEY (`lab_id`) REFERENCES `laboratorium` (`lab_id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `pengajuan_lab` ADD CONSTRAINT `fk_pengajuan_guru` FOREIGN KEY (`guru_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `pengajuan_lab` ADD CONSTRAINT `fk_pengajuan_disetujui` FOREIGN KEY (`disetujui_oleh`) REFERENCES `user` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `pemeriksaan` ADD CONSTRAINT `fk_pemeriksaan_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `pemeriksaan` ADD CONSTRAINT `fk_pemeriksaan_perangkat` FOREIGN KEY (`perangkat_id`) REFERENCES `perangkat` (`perangkat_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `pengecekan` ADD CONSTRAINT `fk_pengecekan_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `pengecekan` ADD CONSTRAINT `fk_pengecekan_perangkat` FOREIGN KEY (`perangkat_id`) REFERENCES `perangkat` (`perangkat_id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `pengecekan` ADD CONSTRAINT `fk_pengecekan_pemeriksaan` FOREIGN KEY (`pemeriksaan_id`) REFERENCES `pemeriksaan` (`pemeriksaan_id`) ON DELETE SET NULL ON UPDATE CASCADE; -- Jika pemeriksaan dihapus, linknya jadi NULL

-- Ini adalah bagian penting untuk alur perbaikan Anda:
ALTER TABLE `perbaikan` ADD CONSTRAINT `fk_perbaikan_pengecekan` FOREIGN KEY (`pengecekan_id`) REFERENCES `pengecekan` (`pengecekan_id`) ON DELETE SET NULL ON UPDATE CASCADE; -- ON DELETE SET NULL
ALTER TABLE `perbaikan` ADD CONSTRAINT `fk_perbaikan_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `perbaikan` ADD CONSTRAINT `fk_perbaikan_perangkat_snapshot` FOREIGN KEY (`perangkat_id_snapshot`) REFERENCES `perangkat` (`perangkat_id`) ON DELETE RESTRICT ON UPDATE CASCADE; -- Jaga agar perangkat tidak dihapus jika ada perbaikan terkait, atau SET NULL jika boleh.

ALTER TABLE `laporan` ADD CONSTRAINT `fk_laporan_user` FOREIGN KEY (`dibuat_oleh`) REFERENCES `user` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `pengumuman` ADD CONSTRAINT `fk_pengumuman_user` FOREIGN KEY (`created_by`) REFERENCES `user` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;


-- VIEW untuk menampilkan alur pemeriksaan → pengecekan → perbaikan
-- View ini mungkin perlu penyesuaian lebih lanjut jika ingin menampilkan perbaikan
-- yang pengecekan_id-nya sudah NULL tapi memiliki perangkat_id_snapshot.
-- Untuk saat ini, view ini akan menunjukkan data selama link antar tabel masih ada.
CREATE VIEW view_laporan_pemeriksaan_perbaikan AS
SELECT 
  pm.pemeriksaan_id,
  p.perangkat_id,
  p.nama_perangkat,
  p.nomor_inventaris,
  lab.nama_lab,
  
  u_pemeriksa.nama_lengkap AS pemeriksa,
  pm.tanggal_pemeriksaan,
  pm.hasil_pemeriksaan,
  pm.catatan AS catatan_pemeriksaan,

  pc.pengecekan_id,
  u_pengecek.nama_lengkap AS pengecek,
  pc.tanggal_pengecekan,
  pc.ditemukan_kerusakan,
  pc.status_pengecekan,

  pb.perbaikan_id,
  u_perbaiki.nama_lengkap AS teknisi_perbaikan,
  pb.tanggal_perbaikan,
  pb.tindakan AS tindakan_perbaikan,
  pb.hasil_perbaikan AS hasil_final_perbaikan,
  pb.catatan_tambahan AS catatan_final_perbaikan,
  pb.tanggal_selesai_perbaikan

FROM pemeriksaan pm
JOIN perangkat p ON pm.perangkat_id = p.perangkat_id
JOIN laboratorium lab ON p.lab_id = lab.lab_id
JOIN user u_pemeriksa ON pm.user_id = u_pemeriksa.user_id

LEFT JOIN pengecekan pc ON pc.perangkat_id = p.perangkat_id AND pc.pemeriksaan_id = pm.pemeriksaan_id -- Join lebih spesifik jika 1 pemeriksaan -> 1 pengecekan
-- Atau jika beberapa pengecekan bisa dari 1 pemeriksaan (atau pengecekan tanpa pemeriksaan), maka:
-- LEFT JOIN pengecekan pc ON pc.perangkat_id = p.perangkat_id 
-- (dan mungkin Anda perlu logika tambahan untuk memilih pengecekan yang relevan jika ada banyak)

LEFT JOIN user u_pengecek ON pc.user_id = u_pengecek.user_id

LEFT JOIN perbaikan pb ON pb.pengecekan_id = pc.pengecekan_id 
-- Jika ingin menampilkan perbaikan yang pengecekan_id nya NULL tapi punya perangkat_id_snapshot:
-- LEFT JOIN perbaikan pb ON (pb.pengecekan_id = pc.pengecekan_id OR (pb.pengecekan_id IS NULL AND pb.perangkat_id_snapshot = p.perangkat_id AND pc.pengecekan_id IS NULL))
-- Bagian view ini bisa kompleks, tergantung bagaimana Anda ingin data agregat ditampilkan.
-- Untuk saat ini, kita biarkan join perbaikan ke pengecekan yang ada.

LEFT JOIN user u_perbaiki ON pb.user_id = u_perbaiki.user_id

-- WHERE pm.hasil_pemeriksaan LIKE 'Bermasalah%' OR pc.pengecekan_id IS NOT NULL OR pb.perbaikan_id IS NOT NULL -- Tampilkan semua alur yang ada
ORDER BY pm.tanggal_pemeriksaan DESC, pc.tanggal_pengecekan DESC, pb.tanggal_perbaikan DESC;


-- DEFAULT USER (Password: 12345678)
INSERT INTO user (username, password, nama_lengkap, email, role)
SELECT 'admin', '$2a$10$ybTPe1uDN/aVEz3/o6xHYOTahBcazv4Icfzwg9t0GA49eC4WryYZS', 'Admin Sistem', 'admin@example.com', 'Admin'
WHERE NOT EXISTS (
    SELECT 1 FROM user WHERE username = 'admin'
);

INSERT INTO user (username, password, nama_lengkap, email, role)
SELECT 'kalab', '$2a$10$ybTPe1uDN/aVEz3/o6xHYOTahBcazv4Icfzwg9t0GA49eC4WryYZS', 'Kepala Laboratorium', 'kalab@example.com', 'Kepala Lab'
WHERE NOT EXISTS (
    SELECT 1 FROM user WHERE username = 'kalab'
);

INSERT INTO user (username, password, nama_lengkap, email, role)
SELECT 'teknisi', '$2a$10$ybTPe1uDN/aVEz3/o6xHYOTahBcazv4Icfzwg9t0GA49eC4WryYZS', 'Teknisi Lab', 'teknisi@example.com', 'Teknisi'
WHERE NOT EXISTS (
    SELECT 1 FROM user WHERE username = 'teknisi'
);

INSERT INTO user (username, password, nama_lengkap, email, role)
SELECT 'guru', '$2a$10$ybTPe1uDN/aVEz3/o6xHYOTahBcazv4Icfzwg9t0GA49eC4WryYZS', 'Guru Pengampu', 'guru@example.com', 'Guru'
WHERE NOT EXISTS (
    SELECT 1 FROM user WHERE username = 'guru'
);

-- Contoh Data Awal (Opsional, untuk development)
-- Pastikan user dengan ID yang sesuai sudah ada jika menjalankan ini
-- INSERT INTO laboratorium (nama_lab, lokasi, kapasitas, kepala_lab_id)
-- SELECT 'Lab Komputer Dasar', 'Gedung A Lt. 1', 40, user_id FROM user WHERE username = 'kalab' LIMIT 1
-- WHERE NOT EXISTS (SELECT 1 FROM laboratorium WHERE nama_lab = 'Lab Komputer Dasar');

-- INSERT INTO perangkat (nama_perangkat, lab_id, nomor_inventaris, status)
-- SELECT 'PC-001', lab_id, 'INV/PC/2024/001', 'Baik' FROM laboratorium WHERE nama_lab = 'Lab Komputer Dasar' LIMIT 1
-- WHERE NOT EXISTS (SELECT 1 FROM perangkat WHERE nama_perangkat = 'PC-001');
