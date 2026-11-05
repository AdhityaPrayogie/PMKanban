// Helpdesk access matrix against a running dev server (local only: mints tokens with AUTH_SECRET from .env).
// Run: node scripts/test_helpdesk_access.mjs [baseUrl]
// Creates one pengajuan as u2 (MFK) and hard-deletes it again at the end.
import crypto from 'node:crypto';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import ExcelJS from 'exceljs';

const BASE = process.argv[2] || 'http://localhost:3000';
const env = Object.fromEntries(
  fs.readFileSync(new URL('../.env', import.meta.url), 'utf8').split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')])
);
const SECRET = env.AUTH_SECRET;
assert.ok(SECRET, 'AUTH_SECRET missing in .env');

const token = (id) => {
  const b = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const head = `${b({ alg: 'HS256', typ: 'JWT' })}.${b({ id, exp: Math.floor(Date.now() / 1000) + 600 })}`;
  return `${head}.${crypto.createHmac('sha256', SECRET).update(head).digest('base64url')}`;
};
const call = async (who, method, path, body) => {
  const res = await fetch(BASE + path, {
    method, redirect: 'manual',
    headers: { 'content-type': 'application/json', ...(who && { cookie: `auth_token=${token(who)}` }) },
    body: body && JSON.stringify(body),
  });
  return res;
};
const expect = async (label, who, method, path, status, body) => {
  const res = await call(who, method, path, body);
  assert.equal(res.status, status, `${label}: expected ${status}, got ${res.status} ${await res.clone().text()}`);
  console.log(`ok  ${status}  ${label}`);
  return res;
};

const TD_USER = 'u4', TD_ADMIN = 'u1', MFK = 'u2';
let id, testId;
try {
  await expect('no session -> 401', null, 'GET', '/api/helpdesk', 401);
  await expect('MFK list helpdesk -> 403', MFK, 'GET', '/api/helpdesk', 403);
  await expect('MFK stats -> 403', MFK, 'GET', '/api/helpdesk/stats', 403);
  await expect('MFK export -> 403', MFK, 'GET', '/api/helpdesk/export?start=2026-09-01&end=2026-09-30', 403);
  await expect('MFK master pic -> 403', MFK, 'GET', '/api/helpdesk/master/pic', 403);
  await expect('MFK master kategori -> 200', MFK, 'GET', '/api/helpdesk/master/kategori', 200);
  await expect('TD user add kategori -> 403', TD_USER, 'POST', '/api/helpdesk/master/kategori', 403, { nama: 'X' });
  // Guard sits inside Suspense, so the redirect is streamed (200 + meta refresh), not a 307
  const page = await (await expect('MFK page /helpdesk -> streamed redirect', MFK, 'GET', '/helpdesk', 200)).text();
  assert.ok(page.includes('url=/pengajuan'), 'MFK not redirected from /helpdesk');

  const [uk] = (await (await call(MFK, 'GET', '/api/helpdesk/master/unit-kerja')).json()).rows;
  // Body tries to spoof identity/status: server must ignore it
  const r = await expect('MFK submit pengajuan -> 201', MFK, 'POST', '/api/helpdesk/pengajuan', 201,
    { kategori_id: 1, unit_kerja_id: uk.id, isi_helpdesk: 'TEST access matrix', requested_by: TD_ADMIN, status: 'Selesai' });
  id = testId = (await r.json()).id;
  const own = await (await call(MFK, 'GET', '/api/helpdesk/pengajuan')).json();
  const mine = own.tickets.find((t) => t.id === id);
  assert.equal(mine.requested_by, MFK, 'requested_by spoofed');
  assert.equal(mine.status, 'Open', 'status spoofed');
  console.log('ok       spoofed fields ignored');

  await expect('MFK ambil -> 403', MFK, 'POST', `/api/helpdesk/${id}/ambil`, 403);
  await expect('TD ambil -> 200', TD_USER, 'POST', `/api/helpdesk/${id}/ambil`, 200);
  await expect('TD ambil again -> 409', TD_USER, 'POST', `/api/helpdesk/${id}/ambil`, 409);
  await expect('MFK delete after Proses -> 409', MFK, 'DELETE', `/api/helpdesk/pengajuan?id=${id}`, 409);

  const { ticket } = await (await call(TD_USER, 'GET', `/api/helpdesk/${id}`)).json();
  assert.deepEqual(ticket.staff_ids, [TD_USER]);
  const put = { ...ticket, jam_mulai: '10:00', jam_selesai: '09:00' };
  await expect('PUT jam_selesai < jam_mulai -> 400', TD_USER, 'PUT', `/api/helpdesk/${id}`, 400, put);
  await expect('PUT non-TD staff -> 400', TD_USER, 'PUT', `/api/helpdesk/${id}`, 400, { ...put, jam_selesai: '10:30', staff_ids: [MFK] });
  await expect('PUT valid -> 200', TD_USER, 'PUT', `/api/helpdesk/${id}`, 200,
    { ...put, jam_selesai: '10:30', status: 'Selesai', tindakan: 'Restart' });
  const { history } = await (await call(TD_USER, 'GET', `/api/helpdesk/${id}`)).json();
  assert.ok(history.length >= 3, 'history create+ambil+update');
  console.log(`ok       history rows: ${history.length}`);

  await expect('TD non-creator delete -> 403', TD_USER, 'DELETE', `/api/helpdesk/${id}`, 403);
  await expect('Admin TD delete -> 200', TD_ADMIN, 'DELETE', `/api/helpdesk/${id}`, 200);
  id = null;

  const xl = await expect('TD export Sep 2026 -> 200', TD_USER, 'GET', '/api/helpdesk/export?start=2026-09-01&end=2026-09-30', 200);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(Buffer.from(await xl.arrayBuffer()));
  const ws = wb.worksheets[0];
  const last = ws.getRow(ws.rowCount);
  assert.equal(ws.rowCount, 1 + 5 + 1, 'header + 5 sample rows + total');
  assert.equal(Number(last.getCell(7).value), 180, 'TOTAL MENIT');
  console.log(`ok       export "${ws.name}": 5 rows, total 180`);
  console.log('\ntest_helpdesk_access: OK');
} finally {
  const db = await mysql.createConnection({ host: env.DB_HOST || 'localhost', user: env.DB_USER || 'root', password: env.DB_PASSWORD || '', database: env.DB_NAME || 'kanbandb' });
  if (id) await db.query('DELETE FROM hd_tickets WHERE id = ?', [id]);
  if (testId) await db.query("DELETE FROM notifications WHERE type = 'system' AND title REGEXP ?", [`#${testId}([^0-9]|$)`]);
  await db.end();
}
