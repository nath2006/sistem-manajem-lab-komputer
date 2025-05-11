CREATE TABLE `user` (
  `user_id` INT PRIMARY KEY AUTO_INCREMENT,
  `username` VARCHAR(50) UNIQUE NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM ('Guru', 'Kepala Lab', 'Kepala Koor Lab', 'Teknisi', 'Admin') NOT NULL
);

CREATE TABLE `perangkat` (
  `perangkat_id` INT PRIMARY KEY AUTO_INCREMENT,
  `nama_perangkat` VARCHAR(100) NOT NULL,
  `spesifikasi` TEXT,
  `status` ENUM ('Baik', 'Rusak', 'Perlu Perbaikan') NOT NULL DEFAULT 'Baik',
  `lokasi` VARCHAR(100)
);

CREATE TABLE `peminjaman` (
  `peminjaman_id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `perangkat_id` INT NOT NULL,
  `tanggal_pinjam` DATE NOT NULL,
  `tanggal_kembali` DATE,
  `status` ENUM ('Dipinjam', 'Dikembalikan') NOT NULL DEFAULT 'Dipinjam'
);

CREATE TABLE `pemeriksaan` (
  `pemeriksaan_id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `perangkat_id` INT NOT NULL,
  `tanggal_pemeriksaan` DATE NOT NULL,
  `hasil_pemeriksaan` ENUM ('Baik', 'Bermasalah') NOT NULL,
  `catatan` TEXT
);

CREATE TABLE `pengecekan` (
  `pengecekan_id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `perangkat_id` INT NOT NULL,
  `tanggal_pengecekan` DATE NOT NULL,
  `hasil_pengecekan` TEXT,
  `catatan` TEXT
);

CREATE TABLE `perbaikan` (
  `perbaikan_id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `perangkat_id` INT NOT NULL,
  `tanggal_perbaikan` DATE NOT NULL,
  `tindakan` TEXT,
  `hasil_perbaikan` ENUM ('Berhasil', 'Gagal') NOT NULL
);

CREATE TABLE `jadwal_lab` (
  `jadwal_id` INT PRIMARY KEY AUTO_INCREMENT,
  `guru_id` INT NOT NULL,
  `tanggal` DATE NOT NULL,
  `jam_mulai` TIME NOT NULL,
  `jam_selesai` TIME NOT NULL,
  `kelas` VARCHAR(50) NOT NULL,
  `kegiatan` VARCHAR(255),
  `status` ENUM ('Kosong', 'Terisi') DEFAULT 'Kosong'
);

CREATE TABLE `laporan` (
  `laporan_id` INT PRIMARY KEY AUTO_INCREMENT,
  `jenis_laporan` ENUM ('Perangkat', 'Perbaikan') NOT NULL,
  `periode` VARCHAR(50),
  `file_path` VARCHAR(255),
  `tanggal_dibuat` DATE DEFAULT (CURRENT_DATE)
);

CREATE TABLE `pengumuman` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `judul` VARCHAR(255) NOT NULL,
  `content` TEXT NOT NULL,
  `file_path` VARCHAR(255),
  `created_at` TIMESTAMP DEFAULT (CURRENT_TIMESTAMP)
);


INSERT INTO `user` (`username`, `password`, `role`)
VALUES (
  'admin',
  '$2b$10$7OYlGOl6ocOsswUszYiD0eH5fpZl12DQ5PRuBrMb02UtSmXKQ5Vza',
  'Admin'
);

ALTER TABLE `peminjaman` ADD FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`);

ALTER TABLE `peminjaman` ADD FOREIGN KEY (`perangkat_id`) REFERENCES `perangkat` (`perangkat_id`);

ALTER TABLE `pemeriksaan` ADD FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`);

ALTER TABLE `pemeriksaan` ADD FOREIGN KEY (`perangkat_id`) REFERENCES `perangkat` (`perangkat_id`);

ALTER TABLE `pengecekan` ADD FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`);

ALTER TABLE `pengecekan` ADD FOREIGN KEY (`perangkat_id`) REFERENCES `perangkat` (`perangkat_id`);

ALTER TABLE `perbaikan` ADD FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`);

ALTER TABLE `perbaikan` ADD FOREIGN KEY (`perangkat_id`) REFERENCES `perangkat` (`perangkat_id`);

ALTER TABLE `jadwal_lab` ADD FOREIGN KEY (`guru_id`) REFERENCES `user` (`user_id`);
