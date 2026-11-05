import { NextRequest, NextResponse } from 'next/server';
import { broadcastTyping } from '@/lib/chatEvents';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { senderId, recipientId, senderName, isTyping } = body;

    if (!senderId || !recipientId) {
      return NextResponse.json({ error: 'Missing senderId or recipientId' }, { status: 400 });
    }

    broadcastTyping({
      senderId,
      recipientId,
      senderName: senderName || 'Seseorang',
      isTyping: Boolean(isTyping),
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
