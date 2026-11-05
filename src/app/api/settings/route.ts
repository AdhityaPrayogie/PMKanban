import { NextResponse } from 'next/server';
import { execute, query } from '@/lib/db';
import { getSessionUser, hashPassword, verifyPassword } from '@/lib/auth';


export async function PATCH(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, avatar_url, oldPassword, newPassword } = await request.json();

    if (name) {
      await execute('UPDATE users SET name = ? WHERE id = ?', [name.trim(), user.id]);
    }
    if (avatar_url !== undefined) {
      await execute('UPDATE users SET avatar_url = ? WHERE id = ?', [avatar_url, user.id]);
    }

    // Password change
    if (newPassword) {
      if (!oldPassword) {
        return NextResponse.json({ error: 'Password lama diperlukan untuk mengubah password' }, { status: 400 });
      }
      if (newPassword.length < 6) {
        return NextResponse.json({ error: 'Password baru minimal 6 karakter' }, { status: 400 });
      }

      const rows = await query<any[]>('SELECT password_hash FROM users WHERE id = ?', [user.id]);
      const currentHash = rows[0]?.password_hash;
      if (!verifyPassword(oldPassword, currentHash)) {
        return NextResponse.json({ error: 'Password lama salah' }, { status: 400 });
      }

      const newHash = hashPassword(newPassword);
      await execute('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, user.id]);
    }

    const updatedUser = await query<any[]>(
      'SELECT id, name, email, avatar_url, role, status FROM users WHERE id = ?',
      [user.id]
    );

    return NextResponse.json({ success: true, user: updatedUser[0] });
  } catch (error: any) {
    console.error('Settings error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
