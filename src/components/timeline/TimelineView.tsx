'use client';

import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar,
  Plus,
  Clock,
  Layers,
  Tag,
  Kanban,
  CornerDownRight,
  CalendarDays,
} from 'lucide-react';
import { useKanbanStore } from '@/store/useKanbanStore';
import { Task } from '@/types';
import { cn, formatDate } from '@/lib/utils';

export function TimelineView() {
  const {
    columns,
    allTasks,
    currentProject,
    openTaskSheet,
    openCreateModal,
    setActiveView,
    searchQuery,
    priorityFilter,
  } = useKanbanStore();

  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({
    task1: true,
    task2: true,
    task3: true,
    it_task_1: true,
    markom_task_1: true,
    mfk_task_1: true,
  });

  // Dynamic 1-month calendar state (Default: October 2026 / current date)
  const [viewDate, setViewDate] = useState(() => new Date(2026, 9, 8));

  const toggleExpand = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  // Auto-expand parent tasks when search query matches child sub-tasks
  useEffect(() => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchMap: Record<string, boolean> = {};
      allTasks.forEach((t) => {
        if (!t.parent_id && t.sub_tasks?.some((st) => st.title.toLowerCase().includes(q))) {
          matchMap[t.id] = true;
        }
      });
      if (Object.keys(matchMap).length > 0) {
        setExpandedTasks((prev) => ({ ...prev, ...matchMap }));
      }
    }
  }, [searchQuery, allTasks]);

  // Filter parent tasks based on searchQuery and priorityFilter
  const parentTasks = allTasks.filter((t) => {
    if (t.parent_id) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = (t.description || '').toLowerCase().includes(q);
      const matchCustomer = (t.customer || '').toLowerCase().includes(q);
      const matchSub = t.sub_tasks?.some(
        (st) =>
          st.title.toLowerCase().includes(q) ||
          (st.description || '').toLowerCase().includes(q)
      );
      if (!matchTitle && !matchDesc && !matchCustomer && !matchSub) return false;
    }

    if (priorityFilter !== 'All' && t.priority !== priorityFilter) {
      return false;
    }

    return true;
  });

  // Map columns for quick status badge lookup
  const columnMap = new Map(columns.map((c) => [c.id, c.title]));

  // Month navigation helpers
  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth(); // 0-indexed (9 = Oktober)
  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const handlePrevMonth = () => {
    setViewDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleToday = () => {
    setViewDate(new Date(2026, 9, 8));
  };

  const monthLabel = viewDate.toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  });

  // Generate full calendar days for the active month (1 to 28-31)
  const today = new Date(2026, 9, 8);
  const days: {
    dayNum: number;
    date: Date;
    label: string;
    isWeekend: boolean;
    isToday: boolean;
  }[] = [];

  for (let day = 1; day <= totalDaysInMonth; day++) {
    const d = new Date(currentYear, currentMonth, day);
    const dayOfWeek = d.getDay(); // 0 = Minggu, 6 = Sabtu
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isToday =
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear();

    days.push({
      dayNum: day,
      date: d,
      label: d.toLocaleDateString('id-ID', { weekday: 'short' }),
      isWeekend,
      isToday,
    });
  }

  // Parse local date safely without timezone jumps
  const parseLocalDate = (dateStr: string | null | undefined): Date | null => {
    if (!dateStr) return null;
    try {
      const clean = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
      const parts = clean.split('-');
      if (parts.length === 3) {
        return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      }
      return new Date(dateStr);
    } catch {
      return null;
    }
  };

  // Calculate duration in days
  const getDurationDays = (startStr: string | null, dueStr: string | null) => {
    if (!startStr || !dueStr) return null;
    const s = parseLocalDate(startStr);
    const e = parseLocalDate(dueStr);
    if (!s || !e) return null;
    const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 1;
  };

  // Calculate Gantt bar position & span relative to the 1-month calendar grid
  const getGanttBarStyle = (startStr: string | null, dueStr: string | null) => {
    const s = parseLocalDate(startStr);
    const e = parseLocalDate(dueStr);

    if (!s || !e) {
      return {
        left: '10%',
        width: '18%',
        isVisible: true,
        startsBeforeMonth: false,
        endsAfterMonth: false,
      };
    }

    const monthStart = new Date(currentYear, currentMonth, 1, 0, 0, 0);
    const monthEnd = new Date(currentYear, currentMonth, totalDaysInMonth, 23, 59, 59);

    // If task range is entirely outside the viewed month
    if (e < monthStart || s > monthEnd) {
      return {
        left: '0%',
        width: '0%',
        isVisible: false,
        startsBeforeMonth: false,
        endsAfterMonth: false,
      };
    }

    const startsBeforeMonth = s < monthStart;
    const endsAfterMonth = e > monthEnd;

    // Clamp days to 1 .. totalDaysInMonth
    const startDay = startsBeforeMonth ? 1 : s.getDate();
    const endDay = endsAfterMonth ? totalDaysInMonth : e.getDate();

    const effectiveEnd = Math.max(startDay, endDay);
    const spanDays = effectiveEnd - startDay + 1;

    const leftPercent = ((startDay - 1) / totalDaysInMonth) * 100;
    const widthPercent = (spanDays / totalDaysInMonth) * 100;

    return {
      left: `${leftPercent.toFixed(2)}%`,
      width: `${Math.max(widthPercent, (1 / totalDaysInMonth) * 100).toFixed(2)}%`,
      isVisible: true,
      startsBeforeMonth,
      endsAfterMonth,
    };
  };

  const priorityColors = {
    Low: 'bg-slate-600 hover:bg-slate-700',
    Medium: 'bg-[#034694] hover:bg-[#023470] dark:bg-blue-600',
    High: 'bg-amber-600 hover:bg-amber-700',
    Urgent: 'bg-rose-600 hover:bg-rose-700',
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f1f5f9] dark:bg-[#090e17] overflow-hidden p-3 sm:p-5 md:p-6 transition-colors">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-3.5 sm:pb-4 gap-3 shrink-0">
        <div>
          {/* Breadcrumb Navigation */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#64748b] dark:text-[#94a3b8] mb-1.5 flex-wrap">
            <button
              onClick={() => setActiveView('hub')}
              className="hover:text-[#034694] dark:hover:text-blue-400 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Project Hub</span>
            </button>
            <span className="text-[#cbd5e1] dark:text-[#334155]">/</span>
            <span className="font-semibold text-[#334155] dark:text-[#e2e8f0] truncate max-w-[200px]">
              {currentProject?.name || 'Board'}
            </span>
            {currentProject?.unit_tag && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e0edfb] dark:bg-blue-950/60 text-[#034694] dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/40">
                <Tag className="w-2.5 h-2.5" />
                <span>#{currentProject.unit_tag}</span>
              </span>
            )}
          </nav>

          {/* Title with Gradient Icon Tile */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-[#034694] to-[#023470] text-white flex items-center justify-center shadow-xs shrink-0">
              <Clock className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
            <h1 className="text-base sm:text-lg md:text-xl font-extrabold text-[#0f172a] dark:text-white tracking-tight leading-none">
              Timeline & Gantt Schedule
            </h1>
          </div>
        </div>

        {/* Month Navigator Controls & Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Calendar 1-Month Navigator */}
          <div className="flex items-center h-9 bg-white dark:bg-[#162032] border border-[#cbd5e1] dark:border-[#2b3b55] rounded-xl p-0.5 shadow-2xs">
            <button
              onClick={handlePrevMonth}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#64748b] hover:text-[#0f172a] dark:text-[#94a3b8] dark:hover:text-white hover:bg-[#f1f5f9] dark:hover:bg-[#1e2a3f] transition-colors cursor-pointer"
              title="Bulan sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 px-2.5 text-xs font-bold text-[#0f172a] dark:text-white capitalize min-w-[125px] justify-center select-none">
              <CalendarDays className="w-3.5 h-3.5 text-[#034694] dark:text-blue-400 shrink-0" />
              <span>{monthLabel}</span>
            </div>

            <button
              onClick={handleNextMonth}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#64748b] hover:text-[#0f172a] dark:text-[#94a3b8] dark:hover:text-white hover:bg-[#f1f5f9] dark:hover:bg-[#1e2a3f] transition-colors cursor-pointer"
              title="Bulan berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleToday}
              className="h-7 px-2.5 ml-0.5 text-[11px] font-bold rounded-lg bg-[#e0edfb] hover:bg-[#d0e5fb] dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-[#034694] dark:text-blue-300 transition-colors cursor-pointer"
              title="Kembali ke bulan ini"
            >
              Bulan Ini
            </button>
          </div>

          {/* Priority legend */}
          <div className="hidden xl:flex items-center h-9 gap-3 text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] bg-white dark:bg-[#162032] px-3 rounded-xl border border-[#cbd5e1] dark:border-[#2b3b55] shadow-2xs select-none">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-600" /> Urgent
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-600" /> High
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#034694] dark:bg-blue-500" /> Medium
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-400" /> Low
            </span>
          </div>

          {/* View Switch Button: Kanban */}
          <button
            onClick={() => setActiveView('board')}
            className="h-9 flex items-center gap-1.5 px-3 bg-white dark:bg-[#162032] hover:bg-[#f1f5f9] dark:hover:bg-[#1e2a3f] text-[#0f172a] dark:text-white border border-[#cbd5e1] dark:border-[#2b3b55] text-xs font-semibold rounded-xl shadow-2xs transition-all cursor-pointer active:scale-95"
            title="Kembali ke Kanban Board"
          >
            <Kanban className="w-3.5 h-3.5 text-[#034694] dark:text-blue-400" />
            <span className="hidden sm:inline">Kanban Board</span>
          </button>

          {/* Primary Action Button: Add Task */}
          <button
            onClick={() => openCreateModal()}
            className="h-9 flex items-center gap-1.5 px-3.5 bg-[#034694] hover:bg-[#023470] text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Tugas</span>
          </button>
        </div>
      </div>

      {/* Responsive Gantt Calendar Container */}
      <div className="flex-1 overflow-x-auto overflow-y-auto touch-pan-x scroll-smooth bg-white dark:bg-[#111726] border border-[#cbd5e1] dark:border-[#1e2a3f] rounded-2xl shadow-xs flex flex-col min-h-0">
        <div
          className="flex-1 flex flex-col"
          style={{
            minWidth: `${Math.max(1600, totalDaysInMonth * 44 + 480)}px`,
          }}
        >
          {/* Table Header: Sticky Top & Sticky Left Columns */}
          <div className="flex border-b border-[#cbd5e1] dark:border-[#1e2a3f] bg-[#f8fafc] dark:bg-[#131b2e] text-xs font-bold text-[#334155] dark:text-[#cbd5e1] sticky top-0 z-30 select-none">
            {/* Sticky Column: Hierarchy Task Title */}
            <div className="w-[260px] sm:w-[320px] md:w-[360px] p-3.5 border-r border-[#cbd5e1] dark:border-[#1e2a3f] shrink-0 flex items-center gap-2 sticky left-0 z-40 bg-[#f8fafc] dark:bg-[#131b2e] shadow-xs">
              <Calendar className="w-4 h-4 text-[#034694] dark:text-blue-400" />
              <span>Hierarki Tugas & Sub-task</span>
            </div>

            {/* Column: Status */}
            <div className="w-24 sm:w-28 p-3.5 border-r border-[#cbd5e1] dark:border-[#1e2a3f] shrink-0 text-center">
              Status
            </div>

            {/* Column: Duration & Date */}
            <div className="w-28 sm:w-36 p-3.5 border-r border-[#cbd5e1] dark:border-[#1e2a3f] shrink-0 text-center">
              Durasi
            </div>

            {/* Dynamic Grid: All Days of the Month (1..totalDaysInMonth) */}
            <div
              className="flex-1 grid text-center divide-x divide-[#cbd5e1] dark:divide-[#1e2a3f]"
              style={{
                gridTemplateColumns: `repeat(${totalDaysInMonth}, minmax(36px, 1fr))`,
              }}
            >
              {days.map((d) => (
                <div
                  key={d.dayNum}
                  className={cn(
                    'py-2 px-0.5 relative flex flex-col items-center justify-center transition-colors',
                    d.isWeekend && 'bg-slate-100/70 dark:bg-[#0c1220]/70 text-[#64748b] dark:text-[#94a3b8]',
                    d.isToday && 'bg-blue-100/90 dark:bg-blue-950/80 text-[#034694] dark:text-blue-300 font-black'
                  )}
                >
                  <div className="text-[9px] uppercase font-bold tracking-wider opacity-75 mb-0.5">
                    {d.label}
                  </div>
                  <div className={cn('text-xs font-extrabold leading-none', d.isToday && 'text-[#034694] dark:text-blue-400')}>
                    {d.dayNum}
                  </div>
                  {d.isToday && (
                    <span className="absolute top-0.5 right-0.5 text-[7px] px-1 py-0.2 rounded bg-[#034694] text-white font-extrabold leading-tight shadow-2xs">
                      Kini
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Table Rows: Parent Tasks & Sub-tasks */}
          <div className="divide-y divide-[#e2e8f0] dark:divide-[#1e2a3f] flex-1">
            {parentTasks.length === 0 ? (
              <div className="p-12 text-center text-xs text-[#94a3b8] italic">
                {searchQuery.trim()
                  ? `Tidak ada tugas atau timeline yang cocok dengan pencarian "${searchQuery}".`
                  : 'Belum ada tugas pada board ini. Klik "Tambah Tugas" untuk membuat tugas baru.'}
              </div>
            ) : (
              parentTasks.map((task) => {
                const isExpanded = Boolean(expandedTasks[task.id]);
                const subTasks = task.sub_tasks || [];
                const hasSubs = subTasks.length > 0;
                const duration = getDurationDays(task.start_date, task.due_date);
                const barStyle = getGanttBarStyle(task.start_date, task.due_date);

                return (
                  <React.Fragment key={task.id}>
                    {/* Parent Task Row */}
                    <div
                      onClick={() => openTaskSheet(task.id)}
                      className="flex items-center hover:bg-[#f8fafc] dark:hover:bg-[#162032] cursor-pointer transition-colors group text-xs min-h-[58px] bg-white dark:bg-[#111726]"
                    >
                      {/* Sticky Task Hierarchy Title */}
                      <div className="w-[260px] sm:w-[320px] md:w-[360px] p-3.5 pl-4 border-r border-[#cbd5e1] dark:border-[#1e2a3f] shrink-0 flex items-center gap-2 sticky left-0 z-20 bg-white dark:bg-[#111726] group-hover:bg-[#f8fafc] dark:group-hover:bg-[#162032] shadow-xs">
                        {hasSubs ? (
                          <button
                            onClick={(e) => toggleExpand(task.id, e)}
                            className="p-1 hover:bg-[#cbd5e1] dark:hover:bg-[#1e2a3f] rounded-md text-[#475569] dark:text-[#94a3b8] transition-colors"
                            title={isExpanded ? 'Tutup sub-tasks' : 'Buka sub-tasks'}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-[#034694] dark:text-blue-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                        ) : (
                          <div className="w-6" />
                        )}

                        <div className="font-extrabold text-[#0f172a] dark:text-white truncate flex-1 text-xs sm:text-[13px]">
                          {task.title}
                        </div>

                        {hasSubs && (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-blue-100 dark:bg-blue-950 text-[#034694] dark:text-blue-300 font-extrabold shrink-0 border border-blue-200 dark:border-blue-900/60">
                            {subTasks.length} sub
                          </span>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openCreateModal(task.column_id, task.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#e2e8f0] dark:hover:bg-[#1e2a3f] rounded-md text-[#034694] dark:text-blue-400 transition-opacity"
                          title="Tambah sub-task ke tugas ini"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Status Column */}
                      <div className="w-24 sm:w-28 p-2.5 border-r border-[#cbd5e1] dark:border-[#1e2a3f] shrink-0 text-center">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#f1f5f9] dark:bg-[#1e2a3f] text-[#334155] dark:text-[#cbd5e1] border border-[#cbd5e1] dark:border-[#2b3a52] inline-block truncate max-w-full">
                          {columnMap.get(task.column_id) || 'To Do'}
                        </span>
                      </div>

                      {/* Duration & Dates Column */}
                      <div className="w-28 sm:w-36 p-2.5 border-r border-[#cbd5e1] dark:border-[#1e2a3f] shrink-0 text-center text-xs">
                        <div className="font-bold text-[#0f172a] dark:text-white text-[11px]">
                          {duration ? `${duration} Hari` : '-'}
                        </div>
                        <div className="text-[9px] text-[#64748b] dark:text-[#94a3b8] mt-0.5">
                          {formatDate(task.start_date)} - {formatDate(task.due_date)}
                        </div>
                      </div>

                      {/* Full-Month Visual Gantt Line Area */}
                      <div className="flex-1 h-full relative py-2 px-0 flex items-center min-h-[58px]">
                        {/* Day Column Grid Background Shading */}
                        <div
                          className="absolute inset-0 grid divide-x divide-[#f1f5f9] dark:divide-[#162238] pointer-events-none"
                          style={{
                            gridTemplateColumns: `repeat(${totalDaysInMonth}, minmax(36px, 1fr))`,
                          }}
                        >
                          {days.map((d) => (
                            <div
                              key={d.dayNum}
                              className={cn(
                                'h-full',
                                d.isWeekend && 'bg-slate-50/60 dark:bg-[#0c1220]/50',
                                d.isToday && 'bg-blue-50/50 dark:bg-blue-950/30'
                              )}
                            />
                          ))}
                        </div>

                        {/* Gantt Bar or Out-of-month pill */}
                        {barStyle.isVisible ? (
                          <div
                            className={cn(
                              'h-9 rounded-lg shadow-sm flex items-center px-2.5 text-white text-[11px] font-bold truncate transition-all z-[1] border border-white/25 hover:scale-[1.01] select-none',
                              priorityColors[task.priority] || 'bg-[#034694]'
                            )}
                            style={{
                              left: barStyle.left,
                              width: barStyle.width,
                              position: 'absolute',
                            }}
                            title={`${task.title} (${task.priority}) • ${formatDate(task.start_date)} - ${formatDate(task.due_date)}`}
                          >
                            {barStyle.startsBeforeMonth && (
                              <span className="mr-1 text-[9px] opacity-80 shrink-0 font-mono">◀</span>
                            )}
                            <span className="truncate flex items-center gap-1.5 flex-1">
                              <span className="truncate">{task.title}</span>
                              {duration && (
                                <span className="text-[9px] opacity-85 font-normal shrink-0">
                                  ({duration}h)
                                </span>
                              )}
                            </span>
                            {barStyle.endsAfterMonth && (
                              <span className="ml-1 text-[9px] opacity-80 shrink-0 font-mono">▶</span>
                            )}
                          </div>
                        ) : (
                          <div className="px-3 text-[11px] italic text-[#94a3b8] dark:text-[#64748b] z-[1]">
                            (Di luar bulan {monthLabel})
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Nested Sub-tasks */}
                    {isExpanded &&
                      subTasks.map((sub) => {
                        const subBarStyle = getGanttBarStyle(sub.start_date, sub.due_date);
                        const subDuration = getDurationDays(sub.start_date, sub.due_date);

                        return (
                          <div
                            key={sub.id}
                            onClick={() => openTaskSheet(sub.id)}
                            className="flex items-center bg-[#f8fafc]/85 dark:bg-[#0c1220]/75 hover:bg-[#edf2f7] dark:hover:bg-[#162032] cursor-pointer transition-colors text-xs border-t border-[#e2e8f0] dark:border-[#1a2538] min-h-[50px] group"
                          >
                            {/* Sticky Indented Subtask Title */}
                            <div className="w-[260px] sm:w-[320px] md:w-[360px] p-2.5 pl-10 border-r border-[#cbd5e1] dark:border-[#1e2a3f] shrink-0 flex items-center gap-2 sticky left-0 z-20 bg-[#f8fafc] dark:bg-[#0c1220] group-hover:bg-[#edf2f7] dark:group-hover:bg-[#162032] shadow-xs">
                              <CornerDownRight className="w-3.5 h-3.5 text-[#94a3b8] shrink-0" />
                              <span className="text-[#334155] dark:text-[#cbd5e1] font-bold truncate flex-1 text-xs">
                                {sub.title}
                              </span>
                              <span className="text-[8px] px-1.5 py-0.2 rounded font-extrabold bg-white dark:bg-[#162032] border border-[#cbd5e1] dark:border-[#2b3a52] text-[#64748b] dark:text-[#94a3b8] shrink-0">
                                Sub
                              </span>
                            </div>

                            {/* Status */}
                            <div className="w-24 sm:w-28 p-2 border-r border-[#cbd5e1] dark:border-[#1e2a3f] shrink-0 text-center">
                              <span className="text-[10px] font-semibold text-[#64748b] dark:text-[#94a3b8] truncate block">
                                {columnMap.get(sub.column_id) || 'To Do'}
                              </span>
                            </div>

                            {/* Duration & Dates */}
                            <div className="w-28 sm:w-36 p-2 border-r border-[#cbd5e1] dark:border-[#1e2a3f] shrink-0 text-center text-[10px] text-[#64748b] dark:text-[#94a3b8]">
                              <span className="font-semibold text-[#0f172a] dark:text-white">
                                {subDuration ? `${subDuration} Hari` : '-'}
                              </span>
                            </div>

                            {/* Sub Gantt Bar Area */}
                            <div className="flex-1 h-full relative py-1.5 px-0 flex items-center min-h-[50px]">
                              {/* Day Column Grid Background Shading */}
                              <div
                                className="absolute inset-0 grid divide-x divide-[#f1f5f9] dark:divide-[#162238] pointer-events-none"
                                style={{
                                  gridTemplateColumns: `repeat(${totalDaysInMonth}, minmax(36px, 1fr))`,
                                }}
                              >
                                {days.map((d) => (
                                  <div
                                    key={d.dayNum}
                                    className={cn(
                                      'h-full',
                                      d.isWeekend && 'bg-slate-50/60 dark:bg-[#0c1220]/50',
                                      d.isToday && 'bg-blue-50/50 dark:bg-blue-950/30'
                                    )}
                                  />
                                ))}
                              </div>

                              {subBarStyle.isVisible ? (
                                <div
                                  className={cn(
                                    'h-7 rounded-md opacity-95 border border-white/40 flex items-center px-2 text-white text-[10px] font-semibold truncate shadow-2xs z-[1] select-none',
                                    priorityColors[sub.priority] || 'bg-[#034694]'
                                  )}
                                  style={{
                                    left: subBarStyle.left,
                                    width: subBarStyle.width,
                                    position: 'absolute',
                                  }}
                                  title={`${sub.title} (${sub.priority})`}
                                >
                                  {subBarStyle.startsBeforeMonth && (
                                    <span className="mr-1 text-[8px] opacity-80 shrink-0 font-mono">◀</span>
                                  )}
                                  <span className="truncate flex-1">{sub.title}</span>
                                  {subDuration && (
                                    <span className="text-[8px] opacity-85 ml-1 font-normal shrink-0">
                                      ({subDuration}h)
                                    </span>
                                  )}
                                  {subBarStyle.endsAfterMonth && (
                                    <span className="ml-1 text-[8px] opacity-80 shrink-0 font-mono">▶</span>
                                  )}
                                </div>
                              ) : (
                                <div className="px-3 text-[10px] italic text-[#94a3b8] dark:text-[#64748b] z-[1]">
                                  (Di luar bulan {monthLabel})
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </React.Fragment>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
