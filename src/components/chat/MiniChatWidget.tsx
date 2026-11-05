'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Minus, ChevronUp, Image as ImageIcon, Loader2, CheckCheck } from 'lucide-react';
import { useKanbanStore } from '@/store/useKanbanStore';
import { Message, User } from '@/types';
import { cn } from '@/lib/utils';

export function MiniChatWidget() {
  const {
    isMiniChatOpen,
    miniChatUser,
    closeMiniChat,
    openMiniChatWith,
    activeUser,
    allUsers,
    unreadMessagesCount,
    fetchUnreadMessagesCount,
  } = useKanbanStore();

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [chatImage, setChatImage] = useState<{ file: File; preview: string } | null>(null);
  const [isUploadingChatImage, setIsUploadingChatImage] = useState(false);
  const chatImageInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const otherUsers = allUsers.filter((u) => u.id !== activeUser?.id);

  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSentTypingRef = useRef<number>(0);

  const conversationIdRef = useRef<string | null>(null);
  conversationIdRef.current = conversationId;

  // Load conversation & connect to Real-time SSE
  useEffect(() => {
    if (!isMiniChatOpen || !miniChatUser || !activeUser) return;

    let isSubscribed = true;

    const loadChat = async () => {
      try {
        const res = await fetch(
          `/api/messages?userOne=${activeUser.id}&userTwo=${miniChatUser.id}&userId=${activeUser.id}`
        );
        const data = await res.json();
        if (data.messages && isSubscribed) {
          setMessages(data.messages);
          setConversationId(data.conversationId);
        }
      } catch (err) {
        console.error('Failed to load chat messages', err);
      }
    };

    loadChat();

    // Connect to Server-Sent Events (SSE) for instant real-time message delivery
    const eventSource = new EventSource(`/api/messages/sse?userId=${activeUser.id}`);

    eventSource.addEventListener('message', (event) => {
      try {
        const newMsg: Message = JSON.parse(event.data);
        const isCurrentPair =
          newMsg.sender_id === miniChatUser.id || newMsg.sender_id === activeUser.id;

        if (isCurrentPair) {
          if (
            conversationIdRef.current &&
            newMsg.conversation_id &&
            newMsg.conversation_id !== conversationIdRef.current
          ) {
            return;
          }
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          // Mark incoming message as read if chat is open and active
          if (newMsg.sender_id === miniChatUser.id && !isMinimized) {
            fetch('/api/messages/read', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                conversationId: newMsg.conversation_id || conversationIdRef.current,
                userId: activeUser.id,
              }),
            }).catch(() => {});
          }
        }
      } catch (err) {
        console.error('Error handling SSE message in MiniChat:', err);
      }
    });

    eventSource.addEventListener('read', (event) => {
      try {
        const { readerId } = JSON.parse(event.data);
        if (readerId === miniChatUser.id) {
          setMessages((prev) =>
            prev.map((m) => (m.sender_id === activeUser.id ? { ...m, is_read: true } : m))
          );
        }
      } catch (err) {
        console.error('Error handling SSE read event in MiniChat:', err);
      }
    });

    eventSource.addEventListener('typing', (event) => {
      try {
        const { senderId, recipientId, isTyping } = JSON.parse(event.data);
        if (senderId === miniChatUser.id && recipientId === activeUser.id) {
          setIsPartnerTyping(Boolean(isTyping));
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          if (isTyping) {
            typingTimeoutRef.current = setTimeout(() => {
              setIsPartnerTyping(false);
            }, 3000);
          }
        }
      } catch (err) {
        console.error('Error handling SSE typing in MiniChat:', err);
      }
    });

    // Fallback sync every 30s in case of connection drop
    const fallbackTimer = setInterval(loadChat, 30000);

    return () => {
      isSubscribed = false;
      eventSource.close();
      clearInterval(fallbackTimer);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [isMiniChatOpen, miniChatUser, activeUser]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isMinimized, isPartnerTyping]);

  // Mark messages as read when opening or un-minimizing chat
  useEffect(() => {
    if (isMiniChatOpen && !isMinimized && activeUser && conversationId) {
      fetch('/api/messages/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          userId: activeUser.id,
        }),
      })
        .then(() => fetchUnreadMessagesCount())
        .catch(() => {});
    }
  }, [isMiniChatOpen, isMinimized, conversationId, activeUser, fetchUnreadMessagesCount]);

  if (!isMiniChatOpen) {
    return (
      <button
        type="button"
        onClick={() => {
          if (otherUsers.length > 0) {
            openMiniChatWith(otherUsers[0]);
          }
        }}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#034694] hover:bg-[#023470] text-white shadow-xl hover:shadow-2xl flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer shrink-0"
        title="Buka Chat Tim"
      >
        <MessageSquare className="w-6 h-6 text-white" />
        {unreadMessagesCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 bg-rose-500 text-white text-[11px] font-black rounded-full flex items-center justify-center ring-2 ring-white dark:ring-[#111726] shadow-md animate-pulse pointer-events-none">
            {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
          </span>
        )}
      </button>
    );
  }

  const handleSelectImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Hanya berkas gambar (PNG, JPG, WEBP, GIF, SVG) yang diperbolehkan di chat!');
      if (chatImageInputRef.current) chatImageInputRef.current.value = '';
      return;
    }
    const preview = URL.createObjectURL(file);
    setChatImage({ file, preview });
  };

  const emitTyping = (isTyping: boolean) => {
    if (!activeUser || !miniChatUser) return;
    fetch('/api/messages/typing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        senderId: activeUser.id,
        recipientId: miniChatUser.id,
        senderName: activeUser.name,
        isTyping,
      }),
    }).catch(() => {});
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);

    if (!activeUser || !miniChatUser) return;
    const now = Date.now();
    if (val.trim().length > 0) {
      if (now - lastSentTypingRef.current > 1500) {
        lastSentTypingRef.current = now;
        emitTyping(true);
      }
    } else {
      emitTyping(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !chatImage) || !activeUser || !miniChatUser) return;

    const textToSend = inputText.trim();
    setInputText('');
    emitTyping(false);

    try {
      let uploadedImageUrl: string | null = null;
      if (chatImage) {
        setIsUploadingChatImage(true);
        const formData = new FormData();
        formData.append('file', chatImage.file);
        const uploadRes = await fetch('/api/upload/image', {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || uploadData.error) {
          alert(uploadData.error || 'Gagal mengunggah gambar');
          setIsUploadingChatImage(false);
          return;
        }
        uploadedImageUrl = uploadData.url;
      }

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          senderId: activeUser.id,
          recipientId: miniChatUser.id,
          content: textToSend,
          imageUrl: uploadedImageUrl,
        }),
      });
      const data = await res.json();
      if (data.message) {
        setMessages((prev) => {
          if (prev.some((m) => String(m.id) === String(data.message.id))) return prev;
          return [...prev, data.message];
        });
        setChatImage(null);
        if (chatImageInputRef.current) chatImageInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Failed to send message', err);
    } finally {
      setIsUploadingChatImage(false);
    }
  };

  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 z-50 w-80 bg-white dark:bg-[#111726] rounded-xl border border-[#e2e8f0] dark:border-[#1e2a3f] shadow-2xl flex flex-col overflow-hidden transition-all duration-200',
        isMinimized ? 'h-12' : 'h-96'
      )}
    >
      {/* Header */}
      <div className="h-12 px-3.5 bg-[#034694] text-white flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2 truncate">
          <div className="relative">
            <img
              src={miniChatUser?.avatar_url || ''}
              alt={miniChatUser?.name}
              className="w-7 h-7 rounded-full object-cover ring-1 ring-white/50"
            />
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-[#034694]" />
          </div>
          <div className="truncate">
            <div className="text-xs font-bold truncate leading-tight">
              {miniChatUser?.name}
            </div>
            <div className="text-[10px] text-blue-200 truncate leading-tight">
              {isPartnerTyping ? (
                <span className="text-amber-300 font-semibold animate-pulse">
                  Sedang mengetik...
                </span>
              ) : (
                'Direct Message'
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-white/10 rounded text-blue-200 hover:text-white"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? <ChevronUp className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
          </button>
          <button
            onClick={closeMiniChat}
            className="p-1 hover:bg-white/10 rounded text-blue-200 hover:text-white"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Switch Contact Bar */}
      {!isMinimized && (
        <>
          <div className="px-3 py-1.5 bg-[#f8fafc] dark:bg-[#162032] border-b border-[#e2e8f0] dark:border-[#1e2a3f] flex items-center gap-1.5 overflow-x-auto text-[11px]">
            <span className="text-[#94a3b8] font-medium shrink-0">Chat with:</span>
            {otherUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => openMiniChatWith(u)}
                className={cn(
                  'px-2 py-0.5 rounded text-[10px] font-semibold transition-colors shrink-0',
                  miniChatUser?.id === u.id
                    ? 'bg-[#034694] text-white'
                    : 'bg-white dark:bg-[#1e2a3f] text-[#475569] dark:text-[#cbd5e1] border border-[#e2e8f0] dark:border-[#2b3a52] hover:bg-[#e9f2fc] dark:hover:bg-[#27354d]'
                )}
              >
                {u.name.split(' ')[0]}
              </button>
            ))}
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2 bg-[#f8fafc]/50 dark:bg-[#0c1220] text-xs">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[#94a3b8] text-[11px] text-center p-4">
                Send a message to start collaborating with {miniChatUser?.name}.
              </div>
            ) : (
              messages.map((m) => {
                const isMe = m.sender_id === activeUser?.id;
                return (
                  <div
                    key={m.id}
                    className={cn('flex flex-col', isMe ? 'items-end' : 'items-start')}
                  >
                    <div
                      className={cn(
                        'max-w-[80%] rounded-md px-3 py-1.5 text-xs leading-relaxed shadow-2xs',
                        isMe
                          ? 'bg-[#034694] text-white rounded-br-none'
                          : 'bg-white dark:bg-[#1a2436] border border-[#e2e8f0] dark:border-[#2b3b55] text-[#0f172a] dark:text-white rounded-bl-none'
                      )}
                    >
                      {m.image_url && (
                        <div className="mb-1 rounded overflow-hidden max-w-[200px]">
                          <a href={m.image_url} target="_blank" rel="noopener noreferrer">
                            <img
                              src={m.image_url}
                              alt="Lampiran pesan"
                              className="w-full max-h-36 object-cover hover:opacity-90 transition-opacity cursor-pointer rounded"
                            />
                          </a>
                        </div>
                      )}
                      {m.content && m.content !== '[Gambar]' && (
                        <p>{m.content}</p>
                      )}
                    </div>
                    <span className="text-[9px] text-[#94a3b8] mt-0.5 px-1 flex items-center gap-1">
                      {new Date(m.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {isMe && (
                        <span title={m.is_read ? 'Sudah dibaca' : 'Terkirim (belum dibaca)'} className="inline-flex">
                          <CheckCheck
                            className={cn(
                              'w-3 h-3',
                              m.is_read ? 'text-[#38bdf8]' : 'text-slate-400 dark:text-slate-500'
                            )}
                          />
                        </span>
                      )}
                    </span>
                  </div>
                );
              })
            )}
            {isPartnerTyping && (
              <div className="flex items-center gap-1.5 text-[11px] text-[#64748b] dark:text-[#94a3b8] italic px-1 py-1 animate-pulse">
                <span className="font-semibold text-[#034694] dark:text-blue-400 not-italic">
                  {miniChatUser?.name}
                </span>
                <span>sedang mengetik</span>
                <span className="inline-flex gap-0.5 ml-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#034694] dark:bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#034694] dark:bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#034694] dark:bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <div className="border-t border-[#e2e8f0] dark:border-[#1e2a3f] bg-white dark:bg-[#111726] p-2">
            {chatImage && (
              <div className="flex items-center gap-1.5 mb-1.5 p-1 bg-[#f1f5f9] dark:bg-[#162032] rounded border border-[#e2e8f0] dark:border-[#2b3b55] w-fit">
                <img
                  src={chatImage.preview}
                  alt="Pratinjau"
                  className="w-7 h-7 object-cover rounded"
                />
                <span className="text-[10px] text-[#475569] dark:text-[#cbd5e1] max-w-[120px] truncate">
                  {chatImage.file.name}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setChatImage(null);
                    if (chatImageInputRef.current) chatImageInputRef.current.value = '';
                  }}
                  className="text-rose-500 hover:text-rose-700 text-xs px-1 font-bold cursor-pointer"
                >
                  ×
                </button>
              </div>
            )}
            <form onSubmit={handleSendMessage} className="flex items-center gap-1.5">
              <input
                ref={chatImageInputRef}
                type="file"
                accept="image/*,.png,.jpg,.jpeg,.webp,.gif,.svg"
                className="hidden"
                onChange={handleSelectImage}
              />
              <button
                type="button"
                onClick={() => chatImageInputRef.current?.click()}
                className="p-1.5 text-[#64748b] dark:text-[#94a3b8] hover:text-[#034694] dark:hover:text-blue-400 hover:bg-[#f1f5f9] dark:hover:bg-[#1e2a3f] rounded border border-[#e2e8f0] dark:border-[#2b3a52] transition-colors cursor-pointer shrink-0"
                title="Kirim Gambar"
              >
                <ImageIcon className="w-3.5 h-3.5" />
              </button>
              <input
                type="text"
                value={inputText}
                onChange={handleInputChange}
                placeholder="Tulis pesan..."
                className="flex-1 px-2.5 py-1.5 border border-[#e2e8f0] dark:border-[#2b3a52] rounded-md text-xs bg-white dark:bg-[#162032] text-[#0f172a] dark:text-white placeholder-[#94a3b8] focus:outline-none focus:border-[#034694] dark:focus:border-blue-500 font-medium"
              />
              <button
                type="submit"
                disabled={(!inputText.trim() && !chatImage) || isUploadingChatImage}
                className="p-1.5 bg-[#034694] hover:bg-[#023470] disabled:bg-[#cbd5e1] dark:disabled:bg-[#1e2a3f] text-white rounded-md transition-colors cursor-pointer shrink-0"
              >
                {isUploadingChatImage ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
