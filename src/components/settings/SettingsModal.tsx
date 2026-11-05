'use client';

import React, { useState } from 'react';
import {
  X,
  Settings,
  User,
  Lock,
  Moon,
  Sun,
  CheckCircle2,
  AlertCircle,
  Database,
} from 'lucide-react';
import { useKanbanStore } from '@/store/useKanbanStore';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  isDarkMode,
  onToggleTheme,
}: SettingsModalProps) {
  const { activeUser, setActiveUser } = useKanbanStore();

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'appearance'>('profile');
  const [name, setName] = useState(activeUser?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(activeUser?.avatar_url || '');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, avatar_url: avatarUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Gagal memperbarui profil' });
        return;
      }

      if (data.user) {
        setActiveUser(data.user);
        setMessage({ type: 'success', text: 'Profil berhasil diperbarui!' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Terjadi kesalahan sistem' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Konfirmasi password baru tidak cocok' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Gagal mengubah password' });
        return;
      }

      setMessage({ type: 'success', text: 'Password berhasil diubah!' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setMessage({ type: 'error', text: 'Terjadi kesalahan sistem' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-[#111726] rounded-xl border border-[#e2e8f0] dark:border-[#1e293b] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#e2e8f0] dark:border-[#1e293b] flex items-center justify-between bg-[#f8fafc] dark:bg-[#0d1322]">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-[#034694] dark:text-blue-400" />
            <h3 className="text-sm font-bold text-[#0f172a] dark:text-white">Pengaturan Sistem & Profil</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#64748b] hover:text-[#0f172a] dark:hover:text-white rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#e2e8f0] dark:border-[#1e293b] bg-white dark:bg-[#111726] px-6 text-xs font-semibold">
          <button
            onClick={() => {
              setActiveTab('profile');
              setMessage(null);
            }}
            className={`py-3 mr-4 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'profile'
                ? 'border-[#034694] text-[#034694] dark:text-blue-400'
                : 'border-transparent text-[#64748b] dark:text-[#94a3b8]'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Profil</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('security');
              setMessage(null);
            }}
            className={`py-3 mr-4 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'security'
                ? 'border-[#034694] text-[#034694] dark:text-blue-400'
                : 'border-transparent text-[#64748b] dark:text-[#94a3b8]'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Keamanan</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('appearance');
              setMessage(null);
            }}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'appearance'
                ? 'border-[#034694] text-[#034694] dark:text-blue-400'
                : 'border-transparent text-[#64748b] dark:text-[#94a3b8]'
            }`}
          >
            {isDarkMode ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            <span>Tema & Tampilan</span>
          </button>
        </div>

        {/* Feedback message */}
        {message && (
          <div className="px-6 pt-4 pb-0">
            <div
              className={`p-3 rounded-md text-xs flex items-center gap-2 ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{message.text}</span>
            </div>
          </div>
        )}

        {/* Tab Contents */}
        <div className="p-6">
          {activeTab === 'profile' && (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0f172a] dark:text-white mb-1">
                  Nama Tampilan
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#e2e8f0] dark:border-[#334155] rounded-md text-xs bg-white dark:bg-[#1e293b] text-[#0f172a] dark:text-white focus:outline-none focus:border-[#034694]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0f172a] dark:text-white mb-1">
                  Avatar URL
                </label>
                <input
                  type="text"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-[#e2e8f0] dark:border-[#334155] rounded-md text-xs bg-white dark:bg-[#1e293b] text-[#0f172a] dark:text-white focus:outline-none focus:border-[#034694]"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <img
                  src={avatarUrl || activeUser?.avatar_url || ''}
                  alt="Preview"
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-[#034694]/20"
                />
                <span className="text-xs text-[#64748b] dark:text-[#94a3b8]">
                  Pratinjau Avatar pengguna saat ini
                </span>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-[#034694] hover:bg-[#023470] text-white text-xs font-semibold rounded-md shadow-xs transition-colors"
                >
                  {loading ? 'Menyimpan...' : 'Simpan Profil'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'security' && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0f172a] dark:text-white mb-1">
                  Password Lama
                </label>
                <input
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-[#e2e8f0] dark:border-[#334155] rounded-md text-xs bg-white dark:bg-[#1e293b] text-[#0f172a] dark:text-white focus:outline-none focus:border-[#034694]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0f172a] dark:text-white mb-1">
                  Password Baru
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-[#e2e8f0] dark:border-[#334155] rounded-md text-xs bg-white dark:bg-[#1e293b] text-[#0f172a] dark:text-white focus:outline-none focus:border-[#034694]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0f172a] dark:text-white mb-1">
                  Konfirmasi Password Baru
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-[#e2e8f0] dark:border-[#334155] rounded-md text-xs bg-white dark:bg-[#1e293b] text-[#0f172a] dark:text-white focus:outline-none focus:border-[#034694]"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-[#034694] hover:bg-[#023470] text-white text-xs font-semibold rounded-md shadow-xs transition-colors"
                >
                  {loading ? 'Mengubah...' : 'Ubah Password'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-[#e2e8f0] dark:border-[#1e293b] bg-[#f8fafc] dark:bg-[#0d1322] flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#0f172a] dark:text-white">
                    Mode Gelap / Dark Mode
                  </h4>
                  <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8] mt-0.5">
                    Aktifkan tema gelap bersih untuk kenyamanan mata di ruangan redup
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onToggleTheme}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold bg-white dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] text-[#0f172a] dark:text-white flex items-center gap-1.5 shadow-2xs hover:bg-[#f1f5f9] transition-colors"
                >
                  {isDarkMode ? <Moon className="w-3.5 h-3.5 text-blue-400" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
                  <span>{isDarkMode ? 'Mode Gelap' : 'Mode Terang'}</span>
                </button>
              </div>

              <div className="p-4 rounded-lg border border-[#e2e8f0] dark:border-[#1e293b] bg-[#f8fafc] dark:bg-[#0d1322] text-xs">
                <div className="flex items-center gap-2 font-bold text-[#0f172a] dark:text-white mb-1">
                  <Database className="w-3.5 h-3.5 text-[#034694] dark:text-blue-400" />
                  <span>Koneksi Database</span>
                </div>
                <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8]">
                  MySQL 8.0 terhubung ke basis data <strong>kanbandb</strong> di port 3306.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
