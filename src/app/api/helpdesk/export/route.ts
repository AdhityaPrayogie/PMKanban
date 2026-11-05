import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { query } from '@/lib/db';
import { requireHelpdesk } from '@/lib/auth';
import { isDate, safeCell } from '@/lib/helpdesk';
import { TICKET_SELECT, dbError, ticketFilter, toTicket } from '@/lib/helpdeskDb';

const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];

function sheetName(start: string, end: string) {
  const [y1, m1] = start.split('-').map(Number);
  const [y2, m2] = end.split('-').map(Number);
  const a = `${MONTH[m1 - 1]} ${String(y1).slice(-2)}`;
  return y1 === y2 && m1 === m2 ? a : `${a}-${MONTH[m2 - 1]} ${String(y2).slice(-2)}`;
}

// Same layout as it-logbook "Laporan_Logbook": dark-blue header, frozen row 1, TOTAL MENIT footer (A:F merged)
export async function GET(request: NextRequest) {
  const { error } = await requireHelpdesk();
  if (error) return error;
  const sp = request.nextUrl.searchParams;
  const start = sp.get('start') ?? '';
  const end = sp.get('end') ?? '';
  if (!isDate(start) || !isDate(end) || start > end) {
    return NextResponse.json({ error: 'Parameter start dan end (YYYY-MM-DD) wajib diisi' }, { status: 400 });
  }

  try {
    const { where, params } = ticketFilter(sp);
    const rows = await query<any[]>(`${TICKET_SELECT} ${where} ORDER BY t.tanggal ASC, t.id ASC`, params);

    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet(sheetName(start, end));
    sheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'Tgl', key: 'tgl', width: 12 },
      { header: 'Nama Kegiatan', key: 'nama_kegiatan', width: 53 },
      { header: 'Jenis', key: 'jenis', width: 12 },
      { header: 'waktu mulai pengerjaan', key: 'waktu_mulai', width: 21 },
      { header: 'waktu selesai pengerjaan', key: 'waktu_selesai', width: 22 },
      { header: 'waktu selesai (Menit)', key: 'menit', width: 19 },
      { header: 'PIC', key: 'it_pic', width: 26 },
      { header: 'Customer', key: 'customer', width: 40 },
      { header: 'Kategori', key: 'kategori_pelayanan', width: 15 },
      { header: 'Barang', key: 'barang', width: 40 },
      { header: 'Biaya (Rp)', key: 'biaya', width: 14 },
    ];
    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, size: 11, name: 'Calibri', color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    let totalMenit = 0, totalRp = 0;
    rows.forEach((raw, i) => {
      const r = toTicket(raw);
      const menit = Number(r.total_menit) || 0;
      totalMenit += menit;
      totalRp += r.total_biaya;
      const [y, m, d] = r.tanggal.split('-');
      const row = sheet.addRow({
        no: i + 1,
        tgl: `${d}/${m}/${y}`,
        nama_kegiatan: safeCell(r.isi_helpdesk),
        jenis: safeCell(r.kategori),
        waktu_mulai: r.jam_mulai ? `${r.jam_mulai}:00` : '',
        waktu_selesai: r.jam_selesai ? `${r.jam_selesai}:00` : '',
        menit,
        it_pic: safeCell(r.staff_names ?? ''),
        customer: safeCell(r.pic_nama ?? r.requester_name ?? ''),
        kategori_pelayanan: r.jenis_pelayanan,
        barang: safeCell(r.biaya.map((b) => `${b.nama_barang} ${b.qty}x${b.harga}`).join('; ')),
        biaya: r.total_biaya || '',
      });
      row.eachCell((cell, col) => {
        cell.font = { size: 11, name: 'Calibri' };
        cell.alignment = { horizontal: [3, 8, 9, 11].includes(col) ? 'left' : col === 12 ? 'right' : 'center', vertical: 'middle' };
      });
      row.getCell(12).numFmt = '#,##0';
      row.getCell(10).font = { bold: true, size: 10, name: 'Arial', color: { argb: 'FF0A53A8' } };
    });

    const f = (sheet.lastRow?.number ?? 1) + 1;
    sheet.mergeCells(`A${f}:F${f}`);
    sheet.getCell(`L${f}`).numFmt = '#,##0';
    for (const [ref, value] of [[`A${f}`, 'TOTAL MENIT'], [`G${f}`, totalMenit], [`K${f}`, 'TOTAL BIAYA'], [`L${f}`, totalRp]] as const) {
      const c = sheet.getCell(ref);
      c.value = value;
      c.font = { bold: true, size: 11, name: 'Calibri' };
      c.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    const buf = await wb.xlsx.writeBuffer();
    return new NextResponse(buf as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Laporan_Logbook_${start}_sd_${end}.xlsx"`,
      },
    });
  } catch (err) {
    return dbError(err);
  }
}
