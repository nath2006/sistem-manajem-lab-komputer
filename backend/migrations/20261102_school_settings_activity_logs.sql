-- Run manually against the intended MySQL database after a backup.
-- Additive/idempotent: does not alter existing application tables.
CREATE TABLE IF NOT EXISTS school_settings (
  id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  school_name VARCHAR(150) NOT NULL DEFAULT 'Sekolah Anda',
  logo_url VARCHAR(2048) NOT NULL DEFAULT '',
  primary_color CHAR(7) NOT NULL DEFAULT '#800000',
  schedule_start CHAR(5) NOT NULL DEFAULT '07:00',
  schedule_end CHAR(5) NOT NULL DEFAULT '17:00',
  lesson_duration SMALLINT UNSIGNED NOT NULL DEFAULT 60,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT IGNORE INTO school_settings (id) VALUES (1);

-- Identity is a snapshot; no FK so deleting a user does not delete audit history.
CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  username VARCHAR(100) NULL,
  role VARCHAR(50) NULL,
  method VARCHAR(10) NOT NULL,
  path VARCHAR(255) NOT NULL,
  action VARCHAR(20) NOT NULL,
  status_code SMALLINT UNSIGNED NOT NULL,
  duration_ms INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_activity_user_created (user_id, created_at),
  INDEX idx_activity_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
