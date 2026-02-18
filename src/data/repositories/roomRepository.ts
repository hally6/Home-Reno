import { getDatabase } from '@/data/database';
import { createId } from '@/data/id';
import { syncScheduledNotifications } from '@/services/notificationService';
import { assertMaxLength, INPUT_LIMITS } from './inputLimits';
import { rollbackAndThrow } from './transactionError';

export type RoomListItem = {
  id: string;
  name: string;
  type: string;
  floor: string | null;
  status: string;
  blockedCount: number;
  doneCount: number;
  totalCount: number;
  nextTaskTitle: string | null;
};

export type RoomTaskItem = {
  id: string;
  title: string;
  phase: string;
  status: string;
  waitingReason: string | null;
  dueAt: string | null;
};

export type RoomDetailData = {
  id: string;
  name: string;
  type: string;
  floor: string | null;
  budgetPlanned: number;
  budgetActual: number;
  tasksByPhase: Record<string, RoomTaskItem[]>;
  attachments: Array<{
    id: string;
    kind: string;
    uri: string;
    fileName: string | null;
    createdAt: string;
  }>;
};

export type RoomFormInput = {
  projectId: string;
  name: string;
  type: string;
  floor: string | null;
  budgetPlanned: number;
};

function validateRoomInput(input: Omit<RoomFormInput, 'projectId'>): void {
  if (!input.name.trim()) {
    throw new Error('Room name is required');
  }
  assertMaxLength(input.name, INPUT_LIMITS.roomName, 'Room name');
  assertMaxLength(input.type, INPUT_LIMITS.roomType, 'Room type');
  assertMaxLength(input.floor, INPUT_LIMITS.roomFloor, 'Room floor');
}

export async function getRoomList(projectId: string): Promise<RoomListItem[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<RoomListItem>(
    `
      SELECT
        r.id,
        r.name,
        r.type,
        r.floor,
        r.status,
        SUM(CASE WHEN t.status = 'waiting' THEN 1 ELSE 0 END) AS blockedCount,
        SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS doneCount,
        COUNT(t.id) AS totalCount,
        (
          SELECT tx.title
          FROM tasks tx
          WHERE tx.room_id = r.id AND tx.deleted_at IS NULL AND tx.status != 'done'
          ORDER BY
            CASE tx.status
              WHEN 'in_progress' THEN 1
              WHEN 'ready' THEN 2
              WHEN 'waiting' THEN 3
              WHEN 'ideas' THEN 4
              ELSE 5
            END,
            tx.due_at ASC
          LIMIT 1
        ) AS nextTaskTitle
      FROM rooms r
      LEFT JOIN tasks t ON t.room_id = r.id AND t.deleted_at IS NULL
      WHERE r.project_id = ?
      GROUP BY r.id
      ORDER BY COALESCE(r.floor, '') ASC, r.order_index ASC
    `,
    [projectId]
  );

  return rows.map((row) => ({
    ...row,
    blockedCount: Number(row.blockedCount ?? 0),
    doneCount: Number(row.doneCount ?? 0),
    totalCount: Number(row.totalCount ?? 0)
  }));
}

export async function getRoomDetail(roomId: string): Promise<RoomDetailData | null> {
  const db = await getDatabase();

  const room = await db.getFirstAsync<{
    id: string;
    name: string;
    type: string;
    floor: string | null;
    budgetPlanned: number;
    budgetActual: number;
  }>(
    `
      SELECT
        r.id,
        r.name,
        r.type,
        r.floor,
        r.budget_planned AS budgetPlanned,
        COALESCE((
          SELECT SUM(e.amount + COALESCE(e.tax_amount, 0))
          FROM expenses e
          WHERE e.room_id = r.id
        ), 0) AS budgetActual
      FROM rooms r
      WHERE r.id = ?
      LIMIT 1
    `,
    [roomId]
  );

  if (!room) {
    return null;
  }

  const tasks = await db.getAllAsync<RoomTaskItem>(
    `
      SELECT
        t.id,
        t.title,
        t.phase,
        t.status,
        t.waiting_reason AS waitingReason,
        t.due_at AS dueAt
      FROM tasks t
      WHERE t.room_id = ? AND t.deleted_at IS NULL
      ORDER BY
        CASE t.phase
          WHEN 'plan' THEN 1
          WHEN 'buy' THEN 2
          WHEN 'prep' THEN 3
          WHEN 'install' THEN 4
          WHEN 'finish' THEN 5
          WHEN 'inspect_snag' THEN 6
          ELSE 7
        END,
        CASE t.status WHEN 'done' THEN 2 ELSE 1 END,
        t.due_at ASC,
        t.sort_index ASC
    `,
    [roomId]
  );

  const grouped: Record<string, RoomTaskItem[]> = {
    plan: [],
    buy: [],
    prep: [],
    install: [],
    finish: [],
    inspect_snag: []
  };

  for (const task of tasks) {
    if (!grouped[task.phase]) {
      grouped[task.phase] = [];
    }
    grouped[task.phase].push(task);
  }

  const attachments = await db.getAllAsync<{
    id: string;
    kind: string;
    uri: string;
    fileName: string | null;
    createdAt: string;
  }>(
    `
      SELECT
        id,
        kind,
        uri,
        file_name AS fileName,
        created_at AS createdAt
      FROM attachments
      WHERE room_id = ?
      ORDER BY created_at DESC
    `,
    [roomId]
  );

  return {
    ...room,
    budgetPlanned: Number(room.budgetPlanned ?? 0),
    budgetActual: Number(room.budgetActual ?? 0),
    tasksByPhase: grouped,
    attachments
  };
}

export async function getRoomForEdit(
  roomId: string
): Promise<{ id: string; name: string; type: string; floor: string | null; budgetPlanned: number } | null> {
  const db = await getDatabase();
  const room = await db.getFirstAsync<{
    id: string;
    name: string;
    type: string;
    floor: string | null;
    budgetPlanned: number;
  }>(`SELECT id, name, type, floor, budget_planned AS budgetPlanned FROM rooms WHERE id = ? LIMIT 1`, [roomId]);
  return room ?? null;
}

export async function createRoom(input: RoomFormInput): Promise<string> {
  validateRoomInput(input);
  const db = await getDatabase();
  const now = new Date().toISOString();
  const roomId = createId('room');
  const maxOrder = await db.getFirstAsync<{ value: number }>(
    `SELECT COALESCE(MAX(order_index), 0) + 1 AS value FROM rooms WHERE project_id = ?`,
    [input.projectId]
  );

  await db.runAsync(
    `
      INSERT INTO rooms (id, project_id, name, type, floor, order_index, status, budget_planned, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
    `,
    [
      roomId,
      input.projectId,
      input.name.trim(),
      input.type,
      input.floor,
      Number(maxOrder?.value ?? 1),
      input.budgetPlanned,
      now,
      now
    ]
  );

  return roomId;
}

export async function updateRoom(roomId: string, input: Omit<RoomFormInput, 'projectId'>): Promise<void> {
  validateRoomInput(input);
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.runAsync(
    `
      UPDATE rooms
      SET name = ?, type = ?, floor = ?, budget_planned = ?, updated_at = ?
      WHERE id = ?
    `,
    [input.name.trim(), input.type, input.floor, input.budgetPlanned, now, roomId]
  );
}

export async function deleteRoom(projectId: string, roomId: string): Promise<void> {
  const db = await getDatabase();

  await db.execAsync('BEGIN IMMEDIATE TRANSACTION;');
  try {
    await db.runAsync(
      `
        DELETE FROM task_tags
        WHERE task_id IN (SELECT id FROM tasks WHERE room_id = ?)
      `,
      [roomId]
    );

    await db.runAsync(
      `
        DELETE FROM attachments
        WHERE room_id = ?
           OR task_id IN (SELECT id FROM tasks WHERE room_id = ?)
           OR expense_id IN (SELECT id FROM expenses WHERE room_id = ?)
      `,
      [roomId, roomId, roomId]
    );

    await db.runAsync(`DELETE FROM builder_quotes WHERE room_id = ? AND project_id = ?`, [roomId, projectId]);

    await db.runAsync(
      `
        DELETE FROM events
        WHERE room_id = ?
           OR task_id IN (SELECT id FROM tasks WHERE room_id = ?)
      `,
      [roomId, roomId]
    );

    await db.runAsync(
      `
        DELETE FROM expenses
        WHERE room_id = ?
           OR task_id IN (SELECT id FROM tasks WHERE room_id = ?)
      `,
      [roomId, roomId]
    );

    await db.runAsync(`DELETE FROM tasks WHERE room_id = ?`, [roomId]);
    await db.runAsync(`DELETE FROM rooms WHERE id = ? AND project_id = ?`, [roomId, projectId]);

    await db.runAsync(
      `
        DELETE FROM tags
        WHERE project_id = ?
          AND id NOT IN (SELECT tag_id FROM task_tags)
      `,
      [projectId]
    );

    await db.execAsync('COMMIT;');
  } catch (error) {
    await rollbackAndThrow(db, `deleteRoom(${roomId})`, error);
  }

  await syncScheduledNotifications(projectId);
}
