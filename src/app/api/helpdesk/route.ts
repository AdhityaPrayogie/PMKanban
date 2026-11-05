import { NextRequest, NextResponse } from 'next/server';
import { query, withTransaction } from '@/lib/db';
import { requireHelpdesk } from '@/lib/auth';
import { validateTicket } from '@/lib/helpdesk';
import {
  TICKET_SELECT, addHistory, allTdStaff, dbError, loadTicket, notify, readJson, setStaff, short, ticketFilter, toTicket,
} from '@/lib/helpdeskDb';

// GET /api/helpdesk?start&end&status&kategori_id&staff_id&sumber&q&limit&offset -> { rows, total }
export async function GET(request: NextRequest) {
  const { error } = await requireHelpdesk();
  if (error) return error;
  const sp = request.nextUrl.searchParams;
  const { where, params } = ticketFilter(sp);
  const limit = Math.min(Math.max(Number(sp.get('limit')) || 25, 1), 200);
  const offset = Math.max(Number(sp.get('offset')) || 0, 0);
  // Open queue: oldest first. Everything else: newest first.
  const order = sp.get('status') === 'Open' ? 't.id ASC' : 't.tanggal DESC, t.id DESC';
  try {
    const [rows, [{ total }]] = await Promise.all([
      query<any[]>(`${TICKET_SELECT} ${where} ORDER BY ${order} LIMIT ? OFFSET ?`, [...params, limit, offset]),
      query<any[]>(
        `SELECT COUNT(*) AS total FROM hd_tickets t
         LEFT JOIN users ru ON ru.id = t.requested_by
         LEFT JOIN hd_pic p ON p.id = t.pic_id
         LEFT JOIN hd_unit_kerja uk ON uk.id = t.unit_kerja_id ${where}`,
        params
      ),
    ]);
    return NextResponse.json({ rows: rows.map(toTicket), total: Number(total) });
  } catch (err) {
    return dbError(err);
  }
}

// TD records a ticket directly (phone / walk-in): PIC required, created_by = session user
export async function POST(request: Request) {
  const { user, error } = await requireHelpdesk();
  if (error) return error;
  const v = validateTicket(await readJson(request));
  if (!v.data) return NextResponse.json({ error: v.error }, { status: 400 });
  const d = v.data;
  if (!d.pic_id) return NextResponse.json({ error: 'PIC (peminta) wajib dipilih' }, { status: 400 });
  if (!d.staff_ids.length) return NextResponse.json({ error: 'Pilih minimal 1 staf IT' }, { status: 400 });
  if (!(await allTdStaff(d.staff_ids))) return NextResponse.json({ error: 'Staf IT harus user aktif unit TD' }, { status: 400 });

  try {
    const id = await withTransaction(async (conn) => {
      const [r]: any = await conn.query(
        `INSERT INTO hd_tickets (tanggal, jam_mulai, jam_selesai, pic_id, kategori_id, unit_kerja_id,
           isi_helpdesk, tindakan, status, jenis_pelayanan, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [d.tanggal, d.jam_mulai, d.jam_selesai, d.pic_id, d.kategori_id, d.unit_kerja_id,
         d.isi_helpdesk, d.tindakan, d.status, d.jenis_pelayanan, user.id]
      );
      await setStaff(conn, r.insertId, d.staff_ids);
      const t = await loadTicket(r.insertId, conn);
      await addHistory(conn, r.insertId, 'create', user.id, [
        { field: 'status', label: 'Status', new: d.status },
        { field: 'staff_names', label: 'Staf IT', new: t?.staff_names ?? null },
      ]);
      return r.insertId as number;
    });
    await notify(d.staff_ids.filter((s) => s !== user.id), `Tiket Helpdesk #${id}`, `${user.name} menugaskan Anda: ${short(d.isi_helpdesk)}`);
    return NextResponse.json({ ticket: await loadTicket(id) }, { status: 201 });
  } catch (err) {
    return dbError(err);
  }
}
