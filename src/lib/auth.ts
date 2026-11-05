import crypto from 'crypto';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { User } from '@/types';

const SECRET = process.env.AUTH_SECRET || 'pmkanban-super-secret-key-32-bytes-long!';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored || !stored.includes(':')) return false;
  const [salt, originalHash] = stored.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === originalHash;
}

export function createToken(payload: object): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(
    JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 7 * 86400 })
  ).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyToken<T = any>(token: string): T | null {
  try {
    const [header, body, signature] = token.split('.');
    if (!header || !body || !signature) return null;
    const expectedSig = crypto
      .createHmac('sha256', SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');
    if (signature !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload as T;
  } catch {
    return null;
  }
}

const lastActiveWrite = new Map<string, number>();

export async function getSessionUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return null;
    const payload = verifyToken<{ id: string }>(token);
    if (!payload?.id) return null;

    // ponytail: per-process throttle (1 write/min/user); presence only needs ~3 min precision
    const now = Date.now();
    if (now - (lastActiveWrite.get(payload.id) ?? 0) > 60_000) {
      lastActiveWrite.set(payload.id, now);
      await query('UPDATE users SET last_active_at = NOW() WHERE id = ?', [payload.id]);
    }

    const rows = await query<User[]>(
      'SELECT id, name, email, avatar_url, role, status, last_active_at FROM users WHERE id = ?',
      [payload.id]
    );
    if (!rows || rows.length === 0) return null;
    return rows[0];
  } catch {
    return null;
  }
}
