-- 5 tiket contoh dari it_logbook (satu per kategori) + master unit kerja. Butuh DB it_logbook di server yang sama.
-- Jalankan setelah migrate_helpdesk.sql: mysql -u root kanbandb < scripts/seed_helpdesk_sample.sql (aman diulang)
SET @ids = '190,188,180,171,153';
SET @seed_user = 'u1';  -- 5 staf IT asli belum punya akun PMkanban; ditugaskan ke Admin (TD)

INSERT IGNORE INTO hd_unit_kerja (id, nama, aktif)
  SELECT id, nama, aktif FROM it_logbook.unit_kerja;

INSERT IGNORE INTO hd_pic (id, nama, aktif)
  SELECT p.id, p.nama, 1 FROM it_logbook.pic p
  WHERE p.id IN (SELECT pic_id FROM it_logbook.logbook WHERE FIND_IN_SET(id, @ids));

INSERT IGNORE INTO hd_tickets (id, tanggal, jam_mulai, jam_selesai, pic_id, kategori_id, unit_kerja_id,
                               isi_helpdesk, tindakan, status, jenis_pelayanan, created_by)
  SELECT id, tanggal, jam_mulai, jam_selesai, pic_id, kategori_id, unit_kerja_id,
         isi_helpdesk, tindakan, status, jenis_pelayanan, @seed_user
  FROM it_logbook.logbook WHERE FIND_IN_SET(id, @ids);

INSERT IGNORE INTO hd_ticket_staff (ticket_id, user_id)
  SELECT id, @seed_user FROM hd_tickets WHERE FIND_IN_SET(id, @ids);

INSERT INTO hd_ticket_history (ticket_id, aksi, user_id, changes)
  SELECT t.id, 'create', @seed_user,
         JSON_ARRAY(JSON_OBJECT('field', 'sumber', 'label', 'Sumber', 'new', 'Contoh dari IT Logbook'))
  FROM hd_tickets t
  WHERE FIND_IN_SET(t.id, @ids) AND NOT EXISTS (SELECT 1 FROM hd_ticket_history h WHERE h.ticket_id = t.id);

-- Tiket baru mulai #1000 agar tidak bentrok dengan ID lama saat migrasi penuh
ALTER TABLE hd_tickets AUTO_INCREMENT = 1000;
