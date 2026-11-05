import { NextResponse } from 'next/server';
import { withTransaction } from '@/lib/db';
import { requireHelpdesk } from '@/lib/auth';
import { addHistory, dbError, loadTicket, notify, parseId } from '@/lib/helpdeskDb';

// "Ambil": take an Open ticket -> me as staff, status Proses, jam_mulai = now.
// The status = 'Open' condition in the UPDATE makes a second concurrent "Ambil" get 0 rows -> 409.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireHelpdesk();
  if (error) return error;
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: 'id tidak valid' }, { status: 400 });

  try {
    const taken = await withTransaction(async (conn) => {
      const [r]: any = await conn.query(
        `UPDATE hd_tickets SET status = 'Proses', jam_mulai = COALESCE(jam_mulai, CURTIME()) WHERE id = ? AND status = 'Open'`,
        [id]
      );
      if (!r.affectedRows) return false;
      await conn.query('INSERT IGNORE INTO hd_ticket_staff (ticket_id, user_id) VALUES (?, ?)', [id, user.id]);
      await addHistory(conn, id, 'update', user.id, [
        { field: 'status', label: 'Status', old: 'Open', new: 'Proses' },
        { field: 'staff_names', label: 'Staf IT', new: user.name },
      ]);
      return true;
    });
    if (!taken) {
      const t = await loadTicket(id);
      return t
        ? NextResponse.json({ error: `Tiket #${id} sudah diambil / tidak Open lagi` }, { status: 409 })
        : NextResponse.json({ error: 'Tiket tidak ditemukan' }, { status: 404 });
    }
    const ticket = (await loadTicket(id))!;
    if (ticket.requested_by && ticket.requested_by !== user.id) {
      await notify([ticket.requested_by], `Pengajuan #${id} diproses`, `${user.name} sedang menangani pengajuan Anda.`);
    }
    return NextResponse.json({ ticket });
  } catch (err) {
    return dbError(err);
  }
}
