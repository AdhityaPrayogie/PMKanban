import { NextRequest, NextResponse } from 'next/server';
import { execute, query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { randomUUID } from 'crypto';


export async function GET() {
  try {
    const admin = await getSessionUser();
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Akses ditolak: Hanya untuk Administrator' }, { status: 403 });
    }

    const users = await query<any[]>(
      'SELECT id, name, email, avatar_url, role, status, unit_id, unit_name, password_plain, created_at FROM users ORDER BY created_at DESC'
    );

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('Admin users error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await getSessionUser();
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Akses ditolak: Hanya untuk Administrator' }, { status: 403 });
    }

    const { userId, status, role, unit_id, unit_name } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: 'userId wajib diisi' }, { status: 400 });
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (status) {
      updates.push('status = ?');
      params.push(status);
    }
    if (role) {
      updates.push('role = ?');
      params.push(role);
    }
    if (unit_id !== undefined) {
      updates.push('unit_id = ?');
      params.push(unit_id);
    }
    if (unit_name !== undefined) {
      updates.push('unit_name = ?');
      params.push(unit_name);
    }

    if (updates.length > 0) {
      params.push(userId);
      await execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    // If status changed to active, send notification to user
    if (status === 'active') {
      await execute(
        `INSERT INTO notifications (id, user_id, title, message, type, related_task_id)
         VALUES (?, ?, ?, ?, 'system', NULL)`,
        [
          randomUUID(),
          userId,
          'Akun Anda Telah Disetujui!',
          'Selamat, pendaftaran akun Anda telah di-ACC oleh Administrator. Anda sekarang dapat mengakses seluruh fitur.',
        ]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Admin update error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = await getSessionUser();
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Akses ditolak: Hanya untuk Administrator' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId wajib diisi' }, { status: 400 });
    }

    if (userId === admin.id) {
      return NextResponse.json({ error: 'Tidak dapat menghapus akun Anda sendiri' }, { status: 400 });
    }

    await execute('DELETE FROM users WHERE id = ?', [userId]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Admin delete user error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
