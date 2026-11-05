const mysql = require('mysql2/promise');

async function migrateAttachments() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'kanbandb',
  });

  console.log('Connected to MySQL kanbandb');

  await conn.query(`
    CREATE TABLE IF NOT EXISTS task_attachments (
      id VARCHAR(36) PRIMARY KEY,
      task_id VARCHAR(36) NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      file_url VARCHAR(500) NOT NULL,
      file_size INT NOT NULL,
      file_type VARCHAR(50) NOT NULL,
      uploaded_by VARCHAR(36) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  console.log('Table task_attachments created successfully.');
  await conn.end();
}

migrateAttachments().catch(console.error);
