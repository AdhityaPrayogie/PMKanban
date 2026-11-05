'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { UserManagementModal } from '@/components/admin/UserManagementModal';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { ShortcutsHelpModal } from '@/components/help/ShortcutsHelpModal';
import { CreateUnitModal } from '@/components/unit/CreateUnitModal';
import { MasterUnitModal } from '@/components/unit/MasterUnitModal';
import { useKanbanStore } from '@/store/useKanbanStore';

// Page chrome (sidebar, header, global modals) for non-board pages, same as /messages
export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const {
    checkAuth, fetchUsers, fetchNotifications, initTheme,
    isUserManagementOpen, closeUserManagement, isSettingsOpen, closeSettings,
    isHelpOpen, closeHelp, isDarkMode, toggleDarkMode,
  } = useKanbanStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initTheme();
    (async () => {
      if (!(await checkAuth())) return router.push('/login');
      setReady(true);
      fetchUsers();
      fetchNotifications();
    })();
  }, []);

  if (!ready) {
    return (
      <div suppressHydrationWarning className="flex h-screen items-center justify-center bg-[#f1f5f9] dark:bg-[#090e17] text-sm text-[#64748b]">
        Memverifikasi sesi pengguna...
      </div>
    );
  }

  return (
    <div suppressHydrationWarning className="flex h-screen bg-[#f1f5f9] dark:bg-[#090e17] text-[#0f172a] dark:text-[#f8fafc] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-3 sm:p-6">{children}</main>
      </div>
      <UserManagementModal isOpen={isUserManagementOpen} onClose={closeUserManagement} />
      <SettingsModal isOpen={isSettingsOpen} onClose={closeSettings} isDarkMode={isDarkMode} onToggleTheme={toggleDarkMode} />
      <ShortcutsHelpModal isOpen={isHelpOpen} onClose={closeHelp} />
      <CreateUnitModal />
      <MasterUnitModal />
    </div>
  );
}
