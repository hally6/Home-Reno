import { getDatabase } from '@/data/database';
import { createId } from '@/data/id';
import { normalizeTagNames, validateTaskInput } from './taskRules';
import { syncScheduledNotifications } from '@/services/notificationService';
import { rollbackAndThrow } from './transactionError';

export type TaskListItem = {
  id: string;
  title: string;
  status: string;
  phase: string;
  waitingReason: string | null;
  dueAt: string | null;
  roomName: string;
};

export type TodaySections = {
  overdue: TaskListItem[];
  dueToday: TaskListItem[];
  next: TaskListItem[];
  waiting: TaskListItem[];
};

export type TaskDetail = {
  id: string;
  roomId: string;
  title: string;
  description: string | null;
  roomName: string;
  phase: string;
  status: string;
  waitingReason: string | null;
  dueAt: string | null;
  startAt: string | null;
  priority: string;
  estimateLabor: number | null;
  estimateMaterials: number | null;
  actualLabor: number | null;
  actualMaterials: number | null;
  tradeTags: string[];
  customTags: string[];
};

export type TaskFormInput = {
  projectId: string;
  roomId: string;
  title: string;
  description: string;
  phase: string;
  status: string;
  waitingReason: string | null;
  dueAt: string | null;
  startAt: string | null;
  priority: string;
  tradeTags: string[];
  customTags: string[];
};

async function upsertTaskTags(
  db: Awaited<ReturnType<typeof getDatabase>>,
  taskId: string,
  projectId: string,
  tradeTags: string[],
  customTags: string[]
): Promise<void> {
  const normalizedTrade = normalizeTagNames(tradeTags);
  const normalizedCustom = normalizeTagNames(customTags);

  const allTags: Array<{ name: string; type: 'trade' | 'custom' }> = [
    ...normalizedTrade.map((name) => ({ name, type: 'trade' as const })),
    ...normalizedCustom.map((name) => ({ name, type: 'custom' as const }))
  ];

  const tagKey = (name: string, type: 'trade' | 'custom'): string => `${type}:${name}`;

  await db.runAsync(`DELETE FROM task_tags WHERE task_id = ?`, [taskId]);

  if (allTags.length > 0) {
    const whereClauses = allTags.map(() => `(name = ? AND type = ?)`).join(' OR ');
    const lookupParams: Array<string> = [projectId];
    for (const tag of allTags) {
      lookupParams.push(tag.name, tag.type);
    }

    const existing = await db.getAllAsync<{ id: string; name: string; type: 'trade' | 'custom' }>(
      `
        SELECT id, name, type
        FROM tags
        WHERE project_id = ?
          AND (${whereClauses})
      `,
      lookupParams
    );

    const tagIdsByKey = new Map<string, string>();
    for (const row of existing) {
      tagIdsByKey.set(tagKey(row.name, row.type), row.id);
    }

    for (const tag of allTags) {
      const key = tagKey(tag.name, tag.type);
      if (tagIdsByKey.has(key)) {
        continue;
      }
      const id = createId('tag');
      await db.runAsync(`INSERT INTO tags (id, project_id, name, type, color_token) VALUES (?, ?, ?, ?, NULL)`, [
        id,
        projectId,
        tag.name,
        tag.type
      ]);
      tagIdsByKey.set(key, id);
    }

    const linkValues: string[] = [];
    const linkParams: string[] = [];
    for (const tag of allTags) {
      const id = tagIdsByKey.get(tagKey(tag.name, tag.type));
      if (!id) {
        continue;
      }
      linkValues.push('(?, ?)');
      linkParams.push(taskId, id);
    }

    if (linkValues.length > 0) {
      await db.runAsync(
        `INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES ${linkValues.join(', ')}`,
        linkParams
      );
    }
  }
}

export async function getTodaySections(projectId: string): Promise<TodaySections> {
  const db = await getDatabase();
  const now = new Date();
  const nowIso = now.toISOString();
  const todayStartIso = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();
  const todayEndIso = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

  const baseSelect = `
    SELECT
      t.id,
      t.title,
      t.status,
      t.phase,
      t.waiting_reason AS waitingReason,
      t.due_at AS dueAt,
      r.name AS roomName
    FROM tasks t
    INNER JOIN rooms r ON r.id = t.room_id
    WHERE t.project_id = ? AND t.deleted_at IS NULL
  `;

  const overdue = await db.getAllAsync<TaskListItem>(
    `${baseSelect}
      AND t.status != 'done'
      AND t.due_at IS NOT NULL
      AND t.due_at < ?
      ORDER BY t.due_at ASC
      LIMIT 15
    `,
    [projectId, nowIso]
  );

  const dueToday = await db.getAllAsync<TaskListItem>(
    `${baseSelect}
      AND t.status != 'done'
      AND t.due_at IS NOT NULL
      AND t.due_at >= ?
      AND t.due_at <= ?
      ORDER BY t.due_at ASC
      LIMIT 15
    `,
    [projectId, todayStartIso, todayEndIso]
  );

  const next = await db.getAllAsync<TaskListItem>(
    `${baseSelect}
      AND t.status != 'done'
      AND t.due_at IS NOT NULL
      AND t.due_at > ?
      ORDER BY t.due_at ASC
      LIMIT 15
    `,
    [projectId, nowIso]
  );

  const waiting = await db.getAllAsync<TaskListItem>(
    `${baseSelect}
      AND t.status = 'waiting'
      ORDER BY t.updated_at DESC
      LIMIT 15
    `,
    [projectId]
  );

  return {
    overdue,
    dueToday,
    next,
    waiting
  };
}

export async function getBoardTasks(projectId: string): Promise<Record<string, TaskListItem[]>> {
  const db = await getDatabase();

  const tasks = await db.getAllAsync<TaskListItem>(
    `
      SELECT
        t.id,
        t.title,
        t.status,
        t.phase,
        t.waiting_reason AS waitingReason,
        t.due_at AS dueAt,
        r.name AS roomName
      FROM tasks t
      INNER JOIN rooms r ON r.id = t.room_id
      WHERE t.project_id = ? AND t.deleted_at IS NULL
      ORDER BY
        CASE t.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
        t.due_at ASC,
        t.updated_at DESC
    `,
    [projectId]
  );

  const grouped: Record<string, TaskListItem[]> = {
    ideas: [],
    ready: [],
    in_progress: [],
    waiting: [],
    done: []
  };

  for (const task of tasks) {
    if (!grouped[task.status]) {
      grouped[task.status] = [];
    }
    grouped[task.status].push(task);
  }

  return grouped;
}

export async function getTaskDetail(taskId: string): Promise<TaskDetail | null> {
  const db = await getDatabase();

  const task = await db.getFirstAsync<Omit<TaskDetail, 'tradeTags' | 'customTags'>>(
    `
      SELECT
        t.id,
        t.room_id AS roomId,
        t.title,
        t.description,
        r.name AS roomName,
        t.phase,
        t.status,
        t.waiting_reason AS waitingReason,
        t.due_at AS dueAt,
        t.start_at AS startAt,
        t.priority,
        t.estimate_labor AS estimateLabor,
        t.estimate_materials AS estimateMaterials,
        t.actual_labor AS actualLabor,
        t.actual_materials AS actualMaterials
      FROM tasks t
      INNER JOIN rooms r ON r.id = t.room_id
      WHERE t.id = ?
      LIMIT 1
    `,
    [taskId]
  );

  if (!task) {
    return null;
  }

  const tags = await db.getAllAsync<{ name: string; type: string }>(
    `
      SELECT
        tg.name,
        tg.type
      FROM task_tags tt
      INNER JOIN tags tg ON tg.id = tt.tag_id
      WHERE tt.task_id = ?
      ORDER BY tg.type, tg.name
    `,
    [taskId]
  );

  return {
    ...task,
    tradeTags: tags.filter((tag) => tag.type === 'trade').map((tag) => tag.name),
    customTags: tags.filter((tag) => tag.type === 'custom').map((tag) => tag.name)
  };
}

export async function createTask(input: TaskFormInput): Promise<string> {
  validateTaskInput(input);

  const db = await getDatabase();
  const now = new Date().toISOString();
  const taskId = createId('task');

  await db.execAsync('BEGIN IMMEDIATE TRANSACTION;');
  try {
    const maxSort = await db.getFirstAsync<{ value: number }>(
      `SELECT COALESCE(MAX(sort_index), 0) + 1 AS value FROM tasks WHERE room_id = ?`,
      [input.roomId]
    );

    await db.runAsync(
      `
        INSERT INTO tasks (
          id, project_id, room_id, title, description, phase, status, waiting_reason,
          due_at, start_at, priority, sort_index, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        taskId,
        input.projectId,
        input.roomId,
        input.title.trim(),
        input.description.trim() || null,
        input.phase,
        input.status,
        input.status === 'waiting' ? input.waitingReason : null,
        input.dueAt,
        input.startAt,
        input.priority,
        Number(maxSort?.value ?? 1),
        now,
        now
      ]
    );

    await upsertTaskTags(db, taskId, input.projectId, input.tradeTags, input.customTags);
    await db.execAsync('COMMIT;');
  } catch (error) {
    await rollbackAndThrow(db, `createTask(${taskId})`, error);
  }

  await syncScheduledNotifications(input.projectId);

  return taskId;
}

export async function updateTask(taskId: string, input: TaskFormInput): Promise<void> {
  validateTaskInput(input);

  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.execAsync('BEGIN IMMEDIATE TRANSACTION;');
  try {
    await db.runAsync(
      `
        UPDATE tasks
        SET room_id = ?, title = ?, description = ?, phase = ?, status = ?, waiting_reason = ?,
            due_at = ?, start_at = ?, priority = ?, updated_at = ?
        WHERE id = ?
      `,
      [
        input.roomId,
        input.title.trim(),
        input.description.trim() || null,
        input.phase,
        input.status,
        input.status === 'waiting' ? input.waitingReason : null,
        input.dueAt,
        input.startAt,
        input.priority,
        now,
        taskId
      ]
    );

    await upsertTaskTags(db, taskId, input.projectId, input.tradeTags, input.customTags);
    await db.execAsync('COMMIT;');
  } catch (error) {
    await rollbackAndThrow(db, `updateTask(${taskId})`, error);
  }

  await syncScheduledNotifications(input.projectId);
}
