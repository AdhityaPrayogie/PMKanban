const mysql = require('mysql2/promise');

async function migrate() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'kanbandb',
  });

  const [cols] = await conn.query('SHOW COLUMNS FROM projects');
  const colNames = cols.map((c) => c.Field);

  if (!colNames.includes('parent_id')) {
    await conn.query('ALTER TABLE projects ADD COLUMN parent_id VARCHAR(36) NULL');
    console.log('Added parent_id');
  }
  if (!colNames.includes('stage')) {
    await conn.query("ALTER TABLE projects ADD COLUMN stage VARCHAR(50) NOT NULL DEFAULT 'Active'");
    console.log('Added stage');
  }
  if (!colNames.includes('unit_tag')) {
    await conn.query("ALTER TABLE projects ADD COLUMN unit_tag VARCHAR(50) NOT NULL DEFAULT 'IT'");
    console.log('Added unit_tag');
  }
  if (!colNames.includes('position')) {
    await conn.query('ALTER TABLE projects ADD COLUMN position FLOAT NOT NULL DEFAULT 0');
    console.log('Added position');
  }

  // Update existing projects with realistic data showing IT having > 2 main boards
  const [users] = await conn.query('SELECT id FROM users LIMIT 2');
  const u1 = users[0]?.id || 'u1';
  const u2 = users[1]?.id || u1;

  // Let's create multiple Main Boards per unit (especially IT having 3+ boards)
  const mainBoards = [
    {
      id: 'it_board_infra',
      name: 'IT: Infrastruktur Cloud & Server',
      description: 'Pengelolaan arsitektur server AWS, Kubernetes cluster, load balancing, dan monitoring sistem.',
      unit_tag: 'IT',
      stage: 'Active',
      position: 1000,
    },
    {
      id: 'it_board_erp',
      name: 'IT: Pengembangan ERP & Sistem Inti',
      description: 'Modul finance, supply chain, inventory management, dan integrasi API payment gateway.',
      unit_tag: 'IT',
      stage: 'Active',
      position: 2000,
    },
    {
      id: 'it_board_security',
      name: 'IT: Cyber Security & Audit ISO 27001',
      description: 'Penetration testing rutin, pembaruan sertifikat SSL, zero-trust network, dan audit kepatuhan.',
      unit_tag: 'IT',
      stage: 'Planning',
      position: 1000,
    },
    {
      id: 'it_board_helpdesk',
      name: 'IT: Helpdesk & Dukungan Pengguna',
      description: 'Penanganan tiket kendala teknis pengguna, inventaris hardware laptop, dan SLA support.',
      unit_tag: 'IT',
      stage: 'Completed',
      position: 1000,
    },
    {
      id: 'markom_board_campaign',
      name: 'Markom: Kampanye Digital Ramadhan',
      description: 'Perencanaan konten media sosial, iklan berbayar Meta & Google Ads, serta kolaborasi influencer.',
      unit_tag: 'Markom',
      stage: 'Active',
      position: 1500,
    },
    {
      id: 'markom_board_brand',
      name: 'Markom: Rebranding Identitas Perusahaan',
      description: 'Penyusunan panduan brand book, logo update, desain merchandise, dan company profile 2026.',
      unit_tag: 'Markom',
      stage: 'Review',
      position: 1000,
    },
    {
      id: 'mfk_board_gedung',
      name: 'MFK: Perawatan Gedung & Fasilitas Kerja',
      description: 'Pemeriksaan rutin kelistrikan, sistem HVAC pendingin ruangan, dan tata ruang kerja modular.',
      unit_tag: 'MFK',
      stage: 'Active',
      position: 1800,
    },
    {
      id: 'mfk_board_k3',
      name: 'MFK: Sertifikasi K3 & Simulasi Bencana',
      description: 'Penyediaan APAR, jalur evakuasi darurat, checklist P3K, dan pelatihan keselamatan staf.',
      unit_tag: 'MFK',
      stage: 'Planning',
      position: 2000,
    },
    {
      id: 'ppsdm_board_training',
      name: 'PPSDM: Program Pelatihan & Bootcamp Internal',
      description: 'Peningkatan kompetensi teknologi, pelatihan leadership manajerial, dan evaluasi hasil belajar.',
      unit_tag: 'PPSDM',
      stage: 'Active',
      position: 2200,
    },
    {
      id: 'ppsdm_board_recruitment',
      name: 'PPSDM: Rekrutmen Talenta & Onboarding',
      description: 'Seleksi kandidat baru, wawancara teknis psikotes, dan program orientasi karyawan baru.',
      unit_tag: 'PPSDM',
      stage: 'Review',
      position: 2000,
    },
  ];

  for (const b of mainBoards) {
    await conn.query(
      `INSERT INTO projects (id, name, description, owner_id, unit_tag, stage, position)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         name = VALUES(name),
         description = VALUES(description),
         unit_tag = VALUES(unit_tag),
         stage = VALUES(stage),
         position = VALUES(position)`,
      [b.id, b.name, b.description, u1, b.unit_tag, b.stage, b.position]
    );

    // Check if columns exist for this board
    const [existingCols] = await conn.query('SELECT id FROM board_columns WHERE project_id = ?', [b.id]);
    if (existingCols.length === 0) {
      const defaultCols = [
        { id: `${b.id}_c1`, title: 'To Do', position: 1000 },
        { id: `${b.id}_c2`, title: 'In Progress', position: 2000 },
        { id: `${b.id}_c3`, title: 'In Review', position: 3000 },
        { id: `${b.id}_c4`, title: 'Done', position: 4000 },
      ];
      for (const col of defaultCols) {
        await conn.query(
          'INSERT INTO board_columns (id, project_id, title, position) VALUES (?, ?, ?, ?)',
          [col.id, b.id, col.title, col.position]
        );
      }

      // Add sample child tasks and subtasks
      const t1 = `${b.id}_t1`;
      const t2 = `${b.id}_t2`;
      await conn.query(
        `INSERT INTO tasks (id, project_id, column_id, title, description, priority, start_date, due_date, position, creator_id)
         VALUES (?, ?, ?, ?, ?, ?, '2026-10-01', '2026-10-15', 1000, ?)`,
        [t1, b.id, `${b.id}_c1`, `Inisiasi & Analisis ${b.name}`, `Dokumentasi kebutuhan dan roadmap pengerjaan ${b.name}`, 'High', u1]
      );
      await conn.query(
        `INSERT INTO tasks (id, project_id, column_id, title, description, priority, start_date, due_date, position, creator_id)
         VALUES (?, ?, ?, ?, ?, ?, '2026-10-05', '2026-10-25', 2000, ?)`,
        [t2, b.id, `${b.id}_c2`, `Implementasi Tahap 1 - ${b.name}`, `Eksekusi pengerjaan teknis modul inti ${b.name}`, 'Urgent', u2]
      );

      // Subtasks
      await conn.query(
        `INSERT INTO tasks (id, project_id, column_id, parent_id, title, description, priority, position, creator_id)
         VALUES (?, ?, ?, ?, ?, ?, 'Medium', 1000, ?)`,
        [`${b.id}_sub1`, b.id, `${b.id}_c1`, t1, 'Checklist kebutuhan dependensi', '', u1]
      );
      await conn.query(
        `INSERT INTO tasks (id, project_id, column_id, parent_id, title, description, priority, position, creator_id)
         VALUES (?, ?, ?, ?, ?, ?, 'Medium', 2000, ?)`,
        [`${b.id}_sub2`, b.id, `${b.id}_c1`, t1, 'Review arsitektur bersama tim lead', '', u1]
      );
    }
  }

  console.log('Migration & seeding of multi-main boards per unit completed successfully.');
  await conn.end();
}

migrate().catch(console.error);
