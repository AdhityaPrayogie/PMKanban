import { NextRequest, NextResponse } from 'next/server';
import { execute, query } from '@/lib/db';
import { broadcastMessagesRead } from '@/lib/chatEvents';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationId, userId } = body;

    if (!conversationId || !userId) {
      return NextResponse.json({ error: 'Missing conversationId or userId' }, { status: 400 });
    }

    await execute(
      'UPDATE messages SET is_read = TRUE WHERE conversation_id = ? AND sender_id != ? AND is_read = FALSE',
      [conversationId, userId]
    );

    // Also mark notifications for messages from this conversation as read
    const convRows = await query<any[]>(
      'SELECT user_one_id, user_two_id FROM conversations WHERE id = ?',
      [conversationId]
    );
    if (convRows.length > 0) {
      const otherUserId = convRows[0].user_one_id === userId ? convRows[0].user_two_id : convRows[0].user_one_id;
      await execute(
        'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND related_task_id = ? AND type = "mention"',
        [userId, otherUserId]
      );
    }

    broadcastMessagesRead({
      conversationId,
      readerId: userId,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error marking messages as read:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
