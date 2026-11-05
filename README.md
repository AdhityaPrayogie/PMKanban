# PMkanban

Aplikasi **Project Management berbasis Kanban** untuk kolaborasi tim lintas unit kerja (IT, Markom, MFK, PPSDM, Umum, dll). Dibangun dengan Next.js (App Router) dan MySQL.

## Fitur

- **Boards Hub**: daftar board per unit dengan stage (`Planning`, `Active`, `Review`, `Completed`) dan sub-board.
- **Kanban Board**: kolom dan kartu tugas dengan drag-and-drop (`@dnd-kit`).
- **Task Detail**: prioritas, tanggal mulai/tenggat, assignee, label, customer, tag unit, sub-task, komentar (bisa pakai gambar), lampiran file, dan log aktivitas.
- **Timeline / Gantt**: tugas utama dengan sub-task bertingkat.
- **Private Chat (P2P)**: halaman `/messages` dan mini chat widget, real-time lewat **Server-Sent Events**, indikator mengetik, status dibaca, status online.
- **Notifikasi**: lonceng untuk assignment, mention, deadline, dan sistem.
- **Autentikasi & Approval**: register, lalu akun berstatus `pending` sampai disetujui admin.
- **Admin**: kelola pengguna (approve/reject/hapus) dan master unit.
- **Pengaturan profil**: ubah nama, avatar, password.
- **Helpdesk IT** (`/helpdesk`, khusus unit TD `unit_it`): antrian pengajuan, ambil/tugaskan tiket, input langsung, data + filter, riwayat perubahan, trend helpdesk 12 bulan, export Excel (format Laporan_Logbook), master kategori/unit kerja/PIC (admin TD).
- **Pengajuan Helpdesk** (`/pengajuan`, semua user): kirim keluhan ke TD, pantau status, hapus selama masih `Open`.
- **Dark mode** dan **keyboard shortcuts**.
- **Kompresi gambar otomatis** saat upload (via `sharp`).

### Keyboard Shortcuts

| Tombol | Aksi |
|---|---|
| `Ctrl + K` / `/` | Fokus ke pencarian |
| `N` | Buat tugas baru |
| `B` | Tampilan Kanban |
| `T` | Tampilan Timeline |
| `M` | Buka chat |
| `D` | Ganti light/dark mode |
| `?` | Bantuan shortcut |
| `Esc` | Tutup panel/modal |

## Tech Stack

| Bagian | Teknologi |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4, `lucide-react` |
| State | Zustand |
| Drag & drop | `@dnd-kit/core`, `@dnd-kit/sortable` |
| Database | MySQL / MariaDB via `mysql2` (raw SQL, connection pool) |
| Real-time | Server-Sent Events + `EventEmitter` in-process |
| Auth | Token HMAC-SHA256 (JWT-style) di cookie `auth_token`, password PBKDF2 |
| Utilitas | `date-fns`, `clsx`, `tailwind-merge`, `sharp` |

> `prisma/schema.prisma` ada, tetapi **aplikasi tidak memakai Prisma Client**. Semua query lewat `src/lib/db.ts` (`mysql2`). Schema Prisma juga belum mengikuti kolom terbaru.

## Struktur Proyek

```
PMkanban/
├── prisma/
│   └── schema.prisma            # Referensi skema (tidak dipakai runtime)
├── public/
│   └── uploads/                 # Dibuat otomatis: attachments/ & chat/
├── scripts/                     # Migrasi & seed manual (node)
│   ├── migrate_activity_logs.js # Tabel task_activities
│   ├── migrate_attachments.js   # Tabel task_attachments
│   ├── migrate_boards.js        # Kolom board: parent_id, stage, unit_tag, position + data contoh
│   ├── migrate_master_units.js  # Tabel units + users.unit_id/unit_name
│   ├── migrate_v3.js            # tasks.customer/unit_tags, users.password_plain
│   ├── seed_units.js            # Board default per unit
│   ├── migrate_helpdesk.sql     # Tabel hd_* (helpdesk)
│   ├── seed_helpdesk_sample.sql # 5 tiket contoh dari DB it_logbook
│   ├── check_helpdesk.mjs       # Self-check validasi/diff helpdesk
│   └── test_helpdesk_access.mjs # Uji akses API helpdesk (butuh dev server)
├── src/
│   ├── app/
│   │   ├── api/                 # Route handlers (lihat tabel API)
│   │   ├── login/page.tsx       # Halaman login & register
│   │   ├── messages/page.tsx    # Chat layar penuh
│   │   ├── helpdesk/page.tsx    # Helpdesk IT (guard server: unit TD)
│   │   ├── pengajuan/page.tsx   # Pengajuan helpdesk (semua user)
│   │   ├── layout.tsx
│   │   ├── page.tsx             # Halaman utama (Hub / Board / Timeline)
│   │   └── globals.css
│   ├── components/
│   │   ├── admin/               # UserManagementModal
│   │   ├── chat/                # MiniChatWidget
│   │   ├── help/                # ShortcutsHelpModal
│   │   ├── helpdesk/            # AppShell, HelpdeskView, TicketForm, TicketTable, HelpdeskMaster, PengajuanView, ui
│   │   ├── kanban/              # BoardsHub, KanbanBoard, BoardColumn, TaskCard
│   │   ├── layout/              # Header, Sidebar
│   │   ├── settings/            # SettingsModal
│   │   ├── task/                # CreateTaskModal, TaskDetailSheet
│   │   ├── timeline/            # TimelineView
│   │   ├── unit/                # CreateUnitModal, MasterUnitModal
│   │   └── ThemeInitializer.tsx
│   ├── hooks/useDebounce.ts
│   ├── lib/
│   │   ├── auth.ts              # Hash password, token, getSessionUser()
│   │   ├── chatEvents.ts        # EventEmitter untuk SSE chat
│   │   ├── db.ts                # Pool mysql2 + helper query/execute/withTransaction
│   │   ├── helpdesk.ts          # Aturan akses, validasi tiket, diff riwayat (pure)
│   │   ├── helpdeskDb.ts        # Query & helper server helpdesk
│   │   ├── unit-similarity.ts
│   │   └── utils.ts
│   ├── store/useKanbanStore.ts  # Global state Zustand
│   ├── types/index.ts           # Tipe domain
│   └── proxy.ts                 # Redirect ke /login jika belum ada cookie
├── schema.sql                   # Skema dasar
├── seed.sql                     # Data contoh
└── project_design_document.md   # Dokumen desain awal
```

## API

| Endpoint | Method | Keterangan |
|---|---|---|
| `/api/auth/register` | POST | Daftar (status `pending`) |
| `/api/auth/login` | POST | Login, set cookie `auth_token` |
| `/api/auth/logout` | POST | Logout |
| `/api/auth/me` | GET | User yang sedang login |
| `/api/board` | GET | Data board (kolom, tugas, label) |
| `/api/units` | GET, POST, PATCH, DELETE | Board / proyek per unit |
| `/api/master-units` | GET, POST, PATCH | Master unit |
| `/api/columns` | POST, PATCH, DELETE | Kolom Kanban |
| `/api/tasks` | POST, PATCH, DELETE | Tugas (buat, pindah, hapus) |
| `/api/tasks/[id]` | GET, PUT | Detail & update tugas |
| `/api/tasks/[id]/comments` | POST | Komentar |
| `/api/tasks/[id]/attachments` | POST, DELETE | Lampiran |
| `/api/messages` | GET, POST | Percakapan & pesan |
| `/api/messages/read` | POST | Tandai dibaca |
| `/api/messages/typing` | POST | Indikator mengetik |
| `/api/messages/sse` | GET | Stream real-time |
| `/api/notifications` | GET, PATCH | Notifikasi |
| `/api/upload/image` | POST | Upload gambar chat/komentar (maks 20 MB) |
| `/api/users` | GET | Daftar pengguna |
| `/api/admin/users` | GET, PATCH, DELETE | Kelola pengguna (khusus admin) |
| `/api/settings` | PATCH | Profil & password |
| `/api/helpdesk` | GET, POST | Daftar tiket (filter + paging) / input langsung — **TD** |
| `/api/helpdesk/[id]` | GET, PUT, DELETE | Detail + riwayat / update / hapus permanen (pembuat atau admin TD) — **TD** |
| `/api/helpdesk/[id]/ambil` | POST | Ambil tiket `Open` → `Proses` — **TD** |
| `/api/helpdesk/stats` | GET | Kartu ringkasan, per hari, per kategori, trend 12 bulan — **TD** |
| `/api/helpdesk/export` | GET | Excel `?start&end[&kategori_ids]` — **TD** |
| `/api/helpdesk/pengajuan` | GET, POST, DELETE | Pengajuan milik sendiri — semua user |
| `/api/helpdesk/master/[type]` | GET, POST, PATCH | `kategori`, `unit-kerja`, `pic`; tulis kategori/unit kerja khusus admin TD |

## Instalasi

### Prasyarat

- Node.js 20+
- MySQL 8 / MariaDB (contoh: Laragon)

### 1. Install dependency

```bash
npm install
```

### 2. Konfigurasi `.env`

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=kanbandb
AUTH_SECRET=ganti-dengan-string-acak-panjang
```

> Jika `AUTH_SECRET` tidak diisi, dipakai default hardcoded di `src/lib/auth.ts`. **Wajib diisi di production.**

### 3. Siapkan database

```bash
mysql -u root -e "CREATE DATABASE IF NOT EXISTS kanbandb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
mysql -u root kanbandb < schema.sql
```

Kolom berikut dipakai aplikasi tetapi **belum ada** di `schema.sql` maupun skrip migrasi, jadi jalankan manual:

```sql
ALTER TABLE users
  ADD COLUMN password_hash VARCHAR(255) NULL,
  ADD COLUMN role ENUM('admin','user') NOT NULL DEFAULT 'user',
  ADD COLUMN status ENUM('pending','active','rejected') NOT NULL DEFAULT 'pending',
  ADD COLUMN last_active_at TIMESTAMP NULL;
ALTER TABLE comments ADD COLUMN image_url VARCHAR(500) NULL;
ALTER TABLE messages ADD COLUMN image_url VARCHAR(500) NULL;
```

Lalu jalankan seed dan migrasi (urutan ini):

```bash
mysql -u root kanbandb < seed.sql
node scripts/migrate_attachments.js
node scripts/migrate_activity_logs.js
node scripts/migrate_boards.js
node scripts/migrate_master_units.js
node scripts/migrate_v3.js
node scripts/seed_units.js   # opsional, board default per unit
```

> Skrip di `scripts/` memakai koneksi hardcoded (`root@127.0.0.1`, tanpa password, db `kanbandb`). Sesuaikan jika berbeda.

Modul helpdesk:

```bash
mysql -u root kanbandb < scripts/migrate_helpdesk.sql
mysql -u root kanbandb < scripts/seed_helpdesk_sample.sql   # opsional, butuh DB it_logbook
node scripts/check_helpdesk.mjs
node scripts/test_helpdesk_access.mjs   # opsional, saat `npm run dev` jalan (membuat & menghapus 1 tiket uji)
```

Akses Helpdesk IT ditentukan oleh `users.unit_id = 'unit_it'` (TD); master kategori/unit kerja juga butuh `role = 'admin'`.

### 4. Buat admin pertama

Daftar lewat `/login`, lalu promosikan akun tersebut:

```sql
UPDATE users SET role = 'admin', status = 'active' WHERE email = 'email@anda.com';
```

### 5. Jalankan

```bash
npm run dev      # development, http://localhost:3000
npm run build    # build production
npm start        # jalankan hasil build
npm run lint     # ESLint
```

## Alur Autentikasi

1. User register → status `pending`, semua admin dapat notifikasi.
2. Admin approve di menu **Kelola Pengguna** → status `active`.
3. Login → cookie `auth_token` (berlaku 7 hari).
4. `src/proxy.ts` me-redirect halaman non-API ke `/login` jika cookie tidak ada; validasi token dilakukan di dalam route API lewat `getSessionUser()`. Route `/api/*` tidak dicegat proxy, jadi tiap route harus memeriksa sesi sendiri dan mengambil identitas dari sesi, bukan dari `userId` di request.

## Catatan & Batasan

- **Real-time chat in-process**: SSE memakai `EventEmitter` di memori, jadi hanya jalan di satu instance server. Untuk multi-instance perlu Redis pub/sub atau layanan sejenis.
- **File upload** disimpan di `public/uploads/` (disk lokal), tidak cocok untuk hosting serverless.
- **`users.password_plain`** menyimpan password dalam teks biasa (dipakai fitur admin). Pertimbangkan untuk dihapus sebelum production.
- `sharp` dipakai di route upload tetapi tidak tercantum langsung di `package.json` (ikut sebagai dependency Next.js). Tambahkan `npm i sharp` jika error saat build.
