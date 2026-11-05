import { NextRequest, NextResponse } from 'next/server';
import { execute, query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { MasterUnit } from '@/types';
import { randomUUID } from 'crypto';
import { broadcastNotification } from '@/lib/chatEvents';

export async function GET() {
  try {
    if (!(await getSessionUser())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const units = await query<MasterUnit[]>(
      `SELECT u.*,
        (SELECT COUNT(*) FROM users usr WHERE usr.unit_id = u.id OR usr.unit_name = u.code) as users_count,
        (SELECT COUNT(*) FROM projects p WHERE p.unit_tag = u.code) as projects_count
       FROM units u
       ORDER BY u.created_at ASC`
    );
    return NextResponse.json({ units });
  } catch (error: any) {
    console.error('Error fetching master units:', error);
    return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, code, description } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Nama unit wajib diisi' }, { status: 400 });
    }

    if (!code || !code.trim()) {
      return NextResponse.json({ error: 'Kode unit wajib diisi (Contoh: IT, MARKOM)' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();
    const cleanName = name.trim();

    // Check if code exists
    const existing = await query<any[]>('SELECT id FROM units WHERE code = ?', [cleanCode]);
    if (existing.length > 0) {
      return NextResponse.json({ error: `Unit dengan kode "${cleanCode}" sudah ada` }, { status: 409 });
    }

    const unitId = `unit_${cleanCode.toLowerCase()}_${randomUUID().slice(0, 4)}`;

    await execute(
      `INSERT INTO units (id, name, code, description, created_at, updated_at)
       VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [unitId, cleanName, cleanCode, description?.trim() || null]
    );

    // Emit system notification
    const notifId = randomUUID();
    const notifTitle = 'Master Unit Baru Ditambahkan';
    const notifMessage = `Unit "${cleanName}" (${cleanCode}) berhasil ditambahkan ke master table units.`;
    await execute(
      `INSERT INTO notifications (id, user_id, title, message, type, related_task_id)
       VALUES (?, ?, ?, ?, 'system', NULL)`,
      [notifId, user.id, notifTitle, notifMessage]
    );
    broadcastNotification({ id: notifId, user_id: user.id, title: notifTitle, message: notifMessage, type: 'system', related_task_id: null, is_read: false });

    return NextResponse.json({
      success: true,
      unit: {
        id: unitId,
        name: cleanName,
        code: cleanCode,
        description: description?.trim() || null,
        users_count: 0,
        projects_count: 0,
      },
    });
  } catch (error: any) {
    console.error('Error creating master unit:', error);
    return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, code, description } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID unit wajib diisi' }, { status: 400 });
    }

    const existingUnits = await query<any[]>('SELECT * FROM units WHERE id = ?', [id]);
    if (!existingUnits || existingUnits.length === 0) {
      return NextResponse.json({ error: 'Unit tidak ditemukan' }, { status: 404 });
    }

    const currentUnit = existingUnits[0];
    const oldCode = currentUnit.code;
    const updates: string[] = [];
    const values: any[] = [];

    if (name && name.trim()) {
      updates.push('name = ?');
      values.push(name.trim());
    }

    let codeChanged = false;
    let cleanCode = oldCode;
    if (code && code.trim()) {
      cleanCode = code.trim().toUpperCase();
      if (cleanCode !== oldCode) {
        const conflict = await query<any[]>('SELECT id FROM units WHERE code = ? AND id != ?', [cleanCode, id]);
        if (conflict.length > 0) {
          return NextResponse.json({ error: `Unit dengan kode "${cleanCode}" sudah digunakan` }, { status: 409 });
        }
        updates.push('code = ?');
        values.push(cleanCode);
        codeChanged = true;
      }
    }

    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description?.trim() || null);
    }

    if (updates.length > 0) {
      values.push(id);
      await execute(`UPDATE units SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, values);
    }

    if (codeChanged) {
      await execute('UPDATE users SET unit_name = ? WHERE unit_id = ? OR unit_name = ?', [cleanCode, id, oldCode]);
      await execute('UPDATE projects SET unit_tag = ? WHERE unit_tag = ?', [cleanCode, oldCode]);
    }

    return NextResponse.json({ success: true, updatedCode: cleanCode });
  } catch (error: any) {
    console.error('Error updating master unit:', error);
    return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
  }
}
