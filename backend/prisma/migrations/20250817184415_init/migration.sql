-- CreateTable
CREATE TABLE `jadwal_lab` (
    `jadwal_id` INTEGER NOT NULL AUTO_INCREMENT,
    `lab_id` INTEGER NOT NULL,
    `guru_id` INTEGER NOT NULL,
    `tanggal` DATE NOT NULL,
    `jam_mulai` TIME(0) NOT NULL,
    `jam_selesai` TIME(0) NOT NULL,
    `kelas` VARCHAR(50) NOT NULL,
    `mata_pelajaran` VARCHAR(100) NOT NULL,
    `kegiatan` VARCHAR(255) NULL,
    `status` ENUM('Terisi', 'Selesai', 'Dibatalkan', 'Berlangsung') NULL DEFAULT 'Terisi',
    `pengajuan_id_asal` INTEGER NULL,

    INDEX `fk_jadwal_guru`(`guru_id`),
    INDEX `fk_jadwal_pengajuan_asal`(`pengajuan_id_asal`),
    UNIQUE INDEX `no_schedule_overlap`(`lab_id`, `tanggal`, `jam_mulai`),
    PRIMARY KEY (`jadwal_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `laboratorium` (
    `lab_id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama_lab` VARCHAR(100) NOT NULL,
    `lokasi` VARCHAR(100) NOT NULL,
    `kapasitas` INTEGER NOT NULL,
    `kepala_lab_id` INTEGER NULL,
    `deskripsi` TEXT NULL,
    `status` ENUM('Tersedia', 'Tidak Tersedia', 'Pemeliharaan') NOT NULL DEFAULT 'Tersedia',
    `jam_buka` TIME(0) NOT NULL DEFAULT '07:00:00',
    `jam_tutup` TIME(0) NOT NULL DEFAULT '16:00:00',
    `foto_lab` VARCHAR(255) NULL,

    INDEX `fk_lab_kepala`(`kepala_lab_id`),
    PRIMARY KEY (`lab_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `laporan` (
    `laporan_id` INTEGER NOT NULL AUTO_INCREMENT,
    `jenis_laporan` ENUM('Pemeriksaan', 'Pengecekan', 'Perbaikan', 'Penggunaan Lab', 'Inventaris Perangkat') NOT NULL,
    `periode_mulai` DATE NULL,
    `periode_selesai` DATE NULL,
    `deskripsi_laporan` TEXT NULL,
    `file_path` VARCHAR(255) NULL,
    `tanggal_dibuat` DATETIME(0) NOT NULL DEFAULT (now()),
    `dibuat_oleh` INTEGER NOT NULL,

    INDEX `fk_laporan_user`(`dibuat_oleh`),
    PRIMARY KEY (`laporan_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pemeriksaan` (
    `pemeriksaan_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `perangkat_id` INTEGER NOT NULL,
    `tanggal_pemeriksaan` DATETIME(0) NOT NULL DEFAULT (now()),
    `hasil_pemeriksaan` ENUM('Baik', 'Bermasalah') NOT NULL,
    `catatan` TEXT NULL,

    INDEX `fk_pemeriksaan_perangkat`(`perangkat_id`),
    INDEX `fk_pemeriksaan_user`(`user_id`),
    PRIMARY KEY (`pemeriksaan_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pengajuan_lab` (
    `pengajuan_id` INTEGER NOT NULL AUTO_INCREMENT,
    `lab_id` INTEGER NOT NULL,
    `guru_id` INTEGER NOT NULL,
    `tanggal_pengajuan` DATETIME(0) NOT NULL DEFAULT (now()),
    `tanggal_pakai` DATE NOT NULL,
    `jam_mulai` TIME(0) NOT NULL,
    `jam_selesai` TIME(0) NOT NULL,
    `kelas` VARCHAR(50) NOT NULL,
    `mata_pelajaran` VARCHAR(100) NOT NULL,
    `kegiatan` VARCHAR(255) NOT NULL,
    `status` ENUM('Menunggu', 'Disetujui', 'Ditolak', 'Dibatalkan') NOT NULL DEFAULT 'Menunggu',
    `alasan_penolakan` TEXT NULL,
    `disetujui_oleh` INTEGER NULL,
    `waktu_persetujuan` DATETIME(0) NULL,

    INDEX `fk_pengajuan_disetujui`(`disetujui_oleh`),
    INDEX `fk_pengajuan_guru`(`guru_id`),
    UNIQUE INDEX `prevent_overlapping_requests`(`lab_id`, `tanggal_pakai`, `jam_mulai`),
    PRIMARY KEY (`pengajuan_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pengecekan` (
    `pengecekan_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `perangkat_id` INTEGER NOT NULL,
    `pemeriksaan_id` INTEGER NULL,
    `tanggal_pengecekan` DATETIME(0) NOT NULL DEFAULT (now()),
    `ditemukan_kerusakan` TEXT NOT NULL,
    `status_pengecekan` ENUM('Baru', 'Sudah Ditangani', 'Menunggu Perbaikan') NOT NULL DEFAULT 'Baru',

    INDEX `fk_pengecekan_pemeriksaan`(`pemeriksaan_id`),
    INDEX `fk_pengecekan_perangkat`(`perangkat_id`),
    INDEX `fk_pengecekan_user`(`user_id`),
    PRIMARY KEY (`pengecekan_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pengumuman` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `judul` VARCHAR(255) NOT NULL,
    `content` TEXT NOT NULL,
    `file_path` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT (now()),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `created_by` INTEGER NOT NULL,
    `is_active` BOOLEAN NULL DEFAULT true,

    INDEX `fk_pengumuman_user`(`created_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `perangkat` (
    `perangkat_id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama_perangkat` VARCHAR(100) NOT NULL,
    `spesifikasi` TEXT NULL,
    `status` ENUM('Baik', 'Rusak', 'Perlu Perbaikan', 'Dalam Perbaikan') NOT NULL DEFAULT 'Baik',
    `lab_id` INTEGER NOT NULL,
    `foto_perangkat` VARCHAR(255) NULL,
    `nomor_inventaris` VARCHAR(50) NULL,

    UNIQUE INDEX `nomor_inventaris`(`nomor_inventaris`),
    INDEX `fk_perangkat_lab`(`lab_id`),
    PRIMARY KEY (`perangkat_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `perbaikan` (
    `perbaikan_id` INTEGER NOT NULL AUTO_INCREMENT,
    `pengecekan_id` INTEGER NULL,
    `user_id` INTEGER NOT NULL,
    `perangkat_id_snapshot` INTEGER NULL,
    `tanggal_perbaikan` DATE NOT NULL,
    `tindakan` TEXT NOT NULL,
    `hasil_perbaikan` ENUM('Berhasil', 'Gagal', 'Perlu Penggantian Komponen') NOT NULL,
    `catatan_tambahan` TEXT NULL,
    `tanggal_selesai_perbaikan` DATE NULL,

    INDEX `fk_perbaikan_pengecekan`(`pengecekan_id`),
    INDEX `fk_perbaikan_perangkat_snapshot`(`perangkat_id_snapshot`),
    INDEX `fk_perbaikan_user`(`user_id`),
    PRIMARY KEY (`perbaikan_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user` (
    `user_id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(50) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `nama_lengkap` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `role` ENUM('Guru', 'Kepala Lab', 'Koordinator Lab', 'Teknisi', 'Admin') NOT NULL,
    `is_online` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `username`(`username`),
    UNIQUE INDEX `email`(`email`),
    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `jadwal_lab` ADD CONSTRAINT `fk_jadwal_guru` FOREIGN KEY (`guru_id`) REFERENCES `user`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `jadwal_lab` ADD CONSTRAINT `fk_jadwal_lab` FOREIGN KEY (`lab_id`) REFERENCES `laboratorium`(`lab_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `jadwal_lab` ADD CONSTRAINT `fk_jadwal_pengajuan_asal` FOREIGN KEY (`pengajuan_id_asal`) REFERENCES `pengajuan_lab`(`pengajuan_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `laboratorium` ADD CONSTRAINT `fk_lab_kepala` FOREIGN KEY (`kepala_lab_id`) REFERENCES `user`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `laporan` ADD CONSTRAINT `fk_laporan_user` FOREIGN KEY (`dibuat_oleh`) REFERENCES `user`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pemeriksaan` ADD CONSTRAINT `fk_pemeriksaan_perangkat` FOREIGN KEY (`perangkat_id`) REFERENCES `perangkat`(`perangkat_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pemeriksaan` ADD CONSTRAINT `fk_pemeriksaan_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pengajuan_lab` ADD CONSTRAINT `fk_pengajuan_disetujui` FOREIGN KEY (`disetujui_oleh`) REFERENCES `user`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pengajuan_lab` ADD CONSTRAINT `fk_pengajuan_guru` FOREIGN KEY (`guru_id`) REFERENCES `user`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pengajuan_lab` ADD CONSTRAINT `fk_pengajuan_lab` FOREIGN KEY (`lab_id`) REFERENCES `laboratorium`(`lab_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pengecekan` ADD CONSTRAINT `fk_pengecekan_pemeriksaan` FOREIGN KEY (`pemeriksaan_id`) REFERENCES `pemeriksaan`(`pemeriksaan_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pengecekan` ADD CONSTRAINT `fk_pengecekan_perangkat` FOREIGN KEY (`perangkat_id`) REFERENCES `perangkat`(`perangkat_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pengecekan` ADD CONSTRAINT `fk_pengecekan_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pengumuman` ADD CONSTRAINT `fk_pengumuman_user` FOREIGN KEY (`created_by`) REFERENCES `user`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `perangkat` ADD CONSTRAINT `fk_perangkat_lab` FOREIGN KEY (`lab_id`) REFERENCES `laboratorium`(`lab_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `perbaikan` ADD CONSTRAINT `fk_perbaikan_pengecekan` FOREIGN KEY (`pengecekan_id`) REFERENCES `pengecekan`(`pengecekan_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `perbaikan` ADD CONSTRAINT `fk_perbaikan_perangkat_snapshot` FOREIGN KEY (`perangkat_id_snapshot`) REFERENCES `perangkat`(`perangkat_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `perbaikan` ADD CONSTRAINT `fk_perbaikan_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
