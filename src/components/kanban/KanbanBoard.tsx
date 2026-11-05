'use client';

import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { Plus, Building2, Layers, Tag, Clock } from 'lucide-react';
import { useKanbanStore } from '@/store/useKanbanStore';
import { BoardColumn } from './BoardColumn';
import { TaskCard } from './TaskCard';
import { Task } from '@/types';

export function KanbanBoard() {
  const {
    columns,
    allTasks,
    currentProject,
    searchQuery,
    priorityFilter,
    assigneeFilter,
    moveTask,
    fetchBoardData,
    setActiveView,
  } = useKanbanStore();

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColTitle, setNewColTitle] = useState('');

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 6,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = allTasks.find((t) => t.id === active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId === overId) return;

    // Check if dropped directly on a column or onto another task
    let targetColId = '';
    const overColumn = columns.find((c) => c.id === overId);

    if (overColumn) {
      targetColId = overColumn.id;
    } else {
      const overTask = allTasks.find((t) => t.id === overId);
      if (overTask) {
        targetColId = overTask.column_id;
      }
    }

    if (!targetColId) return;

    // Calculate position
    const targetColumn = columns.find((c) => c.id === targetColId);
    const colTasks = (targetColumn?.tasks || []).filter((t) => t.id !== activeId);
    const newPosition = (colTasks.length + 1) * 1000;

    await moveTask(activeId, targetColId, newPosition);
  };

  const handleAddColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColTitle.trim() || !currentProject) return;

    try {
      await fetch('/api/columns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProject.id,
          title: newColTitle.trim(),
        }),
      });
      setNewColTitle('');
      setIsAddingColumn(false);
      fetchBoardData();
    } catch (err) {
      console.error('Failed to create column', err);
    }
  };

  // Filter tasks based on searchQuery, priorityFilter, and assigneeFilter
  const filterTask = (task: Task) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchDesc = task.description?.toLowerCase().includes(q);
      const matchSub = task.sub_tasks?.some((st) => st.title.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchSub) return false;
    }

    if (priorityFilter !== 'All' && task.priority !== priorityFilter) {
      return false;
    }

    if (assigneeFilter !== 'All') {
      const hasAssignee = task.assignees?.some((a) => a.id === assigneeFilter);
      if (!hasAssignee) return false;
    }

    return true;
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Unit & Board Context Bar */}
      <div className="px-4 sm:px-6 py-2.5 bg-white dark:bg-[#111726] border-b border-[#cbd5e1] dark:border-[#1e2a3f] flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <button
            onClick={() => setActiveView('hub')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold text-[#034694] dark:text-blue-400 hover:bg-[#e0edfb] dark:hover:bg-[#1a263d] transition-colors border border-blue-200 dark:border-blue-900/60"
            title="Kembali ke Level 1 (Kanban Hub)"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>← Papan Hub (Level 1)</span>
          </button>

          <span className="text-[#cbd5e1] dark:text-[#2b3a52]">/</span>

          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-extrabold bg-[#e0edfb] dark:bg-[#1e293b] text-[#034694] dark:text-blue-300 border border-blue-200 dark:border-blue-900/60">
            <Tag className="w-3 h-3 text-[#034694] dark:text-blue-400" />
            <span>Tag: #{currentProject?.unit_tag || 'IT'}</span>
          </span>

          <span className="font-extrabold text-[#0f172a] dark:text-white truncate max-w-xs">
            {currentProject?.name}
          </span>

          <span className="text-[#cbd5e1] dark:text-[#2b3a52] hidden sm:inline">•</span>
          <span className="text-[#64748b] dark:text-[#94a3b8] font-medium hidden sm:inline">
            {columns.length} Kolom Child
          </span>
          <span className="text-[#cbd5e1] dark:text-[#2b3a52] hidden sm:inline">•</span>
          <span className="text-[#64748b] dark:text-[#94a3b8] font-medium hidden sm:inline">
            {allTasks.length} Tugas & Subtask
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView('timeline')}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#f1f5f9] dark:bg-[#162032] hover:bg-[#e2e8f0] dark:hover:bg-[#1f2d45] border border-[#cbd5e1] dark:border-[#2b3b55] rounded-lg text-xs font-bold text-[#0f172a] dark:text-white transition-colors"
          >
            <Clock className="w-3.5 h-3.5 text-[#034694] dark:text-blue-400" />
            <span className="hidden sm:inline">Buka Timeline</span>
          </button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex gap-4 sm:gap-5 overflow-x-auto p-3 sm:p-5 md:p-6 items-start h-full select-none touch-pan-x scroll-smooth">
        {columns.map((column) => {
          const filteredTasks = (column.tasks || []).filter(filterTask);
          return <BoardColumn key={column.id} column={column} tasks={filteredTasks} />;
        })}

        {/* Add Column Button / Form */}
        <div className="w-[82vw] sm:w-80 shrink-0">
          {isAddingColumn ? (
            <form
              onSubmit={handleAddColumn}
              className="bg-white dark:bg-[#162032] border border-[#cbd5e1] dark:border-[#2b3b55] rounded-xl p-4 shadow-sm space-y-3"
            >
              <input
                type="text"
                value={newColTitle}
                onChange={(e) => setNewColTitle(e.target.value)}
                placeholder="Judul kolom baru..."
                autoFocus
                className="w-full px-3 py-2 border border-[#cbd5e1] dark:border-[#334460] rounded-lg text-xs bg-white dark:bg-[#101726] text-[#0f172a] dark:text-white focus:outline-none focus:border-[#034694]"
              />
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-[#034694] hover:bg-[#023470] text-white text-xs font-bold rounded-md"
                >
                  Tambah Kolom
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingColumn(false)}
                  className="px-3 py-1.5 text-xs text-[#64748b] dark:text-[#94a3b8] hover:text-[#0f172a] dark:hover:text-white"
                >
                  Batal
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setIsAddingColumn(true)}
              className="w-full flex items-center justify-center gap-2 p-3.5 bg-white/70 dark:bg-[#101726]/60 hover:bg-white dark:hover:bg-[#162032] border-2 border-dashed border-[#94a3b8] dark:border-[#24334b] hover:border-[#034694] dark:hover:border-blue-400 rounded-xl text-xs font-bold text-[#475569] dark:text-[#cbd5e1] hover:text-[#034694] dark:hover:text-blue-400 transition-colors shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Kolom Baru</span>
            </button>
          )}
        </div>
      </div>

        {/* Drag Overlay Preview */}
        <DragOverlay dropAnimation={null}>
          {activeTask ? <TaskCard task={activeTask} isOverlay /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
