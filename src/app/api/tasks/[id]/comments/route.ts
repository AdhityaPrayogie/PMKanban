import { NextResponse } from 'next/server';
import { execute, query } from '@/lib/db';
import { randomUUID } from 'crypto';
import { broadcastNotification } from '@/lib/chatEvents';
import { getSessionUser } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = user.id;
    const { id: taskId } = await params;
    const body = await request.json();
    const { content, imageUrl, image_url } = body;
    const finalImageUrl = imageUrl || image_url || null;
    const trimmedContent = (content || '').trim();

    if (!trimmedContent && !finalImageUrl) {
      return NextResponse.json(
        { error: 'Pesan teks atau gambar diperlukan' },
        { status: 400 }
      );
    }

    const finalContent = trimmedContent || '[Gambar]';
    const commentId = randomUUID();

    await execute(
      'INSERT INTO comments (id, task_id, user_id, content, image_url) VALUES (?, ?, ?, ?, ?)',
      [commentId, taskId, userId, finalContent, finalImageUrl]
    );

    // Fetch commenter details and task title
    const taskRows = await query<any[]>('SELECT title, creator_id FROM tasks WHERE id = ?', [taskId]);

    const commenterName = user.name;
    const taskTitle = taskRows[0]?.title || 'Task';
    const taskCreatorId = taskRows[0]?.creator_id;

    // Notify task creator and all assignees (except commenter)
    const assigneeRows = await query<any[]>(
      'SELECT user_id FROM task_assignees WHERE task_id = ?',
      [taskId]
    );

    const recipientIds = new Set<string>();
    if (taskCreatorId && taskCreatorId !== userId) {
      recipientIds.add(taskCreatorId);
    }
    for (const a of assigneeRows) {
      if (a.user_id && a.user_id !== userId) {
        recipientIds.add(a.user_id);
      }
    }

    for (const recipientId of recipientIds) {
      const commentNotifId = randomUUID();
      const notifTitle = 'Komentar Baru pada Tugas';
      const notifMessage = `${commenterName} mengomentari "${taskTitle}": "${finalContent.slice(0, 60)}"`;

      await execute(
        `INSERT INTO notifications (id, user_id, title, message, type, related_task_id)
         VALUES (?, ?, ?, ?, 'mention', ?)`,
        [commentNotifId, recipientId, notifTitle, notifMessage, taskId]
      );
      broadcastNotification({
        id: commentNotifId,
        user_id: recipientId,
        title: notifTitle,
        message: notifMessage,
        type: 'mention',
        related_task_id: taskId,
        is_read: false,
        created_at: new Date().toISOString(),
      });
    }

    // Return the new comment with user info
    const newComment = await query<any[]>(
      `SELECT c.id, c.task_id, c.user_id, c.content, c.image_url, c.created_at, c.updated_at,
              u.name as user_name, u.email as user_email, u.avatar_url as user_avatar
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = ?`,
      [commentId]
    );

    return NextResponse.json({
      success: true,
      comment: {
        id: newComment[0].id,
        task_id: newComment[0].task_id,
        user_id: newComment[0].user_id,
        content: newComment[0].content,
        image_url: newComment[0].image_url,
        created_at: newComment[0].created_at,
        user: {
          id: newComment[0].user_id,
          name: newComment[0].user_name,
          email: newComment[0].user_email,
          avatar_url: newComment[0].user_avatar,
        },
      },
    });
  } catch (error: any) {
    console.error('Error adding comment:', error);
    return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
  }
}
