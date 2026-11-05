'use client';

import React, { useState } from 'react';
import {
  X,
  Building2,
  Plus,
  Users,
  Layers,
  Sparkles,
  CheckCircle2,
  Tag,
  Shield,
  ArrowRight,
  Search,
  Pencil,
} from 'lucide-react';
import { useKanbanStore } from '@/store/useKanbanStore';
import { MasterUnit } from '@/types';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';

export function MasterUnitModal() {
  const {
    isMasterUnitModalOpen,
    closeMasterUnitModal,
    masterUnits,
    createMasterUnit,
    updateMasterUnit,
    allUsers,
    assignUserUnit,
    activeUser,
  } = useKanbanStore();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUnitCode, setSelectedUnitCode] = useState<string>('All');
  const [searchUnit, setSearchUnit] = useState('');
  const [searchUser, setSearchUser] = useState('');
  const debouncedSearchUnit = useDebounce(searchUnit, 250);
  const debouncedSearchUser = useDebounce(searchUser, 250);

  // Edit unit state
  const [editingUnit, setEditingUnit] = useState<MasterUnit | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isEditingSubmitting, setIsEditingSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  if (!isMasterUnitModalOpen) return null;

  const filteredUnits = masterUnits.filter((u) => {
    if (!debouncedSearchUnit.trim()) return true;
    const q = debouncedSearchUnit.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.code.toLowerCase().includes(q) ||
      (u.description && u.description.toLowerCase().includes(q))
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;

    setIsSubmitting(true);
    const success = await createMasterUnit(name.trim(), code.trim(), description.trim());
    setIsSubmitting(false);

    if (success) {
      setName('');
      setCode('');
      setDescription('');
    }
  };

  const handleOpenEdit = (unit: MasterUnit) => {
    setEditingUnit(unit);
    setEditName(unit.name);
    setEditCode(unit.code);
    setEditDescription(unit.description || '');
    setEditError(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUnit || !editName.trim() || !editCode.trim()) return;

    setIsEditingSubmitting(true);
    setEditError(null);

    const prevCode = editingUnit.code;
    const newCode = editCode.trim().toUpperCase();

    const res = await updateMasterUnit(
      editingUnit.id,
      editName.trim(),
      newCode,
      editDescription.trim()
    );

    setIsEditingSubmitting(false);

    if (res.success) {
      if (selectedUnitCode === prevCode) {
        setSelectedUnitCode(newCode);
      }
      setEditingUnit(null);
    } else {
      setEditError(res.error || 'Gagal mengubah unit');
    }
  };

  const handleUserUnitChange = async (userId: string, newUnitCode: string) => {
    const unitObj = masterUnits.find((u) => u.code === newUnitCode);
    if (!unitObj) return;
    await assignUserUnit(userId, unitObj.id, unitObj.code);
  };

  const filteredUsers = allUsers.filter((u) => {
    const matchUnit = selectedUnitCode === 'All' || u.unit_name === selectedUnitCode;
    if (!matchUnit) return false;
    if (!debouncedSearchUser.trim()) return true;
    const q = debouncedSearchUser.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.role && u.role.toLowerCase().includes(q)) ||
      (u.unit_name && u.unit_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
      <div
        className="bg-white dark:bg-[#111726] rounded-2xl border border-[#cbd5e1] dark:border-[#1e2a3f] shadow-2xl w-full max-w-4xl lg:max-w-5xl h-[92vh] max-h-[92vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#cbd5e1] dark:border-[#1e2a3f] flex items-center justify-between bg-[#f8fafc] dark:bg-[#0d1424] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#034694] text-white flex items-center justify-center font-bold shadow-xs">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0f172a] dark:text-white">
                Kelola Master Unit & Penempatan Tim
              </h3>
              <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8]">
                Master table units dan asosiasi unit untuk setiap pengguna
              </p>
            </div>
          </div>
          <button
            onClick={closeMasterUnitModal}
            className="p-1.5 text-[#64748b] hover:text-[#0f172a] dark:hover:text-white rounded-lg hover:bg-[#e2e8f0] dark:hover:bg-[#1e293b] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Add New Master Unit Form */}
          <div className="bg-[#f8fafc] dark:bg-[#162032] p-4 rounded-xl border border-[#cbd5e1] dark:border-[#2b3b55] space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#034694] dark:text-blue-400">
              <Plus className="w-4 h-4" />
              <span>Tambah Unit Baru ke Master Table</span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-[#475569] dark:text-[#cbd5e1] mb-1">
                    Nama Unit / Divisi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Keuangan, Operasional, Legal..."
                    className="w-full px-3 py-2 border border-[#cbd5e1] dark:border-[#334460] rounded-lg text-xs bg-white dark:bg-[#101726] text-[#0f172a] dark:text-white focus:outline-none focus:border-[#034694]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#475569] dark:text-[#cbd5e1] mb-1">
                    Kode Tag <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="Contoh: KEU, OPS"
                    maxLength={10}
                    className="w-full px-3 py-2 border border-[#cbd5e1] dark:border-[#334460] rounded-lg text-xs bg-white dark:bg-[#101726] text-[#0f172a] dark:text-white uppercase font-bold focus:outline-none focus:border-[#034694]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#475569] dark:text-[#cbd5e1] mb-1">
                  Deskripsi / Lingkup Kerja (Opsional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Deskripsi singkat fungsi unit kerja ini..."
                  className="w-full px-3 py-2 border border-[#cbd5e1] dark:border-[#334460] rounded-lg text-xs bg-white dark:bg-[#101726] text-[#0f172a] dark:text-white focus:outline-none focus:border-[#034694]"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting || !name.trim() || !code.trim()}
                  className="px-4 py-2 bg-[#034694] hover:bg-[#023470] disabled:bg-[#cbd5e1] dark:disabled:bg-[#1e2a3f] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Menyimpan...' : 'Tambah ke Master Units'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Section 2: Master Units Directory with Search */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-[#0f172a] dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#034694] dark:text-blue-400" />
                <span>
                  Daftar Master Unit ({filteredUnits.length}
                  {filteredUnits.length !== masterUnits.length ? ` dari ${masterUnits.length}` : ''})
                </span>
              </h4>

              {/* Search Box */}
              <div className="relative w-full sm:w-60">
                <Search className="w-3.5 h-3.5 text-[#94a3b8] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchUnit}
                  onChange={(e) => setSearchUnit(e.target.value)}
                  placeholder="Cari nama / kode unit..."
                  className="w-full pl-8 pr-7 py-1.5 bg-white dark:bg-[#101726] border border-[#cbd5e1] dark:border-[#334460] rounded-lg text-xs text-[#0f172a] dark:text-white placeholder-[#94a3b8] focus:outline-none focus:border-[#034694]"
                />
                {searchUnit && (
                  <button
                    onClick={() => setSearchUnit('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#94a3b8] hover:text-[#0f172a] dark:hover:text-white"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {filteredUnits.length === 0 ? (
              <div className="p-8 text-center bg-[#f8fafc] dark:bg-[#162032] border border-dashed border-[#cbd5e1] dark:border-[#2b3b55] rounded-xl text-xs text-[#94a3b8]">
                Tidak ada unit yang cocok dengan pencarian "{searchUnit}".
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
                {filteredUnits.map((u) => {
                  const isSelected = selectedUnitCode === u.code;
                  return (
                    <div
                      key={u.id}
                      onClick={() => setSelectedUnitCode(isSelected ? 'All' : u.code)}
                      className={cn(
                        'p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between',
                        isSelected
                          ? 'border-[#034694] dark:border-blue-500 bg-[#e0edfb]/40 dark:bg-blue-950/30 ring-1 ring-[#034694]'
                          : 'border-[#cbd5e1] dark:border-[#2b3b55] bg-white dark:bg-[#162032] hover:border-[#034694]'
                      )}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#e0edfb] dark:bg-[#1e293b] text-[#034694] dark:text-blue-300 border border-blue-200 dark:border-blue-900/60">
                            <Tag className="w-2.5 h-2.5 text-[#034694] dark:text-blue-400" />
                            <span>#{u.code}</span>
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-[#64748b] dark:text-[#94a3b8]">
                              {u.users_count || 0} Anggota
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEdit(u);
                              }}
                              className="p-1 rounded-md text-[#64748b] hover:text-[#034694] dark:hover:text-blue-400 hover:bg-[#e2e8f0]/80 dark:hover:bg-[#1e293b] transition-colors"
                              title="Edit unit ini"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="text-xs font-extrabold text-[#0f172a] dark:text-white">
                          {u.name}
                        </div>
                        <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8] line-clamp-2 mt-1">
                          {u.description || 'Unit kerja operasional.'}
                        </p>
                      </div>

                      <div className="pt-2 mt-2 border-t border-[#cbd5e1]/60 dark:border-[#2b3b55]/60 flex items-center justify-between text-[10px] text-[#64748b] dark:text-[#94a3b8]">
                        <span>{u.projects_count || 0} Board Terdaftar</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEdit(u);
                            }}
                            className="font-bold text-[#64748b] hover:text-[#034694] dark:hover:text-blue-300 transition-colors flex items-center gap-1"
                          >
                            <Pencil className="w-2.5 h-2.5" />
                            <span>Edit</span>
                          </button>
                          <span className="font-bold text-[#034694] dark:text-blue-400">
                            {isSelected ? 'Menampilkan Tim' : 'Filter Tim →'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 3: Users Unit Assignment Table with Search */}
          <div className="space-y-3 pt-3 border-t border-[#cbd5e1] dark:border-[#1e2a3f]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xs font-bold text-[#0f172a] dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#034694] dark:text-blue-400" />
                  <span>
                    Penempatan Unit Pengguna{' '}
                    {selectedUnitCode !== 'All' ? `(Unit #${selectedUnitCode})` : '(Semua Pengguna)'}
                  </span>
                </h4>
                <span className="text-[11px] font-semibold text-[#64748b] dark:text-[#94a3b8]">
                  ({filteredUsers.length} dari {allUsers.length} user)
                </span>
                {selectedUnitCode !== 'All' && (
                  <button
                    onClick={() => setSelectedUnitCode('All')}
                    className="text-[10px] font-bold text-[#034694] dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    (Reset Filter Unit)
                  </button>
                )}
              </div>

              {/* User Search Input */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-[#94a3b8] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  placeholder="Cari nama / email pengguna..."
                  className="w-full pl-8 pr-7 py-1.5 bg-white dark:bg-[#101726] border border-[#cbd5e1] dark:border-[#334460] rounded-lg text-xs text-[#0f172a] dark:text-white placeholder-[#94a3b8] focus:outline-none focus:border-[#034694]"
                />
                {searchUser && (
                  <button
                    onClick={() => setSearchUser('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#94a3b8] hover:text-[#0f172a] dark:hover:text-white"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            <div className="border border-[#cbd5e1] dark:border-[#2b3b55] rounded-xl overflow-hidden max-h-72 overflow-y-auto scrollbar-thin">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f8fafc] dark:bg-[#0d1424] border-b border-[#cbd5e1] dark:border-[#1e2a3f] text-[#64748b] dark:text-[#94a3b8] font-bold text-[11px] sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3.5">Nama Pengguna</th>
                    <th className="py-2.5 px-3.5">Role</th>
                    <th className="py-2.5 px-3.5">Unit / Divisi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#cbd5e1] dark:divide-[#1e2a3f] bg-white dark:bg-[#111726]">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-xs text-[#94a3b8] italic bg-white dark:bg-[#111726]">
                        Tidak ada pengguna yang cocok dengan pencarian "{searchUser}".
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                    const currentUnit = user.unit_name || 'IT';
                    return (
                      <tr key={user.id} className="hover:bg-[#f8fafc] dark:hover:bg-[#162032] transition-colors">
                        <td className="py-2.5 px-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-[#034694] text-white flex items-center justify-center text-[10px] font-bold">
                              {user.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-[#0f172a] dark:text-white">
                                {user.name}
                                {user.id === activeUser.id && (
                                  <span className="ml-1.5 text-[9px] px-1 py-0.2 bg-blue-100 text-[#034694] rounded font-bold">
                                    Anda
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-[#64748b] dark:text-[#94a3b8]">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3.5">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded text-[10px] font-bold',
                              user.role === 'admin'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            )}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5">
                          <select
                            value={currentUnit}
                            onChange={(e) => handleUserUnitChange(user.id, e.target.value)}
                            className="bg-[#f1f5f9] dark:bg-[#1a2538] border border-[#cbd5e1] dark:border-[#334460] rounded-lg px-2 py-1 text-xs font-bold text-[#0f172a] dark:text-white focus:outline-none focus:border-[#034694] cursor-pointer"
                          >
                            {masterUnits.map((u) => (
                              <option key={u.id} value={u.code}>
                                Unit: {u.name} (#{u.code})
                              </option>
                            ))}
                          </select>
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

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#cbd5e1] dark:border-[#1e2a3f] bg-[#f8fafc] dark:bg-[#0d1424] flex items-center justify-between shrink-0">
          <span className="text-[11px] text-[#64748b] dark:text-[#94a3b8]">
            Setiap user otomatis terikat pada unit kerjanya dan tercermin pada task/board.
          </span>
          <button
            onClick={closeMasterUnitModal}
            className="px-4 py-2 bg-[#034694] hover:bg-[#023470] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            Selesai
          </button>
        </div>
      </div>

      {/* Edit Master Unit Dialog Modal */}
      {editingUnit && (
        <div
          className="fixed inset-0 z-60 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            e.stopPropagation();
            setEditingUnit(null);
          }}
        >
          <div
            className="bg-white dark:bg-[#111726] rounded-2xl border border-[#cbd5e1] dark:border-[#1e2a3f] shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-[#cbd5e1] dark:border-[#1e2a3f] flex items-center justify-between bg-[#f8fafc] dark:bg-[#0d1424]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#034694] text-white flex items-center justify-center font-bold">
                  <Pencil className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#0f172a] dark:text-white">
                    Edit Master Unit
                  </h4>
                  <p className="text-[10px] text-[#64748b] dark:text-[#94a3b8]">
                    #{editingUnit.code} — {editingUnit.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingUnit(null)}
                className="p-1 text-[#64748b] hover:text-[#0f172a] dark:hover:text-white rounded-lg hover:bg-[#e2e8f0] dark:hover:bg-[#1e293b] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleEditSubmit} className="p-5 space-y-3.5">
              {editError && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-lg text-xs text-rose-600 dark:text-rose-400 font-medium">
                  {editError}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-[#475569] dark:text-[#cbd5e1] mb-1">
                  Nama Unit / Divisi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Contoh: Keuangan, IT..."
                  className="w-full px-3 py-2 border border-[#cbd5e1] dark:border-[#334460] rounded-lg text-xs bg-white dark:bg-[#101726] text-[#0f172a] dark:text-white focus:outline-none focus:border-[#034694]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#475569] dark:text-[#cbd5e1] mb-1">
                  Kode Tag <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                  placeholder="Contoh: KEU, IT"
                  className="w-full px-3 py-2 border border-[#cbd5e1] dark:border-[#334460] rounded-lg text-xs bg-white dark:bg-[#101726] text-[#0f172a] dark:text-white uppercase font-bold focus:outline-none focus:border-[#034694]"
                />
                <p className="text-[10px] text-[#64748b] dark:text-[#94a3b8] mt-1">
                  Kode tag diperbarui otomatis pada anggota tim dan filter board terkait.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#475569] dark:text-[#cbd5e1] mb-1">
                  Deskripsi / Lingkup Kerja (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Deskripsi singkat fungsi unit kerja ini..."
                  className="w-full px-3 py-2 border border-[#cbd5e1] dark:border-[#334460] rounded-lg text-xs bg-white dark:bg-[#101726] text-[#0f172a] dark:text-white focus:outline-none focus:border-[#034694] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#cbd5e1] dark:border-[#1e2a3f]">
                <button
                  type="button"
                  onClick={() => setEditingUnit(null)}
                  className="px-3.5 py-1.5 text-xs font-bold text-[#64748b] dark:text-[#94a3b8] hover:text-[#0f172a] dark:hover:text-white rounded-lg hover:bg-[#e2e8f0] dark:hover:bg-[#1e293b] transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isEditingSubmitting || !editName.trim() || !editCode.trim()}
                  className="px-4 py-1.5 bg-[#034694] hover:bg-[#023470] disabled:bg-[#cbd5e1] dark:disabled:bg-[#1e2a3f] text-white text-xs font-bold rounded-lg transition-all shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isEditingSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
