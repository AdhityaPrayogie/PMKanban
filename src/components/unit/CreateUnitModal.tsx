'use client';

import React, { useState } from 'react';
import { X, Building2, Plus, Sparkles, CheckCircle2 } from 'lucide-react';
import { useKanbanStore } from '@/store/useKanbanStore';
import { BoardStage } from '@/types';

export function CreateUnitModal() {
  const {
    isCreateUnitModalOpen,
    closeCreateUnitModal,
    createBoard,
    createUnitModalDefaultStage,
    createUnitModalDefaultTag,
  } = useKanbanStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unitTag, setUnitTag] = useState<string>(createUnitModalDefaultTag || 'IT');
  const [stage, setStage] = useState<BoardStage>(createUnitModalDefaultStage || 'Active');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (isCreateUnitModalOpen) {
      setUnitTag(createUnitModalDefaultTag || 'IT');
      setStage(createUnitModalDefaultStage || 'Active');
    }
  }, [isCreateUnitModalOpen, createUnitModalDefaultTag, createUnitModalDefaultStage]);

  if (!isCreateUnitModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    const success = await createBoard(name.trim(), description.trim(), unitTag, stage);
    setIsSubmitting(false);

    if (success) {
      setName('');
      setDescription('');
      closeCreateUnitModal();
    }
  };

  const unitOptions = ['IT', 'Markom', 'MFK', 'PPSDM', 'Umum'];
  const stageOptions: { value: BoardStage; label: string }[] = [
    { value: 'Planning', label: 'Perencanaan (Planning)' },
    { value: 'Active', label: 'Sedang Berjalan (Active)' },
    { value: 'Review', label: 'Ditinjau / Evaluasi (Review)' },
    { value: 'Completed', label: 'Selesai / Terawat (Completed)' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div
        className="bg-white dark:bg-[#111726] rounded-2xl border border-[#cbd5e1] dark:border-[#1e2a3f] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#cbd5e1] dark:border-[#1e2a3f] flex items-center justify-between bg-[#f8fafc] dark:bg-[#0d1424]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#034694] text-white flex items-center justify-center font-bold shadow-xs">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0f172a] dark:text-white">Tambah Papan Kerja / Board Baru</h3>
              <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8]">Level 1: Papan Utama dengan Child Kanban & Timeline mandiri</p>
            </div>
          </div>
          <button
            onClick={closeCreateUnitModal}
            className="p-1.5 text-[#64748b] hover:text-[#0f172a] dark:hover:text-white rounded-lg hover:bg-[#e2e8f0] dark:hover:bg-[#1e293b] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#0f172a] dark:text-[#f8fafc] mb-1.5">
              Nama Board Utama <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: IT: Infrastruktur Server, Markom: Campaign Ramadhan..."
              className="w-full px-3.5 py-2.5 border border-[#cbd5e1] dark:border-[#2b3b55] rounded-xl text-xs bg-white dark:bg-[#162032] text-[#0f172a] dark:text-white placeholder-[#94a3b8] focus:outline-none focus:border-[#034694] dark:focus:border-blue-500 font-medium"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Tag Unit */}
            <div>
              <label className="block text-xs font-bold text-[#0f172a] dark:text-[#f8fafc] mb-1.5">
                Tag Unit / Divisi
              </label>
              <select
                value={unitTag}
                onChange={(e) => setUnitTag(e.target.value)}
                className="w-full px-3 py-2 border border-[#cbd5e1] dark:border-[#2b3b55] rounded-xl text-xs bg-white dark:bg-[#162032] text-[#0f172a] dark:text-white focus:outline-none focus:border-[#034694]"
              >
                {unitOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    #{opt}
                  </option>
                ))}
              </select>
            </div>

            {/* Tahap Board (Stage) */}
            <div>
              <label className="block text-xs font-bold text-[#0f172a] dark:text-[#f8fafc] mb-1.5">
                Tahap / Kolom Papan
              </label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as BoardStage)}
                className="w-full px-3 py-2 border border-[#cbd5e1] dark:border-[#2b3b55] rounded-xl text-xs bg-white dark:bg-[#162032] text-[#0f172a] dark:text-white focus:outline-none focus:border-[#034694]"
              >
                {stageOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0f172a] dark:text-[#f8fafc] mb-1.5">
              Deskripsi / Lingkup Kerja (Opsional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deskripsikan tujuan dan ruang lingkup board utama ini..."
              className="w-full px-3.5 py-2.5 border border-[#cbd5e1] dark:border-[#2b3b55] rounded-xl text-xs bg-white dark:bg-[#162032] text-[#0f172a] dark:text-white placeholder-[#94a3b8] focus:outline-none focus:border-[#034694] dark:focus:border-blue-500 font-medium resize-none"
            />
          </div>

          {/* Feature Highlights */}
          <div className="bg-[#f1f5f9] dark:bg-[#162032]/60 rounded-xl p-3 border border-[#cbd5e1] dark:border-[#24334a] text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-[#034694] dark:text-blue-400 text-[11px]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Otomatis Dilengkapi:</span>
            </div>
            <ul className="text-[11px] text-[#475569] dark:text-[#cbd5e1] space-y-0.5 pl-5 list-disc">
              <li>Papan Child Kanban 4 kolom (To Do, In Progress, In Review, Done) yang bisa dikembangkan.</li>
              <li>Timeline Gantt dan Subtask mandiri untuk setiap tugas di board ini.</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeCreateUnitModal}
              className="px-4 py-2 border border-[#cbd5e1] dark:border-[#24334a] text-[#475569] dark:text-[#cbd5e1] hover:bg-[#f1f5f9] dark:hover:bg-[#162032] rounded-xl text-xs font-bold transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-5 py-2 bg-[#034694] hover:bg-[#023470] disabled:bg-[#cbd5e1] dark:disabled:bg-[#1e2a3f] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
            >
              {isSubmitting ? (
                <span>Membuat...</span>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Buat Board Utama</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
