'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { UserManagementModal } from '@/components/admin/UserManagementModal';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { ShortcutsHelpModal } from '@/components/help/ShortcutsHelpModal';
import { CreateUnitModal } from '@/components/unit/CreateUnitModal';
import { useKanbanStore } from '@/store/useKanbanStore';
import { Message, User } from '@/types';
import {
  Send,
  MessageSquare,
  Search,
  Circle,
  ArrowLeft,
  Clock,
  CheckCheck,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';
import { cn, formatLastActive } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';

export default function MessagesPage() {
  const router = useRouter();
  const {
    activeUser,
    allUsers,
    fetchUsers,
    fetchNotifications,
    checkAuth,
    isUserManagementOpen,
    closeUserManagement,
    isSettingsOpen,
    closeSettings,
    isHelpOpen,
    closeHelp,
    isDarkMode,
    toggleDarkMode,
    initTheme,
  } = useKanbanStore();

  const [authChecked, setAuthChecked] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [contactSearch, setContactSearch] = useState('');
  const debouncedContactSearch = useDebounce(contactSearch, 200);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [messageImage, setMessageImage] = useState<{ file: File; preview: string } | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSentTypingRef = useRef<number>(0);

  useEffect(() => {
    initTheme();
    const init = async () => {
      const ok = await checkAuth();
      if (!ok) {
        router.push('/login');
        return;
      }
      setAuthChecked(true);
      fetchUsers();
      fetchNotifications();
    };
    init();

    // Periodic users refresh to update online/last seen presence
    const userTimer = setInterval(() => {
      fetchUsers();
    }, 6000);
    return () => clearInterval(userTimer);
  }, []);

  const otherUsers = allUsers.filter((u) => u.id !== activeUser?.id);

  // Set default selected user on desktop if none
  useEffect(() => {
    if (!selectedUser && otherUsers.length > 0) {
      setSelectedUser(otherUsers[0]);
    }
  }, [allUsers, selectedUser, activeUser]);

  const conversationIdRef = useRef<string | null>(null);
  conversationIdRef.current = conversationId;

  // Load conversation & connect to Real-time SSE
  useEffect(() => {
    if (!selectedUser || !activeUser || !authChecked) return;

    let isSubscribed = true;

    const loadConversation = async () => {
      try {
        const res = await fetch(
          `/api/messages?userOne=${activeUser.id}&userTwo=${selectedUser.id}&userId=${activeUser.id}`
        );
        const data = await res.json();
        if (data.messages && isSubscribed) {
          setMessages(data.messages);
          setConversationId(data.conversationId);
        }
      } catch (err) {
        console.error('Failed to load conversation', err);
      }
    };

    loadConversation();

    // Connect to Server-Sent Events (SSE) for instant real-time message delivery
    const eventSource = new EventSource(`/api/messages/sse?userId=${activeUser.id}`);

    eventSource.addEventListener('message', (event) => {
      try {
        const newMsg: Message = JSON.parse(event.data);
        const isCurrentPair =
          newMsg.sender_id === selectedUser.id || newMsg.sender_id === activeUser.id;

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

          // Mark incoming message as read if viewing this conversation
          if (newMsg.sender_id === selectedUser.id) {
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
        fetchNotifications();
      } catch (err) {
        console.error('Error handling SSE message in Messages page:', err);
      }
    });

    eventSource.addEventListener('read', (event) => {
      try {
        const { readerId } = JSON.parse(event.data);
        if (readerId === selectedUser.id) {
          setMessages((prev) =>
            prev.map((m) => (m.sender_id === activeUser.id ? { ...m, is_read: true } : m))
          );
        }
      } catch (err) {
        console.error('Error handling SSE read event in Messages page:', err);
      }
    });

    eventSource.addEventListener('typing', (event) => {
      try {
        const { senderId, recipientId, isTyping } = JSON.parse(event.data);
        if (senderId === selectedUser.id && recipientId === activeUser.id) {
          setIsPartnerTyping(Boolean(isTyping));
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          if (isTyping) {
            typingTimeoutRef.current = setTimeout(() => {
              setIsPartnerTyping(false);
            }, 3000);
          }
        }
      } catch (err) {
        console.error('Error handling SSE typing in Messages page:', err);
      }
    });

    const fallbackTimer = setInterval(loadConversation, 30000);

    return () => {
      isSubscribed = false;
      eventSource.close();
      clearInterval(fallbackTimer);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [selectedUser, activeUser, authChecked]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPartnerTyping]);

  // Mark messages as read when viewing conversation
  useEffect(() => {
    if (selectedUser && activeUser && conversationId) {
      fetch('/api/messages/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          userId: activeUser.id,
        }),
      }).catch(() => {});
    }
  }, [selectedUser?.id, conversationId, activeUser?.id]);

  const handleSelectImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Hanya berkas gambar (PNG, JPG, WEBP, GIF, SVG) yang diperbolehkan di chat!');
      if (imageInputRef.current) imageInputRef.current.value = '';
      return;
    }
    const preview = URL.createObjectURL(file);
    setMessageImage({ file, preview });
  };

  const emitTyping = (isTyping: boolean) => {
    if (!activeUser || !selectedUser) return;
    fetch('/api/messages/typing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        senderId: activeUser.id,
        recipientId: selectedUser.id,
        senderName: activeUser.name,
        isTyping,
      }),
    }).catch(() => {});
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);

    if (!activeUser || !selectedUser) return;
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
    if ((!inputText.trim() && !messageImage) || !activeUser || !selectedUser) return;

    const content = inputText.trim();
    setInputText('');
    emitTyping(false);

    try {
      let uploadedImageUrl: string | null = null;
      if (messageImage) {
        setIsUploadingImage(true);
        const formData = new FormData();
        formData.append('file', messageImage.file);
        const uploadRes = await fetch('/api/upload/image', {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || uploadData.error) {
          alert(uploadData.error || 'Gagal mengunggah gambar');
          setIsUploadingImage(false);
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
          recipientId: selectedUser.id,
          content,
          imageUrl: uploadedImageUrl,
        }),
      });
      const data = await res.json();
      if (data.message) {
        setMessages((prev) => {
          if (prev.some((m) => String(m.id) === String(data.message.id))) return prev;
          return [...prev, data.message];
        });
        setMessageImage(null);
        if (imageInputRef.current) imageInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Failed to send message', err);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const filteredContacts = otherUsers.filter((u) =>
    u.name.toLowerCase().includes(debouncedContactSearch.toLowerCase())
  );

  const selectedUserStatus = selectedUser ? formatLastActive(selectedUser.last_active_at) : null;

  if (!authChecked) {
    return (
      <div
        suppressHydrationWarning
        className="flex h-screen items-center justify-center bg-[#f1f5f9] dark:bg-[#090e17] text-xs text-[#64748b]"
      >
        Memverifikasi sesi pengguna...
      </div>
    );
  }

  return (
    <div
      suppressHydrationWarning
      className="flex h-screen bg-[#f1f5f9] dark:bg-[#090e17] text-[#0f172a] dark:text-[#f8fafc] overflow-hidden transition-colors"
    >
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header />

        {/* Split-pane Chat Container */}
        <div className="flex-1 flex overflow-hidden p-3 sm:p-6 gap-4 sm:gap-6">
          {/* Left Pane: Contacts List with Online Status */}
          <div
            className={cn(
              'w-full md:w-80 bg-white dark:bg-[#111726] border border-[#cbd5e1] dark:border-[#1e2a3f] rounded-xl shadow-xs flex flex-col overflow-hidden transition-colors',
              showMobileChat ? 'hidden md:flex' : 'flex'
            )}
          >
            {/* Contacts Search Header */}
            <div className="p-4 border-b border-[#cbd5e1] dark:border-[#1e2a3f] bg-[#f8fafc] dark:bg-[#131b2e]">
              <h2 className="font-extrabold text-sm text-[#0f172a] dark:text-white mb-2.5 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#034694] dark:text-blue-400" />
                Obrolan Tim & Status Aktif
              </h2>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  placeholder="Cari rekan kerja..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-[#192336] border border-[#cbd5e1] dark:border-[#2b3b55] rounded-lg text-xs text-[#0f172a] dark:text-white placeholder-[#94a3b8] focus:outline-none focus:border-[#034694]"
                />
              </div>
            </div>

            {/* Contacts Feed */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#e2e8f0] dark:divide-[#1e2a3f]">
              {filteredContacts.map((contact) => {
                const isSelected = selectedUser?.id === contact.id;
                const status = formatLastActive(contact.last_active_at);

                return (
                  <div
                    key={contact.id}
                    onClick={() => {
                      setSelectedUser(contact);
                      setShowMobileChat(true);
                    }}
                    className={cn(
                      'p-3.5 flex items-center gap-3 cursor-pointer transition-colors',
                      isSelected
                        ? 'bg-[#e0edfb] dark:bg-[#1e293b] border-l-4 border-[#034694] dark:border-blue-500'
                        : 'hover:bg-[#f8fafc] dark:hover:bg-[#162032]'
                    )}
                  >
                    {/* Avatar with presence badge */}
                    <div className="relative shrink-0">
                      <img
                        src={contact.avatar_url || ''}
                        alt={contact.name}
                        className="w-10 h-10 rounded-full object-cover ring-1 ring-[#cbd5e1] dark:ring-[#2b3b55]"
                      />
                      <span
                        className={cn(
                          'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-white dark:ring-[#111726]',
                          status.isOnline
                            ? 'bg-emerald-500 animate-pulse'
                            : 'bg-slate-400 dark:bg-slate-600'
                        )}
                        title={status.text}
                      />
                    </div>

                    {/* Contact name and status info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-bold text-xs text-[#0f172a] dark:text-white truncate">
                          {contact.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] truncate">
                        {status.isOnline ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1">
                            <Circle className="w-2 h-2 fill-emerald-500" />
                            Sedang Online
                          </span>
                        ) : (
                          <span className="text-[#64748b] dark:text-[#94a3b8] flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {status.text}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Pane: Active Chat Room */}
          <div
            className={cn(
              'flex-1 bg-white dark:bg-[#111726] border border-[#cbd5e1] dark:border-[#1e2a3f] rounded-xl shadow-xs flex flex-col overflow-hidden transition-colors',
              !showMobileChat ? 'hidden md:flex' : 'flex'
            )}
          >
            {selectedUser ? (
              <>
                {/* Active Chat Header with Presence & Back Button */}
                <div className="h-16 px-4 sm:px-6 border-b border-[#cbd5e1] dark:border-[#1e2a3f] flex items-center justify-between bg-[#f8fafc] dark:bg-[#131b2e] shrink-0">
                  <div className="flex items-center gap-3">
                    {/* Mobile Back Button to Contacts */}
                    <button
                      onClick={() => setShowMobileChat(false)}
                      className="md:hidden p-1.5 rounded-lg text-[#475569] dark:text-[#94a3b8] hover:bg-[#e2e8f0] dark:hover:bg-[#1e293b]"
                      title="Kembali ke kontak"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>

                    {/* Avatar with indicator */}
                    <div className="relative shrink-0">
                      <img
                        src={selectedUser.avatar_url || ''}
                        alt={selectedUser.name}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-[#034694]/20 dark:ring-blue-500/30"
                      />
                      <span
                        className={cn(
                          'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-white dark:ring-[#131b2e]',
                          selectedUserStatus?.isOnline
                            ? 'bg-emerald-500 animate-pulse'
                            : 'bg-slate-400 dark:bg-slate-600'
                        )}
                      />
                    </div>

                    {/* Header Presence Title */}
                    <div>
                      <h3 className="font-extrabold text-sm text-[#0f172a] dark:text-white leading-tight">
                        {selectedUser.name}
                      </h3>
                      <div className="text-xs leading-tight mt-0.5">
                        {isPartnerTyping ? (
                          <span className="text-amber-500 dark:text-amber-400 font-bold flex items-center gap-1.5 text-[11px] animate-pulse">
                            <span className="inline-flex gap-0.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </span>
                            Sedang mengetik...
                          </span>
                        ) : selectedUserStatus?.isOnline ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                            <Circle className="w-2 h-2 fill-emerald-500 animate-pulse" />
                            Sedang Online (Buka Aplikasi)
                          </span>
                        ) : (
                          <span className="text-[#64748b] dark:text-[#94a3b8] flex items-center gap-1 text-[11px]">
                            <Clock className="w-3 h-3 text-[#94a3b8]" />
                            Terakhir aktif: {selectedUserStatus?.text}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="hidden sm:flex items-center gap-2">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-[#034694] dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                      P2P Chat Terenkripsi
                    </span>
                  </div>
                </div>

                {/* Messages Body Feed */}
                <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-3 bg-[#f8fafc]/60 dark:bg-[#0d1424]/40">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-[#94a3b8] text-xs">
                      <MessageSquare className="w-10 h-10 text-[#cbd5e1] dark:text-[#2b3a52] mb-2" />
                      Belum ada percakapan dengan {selectedUser.name}. Mulai kolaborasi sekarang!
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
                              'max-w-[85%] sm:max-w-[70%] rounded-xl px-4 py-2.5 text-xs leading-relaxed shadow-xs font-medium',
                              isMe
                                ? 'bg-[#034694] dark:bg-blue-600 text-white rounded-br-none'
                                : 'bg-white dark:bg-[#162032] border border-[#cbd5e1] dark:border-[#2b3b55] text-[#0f172a] dark:text-white rounded-bl-none'
                            )}
                          >
                            {m.image_url && (
                              <div className="mb-2 rounded-lg overflow-hidden border border-black/10 dark:border-white/10 max-w-xs sm:max-w-sm">
                                <a href={m.image_url} target="_blank" rel="noopener noreferrer">
                                  <img
                                    src={m.image_url}
                                    alt="Lampiran pesan"
                                    className="w-full max-h-64 object-cover hover:opacity-90 transition-opacity cursor-pointer rounded-lg bg-black/5 dark:bg-white/5"
                                  />
                                </a>
                              </div>
                            )}
                            {m.content && m.content !== '[Gambar]' && (
                              <p>{m.content}</p>
                            )}
                          </div>
                          <span className="text-[10px] text-[#64748b] dark:text-[#94a3b8] mt-1 px-1 flex items-center gap-1">
                            {new Date(m.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {isMe && (
                              <span title={m.is_read ? 'Sudah dibaca' : 'Terkirim (belum dibaca)'} className="inline-flex">
                                <CheckCheck
                                  className={cn(
                                    'w-3.5 h-3.5',
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
                    <div className="flex items-center gap-2 text-xs text-[#64748b] dark:text-[#94a3b8] italic px-2 py-1 animate-pulse">
                      <span className="font-semibold text-[#034694] dark:text-blue-400 not-italic">
                        {selectedUser.name}
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

                {/* Message Input Bar */}
                <div className="border-t border-[#cbd5e1] dark:border-[#1e2a3f] bg-white dark:bg-[#111726] p-3 sm:p-4">
                  {messageImage && (
                    <div className="flex items-center gap-2 mb-2 p-1.5 bg-[#f1f5f9] dark:bg-[#162032] rounded-lg border border-[#cbd5e1] dark:border-[#2b3b55] w-fit">
                      <img
                        src={messageImage.preview}
                        alt="Pratinjau gambar"
                        className="w-10 h-10 object-cover rounded-md border border-white/20"
                      />
                      <div className="text-[10px] text-[#475569] dark:text-[#cbd5e1] max-w-[150px] truncate">
                        {messageImage.file.name}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setMessageImage(null);
                          if (imageInputRef.current) imageInputRef.current.value = '';
                        }}
                        className="text-rose-500 hover:text-rose-700 text-xs px-1 font-bold cursor-pointer"
                        title="Batalkan gambar"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  <form
                    onSubmit={handleSendMessage}
                    className="flex items-center gap-2 sm:gap-3"
                  >
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*,.png,.jpg,.jpeg,.webp,.gif,.svg"
                      className="hidden"
                      onChange={handleSelectImage}
                    />
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="p-2.5 border border-[#cbd5e1] dark:border-[#2b3b55] hover:border-[#034694] dark:hover:border-blue-500 text-[#64748b] hover:text-[#034694] dark:text-[#94a3b8] dark:hover:text-blue-400 bg-[#f8fafc] dark:bg-[#162032] rounded-xl text-xs flex items-center justify-center transition-colors cursor-pointer shrink-0"
                      title="Kirim Gambar"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>
                    <input
                      type="text"
                      value={inputText}
                      onChange={handleInputChange}
                      placeholder={`Kirim pesan atau gambar ke ${selectedUser.name}...`}
                      className="flex-1 px-4 py-2.5 border border-[#cbd5e1] dark:border-[#2b3b55] rounded-xl text-xs bg-[#f8fafc] dark:bg-[#162032] text-[#0f172a] dark:text-white placeholder-[#94a3b8] focus:outline-none focus:border-[#034694] dark:focus:border-blue-500 font-medium"
                    />
                    <button
                      type="submit"
                      disabled={(!inputText.trim() && !messageImage) || isUploadingImage}
                      className="px-4 py-2.5 bg-[#034694] hover:bg-[#023470] disabled:bg-[#cbd5e1] dark:disabled:bg-[#1e2a3f] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors shrink-0 cursor-pointer"
                    >
                      {isUploadingImage ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      <span className="hidden sm:inline">Kirim</span>
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-[#94a3b8]">
                Pilih salah satu kontak di sisi kiri untuk memulai percakapan.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <UserManagementModal
        isOpen={isUserManagementOpen}
        onClose={closeUserManagement}
      />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={closeSettings}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleDarkMode}
      />
      <ShortcutsHelpModal
        isOpen={isHelpOpen}
        onClose={closeHelp}
      />
      <CreateUnitModal />
    </div>
  );
}
