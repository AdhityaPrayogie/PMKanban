import { NextRequest, NextResponse } from 'next/server';
import { execute, query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { randomUUID } from 'crypto';
import { broadcastNotification } from '@/lib/chatEvents';

export async function GET() {
  try {
    if (!(await getSessionUser())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const units = await query<any[]>(
      `SELECT p.*,
        COALESCE(p.unit_tag, 'IT') as unit_tag,
        COALESCE(p.stage, 'Active') as stage,
        COALESCE(p.position, 1000) as position,
        (SELECT COUNT(*) FROM board_columns bc WHERE bc.project_id = p.id) as columns_count,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as tasks_count
       FROM projects p
       ORDER BY p.position ASC, p.created_at ASC`
    );
    return NextResponse.json({ units });
  } catch (error: any) {
    console.error('Error fetching units:', error);
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
    const { name, description, unit_tag = 'IT', stage = 'Active' } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Nama board/unit wajib diisi' }, { status: 400 });
    }

    const boardId = `board_${randomUUID().slice(0, 8)}`;

    // Create the Project/Main Board
    await execute(
      `INSERT INTO projects (id, name, description, owner_id, unit_tag, stage, position, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1000, NOW(), NOW())`,
      [boardId, name.trim(), description?.trim() || null, user.id, unit_tag, stage]
    );

    // Auto-create default columns for this new Board
    const defaultColumns = [
      { id: `${boardId}_col1`, title: 'To Do', pos: 1000 },
      { id: `${boardId}_col2`, title: 'In Progress', pos: 2000 },
      { id: `${boardId}_col3`, title: 'In Review', pos: 3000 },
      { id: `${boardId}_col4`, title: 'Done', pos: 4000 },
    ];

    for (const col of defaultColumns) {
      await execute(
        `INSERT INTO board_columns (id, project_id, title, position, created_at, updated_at)
         VALUES (?, ?, ?, ?, NOW(), NOW())`,
        [col.id, boardId, col.title, col.pos]
      );
    }

    // Emit notification
    const unitNotifId = randomUUID();
    await execute(
      `INSERT INTO notifications (id, user_id, title, message, type, related_task_id)
       VALUES (?, ?, ?, ?, 'system', NULL)`,
      [
        unitNotifId,
        user.id,
        'Papan Kerja Baru Dibuat',
        `Board "${name.trim()}" (Tag: #${unit_tag}) berhasil dibuat pada tahap ${stage}.`,
      ]
    );
    broadcastNotification({
      id: unitNotifId,
      user_id: user.id,
      title: 'Papan Kerja Baru Dibuat',
      message: `Board "${name.trim()}" (Tag: #${unit_tag}) berhasil dibuat pada tahap ${stage}.`,
      type: 'system',
      related_task_id: null,
      is_read: false,
      created_at: new Date().toISOString(),
    });

    // Log board creation activity
    try {
      await execute(
        `INSERT INTO task_activities (id, task_id, project_id, user_id, action, details, created_at)
         VALUES (?, NULL, ?, ?, 'create_board', ?, NOW())`,
        [
          randomUUID(),
          boardId,
          user.id,
          JSON.stringify({
            summary: `Papan kerja "${name.trim()}" dibuat`,
            changes: [
              { field: 'Nama Board', new: name.trim() },
              { field: 'Tag Unit', new: `#${unit_tag}` },
              { field: 'Tahap', new: stage },
            ],
          }),
        ]
      );
    } catch (actErr) {
      console.error('Failed to log board creation activity:', actErr);
    }

    return NextResponse.json({
      success: true,
      unit: {
        id: boardId,
        name: name.trim(),
        description: description?.trim() || null,
        owner_id: user.id,
        unit_tag,
        stage,
      },
    });
  } catch (error: any) {
    console.error('Error creating board/unit:', error);
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
    const { id, stage, position, name, description, unit_tag } = body;

    if (!id) {
      return NextResponse.json({ error: 'Board ID wajib disertakan' }, { status: 400 });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (stage !== undefined) {
      updates.push('stage = ?');
      values.push(stage);
    }
    if (position !== undefined) {
      updates.push('position = ?');
      values.push(position);
    }
    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name.trim());
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description.trim());
    }
    if (unit_tag !== undefined) {
      updates.push('unit_tag = ?');
      values.push(unit_tag);
    }

    if (updates.length > 0) {
      values.push(id);
      await execute(
        `UPDATE projects SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
        values
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating board/unit:', error);
    return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const unitId = searchParams.get('id');

    if (!unitId) {
      return NextResponse.json({ error: 'Unit ID wajib diisi' }, { status: 400 });
    }

    const owner = await query<any[]>('SELECT owner_id FROM projects WHERE id = ?', [unitId]);
    if (owner.length && owner[0].owner_id !== user.id && user.role !== 'admin') {
      return NextResponse.json({ error: 'Hanya pemilik board atau admin yang bisa menghapus' }, { status: 403 });
    }

    // Check count of projects
    const total = await query<any[]>('SELECT COUNT(*) as count FROM projects');
    if (total[0].count <= 1) {
      return NextResponse.json({ error: 'Minimal harus ada 1 unit/divisi di sistem' }, { status: 400 });
    }

    await execute('DELETE FROM projects WHERE id = ?', [unitId]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting unit:', error);
    return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
  }
}
