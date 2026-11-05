import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { User } from '@/types';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Never SELECT * here: users also holds password_hash / password_plain
    const users = await query<User[]>(
      `SELECT id, name, email, avatar_url, unit_id, unit_name, role, status, last_active_at
       FROM users ORDER BY name ASC`
    );
    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
  }
}
