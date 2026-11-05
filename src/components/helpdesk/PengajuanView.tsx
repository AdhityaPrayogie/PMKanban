'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { LifeBuoy, Send, Trash2 } from 'lucide-react';
import type { HdTicket } from '@/lib/helpdesk';
import { subscribeRealtime } from '@/lib/realtime';
import { ErrorText, StatusBadge, api, btnGhost, btnPrimary, cardCls, fmtDate, inputCls, labelCls, useMaster } from './ui';

export function PengajuanView() {
  const [kategori] = useMaster('kategori');
  const [unitKerja] = useMaster('unit-kerja');
  const [tickets, setTickets] = useState<HdTicket[] | null>(null);
  const [form, setForm] = useState({ kategori_id: '', unit_kerja: '', isi_helpdesk: '' });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api<{ tickets: HdTicket[] }>('/api/helpdesk/pengajuan').then((d) => setTickets(d.tickets)).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    load();
    // Status changes by TD arrive as notifications for the requester
    return subscribeRealtime({ notification: load });
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const uk = unitKerja.find((u) => u.nama.toLowerCase() === form.unit_kerja.trim().toLowerCase());
    if (!uk) return setError('Lokasi / unit kerja tidak ditemukan, pilih dari daftar');
    setSaving(true);
    try {
      const { id } = await api<{ id: number }>('/api/helpdesk/pengajuan', {
        method: 'POST',
        body: JSON.stringify({ kategori_id: Number(form.kategori_id), unit_kerja_id: uk.id, isi_helpdesk: form.isi_helpdesk }),
      });
      setForm({ kategori_id: '', unit_kerja: '', isi_helpdesk: '' });
      setNotice(`Pengajuan #${id} terkirim. Tim TD akan segera menindaklanjuti.`);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (t: HdTicket) => {
    if (!confirm(`Hapus pengajuan #${t.id}?`)) return;
    try {
      await api(`/api/helpdesk/pengajuan?id=${t.id}`, { method: 'DELETE' });
      load();
    } catch (err: any) {
      alert(err.message);
      load();
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center gap-2">
        <LifeBuoy className="w-5 h-5 text-[#034694] dark:text-blue-400" />
        <h1 className="text-xl font-extrabold">Pengajuan Helpdesk IT</h1>
      </div>

      <form onSubmit={submit} className={`${cardCls} grid gap-3 sm:grid-cols-2`}>
        <div>
          <label htmlFor="pj-kategori" className={labelCls}>Kategori masalah</label>
          <select id="pj-kategori" required className={inputCls} value={form.kategori_id} onChange={(e) => setForm({ ...form, kategori_id: e.target.value })}>
            <option value="">Pilih kategori…</option>
            {kategori.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="pj-lokasi" className={labelCls}>Lokasi / unit kerja</label>
          <input id="pj-lokasi" required list="pj-lokasi-list" autoComplete="off" placeholder="Ketik untuk mencari…" className={inputCls}
            value={form.unit_kerja} onChange={(e) => setForm({ ...form, unit_kerja: e.target.value })} />
          <datalist id="pj-lokasi-list">{unitKerja.map((u) => <option key={u.id} value={u.nama} />)}</datalist>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="pj-isi" className={labelCls}>Keluhan / permintaan</label>
          <textarea id="pj-isi" required rows={3} maxLength={5000} placeholder="Contoh: printer di ruang poli 3 tidak bisa mencetak"
            className={inputCls} value={form.isi_helpdesk} onChange={(e) => setForm({ ...form, isi_helpdesk: e.target.value })} />
        </div>
        <div className="sm:col-span-2 flex items-center justify-between gap-3">
          <div>
            <ErrorText msg={error} />
            {notice && <p aria-live="polite" className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{notice}</p>}
          </div>
          <button type="submit" disabled={saving} className={btnPrimary}>
            <Send className="w-3.5 h-3.5" /> {saving ? 'Mengirim…' : 'Kirim Pengajuan'}
          </button>
        </div>
      </form>

      <section className={cardCls}>
        <h2 className="text-base font-bold mb-3">Pengajuan Saya</h2>
        {tickets === null ? (
          <p className="text-sm text-[#64748b]">Memuat…</p>
        ) : tickets.length === 0 ? (
          <p className="text-sm text-[#64748b]">Belum ada pengajuan.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[#64748b] border-b border-[#e2e8f0] dark:border-[#1e2a3f]">
                <tr>
                  <th className="py-2 pr-3">#</th><th className="pr-3">Tanggal</th><th className="pr-3">Kategori</th>
                  <th className="pr-3">Keluhan</th><th className="pr-3">Status</th><th className="pr-3">Ditangani</th>
                  <th className="pr-3">Tindakan</th><th><span className="sr-only">Aksi</span></th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id} className="border-b border-[#f1f5f9] dark:border-[#162032] align-top">
                    <td className="py-2 pr-3 font-bold">{t.id}</td>
                    <td className="pr-3 whitespace-nowrap">{fmtDate(t.tanggal)}</td>
                    <td className="pr-3">{t.kategori}</td>
                    <td className="pr-3 max-w-xs whitespace-pre-line">{t.isi_helpdesk}</td>
                    <td className="pr-3"><StatusBadge status={t.status} /></td>
                    <td className="pr-3">{t.staff_names || '-'}</td>
                    <td className="pr-3 max-w-xs whitespace-pre-line">{t.tindakan || '-'}</td>
                    <td>
                      {t.status === 'Open' && (
                        <button type="button" onClick={() => remove(t)} className={btnGhost} aria-label={`Hapus pengajuan #${t.id}`}>
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
