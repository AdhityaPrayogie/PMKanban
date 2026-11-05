'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Kanban, ShieldCheck, UserPlus, LogIn, AlertCircle, CheckCircle2, Lock, Mail, User } from 'lucide-react';
import { useKanbanStore } from '@/store/useKanbanStore';

export default function LoginPage() {
  const router = useRouter();
  const { setActiveUser } = useKanbanStore();
  const [tab, setTab] = useState<'login' | 'register'>('login');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Login gagal');
        return;
      }

      if (data.user) {
        setActiveUser(data.user);
        router.push('/');
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg('Terjadi kesalahan jaringan atau server');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Pendaftaran gagal');
        return;
      }

      setSuccessMsg(data.message);
      setName('');
      setEmail('');
      setPassword('');
      setTab('login');
    } catch (err: any) {
      setErrorMsg('Terjadi kesalahan jaringan atau server');
    } finally {
      setLoading(false);
    }
  };

  const fillQuickLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMsg('');
  };

  return (
    <div suppressHydrationWarning className="min-h-screen bg-[#f5f6f8] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl border border-[#e2e8f0] shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#034694] p-6 text-white text-center">
          <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mx-auto mb-3 backdrop-blur-xs ring-1 ring-white/20">
            <Kanban className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">PM Kanban Platform</h1>
          <p className="text-xs text-blue-100 mt-1">
            Enterprise Modular Kanban & Team Collaboration
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[#e2e8f0] bg-[#f8fafc]">
          <button
            onClick={() => {
              setTab('login');
              setErrorMsg('');
            }}
            className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${
              tab === 'login'
                ? 'border-[#034694] text-[#034694] bg-white'
                : 'border-transparent text-[#64748b] hover:text-[#0f172a]'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Masuk</span>
          </button>
          <button
            onClick={() => {
              setTab('register');
              setErrorMsg('');
            }}
            className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${
              tab === 'register'
                ? 'border-[#034694] text-[#034694] bg-white'
                : 'border-transparent text-[#64748b] hover:text-[#0f172a]'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Daftar Akun</span>
          </button>
        </div>

        {/* Alerts */}
        <div className="p-6 pb-0">
          {errorMsg && (
            <div className="p-3 mb-4 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 mb-4 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Form Body */}
        <div className="p-6 pt-2">
          {tab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0f172a] mb-1.5">
                  Alamat Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@perusahaan.com"
                    className="w-full pl-9 pr-3 py-2 border border-[#e2e8f0] rounded-md text-xs text-[#0f172a] focus:outline-none focus:border-[#034694] focus:ring-1 focus:ring-[#034694]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0f172a] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 border border-[#e2e8f0] rounded-md text-xs text-[#0f172a] focus:outline-none focus:border-[#034694] focus:ring-1 focus:ring-[#034694]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#034694] hover:bg-[#023470] disabled:bg-[#94a3b8] text-white font-semibold text-xs rounded-md shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>{loading ? 'Memverifikasi...' : 'Masuk ke Workspace'}</span>
              </button>

              {/* Demo Credentials Helper */}
              <div className="pt-4 border-t border-[#e2e8f0] text-xs">
                <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider block mb-2">
                  Akun Demo (Klik untuk Isi):
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => fillQuickLogin('alex@example.com', 'admin123')}
                    className="p-2 border border-[#e2e8f0] rounded bg-[#f8fafc] hover:bg-[#e9f2fc] text-left transition-colors"
                  >
                    <div className="font-bold text-[#034694] text-[11px] flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Admin (Alex)
                    </div>
                    <div className="text-[10px] text-[#64748b]">admin123</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => fillQuickLogin('sarah@example.com', 'user123')}
                    className="p-2 border border-[#e2e8f0] rounded bg-[#f8fafc] hover:bg-[#e9f2fc] text-left transition-colors"
                  >
                    <div className="font-bold text-[#475569] text-[11px] flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      User (Sarah)
                    </div>
                    <div className="text-[10px] text-[#64748b]">user123</div>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0f172a] mb-1.5">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Pratama Wicaksana"
                    className="w-full pl-9 pr-3 py-2 border border-[#e2e8f0] rounded-md text-xs text-[#0f172a] focus:outline-none focus:border-[#034694] focus:ring-1 focus:ring-[#034694]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0f172a] mb-1.5">
                  Alamat Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@perusahaan.com"
                    className="w-full pl-9 pr-3 py-2 border border-[#e2e8f0] rounded-md text-xs text-[#0f172a] focus:outline-none focus:border-[#034694] focus:ring-1 focus:ring-[#034694]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0f172a] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full pl-9 pr-3 py-2 border border-[#e2e8f0] rounded-md text-xs text-[#0f172a] focus:outline-none focus:border-[#034694] focus:ring-1 focus:ring-[#034694]"
                  />
                </div>
              </div>

              <div className="p-3 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-800 leading-relaxed">
                <span className="font-bold">Perhatian:</span> Akun yang baru didaftarkan akan berstatus <strong>Menunggu Persetujuan (Pending ACC)</strong> dari Administrator sebelum dapat masuk.
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#034694] hover:bg-[#023470] disabled:bg-[#94a3b8] text-white font-semibold text-xs rounded-md shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>{loading ? 'Mendaftarkan...' : 'Daftar Sekarang'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
