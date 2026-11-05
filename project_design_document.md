# Project Management App - System Requirements & Design

## 1. System Requirements

### 1.1. Tech Stack
*   **Framework:** Next.js (App Router), React, TypeScript.
*   **Styling:** Tailwind CSS.
*   **UI Components:** **shadcn/ui** (berbasis Radix UI) & `lucide-react` icons.
*   **Database:** MySQL.
*   **ORM:** Prisma atau Drizzle ORM.
*   **State Management:** Zustand (untuk Kanban *board state*) & React Query (untuk *data fetching* & sinkronisasi).
*   **Real-time Engine:** **Pusher** atau **Socket.io** (wajib untuk *Private Chat*, *Live Comments*, dan *Real-time Notifications*).
*   **Drag-and-Drop (DnD):** `@dnd-kit/core`.

### 1.2. Core Features (MVP + Advanced Collaboration)
*   **Modular Kanban Board:** Manajemen kolom dan *Task Card* dengan sistem *Drag-and-Drop*.
*   **Timeline & Sub-tasks:**
    *   Tampilan *Gantt Chart* atau kalender.
    *   Setiap tugas utama (Parent Task) bisa dipecah menjadi **Sub-tasks**.
    *   Sub-task akan dirender secara hierarkis (menjorok ke dalam/indentasi) di bawah tugas utama pada tampilan *Timeline*.
*   **Collaboration & Commenting:**
    *   Fitur diskusi/komentar di dalam *Task Detail* maupun *Timeline view*.
*   **Real-time Notifications:**
    *   Sistem *alert* otomatis (Notifikasi Lonceng) jika *Due Date* sudah dekat, saat di-*mention* di komentar, atau ada tugas baru yang di-*assign*.
*   **P2P Private Chat:**
    *   Sistem pesan langsung (Direct Message) antar pengguna dalam satu *workspace* untuk diskusi cepat tanpa harus keluar dari aplikasi.

---

## 2. Design System & Modular Theme

### 2.1. Color Palette & shadcn/ui Configuration
Tema berfokus pada estetika "True Blue" yang bersih, tegas, dan struktural.
*   **Background:** `--background: 0 0% 96%` (Gray 100).
*   **Cards/Panels:** `--card: 0 0% 100%` (White).
*   **Borders:** `--border: 214.3 31.8% 91.4%` (Gray 200).
*   **Primary/Accent:** `--primary: 212 96% 30%` (True Blue - `#034694`).
*   **Radius:** `--radius: 0.375rem` (`rounded-md` untuk kesan modular/kotak).

### 2.2. UI Layout & Component Mapping (shadcn)
*   **Sidebar Navigation:** `<Button variant="ghost">` (Menu Utama, Proyek, dan menu **Messages** untuk Chat).
*   **Top Header:** Menampung *Breadcrumbs*, *Global Search*, dan `<Popover>` Notifikasi Lonceng (dengan indikator titik merah jika ada notifikasi baru).
*   **Task Detail & Comments:** Menggunakan `<Sheet>` (meluncur dari kanan). Di dalamnya terdapat detail tugas dan `<ScrollArea>` khusus untuk memuat riwayat **Komentar** dengan `<Textarea>` di bagian bawah.
*   **Timeline & Sub-tasks:** Menggunakan `<Table>` atau *CSS Grid* khusus. *Sub-tasks* diimplementasikan menggunakan `<Collapsible>` atau `<Accordion>` sehingga bisa di-*expand/collapse* di bawah *Parent Task*.
*   **Private Chat UI:**
    *   Tampilan penuh di rute `/messages` dengan tata letak *split-pane* (Kiri: Daftar Kontak, Kanan: Ruang Obrolan).
    *   Sebagai alternatif, *mini-chat* menggunakan `<Dialog>` atau *floating widget* di pojok kanan bawah agar pengguna bisa *chatting* sambil melihat *Kanban Board*.

---

## 3. Database Schema (MySQL - Database: KanbanDb)

Skema ini telah diperbarui untuk mendukung fitur *Sub-tasks*, *Comments*, *Chats*, dan *Notifications*, dan berjalan pada database `KanbanDb`.

```sql
CREATE DATABASE IF NOT EXISTS KanbanDb;
USE KanbanDb;

-- 1. Tabel Users (Menyimpan data pengguna)
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    avatar_url VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Tabel Projects (Workspace/Proyek)
CREATE TABLE projects (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Tabel Board Columns (Kolom Kanban)
CREATE TABLE board_columns (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    title VARCHAR(100) NOT NULL,
    position FLOAT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- 4. Tabel Tasks (Diperbarui dengan parent_id untuk Sub-tasks)
CREATE TABLE tasks (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    column_id VARCHAR(36) NOT NULL,
    parent_id VARCHAR(36) NULL, -- JIKA NULL = Task Utama. JIKA ADA ISI = Ini adalah Sub-task.
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority ENUM('Low', 'Medium', 'High', 'Urgent') DEFAULT 'Medium',
    start_date DATE NULL,
    due_date DATE NULL,
    position FLOAT NOT NULL,
    creator_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (column_id) REFERENCES board_columns(id) ON DELETE CASCADE,
    FOREIGN KEY (creator_id) REFERENCES users(id)
);

-- 5. Tabel Task Assignees (Relasi Penugasan)
CREATE TABLE task_assignees (
    task_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (task_id, user_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 6. Tabel Labels (Master Tag per Project)
CREATE TABLE labels (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(20) DEFAULT 'blue',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- 7. Tabel Task Labels (Relasi Tag ke Task)
CREATE TABLE task_labels (
    task_id VARCHAR(36) NOT NULL,
    label_id VARCHAR(36) NOT NULL,
    PRIMARY KEY (task_id, label_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE
);

-- 8. Tabel Comments (Diskusi pada tugas/timeline)
CREATE TABLE comments (
    id VARCHAR(36) PRIMARY KEY,
    task_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 9. Tabel Notifications (Sistem Peringatan Deadline, Mention, dll)
CREATE TABLE notifications (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('deadline', 'mention', 'assignment', 'system') NOT NULL,
    related_task_id VARCHAR(36) NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 10. Tabel Conversations (Untuk Private Chat antar pengguna)
CREATE TABLE conversations (
    id VARCHAR(36) PRIMARY KEY,
    user_one_id VARCHAR(36) NOT NULL,
    user_two_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_one_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user_two_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_one_id, user_two_id) -- Mencegah duplikasi ruang chat
);

-- 11. Tabel Messages (Isi pesan Private Chat)
CREATE TABLE messages (
    id VARCHAR(36) PRIMARY KEY,
    conversation_id VARCHAR(36) NOT NULL,
    sender_id VARCHAR(36) NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);
```