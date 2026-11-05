'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { BoardColumn as IBoardColumn, Task } from '@/types';
import { TaskCard } from './TaskCard';
import { useKanbanStore } from '@/store/useKanbanStore';
import { cn } from '@/lib/utils';

interface BoardColumnProps {
  column: IBoardColumn;
  tasks: Task[];
}

export function BoardColumn({ column, tasks }: BoardColumnProps) {
  const { openCreateModal } = useKanbanStore();

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: 'Column',
      column,
    },
  });

  const taskIds = tasks.map((t) => t.id);

  return (
    <div className="w-[82vw] sm:w-80 shrink-0 flex flex-col max-h-full bg-[#e6ebf2] dark:bg-[#101726] rounded-xl border border-[#cbd5e1] dark:border-[#1e2a3f] select-none shadow-xs transition-colors">
      {/* Column Header */}
      <div className="p-3.5 border-b border-[#cbd5e1] dark:border-[#1e2a3f] flex items-center justify-between bg-[#edf2f7] dark:bg-[#131b2e] rounded-t-xl">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#034694] dark:bg-blue-400" />
          <h3 className="font-bold text-xs text-[#0f172a] dark:text-[#f8fafc] tracking-wide uppercase">
            {column.title}
          </h3>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#cbd5e1] dark:bg-[#1e2a3f] text-[#334155] dark:text-[#cbd5e1]">
            {tasks.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => openCreateModal(column.id)}
            className="p-1 rounded hover:bg-[#cbd5e1] dark:hover:bg-[#1e2a3f] text-[#475569] dark:text-[#94a3b8] hover:text-[#0f172a] dark:hover:text-white transition-colors"
            title="Tambah tugas ke kolom ini"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Droppable Task Cards Container */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 p-2.5 space-y-2.5 overflow-y-auto min-h-[160px] transition-colors rounded-b-xl',
          isOver && 'bg-[#e0edfb]/80 dark:bg-blue-950/40 ring-2 ring-[#034694] dark:ring-blue-500'
        )}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div
            onClick={() => openCreateModal(column.id)}
            className="h-28 border-2 border-dashed border-[#94a3b8] dark:border-[#2b3a52] rounded-lg flex flex-col items-center justify-center text-xs text-[#64748b] dark:text-[#94a3b8] hover:border-[#034694] dark:hover:border-blue-400 hover:text-[#034694] dark:hover:text-blue-400 cursor-pointer transition-colors bg-white/40 dark:bg-[#162032]/40"
          >
            <Plus className="w-4 h-4 mb-1" />
            <span className="font-semibold">Tarik kartu ke sini / Tambah</span>
          </div>
        )}
      </div>
    </div>
  );
}
