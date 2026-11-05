'use client';

import React, { useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { HELPDESK_UNIT_ID, JENIS, STATUS, type HdMaster, type HdTicket } from '@/lib/helpdesk';
import { useKanbanStore } from '@/store/useKanbanStore';
import { formatLastActive } from '@/lib/utils';
import { ErrorText, api, btnGhost, btnPrimary, inputCls, labelCls, rupiah, today } from './ui';

const byName = (rows: HdMaster[], name: string) => rows.find((r) => r.nama.toLowerCase() === name.trim().toLowerCase());

// Create (no `ticket`) or edit. Unknown PIC names are added to master on save.
export function TicketForm({
  ticket, kategori, unitKerja, pic, onSaved,
}: {
  ticket?: HdTicket;
  kategori: HdMaster[];
  unitKerja: HdMaster[];
  pic: HdMaster[];
  onSaved: (t: HdTicket) => void;
}) {
  const { activeUser, allUsers } = useKanbanStore();
  const tdStaff = allUsers.filter((u) => u.unit_id === HELPDESK_UNIT_ID && u.status === 'active');
  const [f, setF] = useState({
    tanggal: ticket?.tanggal ?? today(),
    jam_mulai: ticket?.jam_mulai ?? '',
    jam_selesai: ticket?.jam_selesai ?? '',
    pic: ticket?.pic_nama ?? '',
    kategori_id: String(ticket?.kategori_id ?? ''),
    unit_kerja: ticket?.unit_kerja ?? '',
    isi_helpdesk: ticket?.isi_helpdesk ?? '',
    tindakan: ticket?.tindakan ?? '',
    status: ticket?.status ?? 'Proses',
    jenis_pelayanan: ticket?.jenis_pelayanan ?? 'Pelayanan',
    staff_ids: ticket?.staff_ids ?? (activeUser ? [activeUser.id] : []),
  });
  // Inputs keep strings while typing; converted to numbers on submit
  const [biaya, setBiaya] = useState(
    (ticket?.biaya ?? []).map((b) => ({ nama_barang: b.nama_barang, qty: String(b.qty), harga: String(b.harga) }))
  );
  const setItem = (i: number, k: 'nama_barang' | 'qty' | 'harga', v: string) =>
    setBiaya(biaya.map((b, j) => (j === i ? { ...b, [k]: v } : b)));
  const totalRp = biaya.reduce((a, b) => a + (Number(b.qty) || 0) * (Number(b.harga) || 0), 0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.value });
  const toggleStaff = (id: string) =>
    setF({ ...f, staff_ids: f.staff_ids.includes(id) ? f.staff_ids.filter((s) => s !== id) : [...f.staff_ids, id] });

  // Preview only; the DB computes the stored total_menit (generated column) the same way
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const totalMenit = f.jam_mulai && f.jam_selesai ? toMin(f.jam_selesai) - toMin(f.jam_mulai) : null;
  const fromPengajuan = !!ticket?.requested_by;
  const picKnown = !f.pic.trim() || !!byName(pic, f.pic);
  const uid = ticket ? `e${ticket.id}` : 'new';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const uk = f.unit_kerja.trim() ? byName(unitKerja, f.unit_kerja) : null;
    if (uk === undefined) return setError('Unit kerja tidak ditemukan, pilih dari daftar');
    if (!fromPengajuan && !f.pic.trim()) return setError('PIC (peminta) wajib diisi');
    setSaving(true);
    try {
      let pic_id: number | null = null;
      if (f.pic.trim()) {
        pic_id = byName(pic, f.pic)?.id
          ?? (await api<{ row: HdMaster }>('/api/helpdesk/master/pic', { method: 'POST', body: JSON.stringify({ nama: f.pic }) })).row.id;
      }
      const body = JSON.stringify({
        tanggal: f.tanggal, jam_mulai: f.jam_mulai || null, jam_selesai: f.jam_selesai || null, pic_id,
        kategori_id: Number(f.kategori_id), unit_kerja_id: uk?.id ?? null, isi_helpdesk: f.isi_helpdesk,
        tindakan: f.tindakan, status: f.status, jenis_pelayanan: f.jenis_pelayanan, staff_ids: f.staff_ids,
        biaya: biaya.map((b) => ({ nama_barang: b.nama_barang, qty: Number(b.qty), harga: Number(b.harga) })),
      });
      const { ticket: saved } = await api<{ ticket: HdTicket }>(ticket ? `/api/helpdesk/${ticket.id}` : '/api/helpdesk', {
        method: ticket ? 'PUT' : 'POST', body,
      });
      onSaved(saved);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-3">
      {fromPengajuan && (
        <p className="sm:col-span-3 text-sm rounded-lg bg-[#e0edfb] dark:bg-[#1e293b] text-[#034694] dark:text-blue-300 px-3 py-2">
          Pengajuan dari <strong>{ticket!.requester_name}</strong> ({ticket!.requester_unit || '-'})
        </p>
      )}
      <div>
        <label htmlFor={`${uid}-tgl`} className={labelCls}>Tanggal</label>
        <input id={`${uid}-tgl`} type="date" required className={inputCls} value={f.tanggal} onChange={set('tanggal')} />
      </div>
      <div>
        <label htmlFor={`${uid}-mulai`} className={labelCls}>Jam mulai</label>
        <input id={`${uid}-mulai`} type="time" className={inputCls} value={f.jam_mulai} onChange={set('jam_mulai')} />
      </div>
      <div>
        <label htmlFor={`${uid}-selesai`} className={labelCls}>Jam selesai</label>
        <input id={`${uid}-selesai`} type="time" min={f.jam_mulai || undefined} className={inputCls} value={f.jam_selesai} onChange={set('jam_selesai')} />
        <output htmlFor={`${uid}-mulai ${uid}-selesai`} aria-live="polite"
          className={`block text-xs font-semibold mt-1 ${totalMenit !== null && totalMenit < 0 ? 'text-rose-600' : 'text-[#475569] dark:text-[#94a3b8]'}`}>
          Total: {totalMenit === null ? '-' : totalMenit < 0 ? 'jam selesai sebelum jam mulai' : `${totalMenit} menit`}
        </output>
      </div>
      <div>
        <label htmlFor={`${uid}-pic`} className={labelCls}>PIC / peminta {fromPengajuan && '(opsional)'}</label>
        <input id={`${uid}-pic`} list={`${uid}-pic-list`} autoComplete="off" required={!fromPengajuan} className={inputCls} value={f.pic} onChange={set('pic')} />
        <datalist id={`${uid}-pic-list`}>{pic.map((p) => <option key={p.id} value={p.nama} />)}</datalist>
        {!picKnown && <p className="text-[11px] text-amber-600 mt-0.5">PIC baru, akan ditambahkan ke master</p>}
      </div>
      <div>
        <label htmlFor={`${uid}-kat`} className={labelCls}>Kategori</label>
        <select id={`${uid}-kat`} required className={inputCls} value={f.kategori_id} onChange={set('kategori_id')}>
          <option value="">Pilih…</option>
          {kategori.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor={`${uid}-uk`} className={labelCls}>Unit kerja / lokasi</label>
        <input id={`${uid}-uk`} list={`${uid}-uk-list`} autoComplete="off" className={inputCls} value={f.unit_kerja} onChange={set('unit_kerja')} />
        <datalist id={`${uid}-uk-list`}>{unitKerja.map((u) => <option key={u.id} value={u.nama} />)}</datalist>
      </div>
      <div className="sm:col-span-3">
        <label htmlFor={`${uid}-isi`} className={labelCls}>Isi helpdesk</label>
        <textarea id={`${uid}-isi`} required rows={2} maxLength={5000} className={inputCls} value={f.isi_helpdesk} onChange={set('isi_helpdesk')} />
      </div>
      <div className="sm:col-span-3">
        <label htmlFor={`${uid}-tindakan`} className={labelCls}>Tindakan</label>
        <textarea id={`${uid}-tindakan`} rows={2} maxLength={5000} className={inputCls} value={f.tindakan} onChange={set('tindakan')} />
      </div>
      <div>
        <label htmlFor={`${uid}-status`} className={labelCls}>Status</label>
        <select id={`${uid}-status`} className={inputCls} value={f.status} onChange={set('status')}>
          {STATUS.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor={`${uid}-jenis`} className={labelCls}>Jenis pelayanan</label>
        <select id={`${uid}-jenis`} className={inputCls} value={f.jenis_pelayanan} onChange={set('jenis_pelayanan')}>
          {JENIS.map((j) => <option key={j}>{j}</option>)}
        </select>
      </div>
      <fieldset className="sm:col-span-3">
        <legend className={labelCls}>Staf IT yang menangani</legend>
        <div className="flex flex-wrap gap-2">
          {tdStaff.map((u) => (
            <label key={u.id} className="inline-flex items-center gap-1.5 text-sm px-2 py-1 rounded-lg border border-[#cbd5e1] dark:border-[#24334a] cursor-pointer">
              <input type="checkbox" checked={f.staff_ids.includes(u.id)} onChange={() => toggleStaff(u.id)} />
              <span suppressHydrationWarning className={`w-1.5 h-1.5 rounded-full ${formatLastActive(u.last_active_at).isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`} aria-hidden />
              {u.name}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="sm:col-span-3">
        <legend className={labelCls}>Biaya / barang keluar (opsional)</legend>
        {biaya.length > 0 && (
          <div className="space-y-2 mb-2">
            {biaya.map((b, i) => (
              <div key={i} className="grid grid-cols-[1fr_5rem_8rem_auto] gap-2 items-center">
                <input aria-label={`Nama barang ${i + 1}`} placeholder="Nama barang, mis. Tinta hitam" required maxLength={150}
                  className={inputCls} value={b.nama_barang} onChange={(e) => setItem(i, 'nama_barang', e.target.value)} />
                <input aria-label={`Qty barang ${i + 1}`} type="number" min={1} max={9999} step={1} required
                  className={inputCls} value={b.qty} onChange={(e) => setItem(i, 'qty', e.target.value)} />
                <input aria-label={`Harga satuan barang ${i + 1} (Rp)`} type="number" min={0} step={1} required placeholder="Harga (Rp)"
                  className={inputCls} value={b.harga} onChange={(e) => setItem(i, 'harga', e.target.value)} />
                <button type="button" onClick={() => setBiaya(biaya.filter((_, j) => j !== i))}
                  className="p-1 text-rose-500" aria-label={`Hapus barang ${i + 1}`}><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <button type="button" className={btnGhost} onClick={() => setBiaya([...biaya, { nama_barang: '', qty: '1', harga: '' }])}>
            <Plus className="w-3.5 h-3.5" /> Tambah barang
          </button>
          <output aria-live="polite" className="text-sm font-bold">Total biaya: {rupiah(totalRp)}</output>
        </div>
      </fieldset>
      <div className="sm:col-span-3 flex items-center justify-between gap-3">
        <ErrorText msg={error} />
        <button type="submit" disabled={saving} className={btnPrimary}>
          <Save className="w-3.5 h-3.5" /> {saving ? 'Menyimpan…' : ticket ? 'Simpan Perubahan' : 'Simpan Tiket'}
        </button>
      </div>
    </form>
  );
}
