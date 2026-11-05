import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { User } from '@/types';

export async function GET() {
  try {
    const users = await query<User[]>('SELECT * FROM users ORDER BY name ASC');
    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
  }
}
