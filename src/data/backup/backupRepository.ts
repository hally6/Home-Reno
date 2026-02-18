import { getDatabase } from '@/data/database';
import { createId } from '@/data/id';
import { validateBackupFile } from './backupValidation';
import type { BackupFileV1, BackupPayload, BackupRow, BackupValidationResult } from './types';

const APP_VERSION = '0.1.0';

const backupTables = {
  projects: 'projects',
  rooms: 'rooms',
  tasks: 'tasks',
  events: 'events',
  expenses: 'expenses',
  builder_quotes: 'builder_quotes',
  attachments: 'attachments',
  tags: 'tags',
  task_tags: 'task_tags'
} as const;

async function listRows(
  db: Awaited<ReturnType<typeof getDatabase>>,
  projectId: string,
  table: keyof BackupPayload
): Promise<BackupRow[]> {
  if (table === 'projects') {
    const rows = await db.getAllAsync<BackupRow>(`SELECT * FROM projects WHERE id = ? ORDER BY id`, [projectId]);
    return rows;
  }

  if (table === 'task_tags') {
    const rows = await db.getAllAsync<BackupRow>(
      `
        SELECT tt.task_id, tt.tag_id
        FROM task_tags tt
        INNER JOIN tasks t ON t.id = tt.task_id
        WHERE t.project_id = ?
        ORDER BY tt.task_id, tt.tag_id
      `,
      [projectId]
    );
    return rows;
  }

  switch (table) {
    case 'rooms':
    case 'tasks':
    case 'events':
    case 'expenses':
    case 'builder_quotes':
    case 'attachments':
    case 'tags': {
      return db.getAllAsync<BackupRow>(`SELECT * FROM ${backupTables[table]} WHERE project_id = ? ORDER BY id`, [
        projectId
      ]);
    }
    default:
      return [];
  }
}

function buildInsert(table: keyof BackupPayload, row: BackupRow): { sql: string; params: Array<string | number | null> } {
  const columns = Object.keys(row);
  const placeholders = columns.map(() => '?').join(', ');
  const sql = `INSERT INTO ${backupTables[table]} (${columns.join(', ')}) VALUES (${placeholders})`;
  const params = columns.map((column) => row[column] ?? null);
  return { sql, params };
}

async function insertRows(table: keyof BackupPayload, rows: BackupRow[]): Promise<void> {
  const db = await getDatabase();
  for (const row of rows) {
    const { sql, params } = buildInsert(table, row);
    await db.runAsync(sql, params);
  }
}

export async function exportProjectBackup(projectId: string): Promise<BackupFileV1> {
  const db = await getDatabase();
  await db.execAsync('BEGIN TRANSACTION;');
  try {
    const payload: BackupPayload = {
      projects: await listRows(db, projectId, 'projects'),
      rooms: await listRows(db, projectId, 'rooms'),
      tasks: await listRows(db, projectId, 'tasks'),
      events: await listRows(db, projectId, 'events'),
      expenses: await listRows(db, projectId, 'expenses'),
      builder_quotes: await listRows(db, projectId, 'builder_quotes'),
      attachments: await listRows(db, projectId, 'attachments'),
      tags: await listRows(db, projectId, 'tags'),
      task_tags: await listRows(db, projectId, 'task_tags')
    };
    await db.execAsync('COMMIT;');

    return {
      schemaVersion: '1',
      exportedAt: new Date().toISOString(),
      appVersion: APP_VERSION,
      projectId,
      payload,
      warnings: ['Backup data is unencrypted. Store and share it carefully.']
    };
  } catch (error) {
    await db.execAsync('ROLLBACK;');
    throw error;
  }
}

export { validateBackupFile };
export type { BackupValidationResult };

async function storePreRestoreSnapshot(
  db: Awaited<ReturnType<typeof getDatabase>>,
  projectId: string,
  backup: BackupFileV1,
  reason: string
): Promise<void> {
  const snapshotId = createId('backup_snapshot');
  await db.runAsync(
    `
      INSERT INTO backup_snapshots (id, project_id, reason, backup_json, created_at)
      VALUES (?, ?, ?, ?, ?)
    `,
    [snapshotId, projectId, reason, JSON.stringify(backup), new Date().toISOString()]
  );
}

export async function listPreRestoreSnapshots(projectId: string): Promise<Array<{ id: string; createdAt: string }>> {
  const db = await getDatabase();
  return db.getAllAsync<{ id: string; createdAt: string }>(
    `
      SELECT id, created_at AS createdAt
      FROM backup_snapshots
      WHERE project_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `,
    [projectId]
  );
}

export async function restoreProjectBackup(projectId: string, input: unknown): Promise<void> {
  const validation = validateBackupFile(input);
  if (!validation.ok) {
    throw new Error(validation.reason);
  }

  const backup = validation.backup;
  if (backup.projectId !== projectId) {
    throw new Error('Backup projectId does not match active project');
  }

  const db = await getDatabase();
  const preRestoreBackup = await exportProjectBackup(projectId);
  await db.execAsync('BEGIN IMMEDIATE TRANSACTION;');
  try {
    await storePreRestoreSnapshot(db, projectId, preRestoreBackup, 'pre_restore');

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
    await db.runAsync(`DELETE FROM builder_quotes WHERE project_id = ?`, [projectId]);
    await db.runAsync(`DELETE FROM events WHERE project_id = ?`, [projectId]);
    await db.runAsync(`DELETE FROM tasks WHERE project_id = ?`, [projectId]);
    await db.runAsync(`DELETE FROM tags WHERE project_id = ?`, [projectId]);
    await db.runAsync(`DELETE FROM rooms WHERE project_id = ?`, [projectId]);
    await db.runAsync(`DELETE FROM projects WHERE id = ?`, [projectId]);

    await insertRows('projects', backup.payload.projects);
    await insertRows('rooms', backup.payload.rooms);
    await insertRows('tasks', backup.payload.tasks);
    await insertRows('events', backup.payload.events);
    await insertRows('expenses', backup.payload.expenses);
    await insertRows('builder_quotes', backup.payload.builder_quotes);
    await insertRows('attachments', backup.payload.attachments);
    await insertRows('tags', backup.payload.tags);
    await insertRows('task_tags', backup.payload.task_tags);

    await db.execAsync('COMMIT;');
  } catch (error) {
    await db.execAsync('ROLLBACK;');
    throw error;
  }
}
