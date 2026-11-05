import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireHelpdesk } from '@/lib/auth';
import { TICKET_SELECT, dbError, toTicket } from '@/lib/helpdeskDb';

// GET /api/helpdesk/stats?month=9&year=2026 (default: month of the latest ticket up to today, else current month)
export async function GET(request: NextRequest) {
  const { error } = await requireHelpdesk();
  if (error) return error;
  const sp = request.nextUrl.searchParams;
  let now = new Date();
  if (!sp.get('month')) {
    const [last] = await query<any[]>('SELECT MAX(tanggal) AS d FROM hd_tickets WHERE tanggal <= CURDATE()');
    if (last?.d) now = new Date(last.d);
  }
  const month = Math.min(Math.max(Number(sp.get('month')) || now.getMonth() + 1, 1), 12);
  const year = Math.min(Math.max(Number(sp.get('year')) || now.getFullYear(), 2000), 2100);
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const range = 't.tanggal >= ? AND t.tanggal < DATE_ADD(?, INTERVAL 1 MONTH)';

  try {
    // Trend window: the 12 months ending at the selected month
    const trendRange = 't.tanggal >= DATE_SUB(?, INTERVAL 11 MONTH) AND t.tanggal < DATE_ADD(?, INTERVAL 1 MONTH)';
    const [[cards], [queue], perKategori, recent, perHari, trend, trendKategori] = await Promise.all([
      query<any[]>(
        `SELECT COUNT(*) AS total, SUM(t.tanggal = CURDATE()) AS hari_ini,
           SUM(t.status = 'Proses') AS proses, SUM(t.status = 'Selesai') AS selesai, SUM(t.status = 'Batal') AS batal,
           COALESCE(SUM(t.total_menit), 0) AS total_menit
         FROM hd_tickets t WHERE ${range}`,
        [start, start]
      ),
      // The queue is not month-bound: an old Open request is still waiting
      query<any[]>(`SELECT COUNT(*) AS open FROM hd_tickets WHERE status = 'Open'`),
      query<any[]>(
        `SELECT k.nama, COUNT(*) AS tiket FROM hd_tickets t JOIN hd_kategori k ON k.id = t.kategori_id
         WHERE ${range} GROUP BY k.id, k.nama ORDER BY tiket DESC`,
        [start, start]
      ),
      query<any[]>(`${TICKET_SELECT} ORDER BY t.updated_at DESC, t.id DESC LIMIT 10`),
      query<any[]>(
        `SELECT DAY(t.tanggal) AS hari, COUNT(*) AS tiket, COALESCE(SUM(t.total_menit), 0) AS menit
         FROM hd_tickets t WHERE ${range} GROUP BY hari`,
        [start, start]
      ),
      query<any[]>(
        `SELECT DATE_FORMAT(t.tanggal, '%Y-%m') AS ym, COUNT(*) AS tiket, COALESCE(SUM(t.total_menit), 0) AS menit,
           ROUND(AVG(t.total_menit)) AS rata_menit, SUM(t.status = 'Selesai') AS selesai
         FROM hd_tickets t WHERE ${trendRange} GROUP BY ym`,
        [start, start]
      ),
      query<any[]>(
        `SELECT DATE_FORMAT(t.tanggal, '%Y-%m') AS ym, k.nama, COUNT(*) AS tiket
         FROM hd_tickets t JOIN hd_kategori k ON k.id = t.kategori_id
         WHERE ${trendRange} GROUP BY ym, k.id, k.nama`,
        [start, start]
      ),
    ]);

    // All 12 months, including empty ones, oldest first
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(year, month - 12 + i, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    const byYm = new Map(trend.map((r) => [r.ym, r]));
    return NextResponse.json({
      month, year,
      cards: {
        total: Number(cards.total), hari_ini: Number(cards.hari_ini ?? 0), open: Number(queue.open),
        proses: Number(cards.proses ?? 0), selesai: Number(cards.selesai ?? 0), batal: Number(cards.batal ?? 0),
        total_menit: Number(cards.total_menit),
      },
      trend: months.map((ym) => {
        const r = byYm.get(ym);
        return {
          ym, tiket: Number(r?.tiket ?? 0), menit: Number(r?.menit ?? 0), selesai: Number(r?.selesai ?? 0),
          rata_menit: r?.rata_menit == null ? null : Number(r.rata_menit),
        };
      }),
      trendKategori: trendKategori.map((r) => ({ ym: r.ym, nama: r.nama, tiket: Number(r.tiket) })),
      perKategori: perKategori.map((k) => ({ nama: k.nama, tiket: Number(k.tiket) })),
      recent: recent.map(toTicket),
      perHari: perHari.map((d) => ({ hari: Number(d.hari), tiket: Number(d.tiket), menit: Number(d.menit) })),
    });
  } catch (err) {
    return dbError(err);
  }
}
