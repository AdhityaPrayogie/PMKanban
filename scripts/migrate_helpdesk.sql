-- Modul Helpdesk IT. Jalankan: mysql -u root kanbandb < scripts/migrate_helpdesk.sql (aman diulang)
-- Collation wajib utf8mb4_unicode_ci agar FK ke users.id / tasks.id (varchar(36)) diterima.

CREATE TABLE IF NOT EXISTS hd_kategori (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(100) NOT NULL UNIQUE,
  aktif TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hd_unit_kerja (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(150) NOT NULL UNIQUE,
  aktif TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hd_pic (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(150) NOT NULL UNIQUE,
  aktif TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ponytail: requested_by/created_by are RESTRICT (like tasks.creator_id), so deleting a user who has
-- tickets fails; SET NULL is not allowed on a column used in a CHECK. Revisit with soft-deleted users.
CREATE TABLE IF NOT EXISTS hd_tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tanggal DATE NOT NULL,
  jam_mulai TIME NULL,
  jam_selesai TIME NULL,
  total_menit INT GENERATED ALWAYS AS (TIME_TO_SEC(TIMEDIFF(jam_selesai, jam_mulai)) DIV 60) VIRTUAL,
  requested_by VARCHAR(36) NULL,
  pic_id INT NULL,
  kategori_id INT NOT NULL,
  unit_kerja_id INT NULL,
  isi_helpdesk TEXT NOT NULL,
  tindakan TEXT NULL,
  status ENUM('Open','Proses','Selesai','Batal') NOT NULL DEFAULT 'Open',
  jenis_pelayanan ENUM('Pelayanan','Non Pelayanan') NOT NULL DEFAULT 'Pelayanan',
  task_id VARCHAR(36) NULL,
  created_by VARCHAR(36) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_jam CHECK (jam_mulai IS NULL OR jam_selesai IS NULL OR jam_selesai >= jam_mulai),
  CONSTRAINT chk_peminta CHECK (requested_by IS NOT NULL OR pic_id IS NOT NULL),
  KEY idx_tanggal (tanggal),
  KEY idx_status (status),
  KEY idx_requested (requested_by),
  CONSTRAINT fk_hd_requested FOREIGN KEY (requested_by) REFERENCES users(id),
  CONSTRAINT fk_hd_pic FOREIGN KEY (pic_id) REFERENCES hd_pic(id),
  CONSTRAINT fk_hd_kategori FOREIGN KEY (kategori_id) REFERENCES hd_kategori(id),
  CONSTRAINT fk_hd_unit_kerja FOREIGN KEY (unit_kerja_id) REFERENCES hd_unit_kerja(id),
  CONSTRAINT fk_hd_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
  CONSTRAINT fk_hd_created FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hd_ticket_staff (
  ticket_id INT NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  PRIMARY KEY (ticket_id, user_id),
  KEY idx_user (user_id),
  CONSTRAINT fk_hds_ticket FOREIGN KEY (ticket_id) REFERENCES hd_tickets(id) ON DELETE CASCADE,
  CONSTRAINT fk_hds_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hd_ticket_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT NOT NULL,
  aksi ENUM('create','update') NOT NULL,
  user_id VARCHAR(36) NULL,
  changes JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ticket (ticket_id),
  CONSTRAINT fk_hdh_ticket FOREIGN KEY (ticket_id) REFERENCES hd_tickets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ID sama dengan it_logbook.kategori_it agar migrasi penuh nanti cocok
INSERT IGNORE INTO hd_kategori (id, nama) VALUES
  (1,'Hardware'),(2,'Software'),(3,'Jaringan'),(7,'Streaming'),(8,'SIMRS'),(9,'Telepon');
