'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  UserCheck,
  UserX,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Check,
  Search,
  KeyRound,
  Building2,
  Users as UsersIcon,
} from 'lucide-react';
import { useKanbanStore } from '@/store/useKanbanStore';
import { User, UserRole, UserStatus } from '@/types';
import { cn, formatDate } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserManagementModal({ isOpen, onClose }: UserManagementModalProps) {
  const { activeUser, fetchUsers, masterUnits, fetchMasterUnits } = useKanbanStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'active' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 250);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      fetchMasterUnits();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const handleCopyPassword = (userId: string, pass?: string | null) => {
    const textToCopy = pass || 'password123';
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(userId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleUpdateUser = async (userId: string, status?: UserStatus, role?: UserRole) => {
    try {
      await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status, role }),
      });
      loadUsers();
      fetchUsers();
    } catch (err) {
      console.error('Failed to update user', err);
    }
  };

  const handleUpdateUserUnit = async (userId: string, unitCode: string) => {
    const targetUnit = masterUnits.find((u) => u.code === unitCode);
    try {
      await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          unit_id: targetUnit?.id || null,
          unit_name: unitCode,
        }),
      });
      loadUsers();
      fetchUsers();
      fetchMasterUnits();
    } catch (err) {
      console.error('Failed to update user unit', err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Yakin ingin menghapus pengguna ini secara permanen?')) return;
    try {
      await fetch(`/api/admin/users?userId=${userId}`, { method: 'DELETE' });
      loadUsers();
      fetchUsers();
    } catch (err) {
      console.error('Failed to delete user', err);
    }
  };

  const pendingCount = users.filter((u) => u.status === 'pending').length;
  const activeCount = users.filter((u) => u.status === 'active').length;
  const rejectedCount = users.filter((u) => u.status === 'rejected').length;

  const filteredUsers = users.filter((u) => {
    if (statusFilter !== 'all' && u.status !== statusFilter) return false;
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      const matchName = u.name.toLowerCase().includes(q);
      const matchEmail = u.email.toLowerCase().includes(q);
      const matchUnit = (u.unit_name || '').toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchUnit) return false;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-[#111726] rounded-2xl border border-[#cbd5e1] dark:border-[#1e2a3f] shadow-2xl w-full max-w-5xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-[#cbd5e1] dark:border-[#1e2a3f] flex items-center justify-between bg-[#f8fafc] dark:bg-[#0d1322]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#034694] text-white flex items-center justify-center shadow-sm">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#0f172a] dark:text-white flex items-center gap-2">
                <span>Kelola Pengguna & Hak Akses Akun</span>
                {pendingCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white animate-pulse shadow-2xs">
                    {pendingCount} Menunggu ACC
                  </span>
                )}
              </h3>
              <p className="text-xs text-[#64748b] dark:text-[#94a3b8]">
                Approval registrasi pendaftaran, wewenang role, unit kerja, dan verifikasi password pengguna.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadUsers}
              className="p-2 text-[#64748b] hover:text-[#0f172a] dark:hover:text-white rounded-lg hover:bg-[#e2e8f0] dark:hover:bg-[#1e293b] transition-colors"
              title="Refresh Data Pengguna"
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[#64748b] hover:text-[#0f172a] dark:hover:text-white rounded-lg hover:bg-[#e2e8f0] dark:hover:bg-[#1e293b] transition-colors"
              title="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-3.5 bg-[#f1f5f9]/60 dark:bg-[#0a0f1a] border-b border-[#cbd5e1] dark:border-[#1e2a3f] text-xs">
          <div className="bg-white dark:bg-[#141d2e] p-2.5 rounded-xl border border-[#cbd5e1] dark:border-[#223147] flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-[#034694] dark:text-blue-300 font-bold shrink-0">
              <UsersIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-[#64748b] dark:text-[#94a3b8]">Total Pengguna</div>
              <div className="text-sm font-black text-[#0f172a] dark:text-white">{users.length} Akun</div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#141d2e] p-2.5 rounded-xl border border-[#cbd5e1] dark:border-[#223147] flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-[#64748b] dark:text-[#94a3b8]">Menunggu ACC</div>
              <div className="text-sm font-black text-amber-600 dark:text-amber-400">{pendingCount} Akun</div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#141d2e] p-2.5 rounded-xl border border-[#cbd5e1] dark:border-[#223147] flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-[#64748b] dark:text-[#94a3b8]">Akun Aktif</div>
              <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">{activeCount} Akun</div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#141d2e] p-2.5 rounded-xl border border-[#cbd5e1] dark:border-[#223147] flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950 flex items-center justify-center text-rose-600 dark:text-rose-400 font-bold shrink-0">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-[#64748b] dark:text-[#94a3b8]">Ditolak</div>
              <div className="text-sm font-black text-rose-600 dark:text-rose-400">{rejectedCount} Akun</div>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="px-6 py-3 border-b border-[#cbd5e1] dark:border-[#1e2a3f] bg-white dark:bg-[#111726] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[#64748b] dark:text-[#94a3b8] font-bold mr-1">Status:</span>
            {(['all', 'pending', 'active', 'rejected'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0',
                  statusFilter === st
                    ? 'bg-[#034694] text-white shadow-2xs'
                    : 'bg-[#f1f5f9] dark:bg-[#162032] text-[#475569] dark:text-[#cbd5e1] hover:bg-[#e2e8f0] dark:hover:bg-[#1f2d45] border border-[#cbd5e1] dark:border-[#2b3b55]'
                )}
              >
                {st === 'all'
                  ? `Semua (${users.length})`
                  : st === 'pending'
                  ? `Pending (${pendingCount})`
                  : st === 'active'
                  ? `Aktif (${activeCount})`
                  : `Ditolak (${rejectedCount})`}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, email, unit..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#f8fafc] dark:bg-[#162032] border border-[#cbd5e1] dark:border-[#2b3b55] rounded-lg text-xs text-[#0f172a] dark:text-white placeholder-[#94a3b8] focus:outline-none focus:border-[#034694]"
            />
          </div>
        </div>

        {/* User Content: Responsive Mobile Cards (< md) & Desktop Table (>= md) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Mobile Card List (< md) */}
          <div className="block md:hidden space-y-3">
            {filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#94a3b8] bg-[#f8fafc] dark:bg-[#162032] rounded-xl border border-dashed border-[#cbd5e1] dark:border-[#223147]">
                Tidak ada pengguna dalam filter ini.
              </div>
            ) : (
              filteredUsers.map((u) => {
                const isSelf = u.id === activeUser?.id;
                const isPassVisible = Boolean(visiblePasswords[u.id]);
                const plainPassword = u.password_plain || 'password123';
                const isCopied = copiedId === u.id;

                return (
                  <div
                    key={u.id}
                    className="p-4 rounded-xl bg-white dark:bg-[#141d2e] border border-[#cbd5e1] dark:border-[#223147] shadow-xs space-y-3"
                  >
                    {/* Top Row: User Avatar, Name, Email, & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        {u.avatar_url ? (
                          <img
                            src={u.avatar_url}
                            alt={u.name}
                            className="w-10 h-10 rounded-full object-cover ring-1 ring-[#cbd5e1] shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[#034694] text-white flex items-center justify-center font-bold text-sm shrink-0">
                            {u.name.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-[#0f172a] dark:text-white flex items-center gap-1.5 truncate">
                            <span className="truncate">{u.name}</span>
                            {isSelf && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded font-extrabold bg-[#e0edfb] text-[#034694] border border-blue-200 shrink-0">
                                Anda
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[#64748b] dark:text-[#94a3b8] truncate">
                            {u.email}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {u.status === 'pending' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse">
                            <Clock className="w-3 h-3" />
                            <span>Pending</span>
                          </span>
                        ) : u.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Aktif</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                            <AlertCircle className="w-3 h-3" />
                            <span>Ditolak</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Password Row */}
                    <div className="p-2.5 rounded-lg bg-[#f8fafc] dark:bg-[#101726] border border-[#cbd5e1] dark:border-[#223147] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <KeyRound className="w-3.5 h-3.5 text-[#034694] dark:text-blue-400 shrink-0" />
                        <span className="text-[11px] text-[#64748b] dark:text-[#94a3b8] shrink-0 font-medium">
                          Password:
                        </span>
                        <span
                          className={cn(
                            'font-mono text-xs px-2 py-0.5 rounded border select-all truncate',
                            isPassVisible
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800 font-bold'
                              : 'bg-white dark:bg-[#182337] text-[#64748b] dark:text-[#94a3b8] border-[#cbd5e1] dark:border-[#283850]'
                          )}
                        >
                          {isPassVisible ? plainPassword : '••••••••'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(u.id)}
                          className="p-1.5 text-[#64748b] hover:text-[#034694] dark:hover:text-blue-400 rounded-md hover:bg-[#e2e8f0] dark:hover:bg-[#1e2a3f] cursor-pointer"
                          title={isPassVisible ? 'Sembunyikan' : 'Lihat password'}
                        >
                          {isPassVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyPassword(u.id, u.password_plain)}
                          className="p-1.5 text-[#64748b] hover:text-[#034694] dark:hover:text-blue-400 rounded-md hover:bg-[#e2e8f0] dark:hover:bg-[#1e2a3f] cursor-pointer"
                          title="Salin password"
                        >
                          {isCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Role & Unit Selectors */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold text-[#64748b] dark:text-[#94a3b8] mb-1">
                          Role Akses
                        </label>
                        <select
                          disabled={isSelf}
                          value={u.role || 'user'}
                          onChange={(e) =>
                            handleUpdateUser(u.id, undefined, e.target.value as UserRole)
                          }
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-[#162032] border border-[#cbd5e1] dark:border-[#2b3b55] rounded-lg text-xs font-semibold text-[#0f172a] dark:text-white focus:outline-none focus:border-[#034694] cursor-pointer disabled:opacity-60"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-[#64748b] dark:text-[#94a3b8] mb-1">
                          Unit Kerja
                        </label>
                        <select
                          value={u.unit_name || 'IT'}
                          onChange={(e) => handleUpdateUserUnit(u.id, e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-[#e0edfb]/80 dark:bg-[#16253d] border border-blue-200 dark:border-blue-900/60 rounded-lg text-xs font-extrabold text-[#034694] dark:text-blue-300 focus:outline-none cursor-pointer"
                        >
                          {masterUnits.map((mu) => (
                            <option key={mu.id} value={mu.code}>
                              #{mu.code}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Action Buttons for Mobile */}
                    <div className="flex items-center justify-between pt-2 border-t border-[#e2e8f0] dark:border-[#223147] text-xs">
                      <span className="text-[10px] text-[#64748b] dark:text-[#94a3b8]">
                        Daftar: {formatDate(u.created_at)}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {u.status !== 'active' && (
                          <button
                            onClick={() => handleUpdateUser(u.id, 'active')}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>ACC</span>
                          </button>
                        )}

                        {u.status !== 'rejected' && !isSelf && (
                          <button
                            onClick={() => handleUpdateUser(u.id, 'rejected')}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            <span>Tolak</span>
                          </button>
                        )}

                        {!isSelf && (
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Pengguna"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table View (>= md) */}
          <div className="hidden md:block border border-[#cbd5e1] dark:border-[#1e2a3f] rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[850px]">
                <thead className="bg-[#f8fafc] dark:bg-[#0d1322] text-[#475569] dark:text-[#94a3b8] font-bold border-b border-[#cbd5e1] dark:border-[#1e2a3f]">
                  <tr>
                    <th className="p-3.5">Pengguna</th>
                    <th className="p-3.5">Password</th>
                    <th className="p-3.5">Role</th>
                    <th className="p-3.5">Unit / Divisi</th>
                    <th className="p-3.5">Status Akun</th>
                    <th className="p-3.5">Terdaftar</th>
                    <th className="p-3.5 text-right">Aksi Kelola</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0] dark:divide-[#1e2a3f]">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-[#94a3b8]">
                        Tidak ada pengguna dalam filter ini.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isSelf = u.id === activeUser?.id;
                      const isPassVisible = Boolean(visiblePasswords[u.id]);
                      const plainPassword = u.password_plain || 'password123';
                      const isCopied = copiedId === u.id;

                      return (
                        <tr
                          key={u.id}
                          className="hover:bg-[#f8fafc] dark:hover:bg-[#162032]/60 transition-colors bg-white dark:bg-[#111726]"
                        >
                          {/* User Avatar & Name */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-3">
                              {u.avatar_url ? (
                                <img
                                  src={u.avatar_url}
                                  alt={u.name}
                                  className="w-8 h-8 rounded-full object-cover ring-1 ring-[#cbd5e1]"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-[#034694] text-white flex items-center justify-center font-bold text-xs">
                                  {u.name.charAt(0)}
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-[#0f172a] dark:text-white flex items-center gap-1.5">
                                  <span>{u.name}</span>
                                  {isSelf && (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded font-extrabold bg-[#e0edfb] text-[#034694] border border-blue-200">
                                      Anda
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-[#64748b] dark:text-[#94a3b8]">
                                  {u.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Password Column with Show/Hide & Copy */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={cn(
                                  'font-mono text-xs px-2 py-1 rounded-md border select-all transition-all',
                                  isPassVisible
                                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800 font-bold'
                                    : 'bg-[#f1f5f9] dark:bg-[#182337] text-[#64748b] dark:text-[#94a3b8] border-[#cbd5e1] dark:border-[#283850]'
                                )}
                              >
                                {isPassVisible ? plainPassword : '••••••••'}
                              </span>

                              {/* Toggle visibility */}
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(u.id)}
                                className="p-1 text-[#64748b] hover:text-[#034694] dark:hover:text-blue-400 rounded hover:bg-[#e2e8f0] dark:hover:bg-[#1e2a3f] transition-colors cursor-pointer"
                                title={isPassVisible ? 'Sembunyikan password' : 'Lihat password'}
                              >
                                {isPassVisible ? (
                                  <EyeOff className="w-3.5 h-3.5" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                              </button>

                              {/* Copy button */}
                              <button
                                type="button"
                                onClick={() => handleCopyPassword(u.id, u.password_plain)}
                                className="p-1 text-[#64748b] hover:text-[#034694] dark:hover:text-blue-400 rounded hover:bg-[#e2e8f0] dark:hover:bg-[#1e2a3f] transition-colors cursor-pointer"
                                title="Salin password"
                              >
                                {isCopied ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Role selector */}
                          <td className="p-3.5">
                            <select
                              disabled={isSelf}
                              value={u.role || 'user'}
                              onChange={(e) =>
                                handleUpdateUser(u.id, undefined, e.target.value as UserRole)
                              }
                              className="px-2.5 py-1 bg-white dark:bg-[#162032] border border-[#cbd5e1] dark:border-[#2b3b55] rounded-lg text-xs font-semibold text-[#0f172a] dark:text-white focus:outline-none focus:border-[#034694] cursor-pointer disabled:opacity-60"
                            >
                              <option value="user">User</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>

                          {/* Unit selector */}
                          <td className="p-3.5">
                            <select
                              value={u.unit_name || 'IT'}
                              onChange={(e) => handleUpdateUserUnit(u.id, e.target.value)}
                              className="px-2.5 py-1 bg-[#e0edfb]/80 dark:bg-[#16253d] border border-blue-200 dark:border-blue-900/60 rounded-lg text-xs font-extrabold text-[#034694] dark:text-blue-300 focus:outline-none cursor-pointer"
                            >
                              {masterUnits.map((mu) => (
                                <option key={mu.id} value={mu.code}>
                                  #{mu.code} ({mu.name})
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Status Badge */}
                          <td className="p-3.5">
                            {u.status === 'pending' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse">
                                <Clock className="w-3 h-3" />
                                <span>Menunggu ACC</span>
                              </span>
                            ) : u.status === 'active' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Aktif</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                                <AlertCircle className="w-3 h-3" />
                                <span>Ditolak</span>
                              </span>
                            )}
                          </td>

                          {/* Date */}
                          <td className="p-3.5 text-[11px] text-[#64748b] dark:text-[#94a3b8]">
                            {formatDate(u.created_at)}
                          </td>

                          {/* Actions */}
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {u.status !== 'active' && (
                                <button
                                  onClick={() => handleUpdateUser(u.id, 'active')}
                                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                                  title="ACC / Setujui Pengguna"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span>ACC</span>
                                </button>
                              )}

                              {u.status !== 'rejected' && !isSelf && (
                                <button
                                  onClick={() => handleUpdateUser(u.id, 'rejected')}
                                  className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                                  title="Tolak Pengguna"
                                >
                                  <UserX className="w-3.5 h-3.5" />
                                  <span>Tolak</span>
                                </button>
                              )}

                              {!isSelf && (
                                <button
                                  onClick={() => handleDeleteUser(u.id)}
                                  className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                                  title="Hapus Akun Pengguna"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
