-- Seed data for kanbandb

-- 1. Users
INSERT INTO users (id, name, email, avatar_url) VALUES
('u1', 'Alex Rivera', 'alex@example.com', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'),
('u2', 'Sarah Chen', 'sarah@example.com', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'),
('u3', 'Budi Santoso', 'budi@example.com', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'),
('u4', 'Marcus Vance', 'marcus@example.com', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 2. Projects
INSERT INTO projects (id, name, description, owner_id) VALUES
('proj1', 'Enterprise Cloud Migration & SaaS Redesign', 'Modernizing core infrastructure to Next.js 15, MySQL clustering, and delivering an ultra-responsive modular Kanban system.', 'u1')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 3. Board Columns
INSERT INTO board_columns (id, project_id, title, position) VALUES
('col1', 'proj1', 'To Do', 1000),
('col2', 'proj1', 'In Progress', 2000),
('col3', 'proj1', 'Review', 3000),
('col4', 'proj1', 'Done', 4000)
ON DUPLICATE KEY UPDATE title=VALUES(title);

-- 4. Labels
INSERT INTO labels (id, project_id, name, color) VALUES
('lbl1', 'proj1', 'Frontend', '#2563eb'),
('lbl2', 'proj1', 'Backend', '#7c3aed'),
('lbl3', 'proj1', 'Database', '#059669'),
('lbl4', 'proj1', 'UI/UX', '#d97706'),
('lbl5', 'proj1', 'Security', '#dc2626')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 5. Tasks (Parent Tasks)
INSERT INTO tasks (id, project_id, column_id, parent_id, title, description, priority, start_date, due_date, position, creator_id) VALUES
('task1', 'proj1', 'col1', NULL, 'Architect Modular Kanban Design System', 'Implement standard true blue color tokens, responsive sidebar, modular cards, and Radix UI sheets according to design specs.', 'High', '2026-10-08', '2026-10-14', 1000, 'u1'),
('task2', 'proj1', 'col2', NULL, 'Database Schema & Relational API Endpoints', 'Provision MySQL kanbandb tables, create foreign key constraints, and write atomic REST endpoints with transaction rollbacks.', 'Urgent', '2026-10-07', '2026-10-10', 2000, 'u2'),
('task3', 'proj1', 'col2', NULL, 'Interactive DnD Kit Board Implementation', 'Wire @dnd-kit/core with optimistic state updates, cross-column drag handles, and smooth drop animations.', 'High', '2026-10-08', '2026-10-12', 2010, 'u1'),
('task4', 'proj1', 'col3', NULL, 'P2P Real-time Chat & Mini Floating Dock', 'Implement split-pane chat at /messages and draggable floating mini-chat widget on the board for instant team sync.', 'Medium', '2026-10-06', '2026-10-11', 3000, 'u3'),
('task5', 'proj1', 'col4', NULL, 'Core Database Provisioning & Table Constraints', 'Execute SQL DDL, verify table relations, foreign keys, cascade triggers, and index configurations.', 'Urgent', '2026-10-05', '2026-10-07', 4000, 'u1')
ON DUPLICATE KEY UPDATE title=VALUES(title);

-- 6. Sub-tasks (with parent_id referencing Parent Tasks)
INSERT INTO tasks (id, project_id, column_id, parent_id, title, description, priority, start_date, due_date, position, creator_id) VALUES
('sub1', 'proj1', 'col1', 'task1', 'Configure Tailwind v4 theme variables and True Blue #034694 palette', 'Define CSS variables for --background, --card, --border, and custom shadows.', 'Medium', '2026-10-08', '2026-10-09', 100, 'u1'),
('sub2', 'proj1', 'col1', 'task1', 'Build reusable Sheet drawer component for Task Details & Comments', 'Right-sliding drawer with tabs and scroll area for comment threads.', 'High', '2026-10-09', '2026-10-11', 200, 'u4'),
('sub3', 'proj1', 'col2', 'task2', 'Define parameterized MySQL connection pool with mysql2', 'Singleton pool pattern with promise API and error recovery.', 'Urgent', '2026-10-07', '2026-10-08', 100, 'u2'),
('sub4', 'proj1', 'col2', 'task2', 'Implement CRUD routes for Board, Tasks, Sub-tasks, and Comments', 'Route handlers with validation and error JSON responses.', 'High', '2026-10-08', '2026-10-10', 200, 'u3'),
('sub5', 'proj1', 'col2', 'task3', 'Setup drag sensors, collision detection, and drag overlays', 'Pointer sensor with activation constraint to prevent accidental drags.', 'Medium', '2026-10-08', '2026-10-10', 100, 'u1')
ON DUPLICATE KEY UPDATE title=VALUES(title);

-- 7. Task Assignees
INSERT INTO task_assignees (task_id, user_id) VALUES
('task1', 'u1'),
('task1', 'u4'),
('task2', 'u2'),
('task2', 'u3'),
('task3', 'u1'),
('task4', 'u3'),
('task4', 'u2'),
('task5', 'u1'),
('sub1', 'u1'),
('sub2', 'u4'),
('sub3', 'u2'),
('sub4', 'u3')
ON DUPLICATE KEY UPDATE assigned_at=CURRENT_TIMESTAMP;

-- 8. Task Labels
INSERT INTO task_labels (task_id, label_id) VALUES
('task1', 'lbl1'),
('task1', 'lbl4'),
('task2', 'lbl2'),
('task2', 'lbl3'),
('task3', 'lbl1'),
('task4', 'lbl1'),
('task4', 'lbl2'),
('task5', 'lbl3'),
('sub1', 'lbl4'),
('sub2', 'lbl1'),
('sub3', 'lbl3'),
('sub4', 'lbl2')
ON DUPLICATE KEY UPDATE task_id=VALUES(task_id);

-- 9. Comments
INSERT INTO comments (id, task_id, user_id, content) VALUES
('comm1', 'task1', 'u4', 'Design tokens have been verified against shadcn specs. True blue gives a very crisp corporate feel.'),
('comm2', 'task1', 'u1', 'Great! Make sure the sheet animation has 300ms ease-out timing.'),
('comm3', 'task2', 'u3', 'Connection pool is working smoothly with kanbandb on localhost:3306.'),
('comm4', 'task3', 'u2', 'Ensure keyboard accessibility is also supported on the drag handles.');

-- 10. Notifications
INSERT INTO notifications (id, user_id, title, message, type, related_task_id, is_read) VALUES
('notif1', 'u1', 'Upcoming Due Date', 'Task "Database Schema & Relational API Endpoints" due in 2 days.', 'deadline', 'task2', FALSE),
('notif2', 'u1', 'New Mention', 'Sarah Chen mentioned you in a comment on "Architect Modular Kanban".', 'mention', 'task1', FALSE),
('notif3', 'u1', 'Task Assigned', 'You have been assigned to "Interactive DnD Kit Board Implementation".', 'assignment', 'task3', TRUE),
('notif4', 'u1', 'System Alert', 'MySQL kanbandb connected successfully with 11 tables synchronized.', 'system', NULL, TRUE);

-- 11. Conversations
INSERT INTO conversations (id, user_one_id, user_two_id) VALUES
('conv1', 'u1', 'u2'),
('conv2', 'u1', 'u3'),
('conv3', 'u1', 'u4')
ON DUPLICATE KEY UPDATE id=VALUES(id);

-- 12. Messages
INSERT INTO messages (id, conversation_id, sender_id, content, is_read) VALUES
('msg1', 'conv1', 'u2', 'Hey Alex, how is the Kanban DnD integration looking?', TRUE),
('msg2', 'conv1', 'u1', 'Hey Sarah! Just hooked up optimistic re-ordering and columns. Smooth at 60fps.', TRUE),
('msg3', 'conv1', 'u2', 'Awesome! Let me know when the sub-tasks hierarchy is ready for API testing.', FALSE),
('msg4', 'conv2', 'u3', 'Alex, database pool queries are running under 2ms on MySQL 8.', FALSE),
('msg5', 'conv3', 'u4', 'Sent over the revised True Blue color palette tokens.', TRUE);
