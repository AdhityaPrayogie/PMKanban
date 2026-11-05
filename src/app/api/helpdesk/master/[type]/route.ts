import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser, requireHelpdesk } from '@/lib/auth';
import { canAccessHelpdesk } from '@/lib/helpdesk';
import { dbError, parseId, readJson } from '@/lib/helpdeskDb';

// Table names come only from this whitelist, never from the URL directly
const TABLES: Record<string, { table: string; max: number }> = {
  pic: { table: 'hd_pic', max: 150 },
  kategori: { table: 'hd_kategori', max: 100 },
  'unit-kerja': { table: 'hd_unit_kerja', max: 150 },
};
type Ctx = { params: Promise<{ type: string }> };

// kategori & unit-kerja: every logged-in user (pengajuan form). pic (staff names): TD only.
export async function GET(request: NextRequest, { params }: Ctx) {
  const cfg = TABLES[(await params).type];
  if (!cfg) return NextResponse.json({ error: 'Tipe tidak dikenal' }, { status: 404 });
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (cfg.table === 'hd_pic' && !canAccessHelpdesk(user)) return NextResponse.json({ error: 'Khusus unit TD' }, { status: 403 });
  const all = request.nextUrl.searchParams.get('all') === '1' && canAccessHelpdesk(user);
  try {
    const rows = await query<any[]>(`SELECT id, nama, aktif FROM ${cfg.table} ${all ? '' : 'WHERE aktif = 1'} ORDER BY nama`);
    return NextResponse.json({ rows });
  } catch (err) {
    return dbError(err);
  }
}

// Add. Any TD user may add a PIC from the ticket form; other types need Admin TD.
export async function POST(request: Request, { params }: Ctx) {
  const type = (await params).type;
  const cfg = TABLES[type];
  if (!cfg) return NextResponse.json({ error: 'Tipe tidak dikenal' }, { status: 404 });
  const { error } = await requireHelpdesk(type !== 'pic');
  if (error) return error;
  const nama = String((await readJson(request))?.nama ?? '').trim().replace(/\s+/g, ' ');
  if (!nama || nama.length > cfg.max) return NextResponse.json({ error: `Nama wajib diisi (maks ${cfg.max} karakter)` }, { status: 400 });
  try {
    const r = await query<any>(`INSERT INTO ${cfg.table} (nama) VALUES (?)`, [nama]);
    return NextResponse.json({ row: { id: r.insertId, nama, aktif: 1 } }, { status: 201 });
  } catch (err: any) {
    if (err?.errno === 1062) {
      // Already exists: hand back the existing row so the form can just select it
      const [row] = await query<any[]>(`SELECT id, nama, aktif FROM ${cfg.table} WHERE nama = ?`, [nama]);
      if (row) return NextResponse.json({ row, existed: true });
    }
    return dbError(err);
  }
}

// Rename / toggle aktif. Admin TD only. No delete: rows are referenced by tickets.
export async function PATCH(request: Request, { params }: Ctx) {
  const cfg = TABLES[(await params).type];
  if (!cfg) return NextResponse.json({ error: 'Tipe tidak dikenal' }, { status: 404 });
  const { error } = await requireHelpdesk(true);
  if (error) return error;
  const b = await readJson(request);
  const id = parseId(String(b?.id ?? ''));
  if (!id) return NextResponse.json({ error: 'id tidak valid' }, { status: 400 });
  const sets: string[] = [];
  const vals: any[] = [];
  if (b.nama !== undefined) {
    const nama = String(b.nama).trim().replace(/\s+/g, ' ');
    if (!nama || nama.length > cfg.max) return NextResponse.json({ error: `Nama wajib diisi (maks ${cfg.max} karakter)` }, { status: 400 });
    sets.push('nama = ?'); vals.push(nama);
  }
  if (b.aktif !== undefined) { sets.push('aktif = ?'); vals.push(b.aktif ? 1 : 0); }
  if (!sets.length) return NextResponse.json({ error: 'Tidak ada perubahan' }, { status: 400 });
  try {
    const r = await query<any>(`UPDATE ${cfg.table} SET ${sets.join(', ')} WHERE id = ?`, [...vals, id]);
    if (!r.affectedRows) return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return dbError(err);
  }
}
