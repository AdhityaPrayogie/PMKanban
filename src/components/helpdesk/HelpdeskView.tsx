'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Hand, Headset } from 'lucide-react';
import { canManageHelpdeskMaster, type HdTicket } from '@/lib/helpdesk';
import { useKanbanStore } from '@/store/useKanbanStore';
import { subscribeRealtime } from '@/lib/realtime';
import { cn } from '@/lib/utils';
import { TicketForm } from './TicketForm';
import { TicketTable } from './TicketTable';
import { HelpdeskMaster } from './HelpdeskMaster';
import { ErrorText, Modal, StatusBadge, api, btnGhost, btnPrimary, cardCls, fmtDate, inputCls, labelCls, useMaster } from './ui';

type Tab = 'dashboard' | 'antrian' | 'input' | 'data' | 'trend' | 'master';

export function HelpdeskView() {
  const { activeUser } = useKanbanStore();
  const isMasterAdmin = canManageHelpdeskMaster(activeUser);
  const [tab, setTab] = useState<Tab>('dashboard');
  // Bumped on every write (and on incoming notifications) so all lists refetch
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);
  const [kategori] = useMaster('kategori', false, version);
  const [unitKerja] = useMaster('unit-kerja', false, version);
  const [pic] = useMaster('pic', false, version);
  const [stats, setStats] = useState<any>(null);
  // '' = let the server pick the month of the latest ticket, then adopt it
  const [period, setPeriod] = useState('');
  const [queue, setQueue] = useState<HdTicket[]>([]);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => subscribeRealtime({ notification: bump }), [bump]);

  useEffect(() => {
    const [year, month] = period.split('-');
    api<any>(`/api/helpdesk/stats${period ? `?month=${Number(month)}&year=${year}` : ''}`)
      .then((d) => {
        setStats(d);
        if (!period) setPeriod(`${d.year}-${String(d.month).padStart(2, '0')}`);
      })
      .catch(() => setStats(null));
    api<{ rows: HdTicket[] }>('/api/helpdesk?status=Open&limit=200').then((d) => setQueue(d.rows)).catch(() => setQueue([]));
  }, [period, version]);

  const tabs: [Tab, string][] = [
    ['dashboard', 'Dashboard'],
    ['antrian', `Antrian${queue.length ? ` (${queue.length})` : ''}`],
    ['input', 'Input'],
    ['data', 'Data'],
    ['trend', 'Trend Helpdesk'],
    ...(isMasterAdmin ? [['master', 'Master Data'] as [Tab, string]] : []),
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Headset className="w-5 h-5 text-[#034694] dark:text-blue-400" />
        <h1 className="text-xl font-extrabold">Helpdesk IT</h1>
      </div>

      <div role="tablist" aria-label="Menu helpdesk" className="flex flex-wrap gap-1.5">
        {tabs.map(([k, label]) => (
          <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => setTab(k)} className={tab === k ? btnPrimary : btnGhost}>
            {label}
          </button>
        ))}
      </div>

      {(tab === 'dashboard' || tab === 'trend') && (
        <div className="flex items-end gap-2">
          <div>
            <label htmlFor="hd-period" className={labelCls}>Periode</label>
            <input id="hd-period" type="month" className={inputCls} value={period} onChange={(e) => e.target.value && setPeriod(e.target.value)} />
          </div>
        </div>
      )}

      {tab === 'dashboard' && <Dashboard stats={stats} onOpenQueue={() => setTab('antrian')} />}
      {tab === 'antrian' && <Queue rows={queue} kategori={kategori} unitKerja={unitKerja} pic={pic} onChanged={bump} />}
      {tab === 'input' && (
        <div className={cardCls}>
          <TicketForm key={version} kategori={kategori} unitKerja={unitKerja} pic={pic}
            onSaved={(t) => { setSaved(`Tiket #${t.id} tersimpan.`); bump(); }} />
          {saved && <p aria-live="polite" className="text-sm font-semibold text-emerald-600 mt-2">{saved}</p>}
        </div>
      )}
      {tab === 'data' && <TicketTable kategori={kategori} unitKerja={unitKerja} pic={pic} version={version} onChanged={bump} />}
      {tab === 'trend' && <Trend stats={stats} onPickMonth={(ym) => { setPeriod(ym); setTab('dashboard'); }} />}
      {tab === 'master' && isMasterAdmin && <HelpdeskMaster onChanged={bump} />}
    </div>
  );
}

// Tickets of one day (clicked column), sorted by start time
function DayModal({ date, onClose }: { date: string; onClose: () => void }) {
  const [rows, setRows] = useState<HdTicket[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<{ rows: HdTicket[] }>(`/api/helpdesk?start=${date}&end=${date}&limit=200`)
      .then((d) => setRows([...d.rows].sort((a, b) => (a.jam_mulai ?? '').localeCompare(b.jam_mulai ?? ''))))
      .catch((e) => { setError(e.message); setRows([]); });
  }, [date]);
  return (
    <Modal title={`Helpdesk ${fmtDate(date)}`} onClose={onClose} wide>
      <ErrorText msg={error} />
      {rows === null ? <p className="text-sm">Memuat…</p> : !rows.length ? <p className="text-sm text-[#64748b]">Tidak ada tiket.</p> : (
        <ul className="divide-y divide-[#f1f5f9] dark:divide-[#162032]">
          {rows.map((t) => (
            <li key={t.id} className="py-2.5 text-sm space-y-1">
              <div className="flex items-start justify-between gap-3">
                <div className="font-bold">
                  #{t.id} · {t.jam_mulai ?? '--'}–{t.jam_selesai ?? '--'}
                  {t.total_menit !== null && <span className="font-normal text-[#64748b]"> ({t.total_menit} menit)</span>}
                  <span className="font-normal"> · {t.kategori} · {t.pic_nama ?? t.requester_name ?? '-'}{t.unit_kerja ? ` (${t.unit_kerja})` : ''}</span>
                </div>
                <StatusBadge status={t.status} />
              </div>
              <p className="whitespace-pre-line">{t.isi_helpdesk}</p>
              {t.tindakan && <p className="whitespace-pre-line text-[#475569] dark:text-[#94a3b8]">↳ {t.tindakan}</p>}
              <p className="text-[11px] text-[#64748b]">Staf: {t.staff_names || '-'} · {t.jenis_pelayanan}</p>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

function Dashboard({ stats, onOpenQueue }: { stats: any; onOpenQueue: () => void }) {
  const [day, setDay] = useState<string | null>(null);
  if (!stats) return <p className="text-sm text-[#64748b]">Memuat…</p>;
  const c = stats.cards;
  const cards: [string, number, string?][] = [
    ['Total', c.total], ['Hari Ini', c.hari_ini], ['Antrian (Open)', c.open, 'text-amber-600'],
    ['Proses', c.proses, 'text-blue-600'], ['Selesai', c.selesai, 'text-emerald-600'], ['Batal', c.batal, 'text-slate-500'],
    ['Total Menit', c.total_menit],
  ];
  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-7">
        {cards.map(([label, n, color]) => (
          <div key={label} className={cardCls}>
            <div className="text-xs font-bold text-[#64748b]">{label}</div>
            <div className={cn('text-3xl font-extrabold', color)}>{n}</div>
          </div>
        ))}
      </div>
      {c.total === 0 && (
        <p className="text-sm text-[#64748b]">Belum ada tiket di periode ini. Ganti Periode di atas untuk melihat bulan lain.</p>
      )}
      <section className={cardCls}>
        <h2 className="text-base font-bold">Tiket per Hari</h2>
        <p className="text-xs text-[#64748b] mb-3">{c.total} tiket · {c.total_menit} menit bulan ini</p>
        <Columns
          ariaLabel={`Tiket per hari, ${stats.perHari.length} hari dengan tiket`}
          tickEvery={5}
          onPick={setDay}
          cols={Array.from({ length: new Date(stats.year, stats.month, 0).getDate() }, (_, i) => {
            const d = stats.perHari.find((x: any) => x.hari === i + 1);
            const key = `${stats.year}-${String(stats.month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
            return { key, label: String(i + 1), value: d?.tiket ?? 0, tip: `${i + 1}/${stats.month}: ${d?.tiket ?? 0} tiket, ${d?.menit ?? 0} menit` };
          })} />
      </section>
      {day && <DayModal date={day} onClose={() => setDay(null)} />}
      {c.open > 0 && (
        <button type="button" onClick={onOpenQueue} className={btnPrimary}>Lihat {c.open} antrian pengajuan</button>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        <section className={`${cardCls} lg:col-span-2`}>
          <h2 className="text-base font-bold mb-2">Aktivitas Terbaru</h2>
          <ul className="divide-y divide-[#f1f5f9] dark:divide-[#162032]">
            {stats.recent.map((t: HdTicket) => (
              <li key={t.id} className="py-2 text-sm flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="font-bold">#{t.id}</span> · {fmtDate(t.tanggal)} · {t.kategori}
                  <div className="truncate text-[#475569] dark:text-[#94a3b8]">{t.isi_helpdesk}</div>
                </div>
                <StatusBadge status={t.status} />
              </li>
            ))}
          </ul>
        </section>
        <section className={cardCls}>
          <h2 className="text-base font-bold mb-2">Per Kategori</h2>
          <Bars rows={stats.perKategori.map((k: any) => [k.nama, k.tiket])} />
        </section>
      </div>
    </div>
  );
}

// One series, one hue, columns anchored to the baseline. Hover/focus shows the value; click opens detail.
type Col = { key: string; label: string; value: number; tip: string };
function Columns({ cols, onPick, ariaLabel, tickEvery = 1 }: {
  cols: Col[]; onPick: (key: string) => void; ariaLabel: string; tickEvery?: number;
}) {
  const max = Math.max(1, ...cols.map((c) => c.value));
  return (
    <figure role="group" aria-label={ariaLabel}>
      <div className="flex gap-2">
        <div className="flex flex-col justify-between text-[11px] text-[#64748b] h-36 pb-0.5 text-right w-5" aria-hidden>
          <span>{max}</span><span>0</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="relative h-36 flex items-end gap-[2px] border-b border-[#cbd5e1] dark:border-[#24334a]">
            <div className="absolute inset-x-0 top-0 border-t border-dashed border-[#e2e8f0] dark:border-[#1e2a3f]" aria-hidden />
            {cols.map((c) =>
              !c.value ? <div key={c.key} className="flex-1" /> : (
                <button key={c.key} type="button" onClick={() => onPick(c.key)} aria-label={`${c.tip}. Lihat detail`}
                  className="group relative flex-1 h-full flex items-end justify-center cursor-pointer rounded-t outline-none focus-visible:ring-2 focus-visible:ring-[#034694]">
                  <div className="w-full max-w-8 rounded-t bg-[#034694] dark:bg-blue-400 group-hover:opacity-80 group-focus-visible:opacity-80"
                    style={{ height: `${(c.value / max) * 100}%` }} />
                  <div role="tooltip" className="pointer-events-none absolute bottom-full mb-1 hidden group-hover:block group-focus-visible:block whitespace-nowrap rounded-md bg-[#0f172a] text-white text-[11px] px-2 py-1 z-10">
                    {c.tip} · klik untuk detail
                  </div>
                </button>
              )
            )}
          </div>
          <div className="flex gap-[2px] text-[11px] text-[#64748b] mt-1" aria-hidden>
            {cols.map((c, i) => (
              <span key={c.key} className="flex-1 text-center truncate">{i === 0 || (i + 1) % tickEvery === 0 ? c.label : ''}</span>
            ))}
          </div>
        </div>
      </div>
    </figure>
  );
}

// Plain CSS bars: label + number are always shown as text, not only the bar length
function Bars({ rows }: { rows: [string, number][] }) {
  const max = Math.max(1, ...rows.map(([, n]) => n));
  if (!rows.length) return <p className="text-sm text-[#64748b]">Belum ada data.</p>;
  return (
    <ul className="space-y-1.5">
      {rows.map(([label, n]) => (
        <li key={label} className="text-sm">
          <div className="flex justify-between"><span>{label}</span><span className="font-bold">{n}</span></div>
          <div className="h-1.5 rounded bg-[#e2e8f0] dark:bg-[#1e2a3f]">
            <div className="h-1.5 rounded bg-[#034694] dark:bg-blue-500" style={{ width: `${(n / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const ymLabel = (ym: string) => `${BULAN[Number(ym.slice(5, 7)) - 1]} ${ym.slice(2, 4)}`;
type TrendRow = { ym: string; tiket: number; menit: number; selesai: number; rata_menit: number | null };

// 12 months ending at the selected period: volume chart (click = open that month) + recap table
function Trend({ stats, onPickMonth }: { stats: any; onPickMonth: (ym: string) => void }) {
  if (!stats) return <p className="text-sm text-[#64748b]">Memuat…</p>;
  const trend: TrendRow[] = stats.trend;
  const kat = [...new Set<string>(stats.trendKategori.map((k: any) => k.nama))].sort();
  const cell = (ym: string, nama: string): number =>
    stats.trendKategori.find((k: any) => k.ym === ym && k.nama === nama)?.tiket ?? 0;
  const sum = (f: (t: TrendRow) => number) => trend.reduce((a, t) => a + f(t), 0);
  const th = 'py-2 px-2 text-right font-semibold whitespace-nowrap';
  const td = 'py-1.5 px-2 text-right tabular-nums';
  return (
    <div className="space-y-4">
      <section className={cardCls}>
        <h2 className="text-base font-bold">Trend Tiket 12 Bulan</h2>
        <p className="text-xs text-[#64748b] mb-3">
          {ymLabel(trend[0].ym)} – {ymLabel(trend[trend.length - 1].ym)} · {sum((t) => t.tiket)} tiket · {sum((t) => t.menit)} menit
        </p>
        <Columns ariaLabel="Jumlah tiket per bulan, 12 bulan" onPick={onPickMonth}
          cols={trend.map((t) => ({ key: t.ym, label: ymLabel(t.ym), value: t.tiket, tip: `${ymLabel(t.ym)}: ${t.tiket} tiket, ${t.menit} menit` }))} />
      </section>
      <section className={`${cardCls} overflow-x-auto`}>
        <h2 className="text-base font-bold mb-2">Rekap per Bulan</h2>
        <table className="w-full text-sm">
          <thead className="text-[#64748b] border-b border-[#e2e8f0] dark:border-[#1e2a3f]">
            <tr>
              <th className="py-2 pr-2 text-left font-semibold">Bulan</th>
              <th className={th}>Tiket</th><th className={th}>Selesai</th><th className={th}>Total Menit</th><th className={th}>Rata-rata Menit</th>
              {kat.map((k) => <th key={k} className={th}>{k}</th>)}
            </tr>
          </thead>
          <tbody>
            {[...trend].reverse().map((t) => (
              <tr key={t.ym} className="border-b border-[#f1f5f9] dark:border-[#162032]">
                <td className="py-1.5 pr-2 font-semibold">{ymLabel(t.ym)}</td>
                <td className={td}>{t.tiket}</td><td className={td}>{t.selesai}</td>
                <td className={td}>{t.menit}</td><td className={td}>{t.rata_menit ?? '-'}</td>
                {kat.map((k) => <td key={k} className={td}>{cell(t.ym, k) || '-'}</td>)}
              </tr>
            ))}
          </tbody>
          <tfoot className="font-bold border-t border-[#cbd5e1] dark:border-[#24334a]">
            <tr>
              <td className="py-2 pr-2">Total</td>
              <td className={td}>{sum((t) => t.tiket)}</td><td className={td}>{sum((t) => t.selesai)}</td>
              <td className={td}>{sum((t) => t.menit)}</td><td className={td} />
              {kat.map((k) => <td key={k} className={td}>{trend.reduce((a, t) => a + cell(t.ym, k), 0)}</td>)}
            </tr>
          </tfoot>
        </table>
      </section>
    </div>
  );
}

function Queue({ rows, kategori, unitKerja, pic, onChanged }: {
  rows: HdTicket[]; kategori: any[]; unitKerja: any[]; pic: any[]; onChanged: () => void;
}) {
  const [editing, setEditing] = useState<HdTicket | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const ambil = async (t: HdTicket) => {
    setBusy(t.id);
    try {
      await api(`/api/helpdesk/${t.id}/ambil`, { method: 'POST' });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBusy(null);
      onChanged();
    }
  };
  if (!rows.length) return <div className={`${cardCls} text-sm text-[#64748b]`}>Tidak ada antrian. Semua pengajuan sudah ditangani.</div>;
  return (
    <div className="space-y-2">
      {rows.map((t) => (
        <div key={t.id} className={`${cardCls} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
          <div className="text-sm min-w-0">
            <div className="font-bold">
              #{t.id} · {t.kategori} · {t.unit_kerja ?? '-'}
              <span className="font-normal text-[#64748b]"> · {fmtDate(t.tanggal)} · {t.requester_name ?? t.pic_nama} ({t.requester_unit ?? '-'})</span>
            </div>
            <p className="whitespace-pre-line mt-1">{t.isi_helpdesk}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button type="button" disabled={busy === t.id} onClick={() => ambil(t)} className={btnPrimary}>
              <Hand className="w-3.5 h-3.5" /> Ambil
            </button>
            <button type="button" onClick={() => setEditing(t)} className={btnGhost}>Tugaskan</button>
          </div>
        </div>
      ))}
      {editing && (
        <Modal title={`Tugaskan Tiket #${editing.id}`} onClose={() => setEditing(null)} wide>
          <TicketForm ticket={{ ...editing, status: 'Proses', staff_ids: [] }} kategori={kategori} unitKerja={unitKerja} pic={pic}
            onSaved={() => { setEditing(null); onChanged(); }} />
        </Modal>
      )}
    </div>
  );
}
