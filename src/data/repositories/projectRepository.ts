import { getDatabase } from '@/data/database';
import { createId } from '@/data/id';
import { assertMaxLength, INPUT_LIMITS } from './inputLimits';
import { rollbackAndThrow } from './transactionError';

export type ProjectSummary = {
  id: string;
  name: string;
  currency: string;
};

export type ProjectSettings = {
  id: string;
  name: string;
  currency: string;
  address: string | null;
  startDate: string | null;
  targetEndDate: string | null;
  homeLayout: 'standard' | 'tile';
  themePreference: 'system' | 'light' | 'dark';
};

export async function getProjectById(projectId: string): Promise<ProjectSummary | null> {
  const db = await getDatabase();
  const project = await db.getFirstAsync<ProjectSummary>(
    `SELECT id, name, currency FROM projects WHERE id = ? LIMIT 1`,
    [projectId]
  );

  return project ?? null;
}

export async function getProjectSettings(projectId: string): Promise<ProjectSettings | null> {
  const db = await getDatabase();
  const project = await db.getFirstAsync<ProjectSettings>(
    `
      SELECT
        id,
        name,
        currency,
        address,
        start_date AS startDate,
        target_end_date AS targetEndDate,
        home_layout AS homeLayout,
        theme_preference AS themePreference
      FROM projects
      WHERE id = ?
      LIMIT 1
    `,
    [projectId]
  );

  return project ?? null;
}

export async function updateProjectSettings(
  projectId: string,
  input: {
    name: string;
    currency: string;
    address: string | null;
    startDate: string | null;
    targetEndDate: string | null;
    homeLayout: 'standard' | 'tile';
    themePreference: 'system' | 'light' | 'dark';
  }
): Promise<void> {
  if (!input.name.trim()) {
    throw new Error('Project name is required');
  }
  assertMaxLength(input.name, INPUT_LIMITS.projectName, 'Project name');
  assertMaxLength(input.currency, INPUT_LIMITS.projectCurrency, 'Currency');
  assertMaxLength(input.address, INPUT_LIMITS.projectAddress, 'Address');
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.runAsync(
    `
      UPDATE projects
      SET
        name = ?,
        currency = ?,
        address = ?,
        start_date = ?,
        target_end_date = ?,
        home_layout = ?,
        theme_preference = ?,
        updated_at = ?
      WHERE id = ?
    `,
    [
      input.name,
      input.currency,
      input.address,
      input.startDate,
      input.targetEndDate,
      input.homeLayout,
      input.themePreference,
      now,
      projectId
    ]
  );
}

export async function listProjectRooms(projectId: string): Promise<Array<{ id: string; name: string }>> {
  const db = await getDatabase();
  return db.getAllAsync<{ id: string; name: string }>(
    `SELECT id, name FROM rooms WHERE project_id = ? ORDER BY order_index ASC`,
    [projectId]
  );
}

export async function listProjectTasks(projectId: string): Promise<Array<{ id: string; title: string }>> {
  const db = await getDatabase();
  return db.getAllAsync<{ id: string; title: string }>(
    `SELECT id, title FROM tasks WHERE project_id = ? AND deleted_at IS NULL ORDER BY updated_at DESC LIMIT 100`,
    [projectId]
  );
}

export async function listProjectTasksForExpense(
  projectId: string
): Promise<Array<{ id: string; title: string; roomId: string }>> {
  const db = await getDatabase();
  return db.getAllAsync<{ id: string; title: string; roomId: string }>(
    `
      SELECT id, title, room_id AS roomId
      FROM tasks
      WHERE project_id = ? AND deleted_at IS NULL
      ORDER BY updated_at DESC
      LIMIT 200
    `,
    [projectId]
  );
}

export async function createQuickRoom(projectId: string, name: string): Promise<string> {
  if (!name.trim()) {
    throw new Error('Room name is required');
  }
  assertMaxLength(name, INPUT_LIMITS.roomName, 'Room name');
  const db = await getDatabase();
  const now = new Date().toISOString();
  const roomId = createId('room');
  const maxOrder = await db.getFirstAsync<{ value: number }>(
    `SELECT COALESCE(MAX(order_index), 0) + 1 AS value FROM rooms WHERE project_id = ?`,
    [projectId]
  );

  await db.runAsync(
    `
      INSERT INTO rooms (id, project_id, name, type, order_index, status, budget_planned, created_at, updated_at)
      VALUES (?, ?, ?, 'other', ?, 'active', 0, ?, ?)
    `,
    [roomId, projectId, name, Number(maxOrder?.value ?? 1), now, now]
  );

  return roomId;
}

export async function clearProjectData(projectId: string): Promise<void> {
  const db = await getDatabase();
  await db.execAsync('BEGIN IMMEDIATE TRANSACTION;');
  try {
    await db.runAsync(
      `
        DELETE FROM task_tags
        WHERE task_id IN (SELECT id FROM tasks WHERE project_id = ?)
           OR tag_id IN (SELECT id FROM tags WHERE project_id = ?)
      `,
      [projectId, projectId]
    );
    await db.runAsync(`DELETE FROM attachments WHERE project_id = ?`, [projectId]);
    await db.runAsync(`DELETE FROM expenses WHERE project_id = ?`, [projectId]);
    await db.runAsync(`DELETE FROM events WHERE project_id = ?`, [projectId]);
    await db.runAsync(`DELETE FROM tasks WHERE project_id = ?`, [projectId]);
    await db.runAsync(`DELETE FROM tags WHERE project_id = ?`, [projectId]);
    await db.runAsync(`DELETE FROM builder_quotes WHERE project_id = ?`, [projectId]);
    await db.runAsync(`DELETE FROM rooms WHERE project_id = ?`, [projectId]);
    await db.runAsync(`DELETE FROM notification_queue WHERE project_id = ?`, [projectId]);
    await db.runAsync(`DELETE FROM notification_preferences WHERE project_id = ?`, [projectId]);
    await db.runAsync(
      `
        UPDATE projects
        SET budget_planned_total = 0, updated_at = ?
        WHERE id = ?
      `,
      [new Date().toISOString(), projectId]
    );
    await db.execAsync('COMMIT;');
  } catch (error) {
    await rollbackAndThrow(db, `clearProjectData(${projectId})`, error);
  }
}
