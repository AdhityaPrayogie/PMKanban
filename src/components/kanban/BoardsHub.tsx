'use client';

import React, { useState, useEffect } from 'react';
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
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  Kanban,
  Clock,
  Plus,
  Tag,
  Search,
  Layers,
  GripVertical,
  FolderKanban,
  CheckCircle2,
  PlayCircle,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { useKanbanStore } from '@/store/useKanbanStore';
import { cn } from '@/lib/utils';
import { BoardStage, Project } from '@/types';
import { useDebounce } from '@/hooks/useDebounce';

interface StageColumnDef {
  id: BoardStage;
  title: string;
  dotColor: string;
}

const STAGE_COLUMNS: StageColumnDef[] = [
  {
    id: 'Planning',
    title: 'Planning',
    dotColor: 'bg-amber-500',
  },
  {
    id: 'Active',
    title: 'In Progress / Active',
    dotColor: 'bg-[#034694] dark:bg-blue-400',
  },
  {
    id: 'Review',
    title: 'Review / Evaluasi',
    dotColor: 'bg-purple-500',
  },
  {
    id: 'Completed',
    title: 'Completed',
    dotColor: 'bg-emerald-500',
  },
];

function getTagForProject(p: Project): string {
  if (p.unit_tag) return p.unit_tag;
  const name = p.name;
  if (name.includes('IT')) return 'IT';
  if (name.includes('Markom')) return 'Markom';
  if (name.includes('MFK')) return 'MFK';
  if (name.includes('PPSDM')) return 'PPSDM';
  return 'Umum';
}

function getStageForProject(p: Project): BoardStage {
  if (p.stage && ['Planning', 'Active', 'Review', 'Completed'].includes(p.stage)) {
    return p.stage;
  }
  return 'Active';
}

// Draggable Board Card Item (Styled identical to TaskCard)
interface BoardCardProps {
  board: Project;
  onOpenBoard: (id: string, view: 'board' | 'timeline') => void;
  onStageChange: (e: React.ChangeEvent<HTMLSelectElement>, id: string) => void;
  isOverlay?: boolean;
}

function BoardCard({
  board,
  onOpenBoard,
  onStageChange,
  isOverlay = false,
}: BoardCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: board.id,
    data: { board },
    disabled: isOverlay,
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined;

  const unitTag = getTagForProject(board);
  const currentStage = getStageForProject(board);

  const stageBadgeStyles: Record<BoardStage, string> = {
    Planning: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    Active: 'bg-blue-100 text-[#034694] dark:bg-blue-950/80 dark:text-blue-300 border-blue-300 dark:border-blue-800',
    Review: 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border-purple-300 dark:border-purple-800',
    Completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onOpenBoard(board.id, 'board')}
      className={cn(
        'group bg-white dark:bg-[#162032] rounded-2xl p-3.5 border transition-all duration-150 cursor-pointer select-none relative',
        isDragging
          ? 'opacity-30 border-[#034694] dark:border-blue-500 scale-95 shadow-none'
          : 'border-[#cbd5e1] dark:border-[#202e44] hover:border-[#034694] dark:hover:border-blue-400 hover:shadow-md shadow-2xs',
        isOverlay && 'shadow-2xl ring-2 ring-[#034694] rotate-1 scale-102 cursor-grabbing'
      )}
    >
      {/* Top Meta: Unit Tag, Stage Label & Quick Shift Selector */}
      <div className="flex items-center justify-between gap-1 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-[#e0edfb] dark:bg-[#1e293b] text-[#034694] dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 shadow-2xs">
            <Tag className="w-2.5 h-2.5 text-[#034694] dark:text-blue-400" />
            <span>#{unitTag}</span>
          </span>

          <span
            className={cn(
              'px-2 py-0.5 rounded-md text-[10px] font-bold border tracking-wide',
              stageBadgeStyles[currentStage]
            )}
          >
            {currentStage}
          </span>
        </div>

        {/* Quick Stage Shift Dropdown & Drag Grip */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1"
        >
          <div className="relative group/shift">
            <select
              value={currentStage}
              onChange={(e) => onStageChange(e, board.id)}
              aria-label="Pindahkan status board utama"
              className="text-[10px] font-semibold bg-[#f1f5f9] dark:bg-[#1e2a3f] text-[#475569] dark:text-[#94a3b8] border border-[#cbd5e1] dark:border-[#334460] rounded-md px-1.5 py-0.5 focus:outline-none focus:border-[#034694] cursor-pointer hover:bg-white dark:hover:bg-[#25354e]"
            >
              <option value="Planning">Planning</option>
              <option value="Active">Active</option>
              <option value="Review">Review</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          <div
            {...attributes}
            {...listeners}
            className="text-[#94a3b8] dark:text-[#64748b] hover:text-[#0f172a] dark:hover:text-white p-0.5 rounded cursor-grab active:cursor-grabbing"
            title="Tarik kartu untuk memindahkan kolom"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Board Title */}
      <h4 className="text-xs font-bold text-[#0f172a] dark:text-[#f8fafc] leading-snug line-clamp-2 mb-1.5 group-hover:text-[#034694] dark:group-hover:text-blue-400 transition-colors">
        {board.name}
      </h4>

      {/* Description Snippet */}
      {board.description && (
        <p className="text-[11px] text-[#475569] dark:text-[#94a3b8] line-clamp-2 mb-2.5 leading-relaxed">
          {board.description}
        </p>
      )}

      {/* Metrics Row: Child Columns & Tasks */}
      <div className="mb-2.5 flex items-center gap-2 text-[10px] font-medium text-[#475569] dark:text-[#cbd5e1] bg-[#f8fafc] dark:bg-[#101726] px-2.5 py-1.5 rounded-lg border border-[#cbd5e1]/60 dark:border-[#223147]">
        <FolderKanban className="w-3.5 h-3.5 text-[#034694] dark:text-blue-400" />
        <span>{board.columns_count || 4} Kolom Child</span>
        <span>•</span>
        <span>{board.tasks_count || 0} Tugas & Subtask</span>
      </div>

      {/* Bottom Row Action Buttons */}
      <div className="flex items-center gap-2 pt-2 border-t border-[#e2e8f0] dark:border-[#223147] mt-1 text-[11px]">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenBoard(board.id, 'board');
          }}
          className="flex-1 h-8.5 flex items-center justify-center gap-1.5 px-2.5 bg-[#034694] hover:bg-[#023470] text-white rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
          title="Buka papan kanban child"
        >
          <Kanban className="w-3.5 h-3.5" />
          <span>Buka Board</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenBoard(board.id, 'timeline');
          }}
          className="flex-1 h-8.5 flex items-center justify-center gap-1.5 px-2.5 border border-[#cbd5e1] dark:border-[#2b3b55] bg-white dark:bg-[#121929] hover:bg-[#f1f5f9] dark:hover:bg-[#182236] text-[#0f172a] dark:text-white rounded-lg text-xs font-bold transition-colors cursor-pointer active:scale-95"
          title="Buka timeline gantt chart"
        >
          <Clock className="w-3.5 h-3.5 text-[#034694] dark:text-blue-400" />
          <span>Timeline</span>
        </button>
      </div>
    </div>
  );
}

// Droppable Board Column (Styled identical to BoardColumn)
interface DroppableBoardColumnProps {
  col: StageColumnDef;
  boards: Project[];
  onOpenBoard: (id: string, view: 'board' | 'timeline') => void;
  onStageChange: (e: React.ChangeEvent<HTMLSelectElement>, id: string) => void;
  onAddBoard: (stage: BoardStage) => void;
}

function DroppableBoardColumn({
  col,
  boards,
  onOpenBoard,
  onStageChange,
  onAddBoard,
}: DroppableBoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: col.id,
    data: { stage: col.id },
  });

  return (
    <div className="w-[82vw] sm:w-80 shrink-0 flex flex-col max-h-full bg-[#e6ebf2] dark:bg-[#101726] rounded-2xl border border-[#cbd5e1] dark:border-[#1e2a3f] select-none shadow-xs transition-colors">
      {/* Column Header */}
      <div className="p-3.5 border-b border-[#cbd5e1] dark:border-[#1e2a3f] flex items-center justify-between bg-[#edf2f7] dark:bg-[#131b2e] rounded-t-2xl">
        <div className="flex items-center gap-2">
          <div className={cn('w-2.5 h-2.5 rounded-full', col.dotColor)} />
          <h3 className="font-bold text-xs text-[#0f172a] dark:text-[#f8fafc] tracking-wide uppercase">
            {col.title}
          </h3>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#cbd5e1] dark:bg-[#1e2a3f] text-[#334155] dark:text-[#cbd5e1]">
            {boards.length}
          </span>
        </div>

        <button
          onClick={() => onAddBoard(col.id)}
          className="p-1 rounded-lg hover:bg-[#cbd5e1] dark:hover:bg-[#1e2a3f] text-[#475569] dark:text-[#94a3b8] hover:text-[#0f172a] dark:hover:text-white transition-colors cursor-pointer"
          title={`Tambah Board Baru di kolom ${col.title}`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Droppable Container */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 p-2.5 space-y-2.5 overflow-y-auto min-h-[160px] transition-colors rounded-b-2xl',
          isOver && 'bg-[#e0edfb]/80 dark:bg-blue-950/40 ring-2 ring-[#034694] dark:ring-blue-500'
        )}
      >
        {boards.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-[#cbd5e1] dark:border-[#283850] rounded-xl text-xs text-[#94a3b8] space-y-2">
            <p>Belum ada board pada kolom ini</p>
            <p className="text-[10px] text-[#64748b] dark:text-[#94a3b8]">
              Drag kartu papan ke sini untuk mengubah status
            </p>
            <button
              onClick={() => onAddBoard(col.id)}
              className="text-[11px] font-bold text-[#034694] dark:text-blue-400 hover:underline flex items-center justify-center gap-1 mx-auto"
            >
              <Plus className="w-3 h-3" />
              <span>Tambah Board di sini</span>
            </button>
          </div>
        ) : (
          boards.map((b) => (
            <BoardCard
              key={b.id}
              board={b}
              onOpenBoard={onOpenBoard}
              onStageChange={onStageChange}
            />
          ))
        )}
      </div>
    </div>
  );
}

export function BoardsHub() {
  const {
    projects,
    selectProject,
    setActiveView,
    openCreateUnitModal,
    moveBoardStage,
    activeUser,
    searchQuery,
    setSearchQuery,
  } = useKanbanStore();

  const isAdmin = activeUser?.role === 'admin';
  const userUnit = (activeUser?.unit_name || 'IT').trim();

  const [localSearch, setLocalSearch] = useState(searchQuery);
  const debouncedSearch = useDebounce(localSearch, 250);
  const [selectedTag, setSelectedTag] = useState<string>(isAdmin ? 'All' : userUnit);
  const [draggedBoard, setDraggedBoard] = useState<Project | null>(null);

  // Sync debounced search to global store
  useEffect(() => {
    setSearchQuery(debouncedSearch);
  }, [debouncedSearch, setSearchQuery]);

  // Sync external search query changes to local input
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

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

  const unitTags = isAdmin
    ? ['All', 'IT', 'Markom', 'MFK', 'PPSDM']
    : [userUnit];

  // Projects filtering: Non-admin users only see projects matching their assigned unit
  const accessibleProjects = isAdmin
    ? projects
    : projects.filter((p) => {
        const pTag = (p.unit_tag || getTagForProject(p)).trim().toLowerCase();
        const pName = p.name.toLowerCase();
        const target = userUnit.toLowerCase();
        return pTag === target || pName.includes(target);
      });

  const queryClean = (debouncedSearch || searchQuery).trim().toLowerCase();
  const filteredProjects = accessibleProjects.filter((p) => {
    const tag = getTagForProject(p);
    const matchTag = selectedTag === 'All' || tag === selectedTag;
    const matchSearch =
      !queryClean ||
      p.name.toLowerCase().includes(queryClean) ||
      (p.description && p.description.toLowerCase().includes(queryClean)) ||
      (p.unit_tag && p.unit_tag.toLowerCase().includes(queryClean));
    return matchTag && matchSearch;
  });

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const board = projects.find((p) => p.id === active.id);
    if (board) {
      setDraggedBoard(board);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedBoard(null);

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    let targetStage: BoardStage | null = null;
    if (STAGE_COLUMNS.some((col) => col.id === overId)) {
      targetStage = overId as BoardStage;
    } else {
      const overBoard = projects.find((p) => p.id === overId);
      if (overBoard) {
        targetStage = getStageForProject(overBoard);
      }
    }

    if (targetStage) {
      const sourceBoard = projects.find((p) => p.id === activeId);
      if (sourceBoard && getStageForProject(sourceBoard) !== targetStage) {
        await moveBoardStage(activeId, targetStage);
      }
    }
  };

  const handleOpenBoard = async (projectId: string, view: 'board' | 'timeline' = 'board') => {
    await selectProject(projectId);
    setActiveView(view);
  };

  const handleStageChange = async (
    e: React.ChangeEvent<HTMLSelectElement>,
    boardId: string
  ) => {
    e.stopPropagation();
    const newStage = e.target.value as BoardStage;
    await moveBoardStage(boardId, newStage);
  };

  const handleAddBoard = (stage: BoardStage) => {
    openCreateUnitModal(stage, selectedTag !== 'All' ? selectedTag : userUnit);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none bg-[#f1f5f9] dark:bg-[#090e17]">
      {/* Top Header Context & Unit Filter Bar */}
      <div className="px-4 sm:px-6 py-3 bg-white dark:bg-[#111726] border-b border-[#cbd5e1] dark:border-[#1e2a3f] flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        {/* Left: Title, Icon & Active Count */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#034694] to-[#023470] text-white flex items-center justify-center shadow-xs shrink-0">
            <Layers className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-extrabold text-[#0f172a] dark:text-white tracking-tight leading-none">
                Project Hub
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#e0edfb] dark:bg-blue-950/60 text-[#034694] dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/40">
                {accessibleProjects.length} Papan
              </span>
            </div>
            {!isAdmin && (
              <span className="text-[11px] text-[#64748b] dark:text-[#94a3b8] mt-0.5 block">
                Unit Anda: <strong className="text-[#034694] dark:text-blue-400">#{userUnit}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Right: Unit Filter Tabs + Debounced Search + Add Board CTA */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between md:justify-end">
          {/* Segmented Unit Filter Pills */}
          <div className="flex items-center gap-1 bg-[#f1f5f9] dark:bg-[#162032] p-1 rounded-xl border border-[#cbd5e1] dark:border-[#2b3b55] overflow-x-auto scrollbar-none">
            {unitTags.map((tag) => {
              const count = accessibleProjects.filter(
                (p) => tag === 'All' || getTagForProject(p) === tag
              ).length;
              return (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={cn(
                    'h-7 px-2.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer active:scale-95',
                    selectedTag === tag
                      ? 'bg-white dark:bg-[#034694] text-[#034694] dark:text-white shadow-2xs'
                      : 'text-[#64748b] dark:text-[#94a3b8] hover:text-[#0f172a] dark:hover:text-white'
                  )}
                >
                  <span>{tag === 'All' ? 'Semua Unit' : `#${tag}`}</span>
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                      selectedTag === tag
                        ? 'bg-[#e0edfb] dark:bg-white/20 text-[#034694] dark:text-white'
                        : 'bg-[#e2e8f0] dark:bg-[#202e44] text-[#64748b] dark:text-[#94a3b8]'
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Debounced Search Box */}
          <div className="relative w-36 sm:w-44 md:w-48 h-9 flex items-center shrink-0">
            <Search className="w-3.5 h-3.5 text-[#94a3b8] absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Cari board..."
              className="w-full h-full pl-8 pr-7 bg-white dark:bg-[#162032] border border-[#cbd5e1] dark:border-[#2b3b55] rounded-xl text-xs text-[#0f172a] dark:text-white placeholder-[#94a3b8] focus:outline-none focus:border-[#034694] transition-all shadow-2xs"
            />
            {localSearch && (
              <button
                type="button"
                onClick={() => setLocalSearch('')}
                className="absolute right-2.5 text-xs text-[#94a3b8] hover:text-[#0f172a] dark:hover:text-white cursor-pointer font-bold"
              >
                ×
              </button>
            )}
          </div>

          {/* Add Board CTA Button */}
          <button
            onClick={() => handleAddBoard('Active')}
            className="h-9 flex items-center justify-center gap-1.5 px-3.5 bg-[#034694] hover:bg-[#023470] text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all shrink-0 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Board</span>
          </button>
        </div>
      </div>

      {/* Main Kanban Content Area (Exact Kanban Board Layout & Drag Function) */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="overflow-x-auto flex-1 p-3 sm:p-5 md:p-6 select-none bg-[#f1f5f9] dark:bg-[#090e17] touch-pan-x scroll-smooth">
          <div className="flex gap-4 sm:gap-5 h-full items-start">
            {STAGE_COLUMNS.map((col) => {
              const boardsInStage = filteredProjects.filter(
                (p) => getStageForProject(p) === col.id
              );

              return (
                <DroppableBoardColumn
                  key={col.id}
                  col={col}
                  boards={boardsInStage}
                  onOpenBoard={handleOpenBoard}
                  onStageChange={handleStageChange}
                  onAddBoard={handleAddBoard}
                />
              );
            })}
          </div>
        </div>

        {/* Drag Overlay Identical to KanbanBoard */}
        <DragOverlay>
          {draggedBoard ? (
            <div className="w-[82vw] sm:w-80">
              <BoardCard
                board={draggedBoard}
                onOpenBoard={() => {}}
                onStageChange={() => {}}
                isOverlay
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
