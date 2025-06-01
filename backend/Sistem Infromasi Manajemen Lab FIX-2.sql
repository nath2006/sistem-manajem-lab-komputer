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
  `email` VARCHAR(100) UNIQUE NOT NULL,
  `role` ENUM ('Guru', 'Kepala Lab', 'Koordinator Lab', 'Teknisi', 'Admin') NOT NULL,
  `is_online` BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE `laboratorium` (
  `lab_id` INT PRIMARY KEY AUTO_INCREMENT,
  `nama_lab` VARCHAR(100) NOT NULL,
  `lokasi` VARCHAR(100) NOT NULL,
  `kapasitas` INT NOT NULL,
  `kepala_lab_id` INT NULL,
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
  `status` ENUM ('Baik', 'Rusak', 'Perlu Perbaikan', 'Dalam Perbaikan') NOT NULL DEFAULT 'Baik',
  `lab_id` INT NOT NULL,
  `foto_perangkat` VARCHAR(255),
  `nomor_inventaris` VARCHAR(50) UNIQUE
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
  `status` ENUM ('Terisi', 'Selesai', 'Dibatalkan', 'Berlangsung') DEFAULT 'Terisi',
  `pengajuan_id_asal` INT NULL -- Opsional: Link ke pengajuan asal
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
  `status` ENUM ('Menunggu', 'Disetujui', 'Ditolak', 'Dibatalkan') NOT NULL DEFAULT 'Menunggu',
  `alasan_penolakan` TEXT,
  `disetujui_oleh` INT NULL,
  `waktu_persetujuan` DATETIME NULL
);

CREATE TABLE `pemeriksaan` (
  `pemeriksaan_id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL, -- User yang melakukan pemeriksaan
  `perangkat_id` INT NOT NULL,
  `tanggal_pemeriksaan` DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  `hasil_pemeriksaan` ENUM ('Baik', 'Bermasalah') NOT NULL, -- Disederhanakan
  `catatan` TEXT
);

CREATE TABLE `pengecekan` (
  `pengecekan_id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL, -- User yang melakukan pengecekan (misal: Kepala Lab, Teknisi)
  `perangkat_id` INT NOT NULL,
  `pemeriksaan_id` INT NULL, -- Opsional: link ke pemeriksaan jika pengecekan berasal dari pemeriksaan
  `tanggal_pengecekan` DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  `ditemukan_kerusakan` TEXT NOT NULL,
  `status_pengecekan` ENUM('Baru', 'Sudah Ditangani', 'Menunggu Perbaikan') NOT NULL DEFAULT 'Baru'
);

CREATE TABLE `perbaikan` (
  `perbaikan_id` INT PRIMARY KEY AUTO_INCREMENT,
  `pengecekan_id` INT NULL, -- Diubah menjadi NULLABLE
  `user_id` INT NOT NULL, -- User yang melakukan perbaikan (Teknisi)
  `perangkat_id_snapshot` INT NULL, -- KOLOM BARU untuk menyimpan ID perangkat
  `tanggal_perbaikan` DATE NOT NULL,
  `tindakan` TEXT NOT NULL,
  `hasil_perbaikan` ENUM ('Berhasil', 'Gagal', 'Perlu Penggantian Komponen') NOT NULL,
  `catatan_tambahan` TEXT,
  `tanggal_selesai_perbaikan` DATE NULL
);

CREATE TABLE `laporan` (
  `laporan_id` INT PRIMARY KEY AUTO_INCREMENT,
  `jenis_laporan` ENUM ('Pemeriksaan', 'Pengecekan', 'Perbaikan', 'Penggunaan Lab', 'Inventaris Perangkat') NOT NULL,
  `periode_mulai` DATE NULL,
  `periode_selesai` DATE NULL,
  `deskripsi_laporan` TEXT NULL,
  `file_path` VARCHAR(255) NULL,
  `tanggal_dibuat` DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  `dibuat_oleh` INT NOT NULL
);

CREATE TABLE `pengumuman` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `judul` VARCHAR(255) NOT NULL,
  `content` TEXT NOT NULL,
  `file_path` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT (CURRENT_TIMESTAMP),
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` INT NOT NULL,
  `is_active` BOOLEAN DEFAULT true
);

-- Membuat Unique Index
CREATE UNIQUE INDEX `no_schedule_overlap` ON `jadwal_lab` (`lab_id`, `tanggal`, `jam_mulai`);
CREATE UNIQUE INDEX `prevent_overlapping_requests` ON `pengajuan_lab` (`lab_id`, `tanggal_pakai`, `jam_mulai`);

-- Menambahkan Foreign Key
ALTER TABLE `laboratorium` ADD CONSTRAINT `fk_lab_kepala` FOREIGN KEY (`kepala_lab_id`) REFERENCES `user` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `perangkat` ADD CONSTRAINT `fk_perangkat_lab` FOREIGN KEY (`lab_id`) REFERENCES `laboratorium` (`lab_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `jadwal_lab` ADD CONSTRAINT `fk_jadwal_lab` FOREIGN KEY (`lab_id`) REFERENCES `laboratorium` (`lab_id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `jadwal_lab` ADD CONSTRAINT `fk_jadwal_guru` FOREIGN KEY (`guru_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `jadwal_lab` ADD CONSTRAINT `fk_jadwal_pengajuan_asal` FOREIGN KEY (`pengajuan_id_asal`) REFERENCES `pengajuan_lab` (`pengajuan_id`) ON DELETE SET NULL ON UPDATE CASCADE; -- FK untuk link ke pengajuan

ALTER TABLE `pengajuan_lab` ADD CONSTRAINT `fk_pengajuan_lab` FOREIGN KEY (`lab_id`) REFERENCES `laboratorium` (`lab_id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `pengajuan_lab` ADD CONSTRAINT `fk_pengajuan_guru` FOREIGN KEY (`guru_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `pengajuan_lab` ADD CONSTRAINT `fk_pengajuan_disetujui` FOREIGN KEY (`disetujui_oleh`) REFERENCES `user` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `pemeriksaan` ADD CONSTRAINT `fk_pemeriksaan_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `pemeriksaan` ADD CONSTRAINT `fk_pemeriksaan_perangkat` FOREIGN KEY (`perangkat_id`) REFERENCES `perangkat` (`perangkat_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `pengecekan` ADD CONSTRAINT `fk_pengecekan_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `pengecekan` ADD CONSTRAINT `fk_pengecekan_perangkat` FOREIGN KEY (`perangkat_id`) REFERENCES `perangkat` (`perangkat_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `pengecekan` ADD CONSTRAINT `fk_pengecekan_pemeriksaan` FOREIGN KEY (`pemeriksaan_id`) REFERENCES `pemeriksaan` (`pemeriksaan_id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `perbaikan` ADD CONSTRAINT `fk_perbaikan_pengecekan` FOREIGN KEY (`pengecekan_id`) REFERENCES `pengecekan` (`pengecekan_id`) ON DELETE SET NULL ON UPDATE CASCADE; -- Sudah benar dengan ON DELETE SET NULL
ALTER TABLE `perbaikan` ADD CONSTRAINT `fk_perbaikan_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `perbaikan` ADD CONSTRAINT `fk_perbaikan_perangkat_snapshot` FOREIGN KEY (`perangkat_id_snapshot`) REFERENCES `perangkat` (`perangkat_id`) ON DELETE RESTRICT ON UPDATE CASCADE; -- FK untuk perangkat_id_snapshot

ALTER TABLE `laporan` ADD CONSTRAINT `fk_laporan_user` FOREIGN KEY (`dibuat_oleh`) REFERENCES `user` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `pengumuman` ADD CONSTRAINT `fk_pengumuman_user` FOREIGN KEY (`created_by`) REFERENCES `user` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;


-- VIEW untuk menampilkan alur pemeriksaan → pengecekan → perbaikan
CREATE VIEW view_laporan_pemeriksaan_perbaikan AS
SELECT 
  pm.pemeriksaan_id,
  p.perangkat_id,
  p.nama_perangkat,
  p.nomor_inventaris,
  lab.nama_lab,
  
  u_pemeriksa.nama_lengkap AS pemeriksa,
  pm.tanggal_pemeriksaan,
  pm.hasil_pemeriksaan, -- Akan berisi 'Baik' atau 'Bermasalah'
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
  pb.tanggal_selesai_perbaikan,
  pb.perangkat_id_snapshot -- Menambahkan ini ke view untuk visibilitas
FROM pemeriksaan pm
JOIN perangkat p ON pm.perangkat_id = p.perangkat_id
JOIN laboratorium lab ON p.lab_id = lab.lab_id
JOIN user u_pemeriksa ON pm.user_id = u_pemeriksa.user_id
LEFT JOIN pengecekan pc ON pc.perangkat_id = p.perangkat_id AND (pc.pemeriksaan_id = pm.pemeriksaan_id OR pm.hasil_pemeriksaan = 'Bermasalah')
LEFT JOIN user u_pengecek ON pc.user_id = u_pengecek.user_id
LEFT JOIN perbaikan pb ON (pb.pengecekan_id = pc.pengecekan_id OR (pb.pengecekan_id IS NULL AND pb.perangkat_id_snapshot = p.perangkat_id AND pc.pengecekan_id IS NULL AND pm.hasil_pemeriksaan = 'Bermasalah')) 
-- ^ Join ke perbaikan diperluas untuk mencoba menangkap perbaikan yang pengecekan_id-nya NULL,
-- dengan asumsi perbaikan tersebut terkait dengan perangkat dari pemeriksaan yang bermasalah dan pengecekan terkaitnya (jika ada) sudah tidak ada.
-- Logika join ini bisa menjadi sangat kompleks dan mungkin perlu disederhanakan atau dibagi menjadi beberapa view berbeda
-- tergantung kebutuhan pelaporan yang spesifik.
LEFT JOIN user u_perbaiki ON pb.user_id = u_perbaiki.user_id
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
