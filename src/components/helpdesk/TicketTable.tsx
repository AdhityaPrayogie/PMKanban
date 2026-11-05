'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Download, History, Pencil, Search, Trash2 } from 'lucide-react';
import { HELPDESK_UNIT_ID, STATUS, canManageHelpdeskMaster, type HdMaster, type HdTicket } from '@/lib/helpdesk';
import { useKanbanStore } from '@/store/useKanbanStore';
import { useDebounce } from '@/hooks/useDebounce';
import { TicketForm } from './TicketForm';
import { Modal, StatusBadge, api, btnGhost, cardCls, fmtDate, inputCls, labelCls, rupiah } from './ui';

const PAGE = 25;

export function TicketTable({ kategori, unitKerja, pic, version, onChanged }: {
  kategori: HdMaster[]; unitKerja: HdMaster[]; pic: HdMaster[]; version: number; onChanged: () => void;
}) {
  const { activeUser, allUsers } = useKanbanStore();
  const tdStaff = allUsers.filter((u) => u.unit_id === HELPDESK_UNIT_ID);
  // No default date range: show all tickets (older ones too); export asks for dates
  const [filter, setFilter] = useState({ start: '', end: '', status:'', kategori_id: '', staff_id: '', sumber: '', q: '' });
  const q = useDebounce(filter.q, 300);
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<{ rows: HdTicket[]; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<HdTicket | null>(null);
  const [historyOf, setHistoryOf] = useState<HdTicket | null>(null);

  const params = useCallback(() => {
    const p = new URLSearchParams();
    Object.entries({ ...filter, q }).forEach(([k, v]) => v && p.set(k, v));
    return p;
  }, [filter, q]);

  useEffect(() => {
    const p = params();
    p.set('limit', String(PAGE));
    p.set('offset', String(offset));
    api<{ rows: HdTicket[]; total: number }>(`/api/helpdesk?${p}`).then(setData).catch((e) => setError(e.message));
  }, [params, offset, version]);

  const setF = (k: keyof typeof filter) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilter({ ...filter, [k]: e.target.value });
    setOffset(0);
  };

  const remove = async (t: HdTicket) => {
    if (!confirm(`Hapus permanen tiket #${t.id}? Riwayatnya ikut terhapus dan tidak bisa dikembalikan.`)) return;
    try {
      await api(`/api/helpdesk/${t.id}`, { method: 'DELETE' });
      onChanged();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const exportXlsx = () => {
    if (!filter.start || !filter.end) return alert('Isi tanggal mulai dan akhir untuk export');
    const p = new URLSearchParams({ start: filter.start, end: filter.end });
    if (filter.kategori_id) p.set('kategori_ids', filter.kategori_id);
    window.location.href = `/api/helpdesk/export?${p}`;
  };

  const canDelete = (t: HdTicket) => t.created_by === activeUser?.id || canManageHelpdeskMaster(activeUser);

  return (
    <div className="space-y-4">
      <div className={`${cardCls} grid gap-2 grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 items-end`}>
        <div><label htmlFor="f-start" className={labelCls}>Dari</label><input id="f-start" type="date" className={inputCls} value={filter.start} onChange={setF('start')} /></div>
        <div><label htmlFor="f-end" className={labelCls}>Sampai</label><input id="f-end" type="date" className={inputCls} value={filter.end} onChange={setF('end')} /></div>
        <div>
          <label htmlFor="f-status" className={labelCls}>Status</label>
          <select id="f-status" className={inputCls} value={filter.status} onChange={setF('status')}>
            <option value="">Semua</option>{STATUS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="f-kat" className={labelCls}>Kategori</label>
          <select id="f-kat" className={inputCls} value={filter.kategori_id} onChange={setF('kategori_id')}>
            <option value="">Semua</option>{kategori.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="f-staff" className={labelCls}>Staf</label>
          <select id="f-staff" className={inputCls} value={filter.staff_id} onChange={setF('staff_id')}>
            <option value="">Semua</option>{tdStaff.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="f-sumber" className={labelCls}>Sumber</label>
          <select id="f-sumber" className={inputCls} value={filter.sumber} onChange={setF('sumber')}>
            <option value="">Semua</option><option value="pengajuan">Pengajuan</option><option value="langsung">Langsung</option>
          </select>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label htmlFor="f-q" className={labelCls}>Cari</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2 top-2.5 text-[#94a3b8]" aria-hidden />
            <input id="f-q" type="search" className={`${inputCls} pl-7`} value={filter.q} onChange={setF('q')} />
          </div>
        </div>
        <button type="button" onClick={exportXlsx} className={`${btnGhost} justify-center py-2`}>
          <Download className="w-3.5 h-3.5" /> Excel
        </button>
      </div>

      <div className={`${cardCls} overflow-x-auto`}>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <table className="w-full text-sm">
          <thead className="text-left text-[#64748b] border-b border-[#e2e8f0] dark:border-[#1e2a3f]">
            <tr>
              <th className="py-2 pr-2">#</th><th className="pr-2">Tanggal</th><th className="pr-2">Jam</th><th className="pr-2 text-right whitespace-nowrap">Total Menit</th><th className="pr-2">Peminta</th>
              <th className="pr-2">Kategori</th><th className="pr-2">Isi Helpdesk</th><th className="pr-2">Staf</th>
              <th className="pr-2 text-right">Biaya</th><th className="pr-2">Status</th><th className="pr-2">Sumber</th><th><span className="sr-only">Aksi</span></th>
            </tr>
          </thead>
          <tbody>
            {data?.rows.map((t) => (
              <tr key={t.id} className="border-b border-[#f1f5f9] dark:border-[#162032] align-top">
                <td className="py-2 pr-2 font-bold">{t.id}</td>
                <td className="pr-2 whitespace-nowrap">{fmtDate(t.tanggal)}</td>
                <td className="pr-2 whitespace-nowrap">
                  {t.jam_mulai ?? '--'}–{t.jam_selesai ?? '--'}
                </td>
                <td className="pr-2 text-right tabular-nums font-semibold">{t.total_menit ?? '-'}</td>
                <td className="pr-2">
                  {t.pic_nama ?? t.requester_name}
                  <div className="text-[11px] text-[#64748b]">{t.unit_kerja ?? ''}</div>
                </td>
                <td className="pr-2">{t.kategori}</td>
                <td className="pr-2 max-w-xs">
                  <div className="line-clamp-2">{t.isi_helpdesk}</div>
                  {t.tindakan && <div className="text-[11px] text-[#64748b] line-clamp-1">↳ {t.tindakan}</div>}
                </td>
                <td className="pr-2">{t.staff_names || '-'}</td>
                <td className="pr-2 text-right whitespace-nowrap tabular-nums">
                  {t.total_biaya ? rupiah(t.total_biaya) : '-'}
                  {t.biaya.length > 0 && <div className="text-[11px] text-[#64748b] max-w-40 truncate ml-auto" title={t.biaya.map((b) => `${b.nama_barang} ×${b.qty}`).join(', ')}>
                    {t.biaya.map((b) => b.nama_barang).join(', ')}
                  </div>}
                </td>
                <td className="pr-2"><StatusBadge status={t.status} /></td>
                <td className="pr-2">{t.requested_by ? 'Pengajuan' : 'Langsung'}</td>
                <td className="whitespace-nowrap">
                  <button type="button" onClick={() => setEditing(t)} className="p-1 hover:text-[#034694]" aria-label={`Edit tiket #${t.id}`}><Pencil className="w-3.5 h-3.5" /></button>
                  <button type="button" onClick={() => setHistoryOf(t)} className="p-1 hover:text-[#034694]" aria-label={`Riwayat tiket #${t.id}`}><History className="w-3.5 h-3.5" /></button>
                  {canDelete(t) && (
                    <button type="button" onClick={() => remove(t)} className="p-1 text-rose-500" aria-label={`Hapus tiket #${t.id}`}><Trash2 className="w-3.5 h-3.5" /></button>
                  )}
                </td>
              </tr>
            ))}
            {data && !data.rows.length && <tr><td colSpan={12} className="py-6 text-center text-[#64748b]">Tidak ada tiket.</td></tr>}
          </tbody>
        </table>
        {data && data.total > PAGE && (
          <div className="flex items-center justify-end gap-2 pt-3 text-sm">
            <span className="text-[#64748b]">{offset + 1}–{Math.min(offset + PAGE, data.total)} dari {data.total}</span>
            <button type="button" className={btnGhost} disabled={offset === 0} onClick={() => setOffset(offset - PAGE)}>Sebelumnya</button>
            <button type="button" className={btnGhost} disabled={offset + PAGE >= data.total} onClick={() => setOffset(offset + PAGE)}>Berikutnya</button>
          </div>
        )}
      </div>

      {editing && (
        <Modal title={`Edit Tiket #${editing.id}`} onClose={() => setEditing(null)} wide>
          <TicketForm ticket={editing} kategori={kategori} unitKerja={unitKerja} pic={pic}
            onSaved={() => { setEditing(null); onChanged(); }} />
        </Modal>
      )}
      {historyOf && <HistoryModal ticket={historyOf} onClose={() => setHistoryOf(null)} />}
    </div>
  );
}

function HistoryModal({ ticket, onClose }: { ticket: HdTicket; onClose: () => void }) {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    api<{ history: any[] }>(`/api/helpdesk/${ticket.id}`).then((d) => setRows(d.history)).catch(() => setRows([]));
  }, [ticket.id]);
  return (
    <Modal title={`Riwayat Tiket #${ticket.id}`} onClose={onClose}>
      {rows === null ? <p className="text-sm">Memuat…</p> : (
        <ol className="space-y-3">
          {rows.map((h) => {
            const changes = typeof h.changes === 'string' ? JSON.parse(h.changes) : h.changes;
            return (
              <li key={h.id} className="text-sm border-l-2 border-[#034694] pl-3">
                <div className="font-bold">
                  {h.aksi === 'create' ? 'Dibuat' : 'Diubah'} oleh {h.user_name ?? '-'}
                  <span className="font-normal text-[#64748b]"> · {new Date(h.created_at).toLocaleString('id-ID')}</span>
                </div>
                <ul className="mt-1 space-y-0.5">
                  {changes.map((c: any, i: number) => (
                    <li key={i}>
                      <span className="text-[#64748b]">{c.label}:</span>{' '}
                      {c.old != null && <><del className="text-rose-600">{String(c.old) || '(kosong)'}</del> → </>}
                      <span className="text-emerald-700 dark:text-emerald-400">{c.new == null || c.new === '' ? '(kosong)' : String(c.new)}</span>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ol>
      )}
    </Modal>
  );
}
