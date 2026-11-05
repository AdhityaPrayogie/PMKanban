import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyPassword, createToken } from '@/lib/auth';


export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email dan password wajib diisi' }, { status: 400 });
    }

    const rows = await query<any[]>(
      'SELECT id, name, email, avatar_url, role, status, password_hash FROM users WHERE email = ?',
      [email.trim().toLowerCase()]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Email atau password salah' }, { status: 401 });
    }

    const user = rows[0];

    const isValid = verifyPassword(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Email atau password salah' }, { status: 401 });
    }

    // Check account status
    if (user.status === 'pending') {
      return NextResponse.json(
        {
          error:
            'Akun Anda sedang menunggu persetujuan (approval) dari Administrator sebelum dapat masuk.',
        },
        { status: 403 }
      );
    }

    if (user.status === 'rejected') {
      return NextResponse.json(
        {
          error: 'Akses akun Anda telah ditolak atau dinonaktifkan oleh Administrator.',
        },
        { status: 403 }
      );
    }

    // Create session token
    const token = createToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar_url: user.avatar_url,
      role: user.role,
      status: user.status,
    };

    const response = NextResponse.json({
      success: true,
      user: safeUser,
    });

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 86400,
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
