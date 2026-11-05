import { NextRequest, NextResponse } from 'next/server';
import { execute, query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { broadcastMessagesRead } from '@/lib/chatEvents';

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { conversationId } = await request.json();
    if (!conversationId) {
      return NextResponse.json({ error: 'Missing conversationId' }, { status: 400 });
    }

    // Only participants may mark a conversation as read
    const convRows = await query<any[]>(
      'SELECT user_one_id, user_two_id FROM conversations WHERE id = ? AND (user_one_id = ? OR user_two_id = ?)',
      [conversationId, user.id, user.id]
    );
    if (convRows.length === 0) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await execute(
      'UPDATE messages SET is_read = TRUE WHERE conversation_id = ? AND sender_id != ? AND is_read = FALSE',
      [conversationId, user.id]
    );

    // Also mark chat notifications from the other participant as read
    const otherUserId = convRows[0].user_one_id === user.id ? convRows[0].user_two_id : convRows[0].user_one_id;
    await execute(
      "UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND related_task_id = ? AND type = 'mention'",
      [user.id, otherUserId]
    );

    broadcastMessagesRead({ conversationId, readerId: user.id });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error marking messages as read:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
