import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import type mysql from 'mysql2/promise';
import pool, { execute, query } from '@/lib/db';
import { broadcastNotification } from '@/lib/chatEvents';
import { HELPDESK_UNIT_ID, HdBiaya, HdChange, HdTicket, STATUS, isDate } from '@/lib/helpdesk';

type Ex = mysql.Pool | mysql.PoolConnection;

// Display row: names instead of ids, dates as strings (mysql2 would hand back Date objects)
export const TICKET_SELECT = `
  SELECT t.id, DATE_FORMAT(t.tanggal, '%Y-%m-%d') AS tanggal,
    TIME_FORMAT(t.jam_mulai, '%H:%i') AS jam_mulai, TIME_FORMAT(t.jam_selesai, '%H:%i') AS jam_selesai,
    t.total_menit, t.requested_by, ru.name AS requester_name, ru.unit_name AS requester_unit,
    t.pic_id, p.nama AS pic_nama, t.kategori_id, k.nama AS kategori, t.unit_kerja_id, uk.nama AS unit_kerja,
    t.isi_helpdesk, t.tindakan, t.status, t.jenis_pelayanan, t.created_by, cu.name AS creator_name, t.created_at,
    (SELECT GROUP_CONCAT(u.name ORDER BY u.name SEPARATOR ', ') FROM hd_ticket_staff s JOIN users u ON u.id = s.user_id WHERE s.ticket_id = t.id) AS staff_names,
    (SELECT GROUP_CONCAT(s.user_id ORDER BY s.user_id) FROM hd_ticket_staff s WHERE s.ticket_id = t.id) AS staff_ids,
    (SELECT JSON_ARRAYAGG(JSON_OBJECT('nama_barang', b.nama_barang, 'qty', b.qty, 'harga', b.harga))
       FROM (SELECT * FROM hd_ticket_biaya WHERE ticket_id = t.id ORDER BY id) b) AS biaya,
    (SELECT COALESCE(SUM(b.qty * b.harga), 0) FROM hd_ticket_biaya b WHERE b.ticket_id = t.id) AS total_biaya
  FROM hd_tickets t
  JOIN hd_kategori k ON k.id = t.kategori_id
  JOIN users cu ON cu.id = t.created_by
  LEFT JOIN users ru ON ru.id = t.requested_by
  LEFT JOIN hd_pic p ON p.id = t.pic_id
  LEFT JOIN hd_unit_kerja uk ON uk.id = t.unit_kerja_id`;

// WHERE clause from list/export query params (all values parameterized, unknown values ignored)
export function ticketFilter(sp: URLSearchParams): { where: string; params: any[] } {
  const w: string[] = [];
  const params: any[] = [];
  const start = sp.get('start'), end = sp.get('end');
  if (start && isDate(start)) { w.push('t.tanggal >= ?'); params.push(start); }
  if (end && isDate(end)) { w.push('t.tanggal <= ?'); params.push(end); }
  const status = sp.get('status');
  if (status && (STATUS as readonly string[]).includes(status)) { w.push('t.status = ?'); params.push(status); }
  const kats = (sp.get('kategori_ids') ?? sp.get('kategori_id') ?? '').split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0);
  if (kats.length) { w.push('t.kategori_id IN (?)'); params.push(kats); }
  const staff = sp.get('staff_id');
  if (staff) { w.push('EXISTS (SELECT 1 FROM hd_ticket_staff s2 WHERE s2.ticket_id = t.id AND s2.user_id = ?)'); params.push(staff); }
  const sumber = sp.get('sumber');
  if (sumber === 'pengajuan') w.push('t.requested_by IS NOT NULL');
  if (sumber === 'langsung') w.push('t.requested_by IS NULL');
  const q = sp.get('q')?.trim();
  if (q) {
    const like = `%${q.replace(/[\\%_]/g, '\\$&')}%`;
    w.push('(t.isi_helpdesk LIKE ? OR t.tindakan LIKE ? OR p.nama LIKE ? OR ru.name LIKE ? OR uk.nama LIKE ?)');
    params.push(like, like, like, like, like);
  }
  return { where: w.length ? `WHERE ${w.join(' AND ')}` : '', params };
}

export const toTicket = (r: any): HdTicket => ({
  ...r,
  staff_ids: r.staff_ids ? String(r.staff_ids).split(',') : [],
  biaya: (typeof r.biaya === 'string' ? JSON.parse(r.biaya) : r.biaya) ?? [],
  total_biaya: Number(r.total_biaya ?? 0),
});

export async function setBiaya(conn: mysql.PoolConnection, ticketId: number, items: HdBiaya[]) {
  await conn.query('DELETE FROM hd_ticket_biaya WHERE ticket_id = ?', [ticketId]);
  if (items.length) {
    await conn.query('INSERT INTO hd_ticket_biaya (ticket_id, nama_barang, qty, harga) VALUES ?',
      [items.map((b) => [ticketId, b.nama_barang, b.qty, b.harga])]);
  }
}

export async function loadTicket(id: number, ex: Ex = pool): Promise<HdTicket | null> {
  const [rows] = await (ex as mysql.PoolConnection).query<any[]>(`${TICKET_SELECT} WHERE t.id = ?`, [id]);
  return rows[0] ? toTicket(rows[0]) : null;
}

export async function addHistory(ex: Ex, ticketId: number, aksi: 'create' | 'update', userId: string, changes: HdChange[]) {
  await (ex as mysql.PoolConnection).query(
    'INSERT INTO hd_ticket_history (ticket_id, aksi, user_id, changes) VALUES (?, ?, ?, ?)',
    [ticketId, aksi, userId, JSON.stringify(changes)]
  );
}

export async function setStaff(conn: mysql.PoolConnection, ticketId: number, staffIds: string[]) {
  await conn.query('DELETE FROM hd_ticket_staff WHERE ticket_id = ?', [ticketId]);
  if (staffIds.length) {
    await conn.query('INSERT INTO hd_ticket_staff (ticket_id, user_id) VALUES ?', [staffIds.map((u) => [ticketId, u])]);
  }
}

// True when every id is an active TD user (assigning to other units is not allowed)
export async function allTdStaff(ids: string[]): Promise<boolean> {
  if (!ids.length) return true;
  const rows = await query<any[]>(
    `SELECT COUNT(*) AS n FROM users WHERE id IN (?) AND unit_id = ? AND status = 'active'`,
    [ids, HELPDESK_UNIT_ID]
  );
  return Number(rows[0].n) === ids.length;
}

export async function tdUserIds(): Promise<string[]> {
  const rows = await query<{ id: string }[]>(`SELECT id FROM users WHERE unit_id = ? AND status = 'active'`, [HELPDESK_UNIT_ID]);
  return rows.map((r) => r.id);
}

// Notifications are best-effort: a failure here must not fail the ticket write that already committed
export async function notify(userIds: string[], title: string, message: string) {
  for (const user_id of new Set(userIds)) {
    try {
      const id = randomUUID();
      await execute(
        `INSERT INTO notifications (id, user_id, title, message, type, related_task_id) VALUES (?, ?, ?, ?, 'system', NULL)`,
        [id, user_id, title, message]
      );
      broadcastNotification({ id, user_id, title, message, type: 'system', related_task_id: null, is_read: false });
    } catch (err) {
      console.error('helpdesk notify failed:', err);
    }
  }
}

export const parseId = (v: string) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

export const short = (s: string, n = 60) => (s.length > n ? `${s.slice(0, n)}…` : s);

export const readJson = (req: Request) => req.json().catch(() => null);

// Turn MySQL constraint errors into user-facing 4xx; everything else is a logged 500
export function dbError(err: any) {
  const res = (error: string, status: number) => NextResponse.json({ error }, { status });
  switch (err?.errno) {
    case 1062: return res('Nama sudah ada', 409);
    case 1451: return res('Data masih dipakai tiket lain', 409);
    case 1452: return res('PIC / kategori / unit kerja / staf tidak ditemukan', 400);
    case 3819: return res('Data tidak valid: cek jam atau peminta (PIC)', 400);
  }
  console.error('helpdesk db error:', err);
  return res('Database error', 500);
}
