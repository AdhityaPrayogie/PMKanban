'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { BoardsHub } from '@/components/kanban/BoardsHub';
import { TimelineView } from '@/components/timeline/TimelineView';
import { TaskDetailSheet } from '@/components/task/TaskDetailSheet';
import { CreateTaskModal } from '@/components/task/CreateTaskModal';
import { MiniChatWidget } from '@/components/chat/MiniChatWidget';
import { UserManagementModal } from '@/components/admin/UserManagementModal';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { ShortcutsHelpModal } from '@/components/help/ShortcutsHelpModal';
import { CreateUnitModal } from '@/components/unit/CreateUnitModal';
import { MasterUnitModal } from '@/components/unit/MasterUnitModal';
import { useKanbanStore } from '@/store/useKanbanStore';

export default function Home() {
  const router = useRouter();
  const {
    activeView,
    fetchBoardData,
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

  useEffect(() => {
    initTheme();
    const init = async () => {
      const ok = await checkAuth();
      if (!ok) {
        router.push('/login');
        return;
      }
      setAuthChecked(true);
      fetchBoardData();
      fetchUsers();
      fetchNotifications();
    };

    init();

    // Periodic sync for notifications
    const interval = setInterval(() => {
      fetchNotifications();
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  if (!authChecked) {
    return (
      <div
        suppressHydrationWarning
        className="flex h-screen items-center justify-center bg-[#f5f6f8] dark:bg-[#090d16] text-xs text-[#64748b]"
      >
        Memverifikasi sesi pengguna...
      </div>
    );
  }

  return (
    <div
      suppressHydrationWarning
      className="flex h-screen bg-[#f5f6f8] dark:bg-[#090d16] text-[#0f172a] dark:text-[#f8fafc] overflow-hidden"
    >
      {/* Left Sidebar */}
      <Sidebar />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header */}
        <Header />

        {/* Content Area: Hub, Board, or Timeline */}
        <main className="flex-1 flex overflow-hidden relative">
          {activeView === 'hub' ? (
            <BoardsHub />
          ) : activeView === 'timeline' ? (
            <TimelineView />
          ) : (
            <KanbanBoard />
          )}
        </main>
      </div>

      {/* Right Drawer Sheet for Task Detail & Discussion */}
      <TaskDetailSheet />

      {/* Create Task Modal */}
      <CreateTaskModal />

      {/* Admin User Management Modal */}
      <UserManagementModal
        isOpen={isUserManagementOpen}
        onClose={closeUserManagement}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={closeSettings}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleDarkMode}
      />

      {/* Shortcuts & Tutorial Help Modal */}
      <ShortcutsHelpModal
        isOpen={isHelpOpen}
        onClose={closeHelp}
      />

      {/* Multi-Unit Creator Modal */}
      <CreateUnitModal />

      {/* Master Units Manager Modal */}
      <MasterUnitModal />

      {/* Floating Bottom-Right Mini Chat Widget */}
      <MiniChatWidget />
    </div>
  );
}
