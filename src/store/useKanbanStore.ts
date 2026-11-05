import { create } from 'zustand';
import { BoardColumn, BoardStage, Label, MasterUnit, NotificationItem, Priority, Project, Task, User } from '@/types';

interface KanbanState {
  activeUser: User;
  allUsers: User[];
  currentProject: Project | null;
  projects: Project[];
  masterUnits: MasterUnit[];
  columns: BoardColumn[];
  allTasks: Task[];
  masterLabels: Label[];
  searchQuery: string;
  priorityFilter: Priority | 'All';
  assigneeFilter: string | 'All';
  activeView: 'hub' | 'board' | 'timeline';
  
  // Sheet Task Details
  selectedTaskId: string | null;
  isTaskSheetOpen: boolean;

  // Create Task Modal
  isCreateModalOpen: boolean;
  createModalColumnId: string | null;
  createModalParentId: string | null;

  // Mini Floating Chat
  isMiniChatOpen: boolean;
  miniChatUser: User | null;

  // Modals & Responsive
  isUserManagementOpen: boolean;
  isSettingsOpen: boolean;
  isHelpOpen: boolean;
  isDarkMode: boolean;
  isMobileSidebarOpen: boolean;
  isCreateUnitModalOpen: boolean;
  isMasterUnitModalOpen: boolean;
  createUnitModalDefaultStage: BoardStage;
  createUnitModalDefaultTag: string;

  // Notifications
  notifications: NotificationItem[];
  unreadNotifsCount: number;

  // Actions
  setActiveUser: (user: User) => void;
  setSearchQuery: (query: string) => void;
  setPriorityFilter: (filter: Priority | 'All') => void;
  setAssigneeFilter: (filter: string | 'All') => void;
  setActiveView: (view: 'hub' | 'board' | 'timeline') => void;
  openTaskSheet: (taskId: string) => void;
  closeTaskSheet: () => void;
  openCreateModal: (columnId?: string, parentId?: string) => void;
  closeCreateModal: () => void;
  openMiniChatWith: (user: User) => void;
  closeMiniChat: () => void;
  
  openUserManagement: () => void;
  closeUserManagement: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  openHelp: () => void;
  closeHelp: () => void;
  openCreateUnitModal: (defaultStage?: BoardStage, defaultTag?: string) => void;
  closeCreateUnitModal: () => void;
  openMasterUnitModal: () => void;
  closeMasterUnitModal: () => void;
  toggleDarkMode: () => void;
  initTheme: () => void;
  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  
  // Data actions
  fetchBoardData: (projectId?: string) => Promise<void>;
  fetchMasterUnits: () => Promise<void>;
  createMasterUnit: (name: string, code: string, description: string) => Promise<boolean>;
  updateMasterUnit: (id: string, name: string, code: string, description?: string) => Promise<{ success: boolean; error?: string }>;
  assignUserUnit: (userId: string, unitId: string, unitName: string) => Promise<boolean>;
  selectProject: (projectId: string) => Promise<void>;
  createUnit: (name: string, description: string) => Promise<boolean>;
  createBoard: (name: string, description: string, unit_tag?: string, stage?: BoardStage) => Promise<boolean>;
  moveBoardStage: (boardId: string, targetStage: BoardStage, newPosition?: number) => Promise<void>;
  deleteUnit: (unitId: string) => Promise<boolean>;
  fetchUsers: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  markNotificationsAsRead: () => Promise<void>;
  markSingleNotificationAsRead: (id: string) => Promise<void>;
  unreadMessagesCount: number;
  fetchUnreadMessagesCount: () => Promise<void>;
  moveTask: (taskId: string, targetColId: string, newPosition: number) => Promise<void>;
}

export const useKanbanStore = create<KanbanState>((set, get) => ({
  activeUser: {
    id: 'u1',
    name: 'Alex Rivera',
    email: 'alex@example.com',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  },
  allUsers: [],
  currentProject: null,
  projects: [],
  masterUnits: [],
  columns: [],
  allTasks: [],
  masterLabels: [],
  searchQuery: '',
  priorityFilter: 'All',
  assigneeFilter: 'All',
  activeView: 'hub',

  selectedTaskId: null,
  isTaskSheetOpen: false,

  isCreateModalOpen: false,
  createModalColumnId: null,
  createModalParentId: null,

  isMiniChatOpen: false,
  miniChatUser: null,

  isUserManagementOpen: false,
  isSettingsOpen: false,
  isHelpOpen: false,
  isDarkMode: false,
  isMobileSidebarOpen: false,
  isCreateUnitModalOpen: false,
  isMasterUnitModalOpen: false,
  createUnitModalDefaultStage: 'Active',
  createUnitModalDefaultTag: 'IT',

  notifications: [],
  unreadNotifsCount: 0,
  unreadMessagesCount: 0,

  openUserManagement: () => set({ isUserManagementOpen: true }),
  closeUserManagement: () => set({ isUserManagementOpen: false }),
  openSettings: () => set({ isSettingsOpen: true }),
  closeSettings: () => set({ isSettingsOpen: false }),
  openHelp: () => set({ isHelpOpen: true }),
  closeHelp: () => set({ isHelpOpen: false }),
  openCreateUnitModal: (defaultStage?: BoardStage, defaultTag?: string) =>
    set({
      isCreateUnitModalOpen: true,
      createUnitModalDefaultStage: defaultStage || 'Active',
      createUnitModalDefaultTag: defaultTag || 'IT',
    }),
  closeCreateUnitModal: () => set({ isCreateUnitModalOpen: false }),
  openMasterUnitModal: () => set({ isMasterUnitModalOpen: true }),
  closeMasterUnitModal: () => set({ isMasterUnitModalOpen: false }),
  toggleMobileSidebar: () => set((s) => ({ isMobileSidebarOpen: !s.isMobileSidebarOpen })),
  closeMobileSidebar: () => set({ isMobileSidebarOpen: false }),

  initTheme: () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      const isDark = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches) || document.documentElement.classList.contains('dark');
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      set({ isDarkMode: isDark });
    }
  },

  toggleDarkMode: () => {
    const nextDark = !get().isDarkMode;
    if (typeof document !== 'undefined') {
      if (nextDark) {
        document.documentElement.classList.add('dark');
        try { localStorage.setItem('theme', 'dark'); } catch (_) {}
      } else {
        document.documentElement.classList.remove('dark');
        try { localStorage.setItem('theme', 'light'); } catch (_) {}
      }
    }
    set({ isDarkMode: nextDark });
  },

  logout: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    } catch (err) {
      console.error('Logout error', err);
    }
  },

  checkAuth: async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          set({ activeUser: data.user });
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  },

  setActiveUser: (user) => {
    set({ activeUser: user });
    get().fetchNotifications();
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setPriorityFilter: (filter) => set({ priorityFilter: filter }),
  setAssigneeFilter: (filter) => set({ assigneeFilter: filter }),
  setActiveView: (view) => set({ activeView: view }),

  openTaskSheet: (taskId) => set({ selectedTaskId: taskId, isTaskSheetOpen: true }),
  closeTaskSheet: () => set({ selectedTaskId: null, isTaskSheetOpen: false }),

  openCreateModal: (columnId, parentId) =>
    set({
      isCreateModalOpen: true,
      createModalColumnId: columnId || null,
      createModalParentId: parentId || null,
    }),
  closeCreateModal: () =>
    set({
      isCreateModalOpen: false,
      createModalColumnId: null,
      createModalParentId: null,
    }),

  openMiniChatWith: (user) => set({ isMiniChatOpen: true, miniChatUser: user }),
  closeMiniChat: () => set({ isMiniChatOpen: false, miniChatUser: null }),

  fetchUsers: async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.users) {
        set({ allUsers: data.users });
      }
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  },

  fetchNotifications: async () => {
    try {
      const { activeUser } = get();
      if (!activeUser) return;
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (data.notifications) {
        set({
          notifications: data.notifications,
          unreadNotifsCount: data.unreadCount || 0,
        });
      }
      get().fetchUnreadMessagesCount();
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  },

  fetchUnreadMessagesCount: async () => {
    try {
      const { activeUser } = get();
      if (!activeUser) return;
      const res = await fetch(`/api/messages`);
      const data = await res.json();
      if (typeof data.totalUnreadMessages === 'number') {
        set({ unreadMessagesCount: data.totalUnreadMessages });
      }
    } catch (err) {
      console.error('Failed to fetch unread messages count', err);
    }
  },

  markNotificationsAsRead: async () => {
    try {
      const { activeUser } = get();
      if (!activeUser) return;
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
        unreadNotifsCount: 0,
      }));
    } catch (err) {
      console.error('Failed to mark notifications read', err);
    }
  },

  markSingleNotificationAsRead: async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      set((state) => {
        const updated = state.notifications.map((n) =>
          n.id === id ? { ...n, is_read: true } : n
        );
        const unreadCount = updated.filter((n) => !n.is_read).length;
        return { notifications: updated, unreadNotifsCount: unreadCount };
      });
    } catch (err) {
      console.error('Failed to mark single notification read', err);
    }
  },

  fetchBoardData: async (projectId?: string) => {
    try {
      const targetId = projectId || get().currentProject?.id;
      const url = targetId ? `/api/board?projectId=${targetId}` : '/api/board';
      const res = await fetch(url);
      const data = await res.json();
      if (data.columns) {
        set({
          currentProject: data.project,
          projects: data.projects,
          columns: data.columns,
          allTasks: data.allTasks,
          masterLabels: data.masterLabels,
        });
      }
      get().fetchMasterUnits();
    } catch (err) {
      console.error('Failed to load board data', err);
    }
  },

  fetchMasterUnits: async () => {
    try {
      const res = await fetch('/api/master-units');
      const data = await res.json();
      if (data.units) {
        set({ masterUnits: data.units });
      }
    } catch (err) {
      console.error('Failed to fetch master units:', err);
    }
  },

  createMasterUnit: async (name: string, code: string, description: string) => {
    try {
      const res = await fetch('/api/master-units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, code, description }),
      });
      const data = await res.json();
      if (res.ok && data.unit) {
        await get().fetchMasterUnits();
        get().fetchNotifications();
        return true;
      }
      alert(data.error || 'Gagal menambahkan unit');
      return false;
    } catch (err) {
      console.error('Error creating master unit:', err);
      return false;
    }
  },

  updateMasterUnit: async (id: string, name: string, code: string, description?: string) => {
    try {
      const res = await fetch('/api/master-units', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name, code, description }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await get().fetchMasterUnits();
        await get().fetchUsers();
        await get().fetchBoardData();
        return { success: true };
      }
      return { success: false, error: data.error || 'Gagal memperbarui unit' };
    } catch (err: any) {
      console.error('Error updating master unit:', err);
      return { success: false, error: err.message || 'Terjadi kesalahan sistem' };
    }
  },

  assignUserUnit: async (userId: string, unitId: string, unitName: string) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, unit_id: unitId, unit_name: unitName }),
      });
      if (res.ok) {
        await get().fetchUsers();
        await get().fetchMasterUnits();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error assigning user unit:', err);
      return false;
    }
  },

  selectProject: async (projectId: string) => {
    await get().fetchBoardData(projectId);
  },

  createUnit: async (name: string, description: string) => {
    try {
      const res = await fetch('/api/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });
      const data = await res.json();
      if (res.ok && data.unit) {
        await get().fetchBoardData(data.unit.id);
        get().fetchNotifications();
        return true;
      }
      alert(data.error || 'Gagal membuat unit');
      return false;
    } catch (err) {
      console.error('Error creating unit:', err);
      return false;
    }
  },

  createBoard: async (name: string, description: string, unit_tag: string = 'IT', stage: BoardStage = 'Active') => {
    try {
      const res = await fetch('/api/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, unit_tag, stage }),
      });
      const data = await res.json();
      if (res.ok && data.unit) {
        await get().fetchBoardData();
        get().fetchNotifications();
        return true;
      }
      alert(data.error || 'Gagal membuat board');
      return false;
    } catch (err) {
      console.error('Error creating board:', err);
      return false;
    }
  },

  moveBoardStage: async (boardId: string, targetStage: BoardStage, newPosition?: number) => {
    const { projects } = get();
    const updatedProjects = projects.map((p) =>
      p.id === boardId
        ? { ...p, stage: targetStage, position: newPosition ?? (p.position || 1000) }
        : p
    );
    set({ projects: updatedProjects });

    try {
      await fetch('/api/units', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: boardId, stage: targetStage, position: newPosition }),
      });
      await get().fetchBoardData();
    } catch (err) {
      console.error('Failed to move board stage:', err);
      await get().fetchBoardData();
    }
  },

  deleteUnit: async (unitId: string) => {
    try {
      const res = await fetch(`/api/units?id=${unitId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        await get().fetchBoardData();
        return true;
      }
      alert(data.error || 'Gagal menghapus unit');
      return false;
    } catch (err) {
      console.error('Error deleting unit:', err);
      return false;
    }
  },

  moveTask: async (taskId, targetColId, newPosition) => {
    // Optimistic update
    const { columns, allTasks } = get();
    const taskToMove = allTasks.find((t) => t.id === taskId);
    if (!taskToMove) return;

    const prevColId = taskToMove.column_id;
    if (prevColId === targetColId && taskToMove.position === newPosition) return;

    const updatedTask = { ...taskToMove, column_id: targetColId, position: newPosition };

    const newColumns = columns.map((col) => {
      if (col.id === prevColId && prevColId !== targetColId) {
        return {
          ...col,
          tasks: (col.tasks || []).filter((t) => t.id !== taskId),
        };
      }
      if (col.id === targetColId) {
        const remaining = (col.tasks || []).filter((t) => t.id !== taskId);
        const nextList = [...remaining, updatedTask].sort((a, b) => a.position - b.position);
        return {
          ...col,
          tasks: nextList,
        };
      }
      return col;
    });

    const newAllTasks = allTasks.map((t) => (t.id === taskId ? updatedTask : t));

    set({ columns: newColumns, allTasks: newAllTasks });

    try {
      await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: taskId,
          column_id: targetColId,
          position: newPosition,
        }),
      });
    } catch (err) {
      console.error('Failed to persist task move', err);
      // Revert on error
      get().fetchBoardData();
    }
  },
}));
