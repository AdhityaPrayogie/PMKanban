'use client';

import React, { useState } from 'react';
import {
  X,
  Plus,
  Calendar,
  Tag,
  Users,
  Search,
  Check,
  AlertCircle,
  Briefcase,
  Sparkles,
} from 'lucide-react';
import { useKanbanStore } from '@/store/useKanbanStore';
import { Priority } from '@/types';
import { checkUnitSimilarity, SimilarUnitMatch } from '@/lib/unit-similarity';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';

export function CreateTaskModal() {
  const {
    isCreateModalOpen,
    createModalColumnId,
    createModalParentId,
    closeCreateModal,
    columns,
    allUsers,
    masterLabels,
    masterUnits,
    fetchMasterUnits,
    currentProject,
    activeUser,
    fetchBoardData,
  } = useKanbanStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [customer, setCustomer] = useState('');
  const [unitInput, setUnitInput] = useState('');
  const [selectedUnitTags, setSelectedUnitTags] = useState<string[]>(['IT']);
  const [unitNotice, setUnitNotice] = useState<string | null>(null);

  const [priority, setPriority] = useState<Priority>('Medium');
  const [columnId, setColumnId] = useState(createModalColumnId || columns[0]?.id || '');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Assignee search state
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const debouncedAssigneeSearch = useDebounce(assigneeSearch, 200);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isCreateModalOpen) return null;

  const isSubTask = Boolean(createModalParentId);

  // Check real-time similarity as user types unit name
  const similarUnitMatch: SimilarUnitMatch | null = unitInput.trim()
    ? checkUnitSimilarity(unitInput, masterUnits)
    : null;

  const handleAddUnitTag = async (tagToAdd?: string) => {
    const rawTag = tagToAdd || unitInput;
    const clean = rawTag.trim().toUpperCase().replace(/^#/, '');
    if (!clean) return;

    // Check if unit already in master units
    const existingMaster = masterUnits.find(
      (u) => u.code.toUpperCase() === clean || u.name.toUpperCase() === clean
    );

    if (!existingMaster) {
      // Save new unit to master units table
      try {
        const res = await fetch('/api/master-units', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: clean,
            name: clean,
            description: `Auto-created from task creation`,
          }),
        });
        if (res.ok) {
          await fetchMasterUnits();
          setUnitNotice(`Unit baru #${clean} berhasil disimpan ke Master Table Units.`);
          setTimeout(() => setUnitNotice(null), 4000);
        }
      } catch (err) {
        console.error('Failed to auto-save unit to master table', err);
      }
    }

    if (!selectedUnitTags.includes(clean)) {
      setSelectedUnitTags((prev) => [...prev, clean]);
    }
    setUnitInput('');
  };

  const handleRemoveUnitTag = (tagToRemove: string) => {
    setSelectedUnitTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  const toggleAssignee = (userId: string) => {
    setSelectedAssignees((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleLabel = (labelId: string) => {
    setSelectedLabels((prev) =>
      prev.includes(labelId) ? prev.filter((id) => id !== labelId) : [...prev, labelId]
    );
  };

  // Filter users by search term
  const filteredUsers = allUsers.filter((u) => {
    if (!debouncedAssigneeSearch.trim()) return true;
    const q = debouncedAssigneeSearch.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.unit_name || '').toLowerCase().includes(q)
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !currentProject || !activeUser || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProject.id,
          columnId: columnId || columns[0]?.id,
          parentId: createModalParentId || null,
          title: title.trim(),
          description: description.trim(),
          customer: customer.trim() || null,
          unit_tags: selectedUnitTags,
          priority,
          startDate: startDate || null,
          dueDate: dueDate || null,
            assigneeIds: selectedAssignees,
          labelIds: selectedLabels,
        }),
      });

      closeCreateModal();
      fetchBoardData();
    } catch (err) {
      console.error('Failed to create task', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-[#111726] rounded-2xl border border-[#cbd5e1] dark:border-[#1e2a3f] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#cbd5e1] dark:border-[#1e2a3f] flex items-center justify-between bg-[#f8fafc] dark:bg-[#0d1322]">
          <h3 className="text-sm font-extrabold text-[#0f172a] dark:text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#034694] dark:text-blue-400" />
            {isSubTask ? 'Buat Sub-task Baru' : 'Buat Tugas Baru'}
          </h3>
          <button
            onClick={closeCreateModal}
            className="p-2 text-[#64748b] hover:text-[#0f172a] dark:hover:text-white rounded-lg hover:bg-[#e2e8f0] dark:hover:bg-[#1e293b] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-[#0f172a] dark:text-white mb-1">
              Judul Tugas <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Implementasi integrasi payment gateway"
              className="w-full px-3 py-2 border border-[#cbd5e1] dark:border-[#2b3b55] bg-white dark:bg-[#162032] rounded-lg text-xs text-[#0f172a] dark:text-white placeholder-[#94a3b8] focus:outline-none focus:border-[#034694]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-[#0f172a] dark:text-white mb-1">
              Deskripsi Tugas
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Rincian konteks atau kriteria penerimaan tugas..."
              className="w-full px-3 py-2 border border-[#cbd5e1] dark:border-[#2b3b55] bg-white dark:bg-[#162032] rounded-lg text-xs text-[#0f172a] dark:text-white placeholder-[#94a3b8] focus:outline-none focus:border-[#034694] resize-none"
            />
          </div>

          {/* Customer */}
          <div>
            <label className="block text-xs font-bold text-[#0f172a] dark:text-white mb-1 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-[#034694] dark:text-blue-400" />
              <span>Customer / Klien Rekanan</span>
            </label>
            <input
              type="text"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              placeholder="Contoh: PT Telkom Indonesia, RS Medika Utama, Bank Mandiri..."
              className="w-full px-3 py-2 border border-[#cbd5e1] dark:border-[#2b3b55] bg-white dark:bg-[#162032] rounded-lg text-xs text-[#0f172a] dark:text-white placeholder-[#94a3b8] focus:outline-none focus:border-[#034694]"
            />
          </div>

          {/* Tags Unit Input with Auto Save & Similarity Notification */}
          <div className="p-3.5 rounded-xl bg-[#f8fafc] dark:bg-[#162032] border border-[#cbd5e1] dark:border-[#2b3b55]">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#0f172a] dark:text-white flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#034694] dark:text-blue-400" />
                <span>Tags Unit (Tersimpan ke Table Units)</span>
              </label>
              <span className="text-[10px] text-[#64748b] dark:text-[#94a3b8]">
                {selectedUnitTags.length} Unit Dipilih
              </span>
            </div>

            {/* Selected Tags Chips */}
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {selectedUnitTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-[#e0edfb] dark:bg-[#1e293b] text-[#034694] dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 shadow-2xs"
                >
                  <span>#{tag}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveUnitTag(tag)}
                    className="p-0.5 hover:text-rose-500 rounded"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            {/* Input field for tags unit */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={unitInput}
                onChange={(e) => setUnitInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddUnitTag();
                  }
                }}
                placeholder="Ketik nama/kode unit lalu tekan Enter atau tombol Tambah..."
                className="flex-1 px-3 py-1.5 bg-white dark:bg-[#101726] border border-[#cbd5e1] dark:border-[#334460] rounded-lg text-xs text-[#0f172a] dark:text-white placeholder-[#94a3b8] focus:outline-none focus:border-[#034694]"
              />
              <button
                type="button"
                onClick={() => handleAddUnitTag()}
                className="px-3 py-1.5 bg-[#034694] hover:bg-[#023470] text-white text-xs font-bold rounded-lg shadow-2xs transition-colors shrink-0"
              >
                + Tambah
              </button>
            </div>

            {/* Similarity Alert Notification */}
            {similarUnitMatch && (
              <div className="mt-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-[11px] flex items-center justify-between gap-2 animate-in fade-in">
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>
                    {similarUnitMatch.message}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleAddUnitTag(similarUnitMatch.unit.code)}
                  className="px-2 py-0.5 bg-amber-600 text-white font-bold rounded text-[10px] hover:bg-amber-700 shrink-0"
                >
                  Pilih #{similarUnitMatch.unit.code}
                </button>
              </div>
            )}

            {/* Success notification banner */}
            {unitNotice && (
              <div className="mt-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[11px] flex items-center gap-1.5 animate-in fade-in">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{unitNotice}</span>
              </div>
            )}
          </div>

          {/* Assignees with Search */}
          <div className="p-3.5 rounded-xl bg-[#f8fafc] dark:bg-[#162032] border border-[#cbd5e1] dark:border-[#2b3b55]">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#0f172a] dark:text-white flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#034694] dark:text-blue-400" />
                <span>Assign Team Members ({selectedAssignees.length})</span>
              </label>
            </div>

            {/* Selected Assignees Chips */}
            {selectedAssignees.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {selectedAssignees.map((id) => {
                  const u = allUsers.find((user) => user.id === id);
                  if (!u) return null;
                  return (
                    <span
                      key={u.id}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-white dark:bg-[#101726] border border-[#cbd5e1] dark:border-[#334460] shadow-2xs"
                    >
                      {u.avatar_url ? (
                        <img
                          src={u.avatar_url}
                          alt={u.name}
                          className="w-4 h-4 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-[#034694] text-white flex items-center justify-center text-[9px] font-bold">
                          {u.name.charAt(0)}
                        </div>
                      )}
                      <span>{u.name}</span>
                      <button
                        type="button"
                        onClick={() => toggleAssignee(u.id)}
                        className="p-0.5 hover:text-rose-500 rounded-full"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Search Input for Assignees */}
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 text-[#94a3b8] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={assigneeSearch}
                onChange={(e) => setAssigneeSearch(e.target.value)}
                placeholder="Cari nama, email, atau unit anggota..."
                className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-[#101726] border border-[#cbd5e1] dark:border-[#334460] rounded-lg text-xs text-[#0f172a] dark:text-white placeholder-[#94a3b8] focus:outline-none focus:border-[#034694]"
              />
            </div>

            {/* Filtered Users List */}
            <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
              {filteredUsers.length === 0 ? (
                <div className="p-3 text-center text-xs text-[#94a3b8] italic">
                  Tidak ada anggota yang cocok dengan pencarian "{assigneeSearch}"
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const isSelected = selectedAssignees.includes(u.id);
                  return (
                    <button
                      type="button"
                      key={u.id}
                      onClick={() => toggleAssignee(u.id)}
                      className={cn(
                        'w-full flex items-center justify-between p-1.5 rounded-lg text-xs transition-colors border text-left',
                        isSelected
                          ? 'bg-[#e0edfb]/80 dark:bg-[#17253d] border-[#034694] dark:border-blue-500 text-[#034694] dark:text-blue-300 font-bold'
                          : 'bg-white dark:bg-[#101726] border-[#cbd5e1] dark:border-[#2b3b55] text-[#475569] dark:text-[#cbd5e1] hover:border-[#034694]'
                      )}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {u.avatar_url ? (
                          <img
                            src={u.avatar_url}
                            alt={u.name}
                            className="w-5 h-5 rounded-full object-cover ring-1 ring-[#cbd5e1]"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-[#034694] text-white flex items-center justify-center text-[9px] font-bold">
                            {u.name.charAt(0)}
                          </div>
                        )}
                        <span className="truncate">{u.name}</span>
                        <span className="text-[10px] text-[#94a3b8] font-normal">
                          #{u.unit_name || 'IT'}
                        </span>
                      </div>
                      <div className="shrink-0">
                        {isSelected ? (
                          <Check className="w-3.5 h-3.5 text-[#034694] dark:text-blue-400" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded border border-[#cbd5e1] dark:border-[#334460]" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Status Column & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#64748b] dark:text-[#94a3b8] mb-1">
                Kolom Status
              </label>
              <select
                value={columnId}
                onChange={(e) => setColumnId(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-[#cbd5e1] dark:border-[#2b3b55] rounded-lg text-xs bg-white dark:bg-[#162032] text-[#0f172a] dark:text-white focus:outline-none focus:border-[#034694]"
              >
                {columns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#64748b] dark:text-[#94a3b8] mb-1">
                Prioritas
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full px-2.5 py-1.5 border border-[#cbd5e1] dark:border-[#2b3b55] rounded-lg text-xs bg-white dark:bg-[#162032] text-[#0f172a] dark:text-white focus:outline-none focus:border-[#034694]"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#64748b] dark:text-[#94a3b8] mb-1">
                Tanggal Mulai
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-[#cbd5e1] dark:border-[#2b3b55] rounded-lg text-xs bg-white dark:bg-[#162032] text-[#0f172a] dark:text-white focus:outline-none focus:border-[#034694]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#64748b] dark:text-[#94a3b8] mb-1">
                Tenggat Waktu
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-[#cbd5e1] dark:border-[#2b3b55] rounded-lg text-xs bg-white dark:bg-[#162032] text-[#0f172a] dark:text-white focus:outline-none focus:border-[#034694]"
              />
            </div>
          </div>

          {/* Labels Selection */}
          {masterLabels.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-[#0f172a] dark:text-white mb-1.5">
                Labels
              </label>
              <div className="flex flex-wrap gap-1.5">
                {masterLabels.map((l) => {
                  const isSelected = selectedLabels.includes(l.id);
                  return (
                    <button
                      type="button"
                      key={l.id}
                      onClick={() => toggleLabel(l.id)}
                      className={cn(
                        'px-2.5 py-0.5 rounded text-xs font-semibold transition-all border',
                        isSelected
                          ? 'ring-2 ring-offset-1 ring-[#034694] text-white'
                          : 'bg-white dark:bg-[#162032] border-[#cbd5e1] dark:border-[#2b3b55] text-[#475569] dark:text-[#cbd5e1]'
                      )}
                      style={{
                        backgroundColor: isSelected ? l.color : undefined,
                      }}
                    >
                      {l.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 border-t border-[#cbd5e1] dark:border-[#1e2a3f] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={closeCreateModal}
              className="px-4 py-2 text-xs font-bold text-[#64748b] hover:text-[#0f172a] dark:hover:text-white cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-[#034694] hover:bg-[#023470] disabled:bg-[#94a3b8] text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95"
            >
              {isSubmitting ? 'Menyimpan...' : isSubTask ? 'Buat Sub-task' : 'Buat Tugas'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
