'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Calendar,
  Send,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Tag,
  AlertTriangle,
  FolderKanban,
  MessageSquare,
  Save,
  RotateCcw,
  Check,
  Building2,
  Users,
  Briefcase,
  Search,
  Sparkles,
  Paperclip,
  Upload,
  FileText,
  FileCode,
  FileSpreadsheet,
  Archive,
  Download,
  ExternalLink,
  Loader2,
  Image as ImageIcon,
  History,
  ArrowRight,
} from 'lucide-react';
import { useKanbanStore } from '@/store/useKanbanStore';
import { Comment, Priority, Task, User, TaskAttachment, TaskActivity } from '@/types';
import { cn, formatDate } from '@/lib/utils';
import { checkUnitSimilarity, SimilarUnitMatch } from '@/lib/unit-similarity';
import { useDebounce } from '@/hooks/useDebounce';

export function TaskDetailSheet() {
  const {
    selectedTaskId,
    isTaskSheetOpen,
    closeTaskSheet,
    columns,
    activeUser,
    allUsers,
    masterUnits,
    fetchMasterUnits,
    currentProject,
    fetchBoardData,
    openCreateModal,
  } = useKanbanStore();

  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activities, setActivities] = useState<TaskActivity[]>([]);
  const [activeLogTab, setActiveLogTab] = useState<'activities' | 'comments'>('activities');
  const [newComment, setNewComment] = useState('');
  const [commentImage, setCommentImage] = useState<{ file: File; preview: string } | null>(null);
  const [isUploadingCommentImage, setIsUploadingCommentImage] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const commentImageInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  // Draft states for manual editing
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDesc, setDraftDesc] = useState('');
  const [draftCustomer, setDraftCustomer] = useState('');
  const [draftUnitTags, setDraftUnitTags] = useState<string[]>([]);
  const [unitInput, setUnitInput] = useState('');
  const [unitNotice, setUnitNotice] = useState<string | null>(null);

  // Assignees search state
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const debouncedAssigneeSearch = useDebounce(assigneeSearch, 200);
  const [draftAssigneeIds, setDraftAssigneeIds] = useState<string[]>([]);

  const [draftColumnId, setDraftColumnId] = useState('');
  const [draftPriority, setDraftPriority] = useState<Priority>('Medium');
  const [draftStartDate, setDraftStartDate] = useState('');
  const [draftDueDate, setDraftDueDate] = useState('');

  // Confirmation modal & feedback states
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState(false);

  // Attachments state
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ALLOWED_EXTENSIONS = [
    '.png', '.jpg', '.jpeg', '.webp', '.gif',
    '.doc', '.docx', '.pdf', '.md', '.markdown',
    '.xls', '.xlsx', '.csv',
    '.zip', '.rar', '.7z', '.tar', '.gz',
  ];

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileCategoryBadge = (type: string) => {
    switch (type) {
      case 'image':
        return { label: 'IMG', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' };
      case 'doc':
        return { label: 'DOC', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300 dark:border-blue-800' };
      case 'pdf':
        return { label: 'PDF', color: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-800' };
      case 'md':
        return { label: 'MD', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300 dark:border-purple-800' };
      case 'excel':
        return { label: 'XLS', color: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border-teal-300 dark:border-teal-800' };
      case 'zip':
        return { label: 'ZIP', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800' };
      default:
        return { label: 'FILE', color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300' };
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTaskId) return;

    setUploadError(null);
    setUploadSuccess(null);

    const ext = '.' + (file.name.toLowerCase().split('.').pop() || '');
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setUploadError(
        'Tipe berkas tidak didukung! Hanya diperbolehkan upload Gambar (IMG: .png, .jpg, .webp, .gif), Dokumen (.doc, .docx), PDF (.pdf), Markdown (.md), Excel (.xls, .xlsx, .csv), dan Arsip (.zip, .rar, .7z).'
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setUploadError('Ukuran berkas melebihi batas 50 MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    try {
      const res = await fetch(`/api/tasks/${selectedTaskId}/attachments`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setUploadError(data.error || 'Gagal mengunggah berkas.');
      } else if (data.attachment) {
        setAttachments((prev) => [data.attachment, ...prev]);
        if (data.compression?.wasCompressed) {
          setUploadSuccess(
            `Berkas "${file.name}" berhasil diunggah & dikompresi (${formatFileSize(data.compression.originalSize)} → ${formatFileSize(data.compression.finalSize)}, hemat ${data.compression.savedPercent}%).`
          );
        } else {
          setUploadSuccess(`Berkas "${file.name}" berhasil diunggah (${formatFileSize(file.size)}).`);
        }
        setTimeout(() => setUploadSuccess(null), 4000);
      }
    } catch (err: any) {
      setUploadError(err.message || 'Terjadi kesalahan saat upload.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!selectedTaskId) return;
    if (!confirm('Apakah Anda yakin ingin menghapus berkas lampiran ini?')) return;

    try {
      const res = await fetch(
        `/api/tasks/${selectedTaskId}/attachments?attachmentId=${attachmentId}`,
        {
          method: 'DELETE',
        }
      );
      if (res.ok) {
        setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      }
    } catch (err) {
      console.error('Failed to delete attachment', err);
    }
  };

  // Helper to parse unit tags
  const parseTags = (raw: any): string[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return raw.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }
    return [];
  };

  // Fetch task details and comments when selectedTaskId changes
  useEffect(() => {
    if (!selectedTaskId || !isTaskSheetOpen) {
      setTask(null);
      setComments([]);
      setAttachments([]);
      setActivities([]);
      setIsConfirmModalOpen(false);
      setUploadError(null);
      setUploadSuccess(null);
      return;
    }

    const loadTask = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/tasks/${selectedTaskId}`);
        const data = await res.json();
        if (data.task) {
          const t: Task = data.task;
          const parsedTags = parseTags(t.unit_tags);
          const assigneeIds = (t.assignees || []).map((a) => a.id);

          setTask(t);
          setDraftTitle(t.title || '');
          setDraftDesc(t.description || '');
          setDraftCustomer(t.customer || '');
          setDraftUnitTags(parsedTags);
          setDraftAssigneeIds(assigneeIds);
          setDraftColumnId(t.column_id || '');
          setDraftPriority(t.priority || 'Medium');
          setDraftStartDate(t.start_date ? t.start_date.slice(0, 10) : '');
          setDraftDueDate(t.due_date ? t.due_date.slice(0, 10) : '');
          setComments(data.comments || []);
          setAttachments(t.attachments || []);
          setActivities(data.activities || []);
        }
      } catch (err) {
        console.error('Failed to load task details', err);
      } finally {
        setLoading(false);
      }
    };

    loadTask();
  }, [selectedTaskId, isTaskSheetOpen]);

  if (!isTaskSheetOpen || !selectedTaskId) return null;

  // Real-time similarity check on unit input
  const similarUnitMatch: SimilarUnitMatch | null = unitInput.trim()
    ? checkUnitSimilarity(unitInput, masterUnits)
    : null;

  // Check if draft has unsaved modifications
  const originalTags = parseTags(task?.unit_tags);
  const originalAssigneeIds = (task?.assignees || []).map((a) => a.id);

  const tagsChanged =
    JSON.stringify(draftUnitTags.slice().sort()) !==
    JSON.stringify(originalTags.slice().sort());

  const assigneesChanged =
    JSON.stringify(draftAssigneeIds.slice().sort()) !==
    JSON.stringify(originalAssigneeIds.slice().sort());

  const isDirty = Boolean(
    task &&
      (draftTitle !== task.title ||
        draftDesc !== (task.description || '') ||
        draftCustomer !== (task.customer || '') ||
        tagsChanged ||
        assigneesChanged ||
        draftColumnId !== task.column_id ||
        draftPriority !== task.priority ||
        draftStartDate !== (task.start_date ? task.start_date.slice(0, 10) : '') ||
        draftDueDate !== (task.due_date ? task.due_date.slice(0, 10) : ''))
  );

  const handleResetDraft = () => {
    if (!task) return;
    setDraftTitle(task.title || '');
    setDraftDesc(task.description || '');
    setDraftCustomer(task.customer || '');
    setDraftUnitTags(parseTags(task.unit_tags));
    setDraftAssigneeIds((task.assignees || []).map((a) => a.id));
    setDraftColumnId(task.column_id || '');
    setDraftPriority(task.priority || 'Medium');
    setDraftStartDate(task.start_date ? task.start_date.slice(0, 10) : '');
    setDraftDueDate(task.due_date ? task.due_date.slice(0, 10) : '');
  };

  const handleAddUnitTag = async (tagToAdd?: string) => {
    const raw = tagToAdd || unitInput;
    const clean = raw.trim().toUpperCase().replace(/^#/, '');
    if (!clean) return;

    // Check if unit already exists in masterUnits table
    const exists = masterUnits.find(
      (u) => u.code.toUpperCase() === clean || u.name.toUpperCase() === clean
    );

    if (!exists) {
      // Auto-save new unit into master table
      try {
        const res = await fetch('/api/master-units', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: clean,
            name: clean,
            description: `Auto-created from task #${task?.id}`,
          }),
        });
        if (res.ok) {
          await fetchMasterUnits();
          setUnitNotice(`Unit baru #${clean} otomatis tersimpan ke Master Table Units.`);
          setTimeout(() => setUnitNotice(null), 4000);
        }
      } catch (err) {
        console.error('Failed to auto-save unit to master table', err);
      }
    }

    if (!draftUnitTags.includes(clean)) {
      setDraftUnitTags((prev) => [...prev, clean]);
    }
    setUnitInput('');
  };

  const handleRemoveUnitTag = (tagToRemove: string) => {
    setDraftUnitTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  const handleToggleAssignee = (userId: string) => {
    setDraftAssigneeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  // Filter users based on search
  const filteredUsers = allUsers.filter((u) => {
    if (!debouncedAssigneeSearch.trim()) return true;
    const q = debouncedAssigneeSearch.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.unit_name || '').toLowerCase().includes(q)
    );
  });

  const handleOpenConfirmSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isDirty || !draftTitle.trim()) return;
    setIsConfirmModalOpen(true);
  };

  const handleConfirmSave = async () => {
    if (!task) return;
    setIsSaving(true);

    try {
      const payload = {
        id: task.id,
        title: draftTitle.trim(),
        description: draftDesc.trim() || null,
        customer: draftCustomer.trim() || null,
        unit_tags: draftUnitTags,
        assignee_ids: draftAssigneeIds,
        column_id: draftColumnId,
        priority: draftPriority,
        start_date: draftStartDate || null,
        due_date: draftDueDate || null,
      };

      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const updatedAssignees = allUsers.filter((u) => draftAssigneeIds.includes(u.id));

        setTask({
          ...task,
          title: draftTitle.trim(),
          description: draftDesc.trim() || null,
          customer: draftCustomer.trim() || null,
          unit_tags: draftUnitTags,
          assignees: updatedAssignees,
          column_id: draftColumnId,
          priority: draftPriority,
          start_date: draftStartDate || null,
          due_date: draftDueDate || null,
        });

        setIsConfirmModalOpen(false);
        setSaveSuccessMessage(true);
        setTimeout(() => setSaveSuccessMessage(false), 3000);
        await fetchBoardData();

        // Refresh activities log
        try {
          const actRes = await fetch(`/api/tasks/${selectedTaskId}`);
          const actData = await actRes.json();
          if (actData.activities) {
            setActivities(actData.activities);
          }
        } catch (e) {
          console.error('Failed to reload activities', e);
        }
      } else {
        alert('Gagal menyimpan perubahan tugas');
      }
    } catch (err) {
      console.error('Failed to update task', err);
      alert('Terjadi kesalahan saat menyimpan perubahan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!task) return;
    if (!confirm('Apakah Anda yakin ingin menghapus tugas ini secara permanen?')) return;

    try {
      await fetch(`/api/tasks?id=${task.id}`, { method: 'DELETE' });
      closeTaskSheet();
      fetchBoardData();
    } catch (err) {
      console.error('Failed to delete task', err);
    }
  };

  const handleSelectCommentImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Hanya berkas gambar (PNG, JPG, WEBP, GIF, SVG) yang diperbolehkan di diskusi!');
      if (commentImageInputRef.current) commentImageInputRef.current.value = '';
      return;
    }
    const preview = URL.createObjectURL(file);
    setCommentImage({ file, preview });
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newComment.trim() && !commentImage) || !task || !activeUser || isSubmittingComment) return;

    setIsSubmittingComment(true);
    try {
      let uploadedImageUrl: string | null = null;
      if (commentImage) {
        setIsUploadingCommentImage(true);
        const formData = new FormData();
        formData.append('file', commentImage.file);
        const uploadRes = await fetch('/api/upload/image', {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || uploadData.error) {
          alert(uploadData.error || 'Gagal mengunggah gambar');
          setIsSubmittingComment(false);
          setIsUploadingCommentImage(false);
          return;
        }
        uploadedImageUrl = uploadData.url;
      }

      const res = await fetch(`/api/tasks/${task.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newComment.trim(),
          imageUrl: uploadedImageUrl,
        }),
      });
      const data = await res.json();
      if (data.comment) {
        setComments((prev) => [...prev, data.comment]);
        setNewComment('');
        setCommentImage(null);
        if (commentImageInputRef.current) commentImageInputRef.current.value = '';
        fetchBoardData();
      }
    } catch (err) {
      console.error('Failed to add comment', err);
    } finally {
      setIsSubmittingComment(false);
      setIsUploadingCommentImage(false);
    }
  };

  const priorityLabelStyles: Record<Priority, string> = {
    Low: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700',
    Medium: 'bg-blue-100 dark:bg-blue-950 text-[#034694] dark:text-blue-300 border-blue-300 dark:border-blue-800',
    High: 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    Urgent: 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={() => {
          if (isDirty) {
            if (confirm('Ada perubahan yang belum disimpan. Yakin ingin keluar?')) {
              closeTaskSheet();
            }
          } else {
            closeTaskSheet();
          }
        }}
      />

      {/* Sheet Panel */}
      <div className="relative w-full max-w-xl bg-white dark:bg-[#111726] h-full shadow-2xl flex flex-col z-10 border-l border-[#cbd5e1] dark:border-[#1e2a3f] animate-in slide-in-from-right duration-200">
        {/* Header Bar */}
        <div className="h-16 px-4 sm:px-6 border-b border-[#cbd5e1] dark:border-[#1e2a3f] flex items-center justify-between bg-[#f8fafc] dark:bg-[#0d1424] shrink-0">
          <div className="flex items-center gap-2 text-xs font-bold text-[#034694] dark:text-blue-400">
            <FolderKanban className="w-4 h-4" />
            <span className="truncate">Detail Tugas & Kolaborasi Multi-Unit</span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={handleDeleteTask}
              className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
              title="Hapus tugas ini"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (isDirty) {
                  if (confirm('Ada perubahan yang belum disimpan. Yakin ingin keluar?')) {
                    closeTaskSheet();
                  }
                } else {
                  closeTaskSheet();
                }
              }}
              className="p-2 text-[#64748b] hover:bg-[#e2e8f0] dark:hover:bg-[#1e293b] hover:text-[#0f172a] dark:hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Tutup sheet"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Alert Banner */}
        {saveSuccessMessage && (
          <div className="bg-emerald-50 dark:bg-emerald-950/60 border-b border-emerald-200 dark:border-emerald-800 px-4 sm:px-6 py-2.5 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 font-bold animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Perubahan tugas berhasil disimpan ke database!</span>
          </div>
        )}

        {/* Unsaved Changes Banner */}
        {isDirty && (
          <div className="bg-amber-50 dark:bg-amber-950/60 border-b border-amber-300 dark:border-amber-800/80 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-2 text-xs text-amber-900 dark:text-amber-200 animate-in fade-in">
            <div className="flex items-center gap-2 font-bold truncate">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="truncate">Ada perubahan belum disimpan.</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleResetDraft}
                className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 rounded-md transition-colors cursor-pointer"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => handleOpenConfirmSave()}
                className="px-3 py-1 bg-[#034694] hover:bg-[#023470] text-white font-bold rounded-md text-[11px] flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer active:scale-95"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan</span>
              </button>
            </div>
          </div>
        )}

        {/* Body Content */}
        {loading || !task ? (
          <div className="flex-1 flex items-center justify-center text-xs text-[#94a3b8]">
            Memuat data tugas...
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-5 sm:space-y-6">
            {/* Title Input */}
            <div>
              <label className="text-xs font-bold text-[#64748b] dark:text-[#94a3b8] block mb-1">
                Judul Tugas
              </label>
              <input
                type="text"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                className="w-full text-base font-bold text-[#0f172a] dark:text-white bg-transparent border-b border-[#cbd5e1] dark:border-[#2b3b55] focus:border-[#034694] dark:focus:border-blue-400 focus:outline-none py-1.5 transition-colors"
                placeholder="Judul tugas..."
              />
            </div>

            {/* Kolom Customer / Klien */}
            <div className="p-4 rounded-xl bg-[#f8fafc] dark:bg-[#162032] border border-[#cbd5e1] dark:border-[#2b3b55]">
              <label className="text-xs font-bold text-[#0f172a] dark:text-white flex items-center gap-2 mb-1.5">
                <Briefcase className="w-4 h-4 text-[#034694] dark:text-blue-400" />
                <span>Kolom Customer / Klien Rekanan</span>
              </label>
              <input
                type="text"
                value={draftCustomer}
                onChange={(e) => setDraftCustomer(e.target.value)}
                placeholder="Nama Customer (Contoh: PT Telkom Indonesia, RS Medika Utama, Bank Mandiri)..."
                className="w-full px-3 py-2 bg-white dark:bg-[#101726] border border-[#cbd5e1] dark:border-[#334460] rounded-lg text-xs font-semibold text-[#0f172a] dark:text-white placeholder-[#94a3b8] focus:outline-none focus:border-[#034694]"
              />
            </div>

            {/* Kolom Tags Unit (Input Save to Master Table & Similarity Notification) */}
            <div className="p-4 rounded-xl bg-[#f8fafc] dark:bg-[#162032] border border-[#cbd5e1] dark:border-[#2b3b55]">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-[#0f172a] dark:text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#034694] dark:text-blue-400" />
                  <span>Tags Unit Terkait (Tersimpan ke Table Units):</span>
                </label>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#e0edfb] dark:bg-[#1e293b] text-[#034694] dark:text-blue-300">
                  {draftUnitTags.length} Unit Dipilih
                </span>
              </div>

              {/* Selected Tag chips */}
              <div className="flex flex-wrap gap-2 mb-3">
                {draftUnitTags.length === 0 ? (
                  <span className="text-xs text-[#94a3b8] italic">Belum ada unit terkait yang dipilih</span>
                ) : (
                  draftUnitTags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-[#034694] text-white flex items-center gap-1.5 border border-[#034694] shadow-2xs"
                    >
                      <Tag className="w-3 h-3 text-white" />
                      <span>#{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveUnitTag(tag)}
                        className="p-0.5 hover:bg-rose-500 rounded"
                        title="Hapus unit ini"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </span>
                  ))
                )}
              </div>

              {/* Input field to add or auto-save unit */}
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
                  placeholder="Ketik nama unit baru lalu tekan Enter / Tambah..."
                  className="flex-1 px-3 py-1.5 bg-white dark:bg-[#101726] border border-[#cbd5e1] dark:border-[#334460] rounded-lg text-xs text-[#0f172a] dark:text-white placeholder-[#94a3b8] focus:outline-none focus:border-[#034694]"
                />
                <button
                  type="button"
                  onClick={() => handleAddUnitTag()}
                  className="px-3.5 py-1.5 bg-[#034694] hover:bg-[#023470] text-white text-xs font-bold rounded-lg shadow-2xs transition-colors shrink-0"
                >
                  + Tambah
                </button>
              </div>

              {/* Similarity Alert Notification */}
              {similarUnitMatch && (
                <div className="mt-2.5 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-[11px] flex items-center justify-between gap-2 animate-in fade-in">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>{similarUnitMatch.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddUnitTag(similarUnitMatch.unit.code)}
                    className="px-2 py-0.5 bg-amber-600 text-white font-bold rounded text-[10px] hover:bg-amber-700 shrink-0"
                  >
                    Gunakan #{similarUnitMatch.unit.code}
                  </button>
                </div>
              )}

              {/* Notice banner */}
              {unitNotice && (
                <div className="mt-2.5 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[11px] flex items-center gap-1.5 animate-in fade-in">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{unitNotice}</span>
                </div>
              )}
            </div>

            {/* Kolom Assignees (Penugasan Tim dengan Fitur Search) */}
            <div className="p-4 rounded-xl bg-[#f8fafc] dark:bg-[#162032] border border-[#cbd5e1] dark:border-[#2b3b55]">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-[#0f172a] dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#034694] dark:text-blue-400" />
                  <span>Kolom Assignees ({draftAssigneeIds.length} Ditugaskan)</span>
                </label>
              </div>

              {/* Selected Assignees Chips */}
              {draftAssigneeIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {draftAssigneeIds.map((id) => {
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
                          onClick={() => handleToggleAssignee(u.id)}
                          className="p-0.5 hover:text-rose-500 rounded-full"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Search Box for Assignees */}
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 text-[#94a3b8] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={assigneeSearch}
                  onChange={(e) => setAssigneeSearch(e.target.value)}
                  placeholder="Cari anggota tim berdasarkan nama, email, unit..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-[#101726] border border-[#cbd5e1] dark:border-[#334460] rounded-lg text-xs text-[#0f172a] dark:text-white placeholder-[#94a3b8] focus:outline-none focus:border-[#034694]"
                />
              </div>

              {/* Filtered list */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {filteredUsers.length === 0 ? (
                  <div className="col-span-2 p-3 text-center text-xs text-[#94a3b8] italic">
                    Tidak ada anggota yang cocok dengan "{assigneeSearch}"
                  </div>
                ) : (
                  filteredUsers.map((u) => {
                    const isAssigned = draftAssigneeIds.includes(u.id);
                    return (
                      <button
                        type="button"
                        key={u.id}
                        onClick={() => handleToggleAssignee(u.id)}
                        className={cn(
                          'flex items-center justify-between p-2 rounded-lg text-left text-xs transition-all border',
                          isAssigned
                            ? 'bg-[#e0edfb]/80 dark:bg-[#17253d] border-[#034694] dark:border-blue-500 font-bold text-[#034694] dark:text-blue-300'
                            : 'bg-white dark:bg-[#101726] border-[#cbd5e1] dark:border-[#2d3d56] text-[#475569] dark:text-[#cbd5e1] hover:border-[#94a3b8]'
                        )}
                      >
                        <div className="flex items-center gap-2 truncate mr-1">
                          {u.avatar_url ? (
                            <img
                              src={u.avatar_url}
                              alt={u.name}
                              className="w-6 h-6 rounded-full object-cover ring-1 ring-[#cbd5e1]"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-[#034694] text-white flex items-center justify-center text-[10px] font-bold">
                              {u.name.charAt(0)}
                            </div>
                          )}
                          <div className="truncate">
                            <div className="truncate">{u.name}</div>
                            <div className="text-[9px] text-[#94a3b8] font-normal">
                              #{u.unit_name || 'IT'}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0">
                          {isAssigned ? (
                            <div className="w-5 h-5 rounded-full bg-[#034694] text-white flex items-center justify-center">
                              <Check className="w-3 h-3" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full border border-[#cbd5e1] dark:border-[#334460]" />
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Properties Grid: Status, Priority, Start Date, Due Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-[#f8fafc] dark:bg-[#162032] border border-[#cbd5e1] dark:border-[#2b3b55] text-xs">
              {/* Status / Column */}
              <div>
                <label className="text-[11px] font-bold text-[#64748b] dark:text-[#94a3b8] block mb-1">
                  Status Kolom
                </label>
                <select
                  value={draftColumnId}
                  onChange={(e) => setDraftColumnId(e.target.value)}
                  className="w-full bg-white dark:bg-[#101726] border border-[#cbd5e1] dark:border-[#334460] rounded-lg px-2.5 py-2 text-xs text-[#0f172a] dark:text-white font-medium focus:outline-none focus:border-[#034694]"
                >
                  {columns.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="text-[11px] font-bold text-[#64748b] dark:text-[#94a3b8] block mb-1">
                  Label Prioritas
                </label>
                <select
                  value={draftPriority}
                  onChange={(e) => setDraftPriority(e.target.value as Priority)}
                  className="w-full bg-white dark:bg-[#101726] border border-[#cbd5e1] dark:border-[#334460] rounded-lg px-2.5 py-2 text-xs text-[#0f172a] dark:text-white font-medium focus:outline-none focus:border-[#034694]"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="text-[11px] font-bold text-[#64748b] dark:text-[#94a3b8] block mb-1">
                  Tanggal Mulai
                </label>
                <input
                  type="date"
                  value={draftStartDate}
                  onChange={(e) => setDraftStartDate(e.target.value)}
                  className="w-full bg-white dark:bg-[#101726] border border-[#cbd5e1] dark:border-[#334460] rounded-lg px-2.5 py-2 text-xs text-[#0f172a] dark:text-white font-medium focus:outline-none focus:border-[#034694]"
                />
              </div>

              {/* Due Date */}
              <div>
                <label className="text-[11px] font-bold text-[#64748b] dark:text-[#94a3b8] block mb-1">
                  Tanggal Tenggat (Deadline)
                </label>
                <input
                  type="date"
                  value={draftDueDate}
                  onChange={(e) => setDraftDueDate(e.target.value)}
                  className="w-full bg-white dark:bg-[#101726] border border-[#cbd5e1] dark:border-[#334460] rounded-lg px-2.5 py-2 text-xs text-[#0f172a] dark:text-white font-medium focus:outline-none focus:border-[#034694]"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-bold text-[#0f172a] dark:text-white block mb-1.5">
                Deskripsi Tugas
              </label>
              <textarea
                rows={3}
                value={draftDesc}
                onChange={(e) => setDraftDesc(e.target.value)}
                placeholder="Tambahkan detail keterangan untuk tugas ini..."
                className="w-full p-3 bg-white dark:bg-[#162032] border border-[#cbd5e1] dark:border-[#2b3b55] rounded-xl text-xs text-[#0f172a] dark:text-white placeholder-[#94a3b8] focus:outline-none focus:border-[#034694] dark:focus:border-blue-500 leading-relaxed resize-none"
              />
            </div>

            {/* Explicit Save Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#cbd5e1] dark:border-[#1e2a3f]">
              <button
                type="button"
                onClick={handleResetDraft}
                disabled={!isDirty}
                className="px-4 py-2 border border-[#cbd5e1] dark:border-[#2b3b55] disabled:opacity-40 text-[#475569] dark:text-[#cbd5e1] hover:bg-[#f1f5f9] dark:hover:bg-[#162032] rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Batal Perubahan</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenConfirmSave()}
                disabled={!isDirty || isSaving}
                className="px-5 py-2 bg-[#034694] hover:bg-[#023470] disabled:bg-[#cbd5e1] dark:disabled:bg-[#1e2a3f] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Perubahan</span>
              </button>
            </div>

            {/* Sub-tasks Section */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-[#0f172a] dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#034694] dark:text-blue-400" />
                  Sub-tasks ({task.sub_tasks?.length || 0})
                </label>
                <button
                  type="button"
                  onClick={() => openCreateModal(task.column_id, task.id)}
                  className="text-xs text-[#034694] dark:text-blue-400 hover:underline font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Sub-task</span>
                </button>
              </div>

              <div className="space-y-1.5">
                {task.sub_tasks && task.sub_tasks.length > 0 ? (
                  task.sub_tasks.map((sub) => (
                    <div
                      key={sub.id}
                      className="p-2.5 rounded-lg bg-[#f8fafc] dark:bg-[#162032] border border-[#cbd5e1] dark:border-[#2b3b55] flex items-center justify-between text-xs hover:bg-[#f1f5f9] dark:hover:bg-[#1a2538] transition-colors"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Circle className="w-3 h-3 text-[#94a3b8]" />
                        <span className="font-semibold text-[#0f172a] dark:text-white truncate">
                          {sub.title}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#475569] dark:text-[#94a3b8] bg-white dark:bg-[#101726] px-2 py-0.5 rounded border border-[#cbd5e1] dark:border-[#2b3b55]">
                        {sub.priority}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-[#94a3b8] italic p-3 bg-[#f8fafc] dark:bg-[#162032]/40 rounded-xl border border-dashed border-[#cbd5e1] dark:border-[#2b3b55] text-center">
                    Belum ada sub-task. Tambahkan sub-task untuk memecah pekerjaan kompleks.
                  </div>
                )}
              </div>
            </div>

            {/* Lampiran Berkas (Attachments) Section */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-[#0f172a] dark:text-white flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-[#034694] dark:text-blue-400" />
                    Lampiran Berkas ({attachments.length})
                  </label>
                  <span className="text-[10px] font-semibold text-[#64748b] dark:text-[#94a3b8] hidden sm:inline">
                    (IMG, DOC, PDF, MD, XLS, ZIP)
                  </span>
                </div>

                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".png,.jpg,.jpeg,.webp,.gif,.doc,.docx,.pdf,.md,.markdown,.xls,.xlsx,.csv,.zip,.rar,.7z,.tar,.gz,image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,application/zip,application/x-zip-compressed,application/x-rar-compressed,application/x-7z-compressed,text/markdown"
                    onChange={handleFileUpload}
                  />
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#034694] hover:bg-[#023470] disabled:bg-[#94a3b8] text-white rounded-lg text-xs font-bold shadow-2xs transition-all cursor-pointer"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Mengunggah...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Berkas</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Upload Notification Banners */}
              {uploadError && (
                <div className="mb-2.5 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>{uploadError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadError(null)}
                    className="text-rose-400 hover:text-rose-700"
                  >
                    ×
                  </button>
                </div>
              )}

              {uploadSuccess && (
                <div className="mb-2.5 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span>{uploadSuccess}</span>
                </div>
              )}

              {/* Attachments List */}
              <div className="space-y-2">
                {attachments.length === 0 ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-4 rounded-xl border border-dashed border-[#cbd5e1] dark:border-[#2b3b55] hover:border-[#034694] dark:hover:border-blue-500 bg-[#f8fafc]/60 dark:bg-[#162032]/40 text-center cursor-pointer transition-colors group"
                  >
                    <Upload className="w-5 h-5 mx-auto text-[#94a3b8] group-hover:text-[#034694] dark:group-hover:text-blue-400 mb-1.5 transition-colors" />
                    <p className="text-xs font-semibold text-[#475569] dark:text-[#cbd5e1]">
                      Klik untuk mengunggah dokumen, spreadsheet, arsip, atau gambar
                    </p>
                    <p className="text-[10px] text-[#94a3b8] mt-0.5">
                      Mendukung format: Gambar (PNG, JPG, WEBP), PDF, Word, Excel (XLSX, CSV), Arsip (ZIP, RAR, 7Z), dan MD maks 50 MB (gambar otomatis terkompresi)
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {attachments.map((att) => {
                      const badge = getFileCategoryBadge(att.file_type);
                      const isImg = att.file_type === 'image';
                      return (
                        <div
                          key={att.id}
                          className="p-2.5 rounded-xl bg-white dark:bg-[#121929] border border-[#cbd5e1] dark:border-[#25354e] hover:border-[#94a3b8] dark:hover:border-[#384d70] flex items-center justify-between gap-2.5 shadow-2xs transition-all group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {/* Icon or Thumbnail */}
                            <div className="w-9 h-9 rounded-lg bg-[#f1f5f9] dark:bg-[#1a2538] flex items-center justify-center shrink-0 overflow-hidden border border-[#e2e8f0] dark:border-[#2b3b55]">
                              {isImg ? (
                                <img
                                  src={att.file_url}
                                  alt={att.file_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : att.file_type === 'pdf' ? (
                                <FileText className="w-4 h-4 text-rose-500" />
                              ) : att.file_type === 'doc' ? (
                                <FileText className="w-4 h-4 text-blue-500" />
                              ) : att.file_type === 'excel' ? (
                                <FileSpreadsheet className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                              ) : att.file_type === 'zip' ? (
                                <Archive className="w-4 h-4 text-amber-500" />
                              ) : (
                                <FileCode className="w-4 h-4 text-purple-500" />
                              )}
                            </div>

                            {/* Meta info */}
                            <div className="min-w-0 flex-1">
                              <a
                                href={att.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-bold text-xs text-[#0f172a] dark:text-white truncate block hover:text-[#034694] dark:hover:text-blue-400 transition-colors"
                                title={att.file_name}
                              >
                                {att.file_name}
                              </a>
                              <div className="flex items-center gap-1.5 text-[10px] text-[#94a3b8] mt-0.5 flex-wrap">
                                <span className={cn('px-1 py-0.2 rounded font-extrabold border text-[9px]', badge.color)}>
                                  {badge.label}
                                </span>
                                <span>{formatFileSize(att.file_size)}</span>
                                {att.uploader?.name && (
                                  <>
                                    <span>•</span>
                                    <span className="truncate max-w-[80px]">
                                      {att.uploader.name}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1 shrink-0">
                            <a
                              href={att.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={att.file_name}
                              className="p-1.5 rounded-md text-[#475569] dark:text-[#94a3b8] hover:text-[#034694] dark:hover:text-blue-400 hover:bg-[#f1f5f9] dark:hover:bg-[#1f2d44] transition-colors"
                              title="Buka / Unduh Berkas"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                            <button
                              type="button"
                              onClick={() => handleDeleteAttachment(att.id)}
                              className="p-1.5 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title="Hapus Lampiran"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Discussion & Activities Stream Section */}
            <div className="pt-4 border-t border-[#cbd5e1] dark:border-[#1e2a3f]">
              {/* Tab Switcher */}
              <div className="flex items-center justify-between border-b border-[#cbd5e1] dark:border-[#1e2a3f] pb-2 mb-3">
                <div className="flex items-center gap-1.5 p-1 bg-[#f1f5f9] dark:bg-[#162032] rounded-xl border border-[#cbd5e1]/60 dark:border-[#2b3b55]/60">
                  <button
                    type="button"
                    onClick={() => setActiveLogTab('activities')}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                      activeLogTab === 'activities'
                        ? 'bg-white dark:bg-[#0f172a] text-[#034694] dark:text-blue-400 shadow-2xs'
                        : 'text-[#64748b] dark:text-[#94a3b8] hover:text-[#0f172a] dark:hover:text-white'
                    )}
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Riwayat Log ({activities.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveLogTab('comments')}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                      activeLogTab === 'comments'
                        ? 'bg-white dark:bg-[#0f172a] text-[#034694] dark:text-blue-400 shadow-2xs'
                        : 'text-[#64748b] dark:text-[#94a3b8] hover:text-[#0f172a] dark:hover:text-white'
                    )}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Diskusi ({comments.length})</span>
                  </button>
                </div>
              </div>

              {/* Tab 1: Activities / Audit Logs */}
              {activeLogTab === 'activities' ? (
                <div className="space-y-3 mb-4 max-h-72 overflow-y-auto pr-1">
                  {activities.length === 0 ? (
                    <div className="text-xs text-[#94a3b8] text-center py-6 bg-[#f8fafc] dark:bg-[#162032]/40 rounded-xl border border-dashed border-[#cbd5e1] dark:border-[#2b3b55]">
                      Belum ada riwayat aktivitas yang tercatat.
                    </div>
                  ) : (
                    <div className="relative pl-5 space-y-3.5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#e2e8f0] dark:before:bg-[#1e293b]">
                      {activities.map((act) => {
                        const isCreateTask = act.action === 'create_task';
                        const isCreateBoard = act.action === 'create_board';
                        const isMove = act.action === 'move_task';
                        const isUpload = act.action === 'upload_attachment';
                        const isDelete = act.action === 'delete_attachment';

                        return (
                          <div key={act.id} className="relative text-xs">
                            {/* Dot Icon */}
                            <div
                              className={cn(
                                'absolute -left-5 top-1 w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-[#111726]',
                                isCreateTask || isCreateBoard
                                  ? 'bg-emerald-500 text-white'
                                  : isMove
                                  ? 'bg-indigo-500 text-white'
                                  : isUpload
                                  ? 'bg-teal-500 text-white'
                                  : isDelete
                                  ? 'bg-rose-500 text-white'
                                  : 'bg-[#034694] text-white'
                              )}
                            >
                              {isCreateTask ? (
                                <Check className="w-2.5 h-2.5" />
                              ) : isCreateBoard ? (
                                <FolderKanban className="w-2.5 h-2.5" />
                              ) : isMove ? (
                                <ArrowRight className="w-2.5 h-2.5" />
                              ) : isUpload ? (
                                <Paperclip className="w-2.5 h-2.5" />
                              ) : (
                                <History className="w-2.5 h-2.5" />
                              )}
                            </div>

                            {/* Activity Card */}
                            <div className="bg-[#f8fafc] dark:bg-[#162032] p-2.5 rounded-xl border border-[#cbd5e1] dark:border-[#2b3b55] space-y-1.5 shadow-2xs">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-1.5">
                                  {act.user?.avatar_url ? (
                                    <img
                                      src={act.user.avatar_url}
                                      alt={act.user.name}
                                      className="w-4 h-4 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-4 h-4 rounded-full bg-[#034694] text-white flex items-center justify-center text-[8px] font-bold">
                                      {act.user?.name?.charAt(0) || 'U'}
                                    </div>
                                  )}
                                  <span className="font-extrabold text-[#0f172a] dark:text-white">
                                    {isCreateTask
                                      ? `Dibuat oleh ${act.user?.name || 'Admin'}`
                                      : isCreateBoard
                                      ? `Papan Kerja Dibuat oleh ${act.user?.name || 'Admin'}`
                                      : `Diubah oleh ${act.user?.name || 'Pengguna'}`}
                                  </span>
                                  {act.user?.role && (
                                    <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-750 text-slate-700 dark:text-slate-300 uppercase">
                                      {act.user.role}
                                    </span>
                                  )}
                                  {act.user?.unit_name && (
                                    <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-blue-100 dark:bg-blue-950 text-[#034694] dark:text-blue-300">
                                      #{act.user.unit_name}
                                    </span>
                                  )}
                                </div>

                                <span className="text-[10px] text-[#94a3b8]">
                                  {formatDate(act.created_at)}
                                </span>
                              </div>

                              {/* Summary */}
                              {act.details?.summary && (
                                <p className="text-[11px] font-medium text-[#475569] dark:text-[#94a3b8]">
                                  {act.details.summary}
                                </p>
                              )}

                              {/* Changes with diff */}
                              {act.details?.changes && act.details.changes.length > 0 && (
                                <div className="mt-1.5 pt-1.5 border-t border-[#e2e8f0] dark:border-[#2b3b55] space-y-1">
                                  {act.details.changes.map((ch, idx) => (
                                    <div key={idx} className="text-[10.5px] flex items-center gap-1.5 flex-wrap">
                                      <span className="font-bold text-[#64748b] dark:text-[#94a3b8]">
                                        {ch.field}:
                                      </span>
                                      {ch.old !== undefined && (
                                        <span className="line-through text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/80 px-1 py-0.2 rounded text-[10px]">
                                          {String(ch.old)}
                                        </span>
                                      )}
                                      {ch.old !== undefined && ch.new !== undefined && (
                                        <ArrowRight className="w-2.5 h-2.5 text-slate-400" />
                                      )}
                                      {ch.new !== undefined && (
                                        <span className="font-extrabold text-[#034694] dark:text-blue-300 bg-[#e0edfb]/80 dark:bg-blue-950/70 px-1.5 py-0.2 rounded text-[10px] border border-blue-200 dark:border-blue-900/60">
                                          {String(ch.new)}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* Tab 2: Comments Stream & Form */
                <>
                  <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-1">
                    {comments.length === 0 ? (
                      <div className="text-xs text-[#94a3b8] text-center py-4 bg-[#f8fafc] dark:bg-[#162032]/40 rounded-xl">
                        Belum ada komentar. Mulai percakapan di sini!
                      </div>
                    ) : (
                      comments.map((comm) => (
                        <div key={comm.id} className="flex items-start gap-2.5 text-xs">
                          {comm.user?.avatar_url ? (
                            <img
                              src={comm.user.avatar_url}
                              alt={comm.user.name}
                              className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5 ring-1 ring-[#cbd5e1]"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-[#034694] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                              {comm.user?.name?.charAt(0) || 'U'}
                            </div>
                          )}
                          <div className="flex-1 bg-[#f8fafc] dark:bg-[#162032] p-2.5 rounded-xl border border-[#cbd5e1] dark:border-[#2b3b55]">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-[#0f172a] dark:text-white">
                                {comm.user?.name || 'Anggota Tim'}
                              </span>
                              <span className="text-[10px] text-[#94a3b8]">
                                {formatDate(comm.created_at)}
                              </span>
                            </div>
                            {comm.image_url && (
                              <div className="mb-1.5 rounded-lg overflow-hidden border border-[#cbd5e1] dark:border-[#2b3b55] max-w-xs">
                                <a href={comm.image_url} target="_blank" rel="noopener noreferrer">
                                  <img
                                    src={comm.image_url}
                                    alt="Lampiran diskusi"
                                    className="w-full max-h-56 object-cover hover:opacity-90 transition-opacity cursor-pointer bg-black/5 dark:bg-white/5"
                                  />
                                </a>
                              </div>
                            )}
                            {comm.content && comm.content !== '[Gambar]' && (
                              <p className="text-[#334155] dark:text-[#cbd5e1] leading-relaxed text-[11px]">
                                {comm.content}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Comment Input */}
                  <form onSubmit={handleAddComment} className="space-y-2">
                    {commentImage && (
                      <div className="flex items-center gap-2 p-1.5 bg-[#f1f5f9] dark:bg-[#1a2538] rounded-lg border border-[#cbd5e1] dark:border-[#2b3b55] w-fit">
                        <img
                          src={commentImage.preview}
                          alt="Pratinjau gambar"
                          className="w-10 h-10 object-cover rounded-md border border-white/20"
                        />
                        <div className="text-[10px] text-[#475569] dark:text-[#cbd5e1] max-w-[150px] truncate">
                          {commentImage.file.name}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setCommentImage(null);
                            if (commentImageInputRef.current) commentImageInputRef.current.value = '';
                          }}
                          className="text-rose-500 hover:text-rose-700 text-xs px-1 font-bold cursor-pointer"
                          title="Batalkan gambar"
                        >
                          ×
                        </button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        ref={commentImageInputRef}
                        type="file"
                        accept=".png,.jpg,.jpeg,.webp,.gif"
                        className="hidden"
                        onChange={handleSelectCommentImage}
                      />
                      <textarea
                        rows={2}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Tulis komentar atau unggah gambar untuk tim..."
                        className="flex-1 p-2.5 bg-white dark:bg-[#162032] border border-[#cbd5e1] dark:border-[#2b3b55] rounded-xl text-xs text-[#0f172a] dark:text-white placeholder-[#94a3b8] focus:outline-none focus:border-[#034694] dark:focus:border-blue-500 resize-none"
                      />
                      <div className="flex flex-col gap-1 self-end">
                        <button
                          type="button"
                          onClick={() => commentImageInputRef.current?.click()}
                          className="p-2 border border-[#cbd5e1] dark:border-[#2b3b55] hover:border-[#034694] dark:hover:border-blue-500 text-[#64748b] hover:text-[#034694] dark:text-[#94a3b8] dark:hover:text-blue-400 bg-white dark:bg-[#162032] rounded-xl text-xs flex items-center justify-center transition-colors cursor-pointer"
                          title="Unggah Gambar ke Diskusi"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="submit"
                          disabled={(!newComment.trim() && !commentImage) || isSubmittingComment || isUploadingCommentImage}
                          className="px-3 py-2 bg-[#034694] hover:bg-[#023470] disabled:bg-[#cbd5e1] dark:disabled:bg-[#1e2a3f] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          title="Kirim Komentar"
                        >
                          {isSubmittingComment || isUploadingCommentImage ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100">
          <div
            className="bg-white dark:bg-[#111726] rounded-2xl border border-[#cbd5e1] dark:border-[#1e2a3f] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#034694] dark:text-blue-400 mx-auto flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-500" />
              </div>

              <div>
                <h4 className="text-sm font-extrabold text-[#0f172a] dark:text-white">
                  Konfirmasi Simpan Perubahan
                </h4>
                <p className="text-xs text-[#475569] dark:text-[#94a3b8] mt-1">
                  Apakah Anda yakin ingin menyimpan perubahan data pada tugas ini?
                </p>
              </div>

              {/* Summary of changes */}
              <div className="bg-[#f8fafc] dark:bg-[#162032] p-3 rounded-xl border border-[#cbd5e1] dark:border-[#2b3b55] text-left text-[11px] space-y-1.5 text-[#334155] dark:text-[#cbd5e1]">
                <div className="font-bold text-[#0f172a] dark:text-white truncate">
                  "{draftTitle}"
                </div>
                {draftCustomer && (
                  <div>
                    <span className="text-[#64748b] dark:text-[#94a3b8]">Customer:</span>{' '}
                    <span className="font-bold">{draftCustomer}</span>
                  </div>
                )}
                <div>
                  <span className="text-[#64748b] dark:text-[#94a3b8]">Unit Tags:</span>{' '}
                  {draftUnitTags.length > 0 ? (
                    <span className="font-bold text-[#034694] dark:text-blue-300">
                      {draftUnitTags.map((t) => `#${t}`).join(', ')}
                    </span>
                  ) : (
                    'Belum ada tag unit'
                  )}
                </div>
                <div>
                  <span className="text-[#64748b] dark:text-[#94a3b8]">Assignees:</span>{' '}
                  <span className="font-bold">{draftAssigneeIds.length} Anggota</span>
                </div>
                <div>
                  <span className="text-[#64748b] dark:text-[#94a3b8]">Prioritas:</span> {draftPriority}
                </div>
                <div>
                  <span className="text-[#64748b] dark:text-[#94a3b8]">Tanggal:</span>{' '}
                  {draftStartDate || 'Belum diatur'} s/d {draftDueDate || 'Belum diatur'}
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmModalOpen(false)}
                  disabled={isSaving}
                  className="w-1/2 px-3 py-2 border border-[#cbd5e1] dark:border-[#2b3b55] text-[#475569] dark:text-[#cbd5e1] hover:bg-[#f1f5f9] dark:hover:bg-[#162032] rounded-xl text-xs font-bold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSave}
                  disabled={isSaving}
                  className="w-1/2 px-3 py-2 bg-[#034694] hover:bg-[#023470] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                >
                  {isSaving ? (
                    <span>Menyimpan...</span>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Ya, Simpan</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
