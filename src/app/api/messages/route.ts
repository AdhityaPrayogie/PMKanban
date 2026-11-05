import { NextRequest, NextResponse } from 'next/server';
import { execute, query } from '@/lib/db';
import { Conversation, Message, User } from '@/types';
import { randomUUID } from 'crypto';
import { broadcastNewMessage, broadcastMessagesRead, broadcastNotification } from '@/lib/chatEvents';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const conversationId = searchParams.get('conversationId');
    const userOne = searchParams.get('userOne');
    const userTwo = searchParams.get('userTwo');

    // 1. Get messages for a specific conversation
    if (conversationId) {
      // Mark messages received by current user as read if userId provided
      if (userId) {
        await execute(
          'UPDATE messages SET is_read = TRUE WHERE conversation_id = ? AND sender_id != ? AND is_read = FALSE',
          [conversationId, userId]
        );
        broadcastMessagesRead({ conversationId, readerId: userId });
      }

      const messages = await query<any[]>(
        `SELECT m.*, u.name as sender_name, u.avatar_url as sender_avatar
         FROM messages m
         JOIN users u ON m.sender_id = u.id
         WHERE m.conversation_id = ?
         ORDER BY m.created_at ASC`,
        [conversationId]
      );

      const formatted: Message[] = messages.map((m) => ({
        id: m.id,
        conversation_id: m.conversation_id,
        sender_id: m.sender_id,
        content: m.content,
        image_url: m.image_url,
        is_read: Boolean(m.is_read),
        created_at: m.created_at,
        sender: {
          id: m.sender_id,
          name: m.sender_name,
          email: '',
          avatar_url: m.sender_avatar,
        },
      }));

      return NextResponse.json({ messages: formatted });
    }

    // 2. Find or create conversation between two users
    if (userOne && userTwo) {
      const sortedOne = userOne < userTwo ? userOne : userTwo;
      const sortedTwo = userOne < userTwo ? userTwo : userOne;

      let convRows = await query<any[]>(
        'SELECT * FROM conversations WHERE user_one_id = ? AND user_two_id = ?',
        [sortedOne, sortedTwo]
      );

      let convId: string;
      if (convRows.length === 0) {
        convId = randomUUID();
        await execute(
          'INSERT INTO conversations (id, user_one_id, user_two_id) VALUES (?, ?, ?)',
          [convId, sortedOne, sortedTwo]
        );
      } else {
        convId = convRows[0].id;
      }

      if (userId) {
        await execute(
          'UPDATE messages SET is_read = TRUE WHERE conversation_id = ? AND sender_id != ? AND is_read = FALSE',
          [convId, userId]
        );
        broadcastMessagesRead({ conversationId: convId, readerId: userId });
      }

      const messages = await query<any[]>(
        `SELECT m.*, u.name as sender_name, u.avatar_url as sender_avatar
         FROM messages m
         JOIN users u ON m.sender_id = u.id
         WHERE m.conversation_id = ?
         ORDER BY m.created_at ASC`,
        [convId]
      );

      return NextResponse.json({
        conversationId: convId,
        messages: messages.map((m) => ({
          id: m.id,
          conversation_id: m.conversation_id,
          sender_id: m.sender_id,
          content: m.content,
          image_url: m.image_url,
          is_read: Boolean(m.is_read),
          created_at: m.created_at,
          sender: {
            id: m.sender_id,
            name: m.sender_name,
            email: '',
            avatar_url: m.sender_avatar,
          },
        })),
      });
    }

    // 3. List all conversations for a user
    if (userId) {
      const convs = await query<any[]>(
        `SELECT c.*,
          CASE WHEN c.user_one_id = ? THEN c.user_two_id ELSE c.user_one_id END as other_user_id
         FROM conversations c
         WHERE c.user_one_id = ? OR c.user_two_id = ?
         ORDER BY c.created_at DESC`,
        [userId, userId, userId]
      );

      const allUsers = await query<User[]>('SELECT * FROM users');
      const userMap = new Map(allUsers.map((u) => [u.id, u]));

      const conversationsWithDetails: Conversation[] = [];

      for (const c of convs) {
        const lastMsgRows = await query<any[]>(
          `SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1`,
          [c.id]
        );
        const unreadRows = await query<any[]>(
          `SELECT COUNT(*) as count FROM messages WHERE conversation_id = ? AND sender_id != ? AND is_read = FALSE`,
          [c.id, userId]
        );

        conversationsWithDetails.push({
          id: c.id,
          user_one_id: c.user_one_id,
          user_two_id: c.user_two_id,
          created_at: c.created_at,
          other_user: userMap.get(c.other_user_id),
          last_message: lastMsgRows[0] || null,
          unread_count: unreadRows[0]?.count || 0,
        });
      }

      const totalUnreadMessages = conversationsWithDetails.reduce(
        (sum, item) => sum + (item.unread_count || 0),
        0
      );

      return NextResponse.json({
        conversations: conversationsWithDetails,
        totalUnreadMessages,
      });
    }

    return NextResponse.json({ error: 'Missing query parameters' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in messages API:', error);
    return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { conversationId, senderId, recipientId, content, imageUrl, image_url } = body;
    const finalImageUrl = imageUrl || image_url || null;
    const trimmedContent = (content || '').trim();

    if (!senderId || (!trimmedContent && !finalImageUrl)) {
      return NextResponse.json(
        { error: 'senderId serta pesan teks atau gambar diperlukan' },
        { status: 400 }
      );
    }

    const finalContent = trimmedContent || '[Gambar]';
    let targetConvId = conversationId;

    // If conversationId not provided, find or create from recipientId
    if (!targetConvId && recipientId) {
      const sortedOne = senderId < recipientId ? senderId : recipientId;
      const sortedTwo = senderId < recipientId ? recipientId : senderId;

      const existing = await query<any[]>(
        'SELECT id FROM conversations WHERE user_one_id = ? AND user_two_id = ?',
        [sortedOne, sortedTwo]
      );

      if (existing.length > 0) {
        targetConvId = existing[0].id;
      } else {
        targetConvId = randomUUID();
        await execute(
          'INSERT INTO conversations (id, user_one_id, user_two_id) VALUES (?, ?, ?)',
          [targetConvId, sortedOne, sortedTwo]
        );
      }
    }

    if (!targetConvId) {
      return NextResponse.json({ error: 'conversationId or recipientId is required' }, { status: 400 });
    }

    const messageId = randomUUID();
    await execute(
      'INSERT INTO messages (id, conversation_id, sender_id, content, image_url, is_read) VALUES (?, ?, ?, ?, ?, FALSE)',
      [messageId, targetConvId, senderId, finalContent, finalImageUrl]
    );

    const newMsgRows = await query<any[]>(
      `SELECT m.*, u.name as sender_name, u.avatar_url as sender_avatar
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.id = ?`,
      [messageId]
    );

    const formattedMessage = {
      id: newMsgRows[0].id,
      conversation_id: newMsgRows[0].conversation_id,
      sender_id: newMsgRows[0].sender_id,
      content: newMsgRows[0].content,
      image_url: newMsgRows[0].image_url,
      is_read: false,
      created_at: newMsgRows[0].created_at,
      recipient_id: recipientId,
      sender: {
        id: newMsgRows[0].sender_id,
        name: newMsgRows[0].sender_name,
        email: '',
        avatar_url: newMsgRows[0].sender_avatar,
      },
    };

    // Broadcast in real-time to active SSE listeners
    broadcastNewMessage(formattedMessage);

    // Insert notification for recipient and broadcast
    const notifId = randomUUID();
    const senderName = newMsgRows[0].sender_name || 'Rekan Tim';
    const notifTitle = `Pesan baru dari ${senderName}`;
    const notifMessage = finalContent === '[Gambar]' ? 'Mengirim lampiran gambar' : finalContent.slice(0, 80);

    await execute(
      `INSERT INTO notifications (id, user_id, title, message, type, related_task_id)
       VALUES (?, ?, ?, ?, 'mention', ?)`,
      [notifId, recipientId, notifTitle, notifMessage, senderId]
    );

    broadcastNotification({
      id: notifId,
      user_id: recipientId,
      title: notifTitle,
      message: notifMessage,
      type: 'mention',
      related_task_id: senderId,
      is_read: false,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: formattedMessage,
    });
  } catch (error: any) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
  }
}
