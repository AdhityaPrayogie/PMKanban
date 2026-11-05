import { NextRequest, NextResponse } from 'next/server';
import { execute, query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { Conversation, Message } from '@/types';
import { randomUUID } from 'crypto';
import { broadcastNewMessage, broadcastMessagesRead, broadcastNotification } from '@/lib/chatEvents';

const MESSAGE_SELECT = `SELECT m.*, u.name as sender_name, u.avatar_url as sender_avatar
  FROM messages m JOIN users u ON m.sender_id = u.id`;

function formatMessage(m: any): Message {
  return {
    id: m.id,
    conversation_id: m.conversation_id,
    sender_id: m.sender_id,
    content: m.content,
    image_url: m.image_url,
    is_read: Boolean(m.is_read),
    created_at: m.created_at,
    sender: { id: m.sender_id, name: m.sender_name, email: '', avatar_url: m.sender_avatar },
  };
}

async function findOrCreateConversation(a: string, b: string): Promise<string> {
  const [one, two] = a < b ? [a, b] : [b, a];
  const rows = await query<any[]>(
    'SELECT id FROM conversations WHERE user_one_id = ? AND user_two_id = ?',
    [one, two]
  );
  if (rows.length > 0) return rows[0].id;
  const id = randomUUID();
  // INSERT IGNORE + re-select handles two users opening the chat at the same moment
  await execute('INSERT IGNORE INTO conversations (id, user_one_id, user_two_id) VALUES (?, ?, ?)', [id, one, two]);
  const created = await query<any[]>(
    'SELECT id FROM conversations WHERE user_one_id = ? AND user_two_id = ?',
    [one, two]
  );
  return created[0].id;
}

async function markReadAndLoad(conversationId: string, userId: string) {
  await execute(
    'UPDATE messages SET is_read = TRUE WHERE conversation_id = ? AND sender_id != ? AND is_read = FALSE',
    [conversationId, userId]
  );
  broadcastMessagesRead({ conversationId, readerId: userId });
  const rows = await query<any[]>(`${MESSAGE_SELECT} WHERE m.conversation_id = ? ORDER BY m.created_at ASC`, [
    conversationId,
  ]);
  return rows.map(formatMessage);
}

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const conversationId = searchParams.get('conversationId');
    // Chat partner. `userTwo` kept for older clients that send userOne/userTwo.
    const partnerId =
      searchParams.get('with') ||
      [searchParams.get('userOne'), searchParams.get('userTwo')].find((id) => id && id !== user.id);

    // 1. Messages of a specific conversation (participants only)
    if (conversationId) {
      const allowed = await query<any[]>(
        'SELECT id FROM conversations WHERE id = ? AND (user_one_id = ? OR user_two_id = ?)',
        [conversationId, user.id, user.id]
      );
      if (allowed.length === 0) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      return NextResponse.json({ messages: await markReadAndLoad(conversationId, user.id) });
    }

    // 2. Conversation with a partner (find or create)
    if (partnerId) {
      const convId = await findOrCreateConversation(user.id, partnerId);
      return NextResponse.json({ conversationId: convId, messages: await markReadAndLoad(convId, user.id) });
    }

    // 3. Conversation list with last message + unread count, in one query
    const convs = await query<any[]>(
      `SELECT c.id, c.user_one_id, c.user_two_id, c.created_at,
              u.id AS other_id, u.name AS other_name, u.email AS other_email,
              u.avatar_url AS other_avatar, u.last_active_at AS other_last_active,
              (SELECT COUNT(*) FROM messages m
                 WHERE m.conversation_id = c.id AND m.sender_id != ? AND m.is_read = FALSE) AS unread_count,
              lm.id AS lm_id, lm.sender_id AS lm_sender_id, lm.content AS lm_content,
              lm.image_url AS lm_image_url, lm.is_read AS lm_is_read, lm.created_at AS lm_created_at
       FROM conversations c
       JOIN users u ON u.id = IF(c.user_one_id = ?, c.user_two_id, c.user_one_id)
       LEFT JOIN messages lm ON lm.id = (
         SELECT m2.id FROM messages m2 WHERE m2.conversation_id = c.id ORDER BY m2.created_at DESC LIMIT 1
       )
       WHERE c.user_one_id = ? OR c.user_two_id = ?
       ORDER BY c.created_at DESC`,
      [user.id, user.id, user.id, user.id]
    );

    const conversations: Conversation[] = convs.map((c) => ({
      id: c.id,
      user_one_id: c.user_one_id,
      user_two_id: c.user_two_id,
      created_at: c.created_at,
      other_user: {
        id: c.other_id,
        name: c.other_name,
        email: c.other_email,
        avatar_url: c.other_avatar,
        last_active_at: c.other_last_active,
      },
      last_message: c.lm_id
        ? {
            id: c.lm_id,
            conversation_id: c.id,
            sender_id: c.lm_sender_id,
            content: c.lm_content,
            image_url: c.lm_image_url,
            is_read: Boolean(c.lm_is_read),
            created_at: c.lm_created_at,
          }
        : undefined,
      unread_count: Number(c.unread_count) || 0,
    }));

    const totalUnreadMessages = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);
    return NextResponse.json({ conversations, totalUnreadMessages });
  } catch (error: any) {
    console.error('Error in messages API:', error);
    return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { conversationId, recipientId, content, imageUrl, image_url } = await request.json();
    const finalImageUrl = imageUrl || image_url || null;
    const trimmedContent = (content || '').trim();

    if (!recipientId || recipientId === user.id || (!trimmedContent && !finalImageUrl)) {
      return NextResponse.json({ error: 'recipientId serta pesan teks atau gambar diperlukan' }, { status: 400 });
    }

    // Conversation is always derived from sender+recipient, so a client can't post into someone else's room
    const targetConvId = await findOrCreateConversation(user.id, recipientId);
    if (conversationId && conversationId !== targetConvId) {
      return NextResponse.json({ error: 'conversationId tidak cocok dengan penerima' }, { status: 400 });
    }

    const finalContent = trimmedContent || '[Gambar]';
    const messageId = randomUUID();
    await execute(
      'INSERT INTO messages (id, conversation_id, sender_id, content, image_url, is_read) VALUES (?, ?, ?, ?, ?, FALSE)',
      [messageId, targetConvId, user.id, finalContent, finalImageUrl]
    );

    const rows = await query<any[]>(`${MESSAGE_SELECT} WHERE m.id = ?`, [messageId]);
    const formattedMessage = { ...formatMessage(rows[0]), recipient_id: recipientId };
    broadcastNewMessage(formattedMessage);

    const notifId = randomUUID();
    const notifTitle = `Pesan baru dari ${user.name || 'Rekan Tim'}`;
    const notifMessage = finalContent === '[Gambar]' ? 'Mengirim lampiran gambar' : finalContent.slice(0, 80);
    await execute(
      `INSERT INTO notifications (id, user_id, title, message, type, related_task_id)
       VALUES (?, ?, ?, ?, 'mention', ?)`,
      [notifId, recipientId, notifTitle, notifMessage, user.id]
    );
    broadcastNotification({
      id: notifId,
      user_id: recipientId,
      title: notifTitle,
      message: notifMessage,
      type: 'mention',
      related_task_id: user.id,
      is_read: false,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, message: formattedMessage });
  } catch (error: any) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
  }
}
