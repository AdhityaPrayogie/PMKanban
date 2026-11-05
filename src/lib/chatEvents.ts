import { EventEmitter } from 'events';

// Global singleton EventEmitter to persist across HMR / Next.js dev reloads
const globalForChat = globalThis as unknown as {
  chatEmitter?: EventEmitter;
};

export const chatEmitter = globalForChat.chatEmitter || new EventEmitter();
chatEmitter.setMaxListeners(200);

if (process.env.NODE_ENV !== 'production') {
  globalForChat.chatEmitter = chatEmitter;
}

export function broadcastNewMessage(message: any) {
  chatEmitter.emit('new_message', message);
}

export function broadcastTyping(data: {
  senderId: string;
  recipientId: string;
  senderName: string;
  isTyping: boolean;
}) {
  chatEmitter.emit('typing', data);
}

export function broadcastMessagesRead(data: {
  conversationId: string;
  readerId: string;
}) {
  chatEmitter.emit('messages_read', data);
}

export function broadcastNotification(notification: any) {
  chatEmitter.emit('notification', notification);
}


