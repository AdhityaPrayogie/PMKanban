'use client';

import React from 'react';
import {
  X,
  Keyboard,
  HelpCircle,
  Kanban,
  Clock,
  MessageSquare,
  Search,
  Plus,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react';

interface ShortcutsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutsHelpModal({ isOpen, onClose }: ShortcutsHelpModalProps) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Ctrl + K  atau  /', desc: 'Fokus pada pencarian cepat (Debounce Search)', icon: <Search className="w-3.5 h-3.5" /> },
    { key: 'N', desc: 'Buka modal untuk membuat Tugas Baru', icon: <Plus className="w-3.5 h-3.5" /> },
    { key: 'B', desc: 'Beralih ke Tampilan Papan Kanban', icon: <Kanban className="w-3.5 h-3.5" /> },
    { key: 'T', desc: 'Beralih ke Tampilan Timeline & Sub-tasks (Gantt)', icon: <Clock className="w-3.5 h-3.5" /> },
    { key: 'M', desc: 'Buka Obrolan Tim (Private Chat)', icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { key: 'D', desc: 'Ganti Mode Tampilan (Light / Dark Mode)', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { key: '?', desc: 'Buka Bantuan & Panduan Shortcut ini', icon: <HelpCircle className="w-3.5 h-3.5" /> },
    { key: 'Esc', desc: 'Tutup panel atau modal yang sedang aktif', icon: <X className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-[#111726] rounded-xl border border-[#e2e8f0] dark:border-[#1e293b] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#e2e8f0] dark:border-[#1e293b] flex items-center justify-between bg-[#f8fafc] dark:bg-[#0d1322]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-[#034694] text-white flex items-center justify-center">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0f172a] dark:text-white">
                Panduan Pintasan Keyboard & Tutorial
              </h3>
              <p className="text-xs text-[#64748b] dark:text-[#94a3b8]">
                Bekerja lebih cepat menggunakan navigasi keyboard dan fitur modular
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#64748b] hover:text-[#0f172a] dark:hover:text-white rounded hover:bg-[#e2e8f0] dark:hover:bg-[#1e293b]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Shortcuts Grid */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#034694] dark:text-blue-400 mb-3 flex items-center gap-1.5">
              <Keyboard className="w-3.5 h-3.5" />
              Pintasan Keyboard Utama
            </h4>
            <div className="grid grid-cols-2 gap-2.5">
              {shortcuts.map((sc, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg border border-[#e2e8f0] dark:border-[#1e293b] bg-[#f8fafc] dark:bg-[#0d1322] flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span className="text-[#034694] dark:text-blue-400 shrink-0">{sc.icon}</span>
                    <span className="text-[#334155] dark:text-[#cbd5e1] truncate">{sc.desc}</span>
                  </div>
                  <kbd className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-white dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] text-[#0f172a] dark:text-white shrink-0 shadow-2xs">
                    {sc.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          {/* Tutorial Workflow */}
          <div className="border-t border-[#e2e8f0] dark:border-[#1e293b] pt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#034694] dark:text-blue-400 mb-3 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              Tutorial Alur Kerja Sistem
            </h4>

            <div className="space-y-3 text-xs text-[#475569] dark:text-[#94a3b8] leading-relaxed">
              <div className="p-3 rounded-lg border border-[#e2e8f0] dark:border-[#1e293b] bg-white dark:bg-[#111726]">
                <div className="font-bold text-[#0f172a] dark:text-white mb-1">
                  1. Drag-and-Drop & Manajemen Kolom
                </div>
                Tarik kartu tugas ke kolom lain (To Do, In Progress, Review, Done) untuk memperbarui status secara otomatis. Sistem akan langsung mengirimkan notifikasi perubahan ke pemilik tugas.
              </div>

              <div className="p-3 rounded-lg border border-[#e2e8f0] dark:border-[#1e293b] bg-white dark:bg-[#111726]">
                <div className="font-bold text-[#0f172a] dark:text-white mb-1">
                  2. Hierarki Sub-tasks pada Timeline
                </div>
                Pecah tugas besar menjadi sub-tasks. Buka tampilan Timeline untuk melihat visualisasi Gantt bar dan lakukan expand/collapse baris sub-task yang menjorok secara hierarkis.
              </div>

              <div className="p-3 rounded-lg border border-[#e2e8f0] dark:border-[#1e293b] bg-white dark:bg-[#111726]">
                <div className="font-bold text-[#0f172a] dark:text-white mb-1">
                  3. Otomatisasi Persetujuan Admin (Approval System)
                </div>
                Setiap pengguna baru yang mendaftar harus disetujui (ACC) oleh Administrator melalui menu <strong>Kelola Pengguna</strong> sebelum dapat login ke dalam aplikasi.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
