import { NextRequest, NextResponse } from 'next/server';
import { query, withTransaction } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { MAX_TEXT } from '@/lib/helpdesk';
import { TICKET_SELECT, addHistory, dbError, notify, parseId, readJson, short, tdUserIds, toTicket } from '@/lib/helpdeskDb';

const MAX_OPEN_PER_USER = 10;

// Pengajuan Helpdesk: any logged-in user, scoped to requested_by = session user
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const rows = await query<any[]>(`${TICKET_SELECT} WHERE t.requested_by = ? ORDER BY t.id DESC LIMIT 100`, [user.id]);
    return NextResponse.json({ tickets: rows.map(toTicket) });
  } catch (err) {
    return dbError(err);
  }
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Only these 3 fields are read; status/staff/jam in the body are ignored on purpose
  const b = await readJson(request);
  const kategori_id = parseId(String(b?.kategori_id ?? ''));
  const unit_kerja_id = parseId(String(b?.unit_kerja_id ?? ''));
  const isi = String(b?.isi_helpdesk ?? '').trim();
  if (!kategori_id || !unit_kerja_id || !isi) {
    return NextResponse.json({ error: 'Kategori, lokasi, dan keluhan wajib diisi' }, { status: 400 });
  }
  if (isi.length > MAX_TEXT) return NextResponse.json({ error: `Keluhan maksimal ${MAX_TEXT} karakter` }, { status: 400 });

  try {
    // ponytail: count-then-insert can let 2 parallel requests slip past the cap; fine for spam limiting
    const [{ n }] = await query<any[]>(
      `SELECT COUNT(*) AS n FROM hd_tickets WHERE requested_by = ? AND status = 'Open'`, [user.id]
    );
    if (Number(n) >= MAX_OPEN_PER_USER) {
      return NextResponse.json({ error: `Maksimal ${MAX_OPEN_PER_USER} pengajuan yang belum diproses` }, { status: 429 });
    }
    const [kat] = await query<any[]>('SELECT 1 FROM hd_kategori WHERE id = ? AND aktif = 1', [kategori_id]);
    const [uk] = await query<any[]>('SELECT 1 FROM hd_unit_kerja WHERE id = ? AND aktif = 1', [unit_kerja_id]);
    if (!kat || !uk) return NextResponse.json({ error: 'Kategori / lokasi tidak ditemukan' }, { status: 400 });

    const id = await withTransaction(async (conn) => {
      const [r]: any = await conn.query(
        `INSERT INTO hd_tickets (tanggal, requested_by, created_by, kategori_id, unit_kerja_id, isi_helpdesk)
         VALUES (CURDATE(), ?, ?, ?, ?, ?)`,
        [user.id, user.id, kategori_id, unit_kerja_id, isi]
      );
      await addHistory(conn, r.insertId, 'create', user.id, [
        { field: 'status', label: 'Status', new: 'Open' },
        { field: 'sumber', label: 'Sumber', new: 'Pengajuan' },
      ]);
      return r.insertId as number;
    });

    await notify(await tdUserIds(), `Pengajuan Helpdesk #${id}`, `${user.name} (${user.unit_name || '-'}): ${short(isi)}`);
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    return dbError(err);
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = parseId(request.nextUrl.searchParams.get('id') ?? '');
  if (!id) return NextResponse.json({ error: 'id tidak valid' }, { status: 400 });

  try {
    // Status checked inside the DELETE itself: TD may "Ambil" at the same moment
    const r = await query<any>(`DELETE FROM hd_tickets WHERE id = ? AND requested_by = ? AND status = 'Open'`, [id, user.id]);
    if (r.affectedRows) return NextResponse.json({ success: true });
    const [row] = await query<any[]>('SELECT 1 FROM hd_tickets WHERE id = ? AND requested_by = ?', [id, user.id]);
    return row
      ? NextResponse.json({ error: 'Pengajuan sudah diproses TD, tidak bisa dihapus' }, { status: 409 })
      : NextResponse.json({ error: 'Pengajuan tidak ditemukan' }, { status: 404 });
  } catch (err) {
    return dbError(err);
  }
}
