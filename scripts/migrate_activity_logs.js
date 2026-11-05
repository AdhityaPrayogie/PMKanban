const mysql = require('mysql2/promise');

async function migrate() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'kanbandb',
  });

  console.log('Connected to MySQL kanbandb');

  await conn.query(`
    CREATE TABLE IF NOT EXISTS task_activities (
      id VARCHAR(36) PRIMARY KEY,
      task_id VARCHAR(36) NULL,
      project_id VARCHAR(36) NULL,
      user_id VARCHAR(36) NOT NULL,
      action VARCHAR(50) NOT NULL,
      details TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_task_act (task_id),
      INDEX idx_project_act (project_id),
      INDEX idx_user_act (user_id),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  console.log('Table task_activities verified/created successfully.');
  await conn.end();
}

migrate().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
