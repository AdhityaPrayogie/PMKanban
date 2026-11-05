import { NextResponse } from 'next/server';
import { execute, query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { NotificationItem } from '@/types';

// ponytail: per-process "already checked today" map; move to a daily cron if running multiple instances
const deadlineCheckedOn = new Map<string, string>();

async function ensureDeadlineNotifications(userId: string) {
  const today = new Date().toDateString();
  if (deadlineCheckedOn.get(userId) === today) return;
  deadlineCheckedOn.set(userId, today);

  // One statement: insert a deadline alert for every due/overdue open task not yet alerted today
  await execute(
    `INSERT INTO notifications (id, user_id, title, message, type, related_task_id)
     SELECT UUID(), ta.user_id, 'Mendekati Batas Waktu',
            CONCAT('Tugas "', t.title, '" mendekati batas tenggat waktu: ', DATE_FORMAT(t.due_date, '%d/%m/%Y'), '.'),
            'deadline', t.id
     FROM tasks t
     JOIN task_assignees ta ON t.id = ta.task_id
     JOIN board_columns c ON t.column_id = c.id
     WHERE ta.user_id = ?
       AND t.due_date IS NOT NULL
       AND t.due_date <= DATE_ADD(CURDATE(), INTERVAL 1 DAY)
       AND LOWER(c.title) NOT LIKE '%done%'
       AND LOWER(c.title) NOT LIKE '%selesai%'
       AND NOT EXISTS (
         SELECT 1 FROM notifications n
         WHERE n.user_id = ta.user_id AND n.related_task_id = t.id
           AND n.type = 'deadline' AND DATE(n.created_at) = CURDATE()
       )`,
    [userId]
  );
}

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await ensureDeadlineNotifications(user.id);

    const notifications = await query<NotificationItem[]>(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30',
      [user.id]
    );
    const unreadCount = notifications.filter((n) => !n.is_read).length;

    return NextResponse.json({ notifications, unreadCount });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, markAll } = await request.json();

    if (markAll) {
      await execute('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [user.id]);
      return NextResponse.json({ success: true });
    }
    if (id) {
      await execute('UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?', [id, user.id]);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'id or markAll required' }, { status: 400 });
  } catch (error: any) {
    console.error('Error updating notifications:', error);
    return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
  }
}
