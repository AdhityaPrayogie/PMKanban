const mysql = require('mysql2/promise');

async function migrateV3() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'kanbandb',
  });

  console.log('Connected to MySQL kanbandb');

  // 1. Add customer & unit_tags to tasks
  const [taskCols] = await conn.query('SHOW COLUMNS FROM tasks');
  const taskColNames = taskCols.map((c) => c.Field);

  if (!taskColNames.includes('customer')) {
    await conn.query('ALTER TABLE tasks ADD COLUMN customer VARCHAR(255) NULL AFTER description');
    console.log('Added customer to tasks');
  }

  if (!taskColNames.includes('unit_tags')) {
    await conn.query('ALTER TABLE tasks ADD COLUMN unit_tags TEXT NULL AFTER customer');
    console.log('Added unit_tags to tasks');
  }

  // 2. Add password_plain to users
  const [userCols] = await conn.query('SHOW COLUMNS FROM users');
  const userColNames = userCols.map((c) => c.Field);

  if (!userColNames.includes('password_plain')) {
    await conn.query('ALTER TABLE users ADD COLUMN password_plain VARCHAR(255) NULL AFTER password_hash');
    console.log('Added password_plain to users');
  }

  // Update existing users password_plain to 'password123' if NULL
  await conn.query("UPDATE users SET password_plain = 'password123' WHERE password_plain IS NULL");
  console.log('Updated user plain passwords.');

  // Populate sample customer & unit_tags on existing tasks
  await conn.query(`
    UPDATE tasks 
    SET customer = 'PT Telkom Indonesia', unit_tags = '["IT", "Markom"]'
    WHERE customer IS NULL LIMIT 2
  `);

  await conn.query(`
    UPDATE tasks 
    SET customer = 'Bank Mandiri Tbk', unit_tags = '["IT", "MFK"]'
    WHERE customer IS NULL LIMIT 2
  `);

  await conn.query(`
    UPDATE tasks 
    SET customer = 'RS Medika Utama', unit_tags = '["MFK", "PPSDM"]'
    WHERE customer IS NULL LIMIT 2
  `);

  console.log('Migration V3 completed successfully.');
  await conn.end();
}

migrateV3().catch(console.error);
