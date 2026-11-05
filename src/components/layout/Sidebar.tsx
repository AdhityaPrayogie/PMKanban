'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Kanban,
  Clock,
  MessageSquare,
  FolderKanban,
  Users,
  Settings,
  ChevronRight,
  Shield,
  HelpCircle,
  LogOut,
  Moon,
  Sun,
  X,
  Circle,
  Building2,
  Plus,
  Layers,
} from 'lucide-react';
import { useKanbanStore } from '@/store/useKanbanStore';
import { cn, formatLastActive } from '@/lib/utils';

export function Sidebar() {
  const pathname = usePathname();
  const {
    activeUser,
    currentProject,
    projects,
    masterUnits,
    selectProject,
    openCreateUnitModal,
    openMasterUnitModal,
    activeView,
    setActiveView,
    openMiniChatWith,
    allUsers,
    openUserManagement,
    openSettings,
    openHelp,
    logout,
    isDarkMode,
    toggleDarkMode,
    isMobileSidebarOpen,
    closeMobileSidebar,
  } = useKanbanStore();

  const isMessagesPage = pathname === '/messages';
  const otherUsers = allUsers.filter((u) => u.id !== activeUser?.id);
  const isAdmin = activeUser?.role === 'admin';
  const pendingCount = allUsers.filter((u) => u.status === 'pending').length;

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-40 lg:hidden animate-in fade-in"
          onClick={closeMobileSidebar}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          'fixed lg:static top-0 bottom-0 left-0 z-50 w-72 lg:w-64 bg-white dark:bg-[#111726] border-r border-[#cbd5e1] dark:border-[#1e2a3f] flex flex-col h-screen select-none shrink-0 shadow-md lg:shadow-none transition-transform duration-200 ease-in-out',
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Brand Header */}
        <div className="h-16 border-b border-[#cbd5e1] dark:border-[#1e2a3f] flex items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#034694] flex items-center justify-center text-white shadow-sm font-bold text-lg">
              <Kanban className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-extrabold text-[#0f172a] dark:text-white text-base leading-tight tracking-tight flex items-center gap-1.5">
                PM Kanban
                <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-[#e0edfb] dark:bg-blue-950 text-[#034694] dark:text-blue-300">
                  v1.0
                </span>
              </div>
              <p className="text-xs text-[#475569] dark:text-[#94a3b8]">Modular Workspace</p>
            </div>
          </div>

          {/* Close button for mobile */}
          <button
            onClick={closeMobileSidebar}
            className="lg:hidden p-1.5 rounded-md text-[#475569] hover:text-[#0f172a] dark:hover:text-white hover:bg-[#f1f5f9] dark:hover:bg-[#1e2a3f]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5 scrollbar-thin">
          {/* Main Navigation */}
          <div className="space-y-1">
            <div className="px-2.5 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-[#64748b] dark:text-[#94a3b8]">
              Workspace Views
            </div>

            <Link
              href="/"
              onClick={() => {
                setActiveView('hub');
                closeMobileSidebar();
              }}
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer',
                !isMessagesPage && activeView === 'hub'
                  ? 'bg-[#e0edfb] dark:bg-[#1e293b] text-[#034694] dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-900/60 shadow-2xs'
                  : 'text-[#334155] dark:text-[#cbd5e1] hover:bg-[#f1f5f9] dark:hover:bg-[#162032] hover:text-[#0f172a] dark:hover:text-white'
              )}
            >
              <Layers className="w-4 h-4 shrink-0 text-[#034694] dark:text-blue-400" />
              <span>Project Hub</span>
            </Link>

            <Link
              href="/"
              onClick={() => {
                setActiveView('board');
                closeMobileSidebar();
              }}
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer',
                !isMessagesPage && activeView === 'board'
                  ? 'bg-[#e0edfb] dark:bg-[#1e293b] text-[#034694] dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-900/60 shadow-2xs'
                  : 'text-[#334155] dark:text-[#cbd5e1] hover:bg-[#f1f5f9] dark:hover:bg-[#162032] hover:text-[#0f172a] dark:hover:text-white'
              )}
            >
              <Kanban className="w-4 h-4 shrink-0 text-[#034694] dark:text-blue-400" />
              <span>Kanban Board</span>
            </Link>

            <Link
              href="/"
              onClick={() => {
                setActiveView('timeline');
                closeMobileSidebar();
              }}
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer',
                !isMessagesPage && activeView === 'timeline'
                  ? 'bg-[#e0edfb] dark:bg-[#1e293b] text-[#034694] dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-900/60 shadow-2xs'
                  : 'text-[#334155] dark:text-[#cbd5e1] hover:bg-[#f1f5f9] dark:hover:bg-[#162032] hover:text-[#0f172a] dark:hover:text-white'
              )}
            >
              <Clock className="w-4 h-4 shrink-0 text-[#034694] dark:text-blue-400" />
              <span>Timeline & Sub-tasks</span>
            </Link>

            <Link
              href="/messages"
              onClick={closeMobileSidebar}
              className={cn(
                'flex items-center justify-between px-2.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer',
                isMessagesPage
                  ? 'bg-[#e0edfb] dark:bg-[#1e293b] text-[#034694] dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-900/60 shadow-2xs'
                  : 'text-[#334155] dark:text-[#cbd5e1] hover:bg-[#f1f5f9] dark:hover:bg-[#162032] hover:text-[#0f172a] dark:hover:text-white'
              )}
            >
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-4 h-4 shrink-0 text-[#034694] dark:text-blue-400" />
                <span>Private Chat</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </Link>
          </div>

          {/* List Project Section */}
          <div className="space-y-1">
            <div className="px-2.5 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-[#64748b] dark:text-[#94a3b8] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FolderKanban className="w-3.5 h-3.5 text-[#034694] dark:text-blue-400" />
                <span>List Project</span>
              </span>
              <button
                onClick={() => {
                  openCreateUnitModal();
                  closeMobileSidebar();
                }}
                className="p-1 rounded text-[#034694] dark:text-blue-400 hover:bg-[#e0edfb] dark:hover:bg-[#1e293b] transition-colors cursor-pointer"
                title="Tambah Project Baru"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
              {(() => {
                const userUnit = (activeUser?.unit_name || '').trim().toLowerCase();
                const visibleProjects = isAdmin
                  ? projects
                  : projects.filter((p) => {
                      const pTag = (p.unit_tag || '').trim().toLowerCase();
                      const pName = p.name.toLowerCase();
                      return pTag === userUnit || pName.includes(userUnit);
                    });

                if (visibleProjects.length === 0) {
                  return (
                    <div className="p-3 text-center text-[11px] text-[#94a3b8] italic bg-[#f8fafc] dark:bg-[#111726] rounded-lg border border-dashed border-[#cbd5e1] dark:border-[#202e44]">
                      Belum ada project untuk #{activeUser?.unit_name || 'Unit'}
                    </div>
                  );
                }

                return visibleProjects.map((proj) => {
                  const isCurrent = proj.id === currentProject?.id;
                  return (
                    <button
                      key={proj.id}
                      onClick={() => {
                        selectProject(proj.id);
                        setActiveView('board');
                        closeMobileSidebar();
                        if (isMessagesPage) {
                          window.location.href = '/';
                        }
                      }}
                      className={cn(
                        'w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all text-left group cursor-pointer',
                        isCurrent && activeView === 'board'
                          ? 'bg-[#e0edfb] dark:bg-[#1e293b] text-[#034694] dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-900/60 shadow-2xs'
                          : 'text-[#334155] dark:text-[#cbd5e1] hover:bg-[#f1f5f9] dark:hover:bg-[#162032] hover:text-[#0f172a] dark:hover:text-white'
                      )}
                    >
                      <div className="truncate mr-2 flex items-center gap-1.5 min-w-0">
                        <span className="text-[9px] px-1 py-0.2 rounded font-bold bg-[#f1f5f9] dark:bg-[#1e293b] text-[#034694] dark:text-blue-300 border border-blue-200 dark:border-blue-900/50 shrink-0">
                          #{proj.unit_tag || 'IT'}
                        </span>
                        <span className="truncate">{proj.name}</span>
                      </div>
                      <span
                        className={cn(
                          'text-[9px] px-1.5 py-0.2 rounded-full font-bold shrink-0',
                          isCurrent
                            ? 'bg-[#034694] text-white dark:bg-blue-600'
                            : 'bg-[#cbd5e1] dark:bg-[#24334a] text-[#475569] dark:text-[#cbd5e1]'
                        )}
                      >
                        {proj.tasks_count || 0}
                      </span>
                    </button>
                  );
                });
              })()}
            </div>
          </div>

          {/* Team DM List with Real-time Online & Last Seen status */}
          <div className="space-y-1">
            <div className="px-2.5 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-[#64748b] dark:text-[#94a3b8] flex items-center justify-between">
              <span>Direct Message</span>
              <Users className="w-3.5 h-3.5" />
            </div>

            <div className="space-y-1 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
              {otherUsers.map((user) => {
                const status = formatLastActive(user.last_active_at);
                return (
                  <button
                    key={user.id}
                    onClick={() => {
                      openMiniChatWith(user);
                      closeMobileSidebar();
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-medium rounded-lg text-[#334155] dark:text-[#cbd5e1] hover:bg-[#f1f5f9] dark:hover:bg-[#162032] hover:text-[#0f172a] dark:hover:text-white transition-colors text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-2 truncate min-w-0">
                      <div className="relative shrink-0">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.name}
                            className="w-6 h-6 rounded-full object-cover ring-1 ring-[#cbd5e1]"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-[#034694] text-white flex items-center justify-center text-[10px] font-bold">
                            {user.name.charAt(0)}
                          </div>
                        )}
                        {/* Presence indicator */}
                        <span
                          suppressHydrationWarning
                          className={cn(
                            'absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-white dark:ring-[#111726]',
                            status.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400 dark:bg-slate-600'
                          )}
                          title={status.text}
                        />
                      </div>
                      <div className="truncate min-w-0">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="truncate font-semibold text-[#0f172a] dark:text-white text-xs">
                            {user.name}
                          </span>
                          <span className="text-[9px] px-1 py-0.2 rounded font-bold bg-[#e0edfb] dark:bg-[#1e293b] text-[#034694] dark:text-blue-300 shrink-0">
                            #{user.unit_name || 'IT'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span
                      suppressHydrationWarning
                      className={cn(
                        'text-[9px] font-medium shrink-0 ml-1',
                        status.isOnline ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-[#94a3b8]'
                      )}
                    >
                      {status.isOnline ? 'Online' : status.text}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Administrasi Section - Admin Only */}
          {isAdmin && (
            <div className="space-y-1">
              <div className="px-2.5 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-[#64748b] dark:text-[#94a3b8] flex items-center justify-between">
                <span>Administrasi</span>
                <Shield className="w-3.5 h-3.5 text-amber-500" />
              </div>

              {/* Kelola Pengguna */}
              <button
                onClick={() => {
                  openUserManagement();
                  closeMobileSidebar();
                }}
                className="w-full flex items-center justify-between px-2.5 py-2 text-xs font-semibold rounded-lg text-[#334155] dark:text-[#cbd5e1] hover:bg-[#f1f5f9] dark:hover:bg-[#162032] hover:text-[#0f172a] dark:hover:text-white transition-all cursor-pointer border border-[#cbd5e1]/50 dark:border-[#1e2a3f] bg-white/40 dark:bg-[#131b2e]/40 shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Kelola Pengguna</span>
                </div>
                {pendingCount > 0 ? (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-amber-500 text-white animate-pulse">
                    {pendingCount} ACC
                  </span>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-[#f1f5f9] dark:bg-[#1e293b] text-[#64748b] dark:text-[#94a3b8]">
                    {allUsers.length}
                  </span>
                )}
              </button>

              {/* Master Unit */}
              <button
                onClick={() => {
                  openMasterUnitModal();
                  closeMobileSidebar();
                }}
                className="w-full flex items-center justify-between px-2.5 py-2 text-xs font-semibold rounded-lg text-[#334155] dark:text-[#cbd5e1] hover:bg-[#f1f5f9] dark:hover:bg-[#162032] hover:text-[#0f172a] dark:hover:text-white transition-all cursor-pointer border border-[#cbd5e1]/50 dark:border-[#1e2a3f] bg-white/40 dark:bg-[#131b2e]/40 shadow-2xs"
                title="Kelola Master Table Units & Penempatan Tim"
              >
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 text-[#034694] dark:text-blue-400 shrink-0" />
                  <span>Master Unit</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-[#e0edfb] dark:bg-[#1e293b] text-[#034694] dark:text-blue-300 border border-blue-200 dark:border-blue-900/60">
                  {masterUnits.length}
                </span>
              </button>
            </div>
          )}

          {/* Utilities Quick Buttons */}
          <div className="space-y-1 pt-2 border-t border-[#e2e8f0] dark:border-[#1e2a3f]">
            <div className="px-2.5 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-[#64748b] dark:text-[#94a3b8]">
              Preferensi
            </div>
            <button
              onClick={() => {
                openSettings();
                closeMobileSidebar();
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-[#475569] dark:text-[#94a3b8] hover:bg-[#f1f5f9] dark:hover:bg-[#162032] cursor-pointer transition-colors"
            >
              <Settings className="w-4 h-4 text-[#64748b] dark:text-[#94a3b8]" />
              <span>Pengaturan</span>
            </button>
            <button
              onClick={() => {
                openHelp();
                closeMobileSidebar();
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-[#475569] dark:text-[#94a3b8] hover:bg-[#f1f5f9] dark:hover:bg-[#162032] cursor-pointer transition-colors"
            >
              <HelpCircle className="w-4 h-4 text-[#64748b] dark:text-[#94a3b8]" />
              <span>Pintasan Keyboard</span>
            </button>
            <button
              onClick={toggleDarkMode}
              className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold rounded-lg text-[#475569] dark:text-[#94a3b8] hover:bg-[#f1f5f9] dark:hover:bg-[#162032] cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2.5">
                {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-500" />}
                <span>{isDarkMode ? 'Mode Terang' : 'Mode Gelap'}</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#f1f5f9] dark:bg-[#1e293b] text-[#64748b] dark:text-[#94a3b8]">D</span>
            </button>
          </div>
        </div>

        {/* Active User Footer */}
        <div className="p-3 border-t border-[#cbd5e1] dark:border-[#1e2a3f] bg-[#f8fafc] dark:bg-[#0d1424]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                {activeUser?.avatar_url ? (
                  <img
                    src={activeUser.avatar_url}
                    alt={activeUser.name}
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-[#034694]/20"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#034694] text-white flex items-center justify-center font-bold text-xs">
                    {activeUser?.name?.charAt(0) || 'U'}
                  </div>
                )}
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#111726]" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#0f172a] dark:text-white truncate">
                  {activeUser?.name || 'Active User'}
                </div>
                <div className="text-[10px] text-[#034694] dark:text-blue-400 font-bold flex items-center gap-1 truncate">
                  <span className="uppercase">{activeUser?.role || 'user'}</span>
                  <span>•</span>
                  <span className="px-1.5 py-0.2 rounded font-extrabold bg-[#e0edfb] dark:bg-[#1e293b] text-[#034694] dark:text-blue-300 truncate">
                    #{activeUser?.unit_name || 'IT'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer shrink-0"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
