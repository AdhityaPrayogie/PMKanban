import { NextRequest, NextResponse } from 'next/server';
import { execute, query } from '@/lib/db';
import { randomUUID } from 'crypto';
import { broadcastNotification } from '@/lib/chatEvents';
import { getSessionUser } from '@/lib/auth';


export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      projectId,
      columnId,
      parentId = null,
      title,
      description = '',
      customer = null,
      unit_tags = null,
      priority = 'Medium',
      startDate = null,
      dueDate = null,
      creatorId,
      assigneeIds = [],
      labelIds = [],
    } = body;

    if (!projectId || !columnId || !title || !creatorId) {
      return NextResponse.json(
        { error: 'projectId, columnId, title, and creatorId are required' },
        { status: 400 }
      );
    }

    const taskId = randomUUID();

    // Get highest position in column
    const posRows = await query<any[]>(
      'SELECT COALESCE(MAX(position), 0) + 1000 AS nextPos FROM tasks WHERE column_id = ? AND (parent_id IS NULL OR parent_id = ?)',
      [columnId, parentId || '']
    );
    const position = posRows[0]?.nextPos || 1000;

    const unitTagsStr = Array.isArray(unit_tags)
      ? JSON.stringify(unit_tags)
      : typeof unit_tags === 'string'
      ? unit_tags
      : null;

    await execute(
      `INSERT INTO tasks (id, project_id, column_id, parent_id, title, description, customer, unit_tags, priority, start_date, due_date, position, creator_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        taskId,
        projectId,
        columnId,
        parentId,
        title,
        description,
        customer || null,
        unitTagsStr,
        priority,
        startDate || null,
        dueDate || null,
        position,
        creatorId,
      ]
    );

    // Insert assignees
    if (Array.isArray(assigneeIds) && assigneeIds.length > 0) {
      for (const userId of assigneeIds) {
        await execute(
          'INSERT INTO task_assignees (task_id, user_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE assigned_at=CURRENT_TIMESTAMP',
          [taskId, userId]
        );

        // Create assignment notification if not assigned to self
        if (userId !== creatorId) {
          const assignNotifId = randomUUID();
          await execute(
            `INSERT INTO notifications (id, user_id, title, message, type, related_task_id)
             VALUES (?, ?, ?, ?, 'assignment', ?)`,
            [
              assignNotifId,
              userId,
              'New Task Assigned',
              `You were assigned to "${title}".`,
              taskId,
            ]
          );
          broadcastNotification({
            id: assignNotifId,
            user_id: userId,
            title: 'New Task Assigned',
            message: `You were assigned to "${title}".`,
            type: 'assignment',
            related_task_id: taskId,
            is_read: false,
            created_at: new Date().toISOString(),
          });
        }
      }
    }

    // Insert labels
    if (Array.isArray(labelIds) && labelIds.length > 0) {
      for (const labelId of labelIds) {
        await execute('INSERT INTO task_labels (task_id, label_id) VALUES (?, ?)', [
          taskId,
          labelId,
        ]);
      }
    }

    // Notify all project assignees and creator
    const creatorNotifId = randomUUID();
    await execute(
      `INSERT INTO notifications (id, user_id, title, message, type, related_task_id)
       VALUES (?, ?, ?, ?, 'assignment', ?)`,
      [
        creatorNotifId,
        creatorId,
        parentId ? 'Sub-task Dibuat' : 'Tugas Baru Dibuat',
        `Tugas "${title}" berhasil ditambahkan ke papan kerja.`,
        taskId,
      ]
    );
    broadcastNotification({
      id: creatorNotifId,
      user_id: creatorId,
      title: parentId ? 'Sub-task Dibuat' : 'Tugas Baru Dibuat',
      message: `Tugas "${title}" berhasil ditambahkan ke papan kerja.`,
      type: 'assignment',
      related_task_id: taskId,
      is_read: false,
      created_at: new Date().toISOString(),
    });

    // Log task creation activity
    try {
      const colRows = await query<any[]>('SELECT title FROM board_columns WHERE id = ?', [columnId]);
      const colTitle = colRows[0]?.title || 'To Do';
      const createChanges: any[] = [
        { field: 'Judul', new: title },
        { field: 'Prioritas', new: priority },
        { field: 'Kolom', new: colTitle },
      ];
      if (customer) createChanges.push({ field: 'Customer / Klien', new: customer });
      if (unit_tags && (Array.isArray(unit_tags) ? unit_tags.length : unit_tags)) {
        createChanges.push({
          field: 'Unit Tags',
          new: Array.isArray(unit_tags) ? unit_tags.map((t) => `#${t}`).join(', ') : unit_tags,
        });
      }

      await execute(
        `INSERT INTO task_activities (id, task_id, project_id, user_id, action, details, created_at)
         VALUES (?, ?, ?, ?, 'create_task', ?, NOW())`,
        [
          randomUUID(),
          taskId,
          projectId,
          creatorId,
          JSON.stringify({
            summary: `Tugas dibuat di kolom "${colTitle}"`,
            changes: createChanges,
          }),
        ]
      );
    } catch (actErr) {
      console.error('Failed to log task creation activity:', actErr);
    }

    return NextResponse.json({ success: true, taskId, id: taskId }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      column_id,
      position,
      title,
      description,
      customer,
      unit_tags,
      assignee_ids,
      priority,
      start_date,
      due_date,
      parent_id,
      userId,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Task id is required' }, { status: 400 });
    }

    const currentTask = await query<any[]>('SELECT * FROM tasks WHERE id = ?', [id]);
    if (currentTask.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const prevColId = currentTask[0].column_id;
    const taskTitle = currentTask[0].title;
    const creatorId = currentTask[0].creator_id;

    const updates: string[] = [];
    const values: any[] = [];

    if (column_id !== undefined) {
      updates.push('column_id = ?');
      values.push(column_id);
    }
    if (position !== undefined) {
      updates.push('position = ?');
      values.push(position);
    }
    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (customer !== undefined) {
      updates.push('customer = ?');
      values.push(customer || null);
    }
    if (unit_tags !== undefined) {
      const tagsStr = Array.isArray(unit_tags)
        ? JSON.stringify(unit_tags)
        : typeof unit_tags === 'string'
        ? unit_tags
        : null;
      updates.push('unit_tags = ?');
      values.push(tagsStr);
    }
    if (priority !== undefined) {
      updates.push('priority = ?');
      values.push(priority);
    }
    if (start_date !== undefined) {
      updates.push('start_date = ?');
      values.push(start_date || null);
    }
    if (due_date !== undefined) {
      updates.push('due_date = ?');
      values.push(due_date || null);
    }
    if (parent_id !== undefined) {
      updates.push('parent_id = ?');
      values.push(parent_id || null);
    }

    if (updates.length > 0) {
      values.push(id);
      await execute(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`, values);
    }

    // Collect field modifications for Activity Log
    const sessionUser = await getSessionUser();
    const modifierId = userId || sessionUser?.id || creatorId;
    const changes: any[] = [];

    if (title !== undefined && title.trim() && title.trim() !== currentTask[0].title) {
      changes.push({ field: 'Judul', old: currentTask[0].title, new: title.trim() });
    }
    if (priority !== undefined && priority !== currentTask[0].priority) {
      changes.push({ field: 'Prioritas', old: currentTask[0].priority, new: priority });
    }
    if (column_id !== undefined && column_id !== prevColId) {
      const prevColRows = await query<any[]>('SELECT title FROM board_columns WHERE id = ?', [prevColId]);
      const newColRows = await query<any[]>('SELECT title FROM board_columns WHERE id = ?', [column_id]);
      changes.push({
        field: 'Status / Kolom',
        old: prevColRows[0]?.title || 'Kolom Lama',
        new: newColRows[0]?.title || 'Kolom Baru',
      });
    }
    if (customer !== undefined) {
      const oldCust = (currentTask[0].customer || '').trim();
      const newCust = (customer || '').trim();
      if (oldCust !== newCust) {
        changes.push({
          field: 'Customer / Klien',
          old: oldCust || '-',
          new: newCust || '-',
        });
      }
    }
    if (description !== undefined) {
      const oldDesc = (currentTask[0].description || '').trim();
      const newDesc = (description || '').trim();
      if (oldDesc !== newDesc) {
        changes.push({
          field: 'Deskripsi',
          old: oldDesc ? 'Tercatat' : 'Kosong',
          new: newDesc ? 'Diperbarui' : 'Dikosongkan',
        });
      }
    }
    if (start_date !== undefined) {
      const oldStart = currentTask[0].start_date ? new Date(currentTask[0].start_date).toISOString().slice(0, 10) : '';
      const newStart = (start_date || '').slice(0, 10);
      if (oldStart !== newStart) {
        changes.push({
          field: 'Tanggal Mulai',
          old: oldStart || '-',
          new: newStart || '-',
        });
      }
    }
    if (due_date !== undefined) {
      const oldDue = currentTask[0].due_date ? new Date(currentTask[0].due_date).toISOString().slice(0, 10) : '';
      const newDue = (due_date || '').slice(0, 10);
      if (oldDue !== newDue) {
        changes.push({
          field: 'Tenggat Waktu',
          old: oldDue || '-',
          new: newDue || '-',
        });
      }
    }
    if (unit_tags !== undefined) {
      const oldTagsRaw = currentTask[0].unit_tags || '';
      let oldTagsList: string[] = [];
      try {
        oldTagsList = typeof oldTagsRaw === 'string' && oldTagsRaw.startsWith('[') ? JSON.parse(oldTagsRaw) : oldTagsRaw.split(',').map((s: string) => s.trim()).filter(Boolean);
      } catch {
        oldTagsList = [];
      }
      const newTagsList = Array.isArray(unit_tags) ? unit_tags : [];
      const oldTagsStr = oldTagsList.sort().join(', ');
      const newTagsStr = newTagsList.sort().join(', ');
      if (oldTagsStr !== newTagsStr) {
        changes.push({
          field: 'Unit Tags',
          old: oldTagsStr ? oldTagsList.map((t) => `#${t}`).join(', ') : '-',
          new: newTagsStr ? newTagsList.map((t) => `#${t}`).join(', ') : '-',
        });
      }
    }

    // Sync assignees if provided
    if (Array.isArray(assignee_ids)) {
      const existingAssigneeRows = await query<any[]>(
        'SELECT ta.user_id, u.name FROM task_assignees ta LEFT JOIN users u ON ta.user_id = u.id WHERE ta.task_id = ?',
        [id]
      );
      const existingSet = new Set(existingAssigneeRows.map((r) => r.user_id));
      const newSet = new Set(assignee_ids);

      const added = assignee_ids.filter((uId: string) => !existingSet.has(uId));
      const removed = existingAssigneeRows.filter((r) => !newSet.has(r.user_id));

      if (added.length > 0 || removed.length > 0) {
        let addedNames = '';
        if (added.length > 0) {
          const addedRows = await query<any[]>(
            `SELECT name FROM users WHERE id IN (${added.map(() => '?').join(',')})`,
            added
          );
          addedNames = addedRows.map((r) => r.name).join(', ');
        }
        const removedNames = removed.map((r) => r.name).join(', ');
        changes.push({
          field: 'Penugasan Tim',
          old: removedNames ? `Dihapus: ${removedNames}` : undefined,
          new: addedNames ? `Ditugaskan: ${addedNames}` : undefined,
        });
      }

      await execute('DELETE FROM task_assignees WHERE task_id = ?', [id]);
      for (const uId of assignee_ids) {
        await execute(
          'INSERT INTO task_assignees (task_id, user_id) VALUES (?, ?)',
          [id, uId]
        );

        // If user is newly assigned, create notification
        if (!existingSet.has(uId)) {
          const assignNotifId = randomUUID();
          const notifTitle = 'Penugasan Tugas';
          const notifMsg = `Anda telah ditugaskan ke tugas "${taskTitle}".`;
          await execute(
            `INSERT INTO notifications (id, user_id, title, message, type, related_task_id)
             VALUES (?, ?, ?, ?, 'assignment', ?)`,
            [assignNotifId, uId, notifTitle, notifMsg, id]
          );
          broadcastNotification({
            id: assignNotifId,
            user_id: uId,
            title: notifTitle,
            message: notifMsg,
            type: 'assignment',
            related_task_id: id,
            is_read: false,
            created_at: new Date().toISOString(),
          });
        }
      }
    }

    // If column changed, emit notification to creator and all assignees
    if (column_id && column_id !== prevColId) {
      const colRows = await query<any[]>('SELECT title FROM board_columns WHERE id = ?', [column_id]);
      const colTitle = colRows[0]?.title || 'Kolom Baru';

      const currentAssignees = await query<any[]>(
        'SELECT user_id FROM task_assignees WHERE task_id = ?',
        [id]
      );
      const recipientIds = new Set<string>();
      if (creatorId) recipientIds.add(creatorId);
      for (const a of currentAssignees) {
        if (a.user_id) recipientIds.add(a.user_id);
      }

      for (const rId of recipientIds) {
        const colNotifId = randomUUID();
        const notifTitle = 'Perubahan Kolom Tugas';
        const notifMsg = `Tugas "${taskTitle}" telah dipindahkan ke kolom "${colTitle}".`;

        await execute(
          `INSERT INTO notifications (id, user_id, title, message, type, related_task_id)
           VALUES (?, ?, ?, ?, 'system', ?)`,
          [colNotifId, rId, notifTitle, notifMsg, id]
        );
        broadcastNotification({
          id: colNotifId,
          user_id: rId,
          title: notifTitle,
          message: notifMsg,
          type: 'system',
          related_task_id: id,
          is_read: false,
          created_at: new Date().toISOString(),
        });
      }
    }

    // Record task modification activity
    if (changes.length > 0) {
      try {
        const isMove = changes.length === 1 && changes[0].field === 'Status / Kolom';
        const actionType = isMove ? 'move_task' : 'update_task';
        const summary = isMove
          ? `Status tugas dipindahkan dari "${changes[0].old}" ke "${changes[0].new}"`
          : `Perubahan: ${changes.map((c) => c.field).join(', ')}`;

        await execute(
          `INSERT INTO task_activities (id, task_id, project_id, user_id, action, details, created_at)
           VALUES (?, ?, ?, ?, ?, ?, NOW())`,
          [
            randomUUID(),
            id,
            currentTask[0].project_id,
            modifierId,
            actionType,
            JSON.stringify({ summary, changes }),
          ]
        );
      } catch (actErr) {
        console.error('Failed to log task update activity:', actErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Task id is required' }, { status: 400 });
    }

    const currentTask = await query<any[]>('SELECT title, creator_id FROM tasks WHERE id = ?', [id]);
    if (currentTask.length > 0) {
      await execute(
        `INSERT INTO notifications (id, user_id, title, message, type, related_task_id)
         VALUES (?, ?, ?, ?, 'system', NULL)`,
        [
          randomUUID(),
          currentTask[0].creator_id,
          'Tugas Telah Dihapus',
          `Tugas "${currentTask[0].title}" telah berhasil dihapus dari papan.`,
        ]
      );
    }

    await execute('DELETE FROM tasks WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
  }
}
