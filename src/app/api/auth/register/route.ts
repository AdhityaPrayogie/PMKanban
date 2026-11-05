import { NextResponse } from 'next/server';
import { execute, query } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { randomUUID } from 'crypto';
import { broadcastNotification } from '@/lib/chatEvents';


export async function POST(request: Request) {
  try {
    const { name, email, password, unit_name, unit_id } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Nama, email, dan password wajib diisi' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    const existing = await query<any[]>('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 409 });
    }

    const userId = randomUUID();
    const passwordHash = hashPassword(password);
    const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
      name
    )}&backgroundColor=034694`;

    await execute(
      `INSERT INTO users (id, name, email, avatar_url, password_hash, password_plain, role, status, unit_id, unit_name)
       VALUES (?, ?, ?, ?, ?, ?, 'user', 'pending', ?, ?)`,
      [userId, name.trim(), cleanEmail, defaultAvatar, passwordHash, password, unit_id || null, unit_name || 'IT']
    );

    // Notify all admin users about the pending registration
    const admins = await query<any[]>("SELECT id FROM users WHERE role = 'admin'");
    const title = 'Pendaftaran Pengguna Baru Menunggu ACC';
    const message = `Pengguna ${name.trim()} (${cleanEmail}) baru saja mendaftar dan menunggu persetujuan Anda di menu Kelola Pengguna.`;
    for (const admin of admins) {
      const notifId = randomUUID();
      await execute(
        `INSERT INTO notifications (id, user_id, title, message, type, related_task_id)
         VALUES (?, ?, ?, ?, 'system', NULL)`,
        [notifId, admin.id, title, message]
      );
      broadcastNotification({ id: notifId, user_id: admin.id, title, message, type: 'system', related_task_id: null, is_read: false });
    }

    return NextResponse.json({
      success: true,
      message:
        'Pendaftaran berhasil! Akun Anda sedang menunggu persetujuan (approval) dari Administrator sebelum dapat masuk.',
    });
  } catch (error: any) {
    console.error('Register error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
