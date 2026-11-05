import { NextResponse } from 'next/server';
import { query, withTransaction } from '@/lib/db';
import { requireHelpdesk } from '@/lib/auth';
import { canManageHelpdeskMaster, diffTicket, validateTicket } from '@/lib/helpdesk';
import { addHistory, allTdStaff, dbError, loadTicket, notify, parseId, readJson, setBiaya, setStaff } from '@/lib/helpdeskDb';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { error } = await requireHelpdesk();
  if (error) return error;
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: 'id tidak valid' }, { status: 400 });
  try {
    const ticket = await loadTicket(id);
    if (!ticket) return NextResponse.json({ error: 'Tiket tidak ditemukan' }, { status: 404 });
    const history = await query<any[]>(
      `SELECT h.id, h.aksi, h.changes, h.created_at, u.name AS user_name
       FROM hd_ticket_history h LEFT JOIN users u ON u.id = h.user_id
       WHERE h.ticket_id = ? ORDER BY h.id DESC`,
      [id]
    );
    return NextResponse.json({ ticket, history });
  } catch (err) {
    return dbError(err);
  }
}

export async function PUT(request: Request, { params }: Ctx) {
  const { user, error } = await requireHelpdesk();
  if (error) return error;
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: 'id tidak valid' }, { status: 400 });
  const v = validateTicket(await readJson(request));
  if (!v.data) return NextResponse.json({ error: v.error }, { status: 400 });
  const d = v.data;
  if (!(await allTdStaff(d.staff_ids))) return NextResponse.json({ error: 'Staf IT harus user aktif unit TD' }, { status: 400 });

  try {
    const result = await withTransaction(async (conn) => {
      // Row lock: two TD staff saving the same ticket apply one after the other, each diffing the latest state
      const [locked]: any = await conn.query('SELECT id FROM hd_tickets WHERE id = ? FOR UPDATE', [id]);
      if (!locked.length) return null;
      const before = (await loadTicket(id, conn))!;
      await conn.query(
        `UPDATE hd_tickets SET tanggal = ?, jam_mulai = ?, jam_selesai = ?, pic_id = ?, kategori_id = ?, unit_kerja_id = ?,
           isi_helpdesk = ?, tindakan = ?, status = ?, jenis_pelayanan = ? WHERE id = ?`,
        [d.tanggal, d.jam_mulai, d.jam_selesai, d.pic_id, d.kategori_id, d.unit_kerja_id,
         d.isi_helpdesk, d.tindakan, d.status, d.jenis_pelayanan, id]
      );
      await setStaff(conn, id, d.staff_ids);
      await setBiaya(conn, id, d.biaya);
      const after = (await loadTicket(id, conn))!;
      const changes = diffTicket(before, after);
      if (changes.length) await addHistory(conn, id, 'update', user.id, changes);
      return { before, after };
    });
    if (!result) return NextResponse.json({ error: 'Tiket tidak ditemukan' }, { status: 404 });

    const { before, after } = result;
    const added = after.staff_ids.filter((s) => !before.staff_ids.includes(s) && s !== user.id);
    await notify(added, `Tiket Helpdesk #${id}`, `${user.name} menugaskan Anda ke tiket #${id}`);
    if (after.requested_by && before.status !== after.status && after.requested_by !== user.id) {
      await notify([after.requested_by], `Pengajuan #${id}: ${after.status}`, `Status pengajuan Anda sekarang ${after.status}.`);
    }
    return NextResponse.json({ ticket: after });
  } catch (err) {
    return dbError(err);
  }
}

// Hard delete (history & staff cascade). Creator or Admin TD only.
export async function DELETE(_req: Request, { params }: Ctx) {
  const { user, error } = await requireHelpdesk();
  if (error) return error;
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: 'id tidak valid' }, { status: 400 });
  try {
    const [row] = await query<any[]>('SELECT created_by FROM hd_tickets WHERE id = ?', [id]);
    if (!row) return NextResponse.json({ error: 'Tiket tidak ditemukan' }, { status: 404 });
    if (row.created_by !== user.id && !canManageHelpdeskMaster(user)) {
      return NextResponse.json({ error: 'Hanya pembuat tiket atau admin TD yang bisa menghapus' }, { status: 403 });
    }
    await query('DELETE FROM hd_tickets WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    return dbError(err);
  }
}
