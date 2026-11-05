'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Calendar,
  MessageSquare,
  CheckSquare,
  AlertCircle,
  GripVertical,
  ArrowRightLeft,
  Tag,
  Briefcase,
  Paperclip,
} from 'lucide-react';
import { Task } from '@/types';
import { cn, formatDate, isOverdue } from '@/lib/utils';
import { useKanbanStore } from '@/store/useKanbanStore';

interface TaskCardProps {
  task: Task;
  isOverlay?: boolean;
}

export function TaskCard({ task, isOverlay = false }: TaskCardProps) {
  const { openTaskSheet, columns, moveTask, currentProject } = useKanbanStore();

  const unitTag = currentProject?.name
    ? currentProject.name.includes('IT')
      ? 'IT'
      : currentProject.name.includes('Markom')
      ? 'Markom'
      : currentProject.name.includes('MFK')
      ? 'MFK'
      : currentProject.name.includes('PPSDM')
      ? 'PPSDM'
      : currentProject.name.split(' ')[0]
    : 'Umum';

  const tagsList: string[] =
    Array.isArray(task.unit_tags) && task.unit_tags.length > 0
      ? task.unit_tags
      : typeof task.unit_tags === 'string' && task.unit_tags.trim()
      ? (() => {
          try {
            const parsed = JSON.parse(task.unit_tags);
            return Array.isArray(parsed) && parsed.length > 0 ? parsed : [unitTag];
          } catch {
            const p = task.unit_tags.split(',').map((s: string) => s.trim()).filter(Boolean);
            return p.length > 0 ? p : [unitTag];
          }
        })()
      : [unitTag];

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: 'Task',
      task,
    },
    disabled: isOverlay,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const overdue = isOverdue(task.due_date);
  const subTasksCount = task.sub_tasks?.length || 0;
  const commentsCount = task.comments_count || 0;

  const priorityStyles = {
    Low: 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700',
    Medium: 'bg-blue-100 dark:bg-blue-950/80 text-[#034694] dark:text-blue-300 border-blue-300 dark:border-blue-800',
    High: 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    Urgent: 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800',
  };

  const handleQuickMove = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    const targetColId = e.target.value;
    if (targetColId && targetColId !== task.column_id) {
      await moveTask(task.id, targetColId, (task.position || 0) + 1000);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'group relative bg-white dark:bg-[#162032] border border-[#cbd5e1] dark:border-[#2b3b55] rounded-lg p-3.5 shadow-xs hover:shadow-md hover:border-[#034694] dark:hover:border-blue-500 transition-all cursor-grab active:cursor-grabbing select-none',
        isDragging && 'opacity-30 border-blue-600 ring-2 ring-blue-500/30 scale-95',
        isOverlay && 'shadow-2xl ring-2 ring-[#034694] dark:ring-blue-400 rotate-2 cursor-grabbing z-50 bg-white dark:bg-[#162032]'
      )}
      onClick={() => openTaskSheet(task.id)}
    >
      {/* Top Header: Unit Tag, Priority Label & Quick Move */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex flex-wrap items-center gap-1.5 overflow-hidden">
          {/* Units as Tags */}
          {tagsList.map((tg) => (
            <span
              key={tg}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#e0edfb] dark:bg-[#1e293b] text-[#034694] dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 shadow-2xs"
            >
              <Tag className="w-2.5 h-2.5 text-[#034694] dark:text-blue-400" />
              <span>#{tg}</span>
            </span>
          ))}

          {/* Priority as Label */}
          <span
            className={cn(
              'px-2 py-0.5 rounded text-[10px] font-bold border tracking-wide',
              priorityStyles[task.priority] || priorityStyles.Medium
            )}
          >
            Label: {task.priority}
          </span>

          {task.labels &&
            task.labels.map((lbl) => (
              <span
                key={lbl.id}
                className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white tracking-wide shadow-2xs"
                style={{ backgroundColor: lbl.color || '#034694' }}
              >
                {lbl.name}
              </span>
            ))}
        </div>

        {/* Quick Column Shift Selector */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1"
        >
          <div className="relative group/shift">
            <select
              value={task.column_id}
              onChange={handleQuickMove}
              aria-label="Pindahkan status tugas"
              className="text-[10px] font-semibold bg-[#f1f5f9] dark:bg-[#1e2a3f] text-[#475569] dark:text-[#94a3b8] border border-[#cbd5e1] dark:border-[#334460] rounded px-1.5 py-0.5 focus:outline-none focus:border-[#034694] cursor-pointer hover:bg-white dark:hover:bg-[#25354e]"
            >
              {columns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <div
            className="text-[#94a3b8] dark:text-[#64748b] hover:text-[#0f172a] dark:hover:text-white p-0.5 rounded cursor-grab"
            title="Tarik kartu untuk memindahkan kolom"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Customer Badge */}
      {task.customer && (
        <div className="flex items-center gap-1.5 text-[10px] text-[#034694] dark:text-blue-300 font-bold mb-1.5 truncate bg-blue-50/80 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900/40">
          <Briefcase className="w-3 h-3 text-[#034694] dark:text-blue-400 shrink-0" />
          <span className="truncate">{task.customer}</span>
        </div>
      )}

      {/* Task Title */}
      <h4 className="text-xs font-bold text-[#0f172a] dark:text-[#f8fafc] leading-snug line-clamp-2 mb-1.5 group-hover:text-[#034694] dark:group-hover:text-blue-400 transition-colors">
        {task.title}
      </h4>

      {/* Description Snippet */}
      {task.description && (
        <p className="text-[11px] text-[#475569] dark:text-[#94a3b8] line-clamp-2 mb-3 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Sub-tasks Progress Badge */}
      {subTasksCount > 0 && (
        <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-medium text-[#475569] dark:text-[#cbd5e1] bg-[#f1f5f9] dark:bg-[#101726] px-2 py-1 rounded border border-[#cbd5e1]/60 dark:border-[#223147]">
          <CheckSquare className="w-3.5 h-3.5 text-[#034694] dark:text-blue-400" />
          <span>{subTasksCount} sub-task</span>
        </div>
      )}

      {/* Bottom Row: Due date, comments, assignees */}
      <div className="flex items-center justify-between pt-2 border-t border-[#e2e8f0] dark:border-[#223147] mt-2 text-[11px] text-[#64748b] dark:text-[#94a3b8]">
        <div className="flex items-center gap-2.5">
          {/* Due date */}
          {task.due_date && (
            <div
              className={cn(
                'flex items-center gap-1 font-semibold text-[10px] px-1.5 py-0.5 rounded border',
                overdue
                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                  : 'bg-[#f8fafc] dark:bg-[#101726] text-[#475569] dark:text-[#cbd5e1] border-[#cbd5e1] dark:border-[#24334b]'
              )}
              title={overdue ? 'Tugas terlambat!' : 'Tenggat Waktu'}
            >
              {overdue ? (
                <AlertCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
              ) : (
                <Calendar className="w-3 h-3 text-[#64748b] dark:text-[#94a3b8]" />
              )}
              <span>{formatDate(task.due_date)}</span>
            </div>
          )}

          {/* Comments count */}
          {commentsCount > 0 && (
            <div className="flex items-center gap-1 font-medium text-[#475569] dark:text-[#cbd5e1]" title={`${commentsCount} Komentar`}>
              <MessageSquare className="w-3.5 h-3.5 text-[#94a3b8] dark:text-[#64748b]" />
              <span>{commentsCount}</span>
            </div>
          )}

          {/* Attachments count */}
          {((task.attachments_count || 0) > 0 || (task.attachments?.length || 0) > 0) && (
            <div
              className="flex items-center gap-1 font-medium text-[#475569] dark:text-[#cbd5e1]"
              title={`${task.attachments_count || task.attachments?.length || 0} Lampiran berkas`}
            >
              <Paperclip className="w-3 h-3 text-[#94a3b8] dark:text-[#64748b]" />
              <span>{task.attachments_count || task.attachments?.length || 0}</span>
            </div>
          )}
        </div>

        {/* Assignees stack */}
        <div className="flex items-center -space-x-1.5 overflow-hidden">
          {task.assignees?.map((a) => (
            <img
              key={a.id}
              src={a.avatar_url || ''}
              alt={a.name}
              title={a.name}
              className="w-5 h-5 rounded-full ring-2 ring-white dark:ring-[#162032] object-cover shadow-2xs"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
