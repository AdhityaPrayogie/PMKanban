import { NextRequest, NextResponse } from 'next/server';
import { execute, query } from '@/lib/db';
import { randomUUID } from 'crypto';
import { getSessionUser } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    if (!(await getSessionUser())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json();
    const { projectId, title } = body;

    if (!projectId || !title) {
      return NextResponse.json({ error: 'projectId and title are required' }, { status: 400 });
    }

    const colId = randomUUID();
    const posRows = await query<any[]>(
      'SELECT COALESCE(MAX(position), 0) + 1000 AS nextPos FROM board_columns WHERE project_id = ?',
      [projectId]
    );
    const position = posRows[0]?.nextPos || 1000;

    await execute(
      'INSERT INTO board_columns (id, project_id, title, position) VALUES (?, ?, ?, ?)',
      [colId, projectId, title.trim(), position]
    );

    return NextResponse.json({
      success: true,
      column: {
        id: colId,
        project_id: projectId,
        title: title.trim(),
        position,
        tasks: [],
      },
    });
  } catch (error: any) {
    console.error('Error creating column:', error);
    return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    if (!(await getSessionUser())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json();
    const { id, title, position } = body;

    if (!id) {
      return NextResponse.json({ error: 'Column id is required' }, { status: 400 });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }
    if (position !== undefined) {
      updates.push('position = ?');
      values.push(position);
    }

    if (updates.length === 0) {
      return NextResponse.json({ message: 'No updates provided' });
    }

    values.push(id);
    await execute(`UPDATE board_columns SET ${updates.join(', ')} WHERE id = ?`, values);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating column:', error);
    return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!(await getSessionUser())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Column id is required' }, { status: 400 });
    }

    await execute('DELETE FROM board_columns WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting column:', error);
    return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
  }
}
