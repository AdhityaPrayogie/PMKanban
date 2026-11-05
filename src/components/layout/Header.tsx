'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  Search,
  Plus,
  Kanban,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AtSign,
  UserCheck,
  ChevronDown,
  Moon,
  Sun,
  Settings,
  HelpCircle,
  Shield,
  LogOut,
  Menu,
  Layers,
  MessageSquare,
} from 'lucide-react';
import { useKanbanStore } from '@/store/useKanbanStore';
import { cn, formatDate } from '@/lib/utils';
import { Priority } from '@/types';

export function Header() {
  const {
    activeUser,
    setActiveUser,
    allUsers,
    currentProject,
    searchQuery,
    setSearchQuery,
    priorityFilter,
    setPriorityFilter,
    assigneeFilter,
    setAssigneeFilter,
    activeView,
    setActiveView,
    openCreateModal,
    notifications,
    unreadNotifsCount,
    fetchNotifications,
    markNotificationsAsRead,
    markSingleNotificationAsRead,
    openTaskSheet,
    isDarkMode,
    toggleDarkMode,
    openSettings,
    openHelp,
    openUserManagement,
    openMiniChatWith,
    logout,
    toggleMobileSidebar,
  } = useKanbanStore();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Live Toast Banner state
  const [liveToast, setLiveToast] = useState<{
    id: string;
    title: string;
    message: string;
    type?: string;
    taskId?: string | null;
    senderId?: string;
  } | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search state
  const [localSearch, setLocalSearch] = useState(searchQuery);

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(localSearch);
    }, 250);
    return () => clearTimeout(handler);
  }, [localSearch, setSearchQuery]);

  // Sync external search changes
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  // Global Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)) {
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        openCreateModal();
      } else if (e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setActiveView('board');
      } else if (e.key.toLowerCase() === 't') {
        e.preventDefault();
        setActiveView('timeline');
      } else if (e.key.toLowerCase() === 'd') {
        e.preventDefault();
        toggleDarkMode();
      } else if (e.key === '?' || e.key.toLowerCase() === 'h') {
        e.preventDefault();
        openHelp();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openCreateModal, setActiveView, toggleDarkMode, openHelp]);

  // Global Real-time Notifications & Alerts via SSE
  useEffect(() => {
    if (!activeUser) return;

    fetchNotifications();

    const eventSource = new EventSource(`/api/messages/sse?userId=${activeUser.id}`);

    eventSource.addEventListener('notification', (event) => {
      try {
        const notif = JSON.parse(event.data);
        fetchNotifications();
        if (notif.title) {
          setLiveToast({
            id: notif.id || String(Date.now()),
            title: notif.title,
            message: notif.message,
            type: notif.type,
            taskId: notif.related_task_id,
          });
          if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
          toastTimerRef.current = setTimeout(() => setLiveToast(null), 5000);
        }
      } catch (err) {
        console.error('Error handling SSE notification in Header:', err);
      }
    });

    eventSource.addEventListener('message', (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.sender_id !== activeUser.id) {
          fetchNotifications();
        }
      } catch (err) {
        console.error('Error handling SSE message in Header:', err);
      }
    });

    eventSource.addEventListener('read', () => {
      fetchNotifications();
    });

    return () => {
      eventSource.close();
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [activeUser?.id, fetchNotifications]);

  // Close popovers when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenNotif = () => {
    setIsNotifOpen(!isNotifOpen);
  };

  const getNotifIcon = (type: string, relatedTaskId?: string | null) => {
    if (relatedTaskId && allUsers.some((u) => u.id === relatedTaskId)) {
      return <MessageSquare className="w-4 h-4 text-[#034694] dark:text-blue-400" />;
    }
    switch (type) {
      case 'deadline':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'mention':
        return <AtSign className="w-4 h-4 text-[#034694] dark:text-blue-400" />;
      case 'assignment':
        return <UserCheck className="w-4 h-4 text-emerald-500" />;
      default:
        return <CheckCircle2 className="w-4 h-4 text-slate-500" />;
    }
  };

  const isAdmin = activeUser?.role === 'admin';
  const pendingUsersCount = allUsers.filter((u) => u.status === 'pending').length;

  return (
    <header className="h-16 bg-white dark:bg-[#111726] border-b border-[#cbd5e1] dark:border-[#1e2a3f] px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 shrink-0 shadow-xs z-30 transition-colors">
      {/* Left: Mobile Hamburger & View Switcher Tabs */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile Sidebar Hamburger Toggle */}
        <button
          onClick={toggleMobileSidebar}
          className="lg:hidden p-2 rounded-lg text-[#334155] dark:text-[#cbd5e1] hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] transition-colors"
          title="Buka Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* View Switcher Tabs: Hub, Board, Timeline */}
        <div className="flex items-center bg-[#f1f5f9] dark:bg-[#1a2436] p-1 rounded-lg border border-[#cbd5e1] dark:border-[#2b3a52]">
          <button
            onClick={() => setActiveView('hub')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer',
              activeView === 'hub'
                ? 'bg-white dark:bg-[#034694] text-[#034694] dark:text-white shadow-xs font-bold'
                : 'text-[#475569] dark:text-[#94a3b8] hover:text-[#0f172a] dark:hover:text-white'
            )}
            title="Daftar Papan Proyek (Level 1)"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Project Hub</span>
          </button>
          <button
            onClick={() => setActiveView('board')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer',
              activeView === 'board'
                ? 'bg-white dark:bg-[#034694] text-[#034694] dark:text-white shadow-xs font-bold'
                : 'text-[#475569] dark:text-[#94a3b8] hover:text-[#0f172a] dark:hover:text-white'
            )}
            title="Kanban Board (Level 2)"
          >
            <Kanban className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Board</span>
          </button>
          <button
            onClick={() => setActiveView('timeline')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer',
              activeView === 'timeline'
                ? 'bg-white dark:bg-[#034694] text-[#034694] dark:text-white shadow-xs font-bold'
                : 'text-[#475569] dark:text-[#94a3b8] hover:text-[#0f172a] dark:hover:text-white'
            )}
            title="Timeline & Subtasks Schedule"
          >
            <Clock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Timeline</span>
          </button>
        </div>
      </div>

      {/* Middle: Debounced Search & Quick Filters */}
      <div className="flex items-center gap-2 flex-1 max-w-md mx-2">
        {/* Debounced Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            ref={searchInputRef}
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder={
              activeView === 'hub'
                ? 'Cari board/project (Ctrl+K)...'
                : activeView === 'timeline'
                ? 'Cari tugas di timeline (Ctrl+K)...'
                : 'Cari tugas kanban (Ctrl+K)...'
            }
            className="w-full pl-9 pr-7 py-1.5 bg-[#f8fafc] dark:bg-[#192336] border border-[#cbd5e1] dark:border-[#2b3b55] rounded-lg text-xs text-[#0f172a] dark:text-white placeholder-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#034694]/20 focus:border-[#034694] transition-all"
          />
          {localSearch && (
            <button
              onClick={() => setLocalSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#94a3b8] hover:text-[#0f172a] dark:hover:text-white"
            >
              ×
            </button>
          )}
        </div>

        {/* Priority Filter (Hidden on very small screens) */}
        <div className="hidden md:flex items-center">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as Priority | 'All')}
            aria-label="Filter tasks by priority"
            className="px-2 py-1.5 bg-[#f8fafc] dark:bg-[#192336] border border-[#cbd5e1] dark:border-[#2b3b55] rounded-lg text-xs font-semibold text-[#334155] dark:text-[#cbd5e1] focus:outline-none focus:border-[#034694] cursor-pointer"
          >
            <option value="All">All Priority</option>
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* Right: Actions, Utilities, Notifications & User */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Create Task Button */}
        <button
          onClick={() => openCreateModal()}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-[#034694] hover:bg-[#023470] text-white text-xs font-bold rounded-lg shadow-sm transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Task</span>
        </button>

        {/* Theme Toggle (Light / Dark mode) */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-lg text-[#475569] dark:text-[#94a3b8] hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] hover:text-[#0f172a] dark:hover:text-white transition-colors"
          title={isDarkMode ? 'Beralih ke Mode Terang (D)' : 'Beralih ke Mode Gelap (D)'}
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Help & Shortcuts Guide (?) */}
        <button
          onClick={openHelp}
          className="hidden sm:flex p-2 rounded-lg text-[#475569] dark:text-[#94a3b8] hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] hover:text-[#0f172a] dark:hover:text-white transition-colors"
          title="Panduan Pintasan Keyboard (?)"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Notification Bell with Popover */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={handleOpenNotif}
            className="relative p-2 rounded-lg text-[#475569] dark:text-[#94a3b8] hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] hover:text-[#0f172a] dark:hover:text-white transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-[#111726] shadow-sm animate-pulse">
                {unreadNotifsCount > 99 ? '99+' : unreadNotifsCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#162032] border border-[#cbd5e1] dark:border-[#2b3b55] rounded-xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-4 py-2 border-b border-[#e2e8f0] dark:border-[#24334a] flex items-center justify-between">
                <div className="font-bold text-xs text-[#0f172a] dark:text-white">
                  Semua Notifikasi Aksi
                </div>
                {unreadNotifsCount > 0 && (
                  <button
                    onClick={markNotificationsAsRead}
                    className="text-[11px] text-[#034694] dark:text-blue-400 hover:underline font-bold"
                  >
                    Tandai terbaca
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-[#f1f5f9] dark:divide-[#1e293b]">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[#94a3b8]">
                    Belum ada notifikasi baru.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        markSingleNotificationAsRead(n.id);
                        if (n.related_task_id) {
                          const chatPartner = allUsers.find((u) => u.id === n.related_task_id);
                          if (chatPartner) {
                            openMiniChatWith(chatPartner);
                            setIsNotifOpen(false);
                            return;
                          }
                          openTaskSheet(n.related_task_id);
                          setIsNotifOpen(false);
                        }
                      }}
                      className={cn(
                        'p-3 flex items-start gap-3 hover:bg-[#f8fafc] dark:hover:bg-[#1b273d] cursor-pointer transition-colors',
                        !n.is_read && 'bg-[#e0edfb]/50 dark:bg-blue-950/30'
                      )}
                    >
                      <div className="mt-0.5">{getNotifIcon(n.type, n.related_task_id)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-[#0f172a] dark:text-white flex items-center justify-between">
                          <span className="truncate">{n.title}</span>
                          <span className="text-[10px] text-[#94a3b8] font-normal shrink-0 ml-2">
                            {formatDate(n.created_at)}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#475569] dark:text-[#94a3b8] mt-0.5 leading-snug">
                          {n.message}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile & Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#2b3b55] transition-colors"
            title="Menu Akun"
          >
            {activeUser?.avatar_url ? (
              <img
                src={activeUser.avatar_url}
                alt={activeUser.name}
                className="w-6 h-6 rounded-full object-cover ring-1 ring-[#cbd5e1]"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-[#034694] text-white flex items-center justify-center text-xs font-bold">
                {activeUser?.name?.charAt(0)}
              </div>
            )}
            <div className="text-left hidden lg:block">
              <span className="text-xs font-bold text-[#0f172a] dark:text-white block leading-tight">
                {activeUser?.name?.split(' ')[0]}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-[#034694] dark:text-blue-400 font-extrabold block leading-tight">
                {activeUser?.role || 'user'}
              </span>
            </div>
            <ChevronDown className="w-3 h-3 text-[#94a3b8]" />
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#162032] border border-[#cbd5e1] dark:border-[#2b3b55] rounded-xl shadow-xl py-1.5 z-50">
              <div className="px-3 py-2 border-b border-[#e2e8f0] dark:border-[#24334a]">
                <div className="font-bold text-xs text-[#0f172a] dark:text-white">
                  {activeUser?.name}
                </div>
                <div className="text-[10px] text-[#64748b] dark:text-[#94a3b8]">{activeUser?.email}</div>
              </div>

              <div className="py-1">
                {isAdmin && (
                  <button
                    onClick={() => {
                      openUserManagement();
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#334155] dark:text-[#cbd5e1] hover:bg-[#f1f5f9] dark:hover:bg-[#1b273d]"
                  >
                    <Shield className="w-3.5 h-3.5 text-amber-500" />
                    <span>Kelola Pengguna ({pendingUsersCount} pending)</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    openSettings();
                    setIsUserMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#334155] dark:text-[#cbd5e1] hover:bg-[#f1f5f9] dark:hover:bg-[#1b273d]"
                >
                  <Settings className="w-3.5 h-3.5 text-[#64748b]" />
                  <span>Pengaturan Akun</span>
                </button>
                <button
                  onClick={() => {
                    openHelp();
                    setIsUserMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#334155] dark:text-[#cbd5e1] hover:bg-[#f1f5f9] dark:hover:bg-[#1b273d]"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-[#64748b]" />
                  <span>Pintasan Keyboard</span>
                </button>
              </div>

              <div className="border-t border-[#e2e8f0] dark:border-[#24334a] pt-1">
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Keluar / Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Real-time Floating Toast Alert */}
      {liveToast && (
        <div className="fixed top-16 right-6 z-50 max-w-sm w-full bg-white dark:bg-[#162032] border border-[#cbd5e1] dark:border-[#2b3b55] rounded-xl shadow-2xl p-3.5 flex items-start gap-3 animate-in slide-in-from-top-3 fade-in duration-200">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#034694] dark:text-blue-400 shrink-0 mt-0.5">
            <Bell className="w-4 h-4 animate-bounce" />
          </div>
          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => {
              if (liveToast.taskId) {
                openTaskSheet(liveToast.taskId);
              } else if (liveToast.senderId) {
                const senderObj = allUsers.find((u) => u.id === liveToast.senderId);
                if (senderObj) openMiniChatWith(senderObj);
              }
              setLiveToast(null);
            }}
          >
            <div className="text-xs font-bold text-[#0f172a] dark:text-white truncate">
              {liveToast.title}
            </div>
            <div className="text-[11px] text-[#64748b] dark:text-[#94a3b8] line-clamp-2 mt-0.5 leading-snug">
              {liveToast.message}
            </div>
          </div>
          <button
            onClick={() => setLiveToast(null)}
            className="text-[#94a3b8] hover:text-[#0f172a] dark:hover:text-white text-xs p-1 cursor-pointer font-bold"
          >
            ×
          </button>
        </div>
      )}
    </header>
  );
}
