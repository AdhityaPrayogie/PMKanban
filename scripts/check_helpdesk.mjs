// Self-check for src/lib/helpdesk.ts. Run: node scripts/check_helpdesk.mjs (Node 22.18+/24, type stripping)
import assert from 'node:assert/strict';
import { validateTicket, diffTicket, safeCell, canAccessHelpdesk, canManageHelpdeskMaster } from '../src/lib/helpdesk.ts';

const ok = {
  tanggal: '2026-09-10', jam_mulai: '08:00', jam_selesai: '08:45', pic_id: 5, kategori_id: 1,
  unit_kerja_id: '', isi_helpdesk: ' Printer macet ', tindakan: '', status: 'Selesai',
  jenis_pelayanan: 'Pelayanan', staff_ids: ['u1', 'u1', 'u4'],
};
const v = validateTicket(ok);
assert.equal(v.error, undefined);
assert.equal(v.data.isi_helpdesk, 'Printer macet');
assert.equal(v.data.unit_kerja_id, null);
assert.equal(v.data.tindakan, null);
assert.deepEqual(v.data.staff_ids, ['u1', 'u4']);
assert.equal(validateTicket({ ...ok, jam_mulai: '09:00:00', jam_selesai: '09:30:59' }).data.jam_selesai, '09:30');

assert.match(validateTicket({ ...ok, jam_selesai: '07:59' }).error, /Jam selesai/);
assert.match(validateTicket({ ...ok, jam_mulai: '25:00' }).error, /Format jam/);
assert.match(validateTicket({ ...ok, tanggal: '2026-13-40' }).error, /Tanggal/);
assert.match(validateTicket({ ...ok, staff_ids: [] }).error, /staf IT/);
assert.equal(validateTicket({ ...ok, status: 'Open', staff_ids: [] }).error, undefined);
assert.match(validateTicket({ ...ok, status: 'Done' }).error, /Status/);
assert.match(validateTicket({ ...ok, pic_id: 'abc' }).error, /PIC/);
assert.match(validateTicket({ ...ok, kategori_id: 0 }).error, /Kategori/);
assert.match(validateTicket({ ...ok, isi_helpdesk: '   ' }).error, /Isi/);
assert.match(validateTicket(null).error, /Body/);

assert.deepEqual(diffTicket({ status: 'Open', tindakan: null }, { status: 'Proses', tindakan: null }), [
  { field: 'status', label: 'Status', old: 'Open', new: 'Proses' },
]);
assert.equal(diffTicket({ total_menit: 1, tindakan: '' }, { total_menit: 2, tindakan: null }).length, 0);

assert.equal(safeCell('=HYPERLINK("x")'), `'=HYPERLINK("x")`);
assert.equal(safeCell('-1+2'), `'-1+2`);
assert.equal(safeCell('Normal'), 'Normal');
assert.equal(safeCell(15), 15);

assert.ok(canAccessHelpdesk({ unit_id: 'unit_it', role: 'user' }));
assert.ok(!canAccessHelpdesk({ unit_id: 'unit_mfk', role: 'admin' }));
assert.ok(canManageHelpdeskMaster({ unit_id: 'unit_it', role: 'admin' }));
assert.ok(!canManageHelpdeskMaster({ unit_id: 'unit_it', role: 'user' }));
assert.ok(!canAccessHelpdesk(null));

console.log('check_helpdesk: OK');
