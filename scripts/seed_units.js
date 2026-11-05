const mysql = require('mysql2/promise');

async function seedUnits() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'kanbandb',
  });

  console.log('Connected to MySQL kanbandb');

  // Check existing users
  const [users] = await connection.query('SELECT id, name FROM users');
  const u1 = users[0]?.id || 'u1';
  const u2 = users[1]?.id || u1;

  const units = [
    {
      id: 'unit_it',
      name: 'IT (Teknologi Informasi)',
      description: 'Pengembangan infrastruktur, aplikasi web, keamanan sistem, dan helpdesk internal.',
    },
    {
      id: 'unit_markom',
      name: 'Markom (Marketing & Komunikasi)',
      description: 'Kampanye branding digital, konten sosial media, event promosi, dan relasi publik.',
    },
    {
      id: 'unit_mfk',
      name: 'MFK (Manajemen Fasilitas & K3)',
      description: 'Pemeliharaan sarana prasarana, keselamatan kerja, audit kelayakan gedung, dan tanggap darurat.',
    },
    {
      id: 'unit_ppsdm',
      name: 'PPSDM (Pengembangan SDM)',
      description: 'Pelatihan karyawan, rekrutmen talenta, evaluasi kompetensi, dan sertifikasi profesi.',
    },
  ];

  for (const unit of units) {
    // Check if unit exists
    const [existing] = await connection.query('SELECT id FROM projects WHERE id = ? OR name = ?', [unit.id, unit.name]);
    if (existing.length === 0) {
      await connection.query(
        'INSERT INTO projects (id, name, description, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
        [unit.id, unit.name, unit.description, u1]
      );
      console.log(`Created Unit: ${unit.name}`);
    } else {
      console.log(`Unit already exists: ${unit.name}`);
      unit.id = existing[0].id;
    }

    // Default Columns for each Unit
    const cols = [
      { id: `${unit.id}_col1`, title: 'To Do', pos: 1000 },
      { id: `${unit.id}_col2`, title: 'In Progress', pos: 2000 },
      { id: `${unit.id}_col3`, title: 'In Review', pos: 3000 },
      { id: `${unit.id}_col4`, title: 'Done', pos: 4000 },
    ];

    for (const c of cols) {
      const [exCol] = await connection.query('SELECT id FROM board_columns WHERE id = ?', [c.id]);
      if (exCol.length === 0) {
        await connection.query(
          'INSERT INTO board_columns (id, project_id, title, position, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
          [c.id, unit.id, c.title, c.pos]
        );
      }
    }

    // Default sample tasks for this unit
    const [tasks] = await connection.query('SELECT id FROM tasks WHERE project_id = ?', [unit.id]);
    if (tasks.length === 0) {
      if (unit.id === 'unit_it') {
        // IT Tasks
        const parentId = 'it_task_1';
        await connection.query(
          `INSERT INTO tasks (id, project_id, column_id, parent_id, title, description, priority, start_date, due_date, position, creator_id, created_at, updated_at)
           VALUES (?, ?, ?, NULL, 'Upgrade Server Database & Clustering', 'Implementasi replikasi master-slave dan load balancing MySQL', 'High', DATE_SUB(CURDATE(), INTERVAL 3 DAY), DATE_ADD(CURDATE(), INTERVAL 4 DAY), 1000, ?, NOW(), NOW())`,
          [parentId, unit.id, `${unit.id}_col2`, u1]
        );
        await connection.query(
          `INSERT INTO tasks (id, project_id, column_id, parent_id, title, description, priority, start_date, due_date, position, creator_id, created_at, updated_at)
           VALUES ('it_task_1_sub1', ?, ?, ?, 'Konfigurasi failover IP', 'Pengaturan keepalived pada VPS', 'Medium', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 DAY), 1000, ?, NOW(), NOW())`,
          [unit.id, `${unit.id}_col2`, parentId, u2]
        );
        await connection.query(
          `INSERT INTO tasks (id, project_id, column_id, parent_id, title, description, priority, start_date, due_date, position, creator_id, created_at, updated_at)
           VALUES ('it_task_2', ?, ?, NULL, 'Audit Keamanan & SSL Renewal', 'Pembaruan sertifikat SSL wildcard untuk semua subdomain', 'Urgent', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 2 DAY), 2000, ?, NOW(), NOW())`,
          [unit.id, `${unit.id}_col1`, u1]
        );
      } else if (unit.id === 'unit_markom') {
        // Markom Tasks
        const parentId = 'markom_task_1';
        await connection.query(
          `INSERT INTO tasks (id, project_id, column_id, parent_id, title, description, priority, start_date, due_date, position, creator_id, created_at, updated_at)
           VALUES (?, ?, ?, NULL, 'Peluncuran Kampanye Digital Q4', 'Pembuatan konten feed dan video promo reels', 'High', DATE_SUB(CURDATE(), INTERVAL 2 DAY), DATE_ADD(CURDATE(), INTERVAL 5 DAY), 1000, ?, NOW(), NOW())`,
          [parentId, unit.id, `${unit.id}_col2`, u2]
        );
        await connection.query(
          `INSERT INTO tasks (id, project_id, column_id, parent_id, title, description, priority, start_date, due_date, position, creator_id, created_at, updated_at)
           VALUES ('markom_task_1_sub1', ?, ?, ?, 'Finalisasi Key Visual & Banner', 'Approval desain dari manajemen', 'Medium', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 2 DAY), 1000, ?, NOW(), NOW())`,
          [unit.id, `${unit.id}_col2`, parentId, u1]
        );
      } else if (unit.id === 'unit_mfk') {
        // MFK Tasks
        const parentId = 'mfk_task_1';
        await connection.query(
          `INSERT INTO tasks (id, project_id, column_id, parent_id, title, description, priority, start_date, due_date, position, creator_id, created_at, updated_at)
           VALUES (?, ?, ?, NULL, 'Inspeksi Berkala Alat Pemadam Api Ringan (APAR)', 'Pengecekan fisik dan masa kedaluwarsa tabung pemadam lantai 1-5', 'Urgent', DATE_SUB(CURDATE(), INTERVAL 1 DAY), DATE_ADD(CURDATE(), INTERVAL 3 DAY), 1000, ?, NOW(), NOW())`,
          [parentId, unit.id, `${unit.id}_col2`, u1]
        );
      } else if (unit.id === 'unit_ppsdm') {
        // PPSDM Tasks
        const parentId = 'ppsdm_task_1';
        await connection.query(
          `INSERT INTO tasks (id, project_id, column_id, parent_id, title, description, priority, start_date, due_date, position, creator_id, created_at, updated_at)
           VALUES (?, ?, ?, NULL, 'Penyelenggaraan Workshop Kepemimpinan & Agile', 'Pelatihan manajerial tingkat intermediate angkatan 2026', 'High', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 6 DAY), 1000, ?, NOW(), NOW())`,
          [parentId, unit.id, `${unit.id}_col1`, u2]
        );
      }
    }
  }

  console.log('Seeding Units completed successfully!');
  await connection.end();
}

seedUnits().catch(console.error);
