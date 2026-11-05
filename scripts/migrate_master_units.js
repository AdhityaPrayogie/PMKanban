const mysql = require('mysql2/promise');

async function migrateMasterUnits() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'kanbandb',
  });

  console.log('Connected to MySQL kanbandb');

  // 1. Create master table `units`
  await conn.query(`
    CREATE TABLE IF NOT EXISTS units (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      code VARCHAR(20) NOT NULL UNIQUE,
      description TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('Table units ensured.');

  // 2. Add unit_id & unit_name to `users`
  const [userCols] = await conn.query('SHOW COLUMNS FROM users');
  const userColNames = userCols.map((c) => c.Field);

  if (!userColNames.includes('unit_id')) {
    await conn.query('ALTER TABLE users ADD COLUMN unit_id VARCHAR(36) NULL AFTER avatar_url');
    console.log('Added unit_id to users');
  }

  if (!userColNames.includes('unit_name')) {
    await conn.query('ALTER TABLE users ADD COLUMN unit_name VARCHAR(100) NULL AFTER unit_id');
    console.log('Added unit_name to users');
  }

  // 3. Seed default master units (IT, Markom, MFK, PPSDM, Umum)
  const masterUnits = [
    {
      id: 'unit_it',
      name: 'Teknologi Informasi',
      code: 'IT',
      description: 'Pengembangan infrastruktur cloud, sistem informasi web/ERP, cyber security, dan helpdesk.',
    },
    {
      id: 'unit_markom',
      name: 'Marketing & Komunikasi',
      code: 'Markom',
      description: 'Kampanye branding digital, konten sosial media, periklanan, dan hubungan masyarakat.',
    },
    {
      id: 'unit_mfk',
      name: 'Manajemen Fasilitas & K3',
      code: 'MFK',
      description: 'Pemeliharaan fasilitas gedung kerja, kelistrikan, standar keselamatan K3, dan tanggap darurat.',
    },
    {
      id: 'unit_ppsdm',
      name: 'Pengembangan SDM',
      code: 'PPSDM',
      description: 'Pelatihan kompetensi karyawan, rekrutmen talenta, evaluasi kinerja, dan sertifikasi profesi.',
    },
  ];

  for (const u of masterUnits) {
    await conn.query(
      `INSERT INTO units (id, name, code, description)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         name = VALUES(name),
         description = VALUES(description)`,
      [u.id, u.name, u.code, u.description]
    );
  }
  console.log('Master units seeded.');

  // 4. Assign units to existing users
  const [users] = await conn.query('SELECT id, name, email FROM users');
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    let assignedUnit = masterUnits[i % masterUnits.length];
    // Give admin IT unit specifically
    if (user.email.includes('alex') || user.email.includes('admin')) {
      assignedUnit = masterUnits[0]; // IT
    }
    await conn.query(
      'UPDATE users SET unit_id = ?, unit_name = ? WHERE id = ?',
      [assignedUnit.id, assignedUnit.code, user.id]
    );
    console.log(`Assigned user ${user.name} (${user.email}) -> Unit: ${assignedUnit.code}`);
  }

  console.log('Migration master units completed successfully.');
  await conn.end();
}

migrateMasterUnits().catch(console.error);
