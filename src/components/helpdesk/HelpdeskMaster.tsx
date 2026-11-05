'use client';

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import type { HdMaster } from '@/lib/helpdesk';
import { ErrorText, api, btnGhost, btnPrimary, cardCls, inputCls, useMaster } from './ui';

const TYPES = [
  ['kategori', 'Kategori'],
  ['unit-kerja', 'Unit Kerja'],
  ['pic', 'PIC'],
] as const;

// Admin TD only (tab hidden otherwise; PATCH/POST are also guarded server-side)
export function HelpdeskMaster({ onChanged }: { onChanged: () => void }) {
  const [type, setType] = useState<(typeof TYPES)[number][0]>('kategori');
  const [version, setVersion] = useState(0);
  const [rows] = useMaster(type, true, version);
  const [nama, setNama] = useState('');
  const [filter, setFilter] = useState('');
  const [error, setError] = useState<string | null>(null);

  const done = () => { setVersion((v) => v + 1); onChanged(); };
  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try { await fn(); done(); } catch (e: any) { setError(e.message); }
  };
  const add = (e: React.FormEvent) => {
    e.preventDefault();
    run(() => api(`/api/helpdesk/master/${type}`, { method: 'POST', body: JSON.stringify({ nama }) }).then(() => setNama('')));
  };
  const rename = (r: HdMaster) => {
    const n = prompt('Nama baru', r.nama);
    if (n && n.trim() !== r.nama) run(() => api(`/api/helpdesk/master/${type}`, { method: 'PATCH', body: JSON.stringify({ id: r.id, nama: n }) }));
  };
  const toggle = (r: HdMaster) =>
    run(() => api(`/api/helpdesk/master/${type}`, { method: 'PATCH', body: JSON.stringify({ id: r.id, aktif: !r.aktif }) }));

  const shown = rows.filter((r) => r.nama.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className={`${cardCls} space-y-3`}>
      <div role="tablist" aria-label="Jenis master" className="flex gap-2">
        {TYPES.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={type === k} type="button" onClick={() => setType(k)}
            className={type === k ? btnPrimary : btnGhost}>{label}</button>
        ))}
      </div>
      <form onSubmit={add} className="flex gap-2">
        <label htmlFor="m-nama" className="sr-only">Nama baru</label>
        <input id="m-nama" required className={inputCls} placeholder="Tambah nama baru…" value={nama} onChange={(e) => setNama(e.target.value)} />
        <button type="submit" className={btnPrimary}><Plus className="w-3.5 h-3.5" /> Tambah</button>
      </form>
      <ErrorText msg={error} />
      <label htmlFor="m-filter" className="sr-only">Saring</label>
      <input id="m-filter" type="search" className={inputCls} placeholder={`Saring ${rows.length} data…`} value={filter} onChange={(e) => setFilter(e.target.value)} />
      <ul className="divide-y divide-[#f1f5f9] dark:divide-[#162032] max-h-[50vh] overflow-y-auto">
        {shown.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
            <span className={r.aktif ? '' : 'line-through text-[#94a3b8]'}>{r.nama}</span>
            <span className="flex gap-1.5 shrink-0">
              <button type="button" className={btnGhost} onClick={() => rename(r)}>Ubah</button>
              <button type="button" className={btnGhost} onClick={() => toggle(r)}>{r.aktif ? 'Nonaktifkan' : 'Aktifkan'}</button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
