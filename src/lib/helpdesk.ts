// Pure helpers shared by client & server (no imports: also run by scripts/check_helpdesk.mjs)

export const HELPDESK_UNIT_ID = 'unit_it'; // unit with code "TD"
export const STATUS = ['Open', 'Proses', 'Selesai', 'Batal'] as const;
export const JENIS = ['Pelayanan', 'Non Pelayanan'] as const;
export type HdStatus = (typeof STATUS)[number];
export type HdJenis = (typeof JENIS)[number];

type U = { role?: string | null; unit_id?: string | null } | null | undefined;
// By unit_id, not unit_name: master-units PATCH rewrites unit_name when a code changes.
export const canAccessHelpdesk = (u: U) => u?.unit_id === HELPDESK_UNIT_ID;
export const canManageHelpdeskMaster = (u: U) => canAccessHelpdesk(u) && u?.role === 'admin';

export interface HdTicket {
  id: number;
  tanggal: string;
  jam_mulai: string | null;
  jam_selesai: string | null;
  total_menit: number | null;
  requested_by: string | null;
  requester_name: string | null;
  requester_unit: string | null;
  pic_id: number | null;
  pic_nama: string | null;
  kategori_id: number;
  kategori: string;
  unit_kerja_id: number | null;
  unit_kerja: string | null;
  isi_helpdesk: string;
  tindakan: string | null;
  status: HdStatus;
  jenis_pelayanan: HdJenis;
  created_by: string;
  creator_name: string;
  created_at: string;
  staff_names: string | null;
  staff_ids: string[];
}

export interface HdMaster { id: number; nama: string; aktif: number }

export interface TicketInput {
  tanggal: string;
  jam_mulai: string | null;
  jam_selesai: string | null;
  pic_id: number | null;
  kategori_id: number;
  unit_kerja_id: number | null;
  isi_helpdesk: string;
  tindakan: string | null;
  status: HdStatus;
  jenis_pelayanan: HdJenis;
  staff_ids: string[];
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
export const MAX_TEXT = 5000;

export const isDate = (v: unknown): v is string =>
  typeof v === 'string' && DATE_RE.test(v) && !Number.isNaN(Date.parse(v));

// null/'' -> null, positive integer -> number, anything else -> NaN (invalid)
function optId(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : NaN;
}

function optTime(v: unknown): string | null | undefined {
  if (v === null || v === undefined || v === '') return null;
  return typeof v === 'string' && TIME_RE.test(v) ? v.slice(0, 5) : undefined;
}

export function validateTicket(b: any): { data?: TicketInput; error?: string } {
  if (!b || typeof b !== 'object') return { error: 'Body tidak valid' };
  if (!isDate(b.tanggal)) return { error: 'Tanggal tidak valid' };
  const jam_mulai = optTime(b.jam_mulai);
  const jam_selesai = optTime(b.jam_selesai);
  if (jam_mulai === undefined || jam_selesai === undefined) return { error: 'Format jam tidak valid (HH:MM)' };
  if (jam_mulai && jam_selesai && jam_selesai < jam_mulai) return { error: 'Jam selesai harus setelah jam mulai' };
  const kategori_id = optId(b.kategori_id);
  if (!kategori_id) return { error: 'Kategori wajib dipilih' };
  const pic_id = optId(b.pic_id);
  const unit_kerja_id = optId(b.unit_kerja_id);
  if (Number.isNaN(pic_id) || Number.isNaN(unit_kerja_id)) return { error: 'PIC / unit kerja tidak valid' };
  const isi_helpdesk = String(b.isi_helpdesk ?? '').trim();
  if (!isi_helpdesk) return { error: 'Isi helpdesk wajib diisi' };
  const tindakan = String(b.tindakan ?? '').trim() || null;
  if (isi_helpdesk.length > MAX_TEXT || (tindakan?.length ?? 0) > MAX_TEXT) return { error: `Teks maksimal ${MAX_TEXT} karakter` };
  if (!STATUS.includes(b.status)) return { error: 'Status tidak valid' };
  if (!JENIS.includes(b.jenis_pelayanan)) return { error: 'Jenis pelayanan tidak valid' };
  const staff_ids: string[] = Array.isArray(b.staff_ids)
    ? [...new Set<string>(b.staff_ids.filter((s: unknown) => typeof s === 'string' && s))]
    : [];
  if (b.status !== 'Open' && staff_ids.length === 0) return { error: 'Pilih minimal 1 staf IT untuk status selain Open' };
  return {
    data: {
      tanggal: b.tanggal, jam_mulai, jam_selesai, pic_id, kategori_id, unit_kerja_id,
      isi_helpdesk, tindakan, status: b.status, jenis_pelayanan: b.jenis_pelayanan, staff_ids,
    },
  };
}

export const HISTORY_FIELDS: [string, string][] = [
  ['tanggal', 'Tanggal'],
  ['jam_mulai', 'Jam Mulai'],
  ['jam_selesai', 'Jam Selesai'],
  ['pic_nama', 'PIC'],
  ['kategori', 'Kategori'],
  ['unit_kerja', 'Unit Kerja'],
  ['isi_helpdesk', 'Isi Helpdesk'],
  ['tindakan', 'Tindakan'],
  ['status', 'Status'],
  ['jenis_pelayanan', 'Jenis'],
  ['staff_names', 'Staf IT'],
];

export interface HdChange { field: string; label: string; old?: string | null; new?: string | null }

// Compares display rows (names, not ids) so history reads well without joins
export function diffTicket(before: Record<string, any>, after: Record<string, any>): HdChange[] {
  const s = (v: unknown) => (v === null || v === undefined ? '' : String(v));
  return HISTORY_FIELDS.filter(([f]) => s(before[f]) !== s(after[f])).map(([field, label]) => ({
    field, label, old: before[field] ?? null, new: after[field] ?? null,
  }));
}

// Excel formula injection: text starting with = + - @ is executed by Excel
export const safeCell = (v: unknown) =>
  typeof v === 'string' && /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
