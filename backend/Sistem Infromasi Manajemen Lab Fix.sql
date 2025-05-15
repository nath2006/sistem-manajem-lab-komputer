CREATE TABLE `user` (
  `user_id` INT PRIMARY KEY AUTO_INCREMENT,
  `username` VARCHAR(50) UNIQUE NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `nama_lengkap` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `role` ENUM ('Guru', 'Kepala Lab', 'Kepala Koor Lab', 'Teknisi', 'Admin') NOT NULL
);

CREATE TABLE `laboratorium` (
  `lab_id` INT PRIMARY KEY AUTO_INCREMENT,
  `nama_lab` VARCHAR(100) NOT NULL,
  `lokasi` VARCHAR(100) NOT NULL,
  `kapasitas` INT NOT NULL,
  `kepala_lab_id` INT NOT NULL,
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
  `status` ENUM ('Baik', 'Rusak', 'Perlu Perbaikan') NOT NULL DEFAULT 'Baik',
  `lab_id` INT NOT NULL,
  `file_path` VARCHAR(255),
  `nomor_inventaris` VARCHAR(50)
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
  `status` ENUM ('Terisi', 'Selesai', 'Dibatalkan') DEFAULT 'Terisi'
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
  `status` ENUM ('Menunggu', 'Disetujui', 'Ditolak') NOT NULL DEFAULT 'Menunggu',
  `alasan_penolakan` TEXT,
  `disetujui_oleh` INT,
  `waktu_persetujuan` DATETIME
);

CREATE TABLE `pemeriksaan` (
  `pemeriksaan_id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `perangkat_id` INT NOT NULL,
  `tanggal_pemeriksaan` DATE NOT NULL,
  `hasil_pemeriksaan` ENUM ('Baik', 'Bermasalah') NOT NULL,
  `catatan` TEXT
);

CREATE TABLE `perbaikan` (
  `perbaikan_id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `perangkat_id` INT NOT NULL,
  `tanggal_perbaikan` DATE NOT NULL,
  `tindakan` TEXT,
  `hasil_perbaikan` ENUM ('Berhasil', 'Gagal') NOT NULL,
  `catatan_tambahan` TEXT
);

CREATE TABLE `laporan` (
  `laporan_id` INT PRIMARY KEY AUTO_INCREMENT,
  `jenis_laporan` ENUM ('Perangkat', 'Perbaikan', 'Penggunaan Lab') NOT NULL,
  `periode` VARCHAR(50),
  `file_path` VARCHAR(255),
  `tanggal_dibuat` DATE DEFAULT (CURRENT_DATE),
  `dibuat_oleh` INT NOT NULL
);

CREATE TABLE `pengumuman` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `judul` VARCHAR(255) NOT NULL,
  `content` TEXT NOT NULL,
  `file_path` VARCHAR(255),
  `created_at` TIMESTAMP DEFAULT (CURRENT_TIMESTAMP),
  `created_by` INT NOT NULL,
  `is_active` BOOLEAN DEFAULT true
);

CREATE UNIQUE INDEX `no_schedule_overlap` ON `jadwal_lab` (`lab_id`, `tanggal`, `jam_mulai`, `jam_selesai`);

CREATE UNIQUE INDEX `prevent_overlapping_requests` ON `pengajuan_lab` (`lab_id`, `tanggal_pakai`, `jam_mulai`);

ALTER TABLE `laboratorium` ADD FOREIGN KEY (`kepala_lab_id`) REFERENCES `user` (`user_id`);

ALTER TABLE `perangkat` ADD FOREIGN KEY (`lab_id`) REFERENCES `laboratorium` (`lab_id`);

ALTER TABLE `jadwal_lab` ADD FOREIGN KEY (`lab_id`) REFERENCES `laboratorium` (`lab_id`);

ALTER TABLE `jadwal_lab` ADD FOREIGN KEY (`guru_id`) REFERENCES `user` (`user_id`);

ALTER TABLE `pengajuan_lab` ADD FOREIGN KEY (`lab_id`) REFERENCES `laboratorium` (`lab_id`);

ALTER TABLE `pengajuan_lab` ADD FOREIGN KEY (`guru_id`) REFERENCES `user` (`user_id`);

ALTER TABLE `pengajuan_lab` ADD FOREIGN KEY (`disetujui_oleh`) REFERENCES `user` (`user_id`);

ALTER TABLE `pemeriksaan` ADD FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`);

ALTER TABLE `pemeriksaan` ADD FOREIGN KEY (`perangkat_id`) REFERENCES `perangkat` (`perangkat_id`);

ALTER TABLE `perbaikan` ADD FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`);

ALTER TABLE `perbaikan` ADD FOREIGN KEY (`perangkat_id`) REFERENCES `perangkat` (`perangkat_id`);

ALTER TABLE `laporan` ADD FOREIGN KEY (`dibuat_oleh`) REFERENCES `user` (`user_id`);

ALTER TABLE `pengumuman` ADD FOREIGN KEY (`created_by`) REFERENCES `user` (`user_id`);

INSERT INTO user (username, password, nama_lengkap, email, role)
-- DEFAULT USER
-- username = admin
-- password = 12345678
-- role = Admin
SELECT 'admin', '$2a$10$ybTPe1uDN/aVEz3/o6xHYOTahBcazv4Icfzwg9t0GA49eC4WryYZS', 'Admin', 'admin@gmail.com', 'Admin'
WHERE NOT EXISTS (
    SELECT 1 FROM user WHERE username = 'admin'
);
