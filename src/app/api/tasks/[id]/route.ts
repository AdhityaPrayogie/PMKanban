import { NextResponse } from 'next/server';
import { execute, query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { Comment, Label, Task, User } from '@/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await getSessionUser())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const taskRows = await query<Task[]>('SELECT * FROM tasks WHERE id = ?', [id]);
    if (!taskRows || taskRows.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const task = taskRows[0];

    // Assignees
    const assignees = await query<User[]>(
      `SELECT u.id, u.name, u.email, u.avatar_url
       FROM task_assignees ta
       JOIN users u ON ta.user_id = u.id
       WHERE ta.task_id = ?`,
      [id]
    );

    // Labels
    const labels = await query<Label[]>(
      `SELECT l.id, l.project_id, l.name, l.color
       FROM task_labels tl
       JOIN labels l ON tl.label_id = l.id
       WHERE tl.task_id = ?`,
      [id]
    );

    // Sub-tasks
    const subTasks = await query<Task[]>(
      `SELECT * FROM tasks WHERE parent_id = ? ORDER BY position ASC`,
      [id]
    );

    // Comments with user profile
    const comments = await query<any[]>(
      `SELECT c.id, c.task_id, c.user_id, c.content, c.image_url, c.created_at, c.updated_at,
              u.name as user_name, u.email as user_email, u.avatar_url as user_avatar
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.task_id = ?
       ORDER BY c.created_at ASC`,
      [id]
    );

    const formattedComments: Comment[] = comments.map((c) => ({
      id: c.id,
      task_id: c.task_id,
      user_id: c.user_id,
      content: c.content,
      image_url: c.image_url,
      created_at: c.created_at,
      updated_at: c.updated_at,
      user: {
        id: c.user_id,
        name: c.user_name,
        email: c.user_email,
        avatar_url: c.user_avatar,
      },
    }));

    let parsedUnitTags: string[] = [];
    if (task.unit_tags) {
      if (typeof task.unit_tags === 'string') {
        try {
          parsedUnitTags = JSON.parse(task.unit_tags);
        } catch {
          parsedUnitTags = task.unit_tags.split(',').map((s: string) => s.trim()).filter(Boolean);
        }
      } else if (Array.isArray(task.unit_tags)) {
        parsedUnitTags = task.unit_tags;
      }
    }

    // Attachments with uploader
    const attachments = await query<any[]>(
      `SELECT a.id, a.task_id, a.file_name, a.file_url, a.file_size, a.file_type, a.uploaded_by, a.created_at,
              u.name as uploader_name, u.email as uploader_email, u.avatar_url as uploader_avatar
       FROM task_attachments a
       LEFT JOIN users u ON a.uploaded_by = u.id
       WHERE a.task_id = ?
       ORDER BY a.created_at DESC`,
      [id]
    );

    const formattedAttachments = (attachments || []).map((a) => ({
      id: a.id,
      task_id: a.task_id,
      file_name: a.file_name,
      file_url: a.file_url,
      file_size: a.file_size,
      file_type: a.file_type,
      uploaded_by: a.uploaded_by,
      created_at: a.created_at,
      uploader: a.uploaded_by
        ? {
            id: a.uploaded_by,
            name: a.uploader_name,
            email: a.uploader_email,
            avatar_url: a.uploader_avatar,
          }
        : undefined,
    }));

    // Activities / Audit logs
    const activities = await query<any[]>(
      `SELECT a.*, 
              u.name as user_name, u.avatar_url as user_avatar, u.role as user_role, u.unit_name as user_unit
       FROM task_activities a
       LEFT JOIN users u ON a.user_id = u.id
       WHERE a.task_id = ? OR (a.task_id IS NULL AND a.project_id = ?)
       ORDER BY a.created_at DESC`,
      [id, task.project_id]
    );

    let formattedActivities = (activities || []).map((act) => {
      let parsedDetails: { summary?: string; changes?: any[] } = { summary: '', changes: [] };
      try {
        parsedDetails = typeof act.details === 'string' ? JSON.parse(act.details) : act.details;
      } catch (e) {
        parsedDetails = { summary: act.details || '', changes: [] };
      }
      return {
        id: act.id,
        task_id: act.task_id,
        project_id: act.project_id,
        user_id: act.user_id,
        action: act.action,
        details: parsedDetails,
        created_at: act.created_at,
        user: {
          id: act.user_id,
          name: act.user_name || 'Pengguna',
          avatar_url: act.user_avatar,
          role: act.user_role,
          unit_name: act.user_unit,
        },
      };
    });

    // If no activities yet for this task, synthesize/record initial creation log
    if (!formattedActivities.some((a) => a.action === 'create_task') && task.creator_id) {
      try {
        const creatorRows = await query<any[]>('SELECT name, avatar_url, role, unit_name FROM users WHERE id = ?', [task.creator_id]);
        const creator = creatorRows[0];
        const initialDetails = {
          summary: `Tugas "${task.title}" dibuat`,
          changes: [
            { field: 'Judul', new: task.title },
            { field: 'Prioritas', new: task.priority },
          ],
        };
        const initialActId = `act_${task.id.slice(0, 8)}_${Date.now().toString(36)}`;
        await execute(
          `INSERT INTO task_activities (id, task_id, project_id, user_id, action, details, created_at)
           VALUES (?, ?, ?, ?, 'create_task', ?, ?)`,
          [initialActId, id, task.project_id, task.creator_id, JSON.stringify(initialDetails), task.created_at || new Date()]
        );
        formattedActivities.push({
          id: initialActId,
          task_id: id,
          project_id: task.project_id,
          user_id: task.creator_id,
          action: 'create_task',
          details: initialDetails,
          created_at: task.created_at || new Date().toISOString(),
          user: {
            id: task.creator_id,
            name: creator?.name || 'Admin',
            avatar_url: creator?.avatar_url,
            role: creator?.role,
            unit_name: creator?.unit_name,
          },
        });
      } catch (initErr) {
        console.error('Error synthesizing initial activity:', initErr);
      }
    }

    return NextResponse.json({
      task: {
        ...task,
        unit_tags: parsedUnitTags,
        assignees,
        labels,
        sub_tasks: subTasks,
        attachments: formattedAttachments,
      },
      comments: formattedComments,
      activities: formattedActivities,
    });
  } catch (error: any) {
    console.error('Error fetching task details:', error);
    return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await getSessionUser())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const body = await request.json();
    const {
      title,
      description,
      customer,
      unit_tags,
      priority,
      column_id,
      start_date,
      due_date,
      assignee_ids,
      label_ids,
    } = body;

    const unitTagsStr = Array.isArray(unit_tags)
      ? JSON.stringify(unit_tags)
      : typeof unit_tags === 'string'
      ? unit_tags
      : null;

    // Update main task fields
    await execute(
      `UPDATE tasks 
       SET title = COALESCE(?, title),
           description = ?,
           customer = ?,
           unit_tags = ?,
           priority = COALESCE(?, priority),
           column_id = COALESCE(?, column_id),
           start_date = ?,
           due_date = ?
       WHERE id = ?`,
      [
        title || null,
        description !== undefined ? description : null,
        customer !== undefined ? customer : null,
        unitTagsStr,
        priority || null,
        column_id || null,
        start_date || null,
        due_date || null,
        id,
      ]
    );

    // Update assignees if provided
    if (Array.isArray(assignee_ids)) {
      await execute('DELETE FROM task_assignees WHERE task_id = ?', [id]);
      for (const userId of assignee_ids) {
        await execute(
          'INSERT INTO task_assignees (task_id, user_id) VALUES (?, ?)',
          [id, userId]
        );
      }
    }

    // Update labels if provided
    if (Array.isArray(label_ids)) {
      await execute('DELETE FROM task_labels WHERE task_id = ?', [id]);
      for (const labelId of label_ids) {
        await execute('INSERT INTO task_labels (task_id, label_id) VALUES (?, ?)', [
          id,
          labelId,
        ]);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
  }
}
