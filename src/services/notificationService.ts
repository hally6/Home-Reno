import { getDatabase } from '@/data/database';
import { createId } from '@/data/id';
import { buildScheduledReminders, type NotificationPreferences } from './notificationScheduler';

const defaultPreferences: NotificationPreferences = {
  taskDueEnabled: true,
  eventEnabled: true,
  waitingEnabled: false,
  leadMinutes: 60
};

export async function getNotificationPreferences(projectId: string): Promise<NotificationPreferences> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{
    task_due_enabled: number;
    event_enabled: number;
    waiting_enabled: number;
    lead_minutes: number;
  }>(
    `
      SELECT task_due_enabled, event_enabled, waiting_enabled, lead_minutes
      FROM notification_preferences
      WHERE project_id = ?
      LIMIT 1
    `,
    [projectId]
  );

  if (!row) {
    return defaultPreferences;
  }

  return {
    taskDueEnabled: Boolean(row.task_due_enabled),
    eventEnabled: Boolean(row.event_enabled),
    waitingEnabled: Boolean(row.waiting_enabled),
    leadMinutes: Number(row.lead_minutes ?? 60)
  };
}

export async function updateNotificationPreferences(projectId: string, prefs: NotificationPreferences): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `
      INSERT INTO notification_preferences (
        project_id, task_due_enabled, event_enabled, waiting_enabled, lead_minutes, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(project_id) DO UPDATE SET
        task_due_enabled = excluded.task_due_enabled,
        event_enabled = excluded.event_enabled,
        waiting_enabled = excluded.waiting_enabled,
        lead_minutes = excluded.lead_minutes,
        updated_at = excluded.updated_at
    `,
    [
      projectId,
      prefs.taskDueEnabled ? 1 : 0,
      prefs.eventEnabled ? 1 : 0,
      prefs.waitingEnabled ? 1 : 0,
      prefs.leadMinutes,
      now
    ]
  );
}

export async function syncScheduledNotifications(projectId: string): Promise<void> {
  const db = await getDatabase();
  const prefs = await getNotificationPreferences(projectId);
  const now = new Date();

  const tasks = await db.getAllAsync<{
    id: string;
    title: string;
    dueAt: string | null;
    status: string;
    waitingReason: string | null;
  }>(
    `
      SELECT id, title, due_at AS dueAt, status, waiting_reason AS waitingReason
      FROM tasks
      WHERE project_id = ? AND deleted_at IS NULL
    `,
    [projectId]
  );

  const events = await db.getAllAsync<{ id: string; title: string; startsAt: string }>(
    `
      SELECT id, title, starts_at AS startsAt
      FROM events
      WHERE project_id = ?
    `,
    [projectId]
  );

  const reminders = buildScheduledReminders(now, prefs, tasks, events);

  await db.execAsync('BEGIN IMMEDIATE TRANSACTION;');
  try {
    await db.runAsync(`DELETE FROM notification_queue WHERE project_id = ?`, [projectId]);
    const createdAt = now.toISOString();
    for (const reminder of reminders) {
      await db.runAsync(
        `
          INSERT INTO notification_queue (id, project_id, source_type, source_id, category, title, fire_at, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          createId('nq'),
          projectId,
          reminder.sourceType,
          reminder.sourceId,
          reminder.category,
          reminder.title,
          reminder.fireAt,
          createdAt
        ]
      );
    }
    await db.execAsync('COMMIT;');
  } catch (error) {
    await db.execAsync('ROLLBACK;');
    throw error;
  }
}

export async function cancelProjectNotifications(projectId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM notification_queue WHERE project_id = ?`, [projectId]);
}

export async function getScheduledNotificationCount(projectId: string): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: number }>(
    `SELECT COUNT(*) AS value FROM notification_queue WHERE project_id = ?`,
    [projectId]
  );
  return Number(row?.value ?? 0);
}

export async function markNotificationFired(notificationQueueId: string, firedAt: string = new Date().toISOString()): Promise<void> {
  const db = await getDatabase();
  const queueEntry = await db.getFirstAsync<{
    id: string;
    projectId: string;
    sourceType: string;
    sourceId: string;
    category: string;
    title: string;
    fireAt: string;
  }>(
    `
      SELECT
        id,
        project_id AS projectId,
        source_type AS sourceType,
        source_id AS sourceId,
        category,
        title,
        fire_at AS fireAt
      FROM notification_queue
      WHERE id = ?
      LIMIT 1
    `,
    [notificationQueueId]
  );

  if (!queueEntry) {
    return;
  }

  const recordedAt = new Date().toISOString();
  await db.execAsync('BEGIN IMMEDIATE TRANSACTION;');
  try {
    await db.runAsync(
      `
        INSERT INTO notification_history (
          id, project_id, queue_id, source_type, source_id, category, title, fire_at, fired_at, recorded_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        createId('nh'),
        queueEntry.projectId,
        queueEntry.id,
        queueEntry.sourceType,
        queueEntry.sourceId,
        queueEntry.category,
        queueEntry.title,
        queueEntry.fireAt,
        firedAt,
        recordedAt
      ]
    );
    await db.runAsync(`DELETE FROM notification_queue WHERE id = ?`, [notificationQueueId]);
    await db.runAsync(
      `
        DELETE FROM notification_history
        WHERE project_id = ?
          AND id NOT IN (
            SELECT id
            FROM notification_history
            WHERE project_id = ?
            ORDER BY fired_at DESC, recorded_at DESC
            LIMIT 1000
          )
      `,
      [queueEntry.projectId, queueEntry.projectId]
    );
    await db.execAsync('COMMIT;');
  } catch (error) {
    await db.execAsync('ROLLBACK;');
    throw error;
  }
}

export async function getFiredNotificationCount(projectId: string): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: number }>(
    `SELECT COUNT(*) AS value FROM notification_history WHERE project_id = ?`,
    [projectId]
  );
  return Number(row?.value ?? 0);
}
