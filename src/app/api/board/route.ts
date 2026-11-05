import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { BoardColumn, Label, Project, Task, User } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectIdParam = searchParams.get('projectId');

    // Fetch projects with columns and tasks count
    const projects = await query<Project[]>(
      `SELECT p.*,
        COALESCE(p.unit_tag, 'IT') as unit_tag,
        COALESCE(p.stage, 'Active') as stage,
        COALESCE(p.position, 1000) as position,
        (SELECT COUNT(*) FROM board_columns bc WHERE bc.project_id = p.id) as columns_count,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as tasks_count
       FROM projects p
       ORDER BY p.position ASC, p.created_at ASC`
    );
    if (!projects || projects.length === 0) {
      return NextResponse.json({ error: 'No projects found' }, { status: 404 });
    }

    const currentProject = projectIdParam
      ? projects.find((p) => p.id === projectIdParam) || projects[0]
      : projects[0];

    // Fetch columns
    const columns = await query<BoardColumn[]>(
      'SELECT * FROM board_columns WHERE project_id = ? ORDER BY position ASC',
      [currentProject.id]
    );

    // Fetch all tasks for this project (both parent tasks and sub-tasks)
    const allTasks = await query<any[]>(
      `SELECT t.*, 
        (SELECT COUNT(*) FROM comments c WHERE c.task_id = t.id) as comments_count
       FROM tasks t
       WHERE t.project_id = ?
       ORDER BY t.position ASC`,
      [currentProject.id]
    );

    // Fetch assignees for all tasks
    const assignees = await query<any[]>(
      `SELECT ta.task_id, u.id, u.name, u.email, u.avatar_url
       FROM task_assignees ta
       JOIN users u ON ta.user_id = u.id
       JOIN tasks t ON ta.task_id = t.id
       WHERE t.project_id = ?`,
      [currentProject.id]
    );

    // Fetch labels for all tasks
    const taskLabels = await query<any[]>(
      `SELECT tl.task_id, l.id, l.name, l.color, l.project_id
       FROM task_labels tl
       JOIN labels l ON tl.label_id = l.id
       WHERE l.project_id = ?`,
      [currentProject.id]
    );

    // Fetch master labels
    const masterLabels = await query<Label[]>(
      'SELECT * FROM labels WHERE project_id = ? ORDER BY name ASC',
      [currentProject.id]
    );

    // Map assignees and labels to tasks
    const taskMap = new Map<string, Task>();
    allTasks.forEach((t) => {
      let parsedTags: string[] = [];
      if (t.unit_tags) {
        if (typeof t.unit_tags === 'string') {
          try {
            parsedTags = JSON.parse(t.unit_tags);
          } catch {
            parsedTags = t.unit_tags.split(',').map((s: string) => s.trim()).filter(Boolean);
          }
        } else if (Array.isArray(t.unit_tags)) {
          parsedTags = t.unit_tags;
        }
      }
      taskMap.set(t.id, {
        ...t,
        unit_tags: parsedTags,
        assignees: [],
        labels: [],
        sub_tasks: [],
      });
    });

    assignees.forEach((a) => {
      const task = taskMap.get(a.task_id);
      if (task) {
        task.assignees?.push({
          id: a.id,
          name: a.name,
          email: a.email,
          avatar_url: a.avatar_url,
        });
      }
    });

    taskLabels.forEach((tl) => {
      const task = taskMap.get(tl.task_id);
      if (task) {
        task.labels?.push({
          id: tl.id,
          project_id: tl.project_id,
          name: tl.name,
          color: tl.color,
        });
      }
    });

    // Populate attachment counts
    try {
      const attachmentCounts = await query<any[]>(
        `SELECT task_id, COUNT(*) as count FROM task_attachments GROUP BY task_id`
      );
      (attachmentCounts || []).forEach((ac) => {
        const task = taskMap.get(ac.task_id);
        if (task) {
          task.attachments_count = Number(ac.count);
        }
      });
    } catch {
      // Table may not have data yet, ignore
    }

    // Separate parent tasks and attach sub-tasks
    const parentTasks: Task[] = [];
    const subTasks: Task[] = [];

    taskMap.forEach((task) => {
      if (task.parent_id) {
        subTasks.push(task);
      } else {
        parentTasks.push(task);
      }
    });

    subTasks.forEach((sub) => {
      if (sub.parent_id) {
        const parent = taskMap.get(sub.parent_id);
        if (parent) {
          parent.sub_tasks?.push(sub);
        }
      }
    });

    // Attach parent tasks to their respective columns
    const columnsWithTasks = columns.map((col) => {
      return {
        ...col,
        tasks: parentTasks.filter((t) => t.column_id === col.id),
      };
    });

    return NextResponse.json({
      project: currentProject,
      projects,
      columns: columnsWithTasks,
      allTasks: Array.from(taskMap.values()),
      masterLabels,
    });
  } catch (error: any) {
    console.error('Error fetching board:', error);
    return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
  }
}
