'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { HdMaster, HdStatus } from '@/lib/helpdesk';
import { cn } from '@/lib/utils';

export async function api<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json', ...init.headers } : init?.headers,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data as T;
}

export const today = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD, local time

export const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

export function useMaster(type: 'pic' | 'kategori' | 'unit-kerja', all = false, version = 0) {
  const [rows, setRows] = useState<HdMaster[]>([]);
  useEffect(() => {
    api<{ rows: HdMaster[] }>(`/api/helpdesk/master/${type}${all ? '?all=1' : ''}`)
      .then((d) => setRows(d.rows))
      .catch(() => setRows([]));
  }, [type, all, version]);
  return [rows, setRows] as const;
}

const STATUS_STYLE: Record<HdStatus, string> = {
  Open: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
  Proses: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800',
  Selesai: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
  Batal: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600',
};

export function StatusBadge({ status }: { status: HdStatus }) {
  return (
    <span className={cn('inline-block px-2 py-0.5 rounded-full text-[11px] font-bold border whitespace-nowrap', STATUS_STYLE[status])}>
      {status}
    </span>
  );
}

// Native <dialog>: focus trap, Esc and backdrop come from the browser
export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-label={title}
      className={cn(
        'm-auto w-[calc(100%-2rem)] rounded-xl border border-[#cbd5e1] dark:border-[#1e2a3f] bg-white dark:bg-[#111726] text-[#0f172a] dark:text-[#f8fafc] p-0 shadow-xl backdrop:bg-slate-950/50',
        wide ? 'max-w-3xl' : 'max-w-lg'
      )}
    >
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#cbd5e1] dark:border-[#1e2a3f]">
        <h2 className="text-base font-bold">{title}</h2>
        <button type="button" onClick={() => ref.current?.close()} className="p-1 rounded hover:bg-[#f1f5f9] dark:hover:bg-[#1e2a3f]" aria-label="Tutup">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-5 max-h-[75vh] overflow-y-auto">{children}</div>
    </dialog>
  );
}

export function ErrorText({ msg }: { msg: string | null }) {
  return (
    <p aria-live="polite" className="text-sm font-semibold text-rose-600 dark:text-rose-400 min-h-4">
      {msg}
    </p>
  );
}

export const inputCls =
  'w-full px-3 py-2 text-sm rounded-lg border border-[#cbd5e1] dark:border-[#24334a] bg-white dark:bg-[#0d1424] text-[#0f172a] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#034694]/40';
export const labelCls = 'block text-xs font-bold text-[#334155] dark:text-[#cbd5e1] mb-1';
export const btnPrimary =
  'inline-flex items-center gap-1.5 px-3 py-2 text-sm font-bold rounded-lg bg-[#034694] hover:bg-[#023470] text-white disabled:opacity-50 cursor-pointer';
export const btnGhost =
  'inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-semibold rounded-lg border border-[#cbd5e1] dark:border-[#24334a] text-[#334155] dark:text-[#cbd5e1] hover:bg-[#f1f5f9] dark:hover:bg-[#162032] disabled:opacity-50 cursor-pointer';
export const cardCls = 'rounded-xl border border-[#cbd5e1] dark:border-[#1e2a3f] bg-white dark:bg-[#111726] p-4';
