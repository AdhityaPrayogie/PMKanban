import { NextRequest } from 'next/server';
import { chatEmitter } from '@/lib/chatEvents';
import { getSessionUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  const userId = user.id;

  let isClosed = false;
  let cleanup = () => {};

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Initial connection acknowledgment
      try {
        controller.enqueue(
          encoder.encode(
            `event: connected\ndata: ${JSON.stringify({ status: 'connected', userId, timestamp: Date.now() })}\n\n`
          )
        );
      } catch (err) {
        console.error('Failed to send SSE initial event:', err);
      }

      // Listener for real-time broadcasted messages
      const onMessageHandler = (message: any) => {
        if (isClosed) return;
        // Deliver message only to recipient or sender
        if (message.recipient_id !== userId && message.sender_id !== userId) return;
        try {
          controller.enqueue(
            encoder.encode(`event: message\ndata: ${JSON.stringify(message)}\n\n`)
          );
        } catch (err) {
          console.error('Failed to send SSE message chunk:', err);
        }
      };

      chatEmitter.on('new_message', onMessageHandler);

      // Listener for real-time typing indicators
      const onTypingHandler = (typingData: any) => {
        if (isClosed) return;
        // Deliver typing indicator only to the intended recipient
        if (typingData.recipientId !== userId) return;
        try {
          controller.enqueue(
            encoder.encode(`event: typing\ndata: ${JSON.stringify(typingData)}\n\n`)
          );
        } catch (err) {
          console.error('Failed to send SSE typing chunk:', err);
        }
      };

      chatEmitter.on('typing', onTypingHandler);

      // Listener for real-time message read receipts
      const onReadHandler = (readData: any) => {
        if (isClosed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: read\ndata: ${JSON.stringify(readData)}\n\n`)
          );
        } catch (err) {
          console.error('Failed to send SSE read chunk:', err);
        }
      };

      chatEmitter.on('messages_read', onReadHandler);

      // Listener for real-time system & task notifications
      const onNotificationHandler = (notif: any) => {
        if (isClosed) return;
        if (notif.user_id === userId) {
          try {
            controller.enqueue(
              encoder.encode(`event: notification\ndata: ${JSON.stringify(notif)}\n\n`)
            );
          } catch (err) {
            console.error('Failed to send SSE notification chunk:', err);
          }
        }
      };

      chatEmitter.on('notification', onNotificationHandler);

      // Keep-alive heartbeat every 15 seconds to prevent gateway timeouts
      const keepAliveTimer = setInterval(() => {
        if (isClosed) return;
        try {
          controller.enqueue(encoder.encode(`: keepalive\n\n`));
        } catch {
          cleanup();
        }
      }, 15000);

      cleanup = () => {
        if (isClosed) return;
        isClosed = true;
        clearInterval(keepAliveTimer);
        chatEmitter.off('new_message', onMessageHandler);
        chatEmitter.off('typing', onTypingHandler);
        chatEmitter.off('messages_read', onReadHandler);
        chatEmitter.off('notification', onNotificationHandler);
        try {
          controller.close();
        } catch {}
      };

      request.signal.addEventListener('abort', cleanup);
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
