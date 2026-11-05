import { NextRequest, NextResponse } from 'next/server';
import { execute, query } from '@/lib/db';
import { NotificationItem } from '@/types';

import { randomUUID } from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Auto-check upcoming/overdue deadlines for user's assigned tasks
    const upcomingTasks = await query<any[]>(
      `SELECT t.id, t.title, t.due_date 
       FROM tasks t
       JOIN task_assignees ta ON t.id = ta.task_id
       JOIN board_columns c ON t.column_id = c.id
       WHERE ta.user_id = ? 
         AND t.due_date IS NOT NULL 
         AND t.due_date <= DATE_ADD(CURDATE(), INTERVAL 1 DAY)
         AND LOWER(c.title) NOT LIKE '%done%' 
         AND LOWER(c.title) NOT LIKE '%selesai%'`,
      [userId]
    );

    for (const t of upcomingTasks) {
      const existing = await query<any[]>(
        `SELECT id FROM notifications 
         WHERE user_id = ? AND related_task_id = ? AND type = 'deadline' 
           AND DATE(created_at) = CURDATE()`,
        [userId, t.id]
      );
      if (existing.length === 0) {
        const notifId = randomUUID();
        await execute(
          `INSERT INTO notifications (id, user_id, title, message, type, related_task_id)
           VALUES (?, ?, ?, ?, 'deadline', ?)`,
          [
            notifId,
            userId,
            'Mendekati Batas Waktu',
            `Tugas "${t.title}" mendekati batas tenggat waktu: ${new Date(t.due_date).toLocaleDateString('id-ID')}.`,
            t.id,
          ]
        );
      }
    }

    const notifications = await query<NotificationItem[]>(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30',
      [userId]
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
    const body = await request.json();
    const { id, userId, markAll } = body;

    if (markAll && userId) {
      await execute('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [userId]);
      return NextResponse.json({ success: true });
    }

    if (id) {
      await execute('UPDATE notifications SET is_read = TRUE WHERE id = ?', [id]);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'id or markAll with userId required' }, { status: 400 });
  } catch (error: any) {
    console.error('Error updating notifications:', error);
    return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
  }
}
