import { getDatabase } from '@/data/database';
import { createId } from '@/data/id';
import { validateEventInput } from './eventRules';
import { syncScheduledNotifications } from '@/services/notificationService';

export type AgendaItem = {
  itemType: 'event' | 'task';
  id: string;
  title: string;
  subtype: string;
  startsAt: string;
  roomName: string | null;
  linkedTaskId: string | null;
  isAllDay: number;
};

export type CursorPage<T> = {
  items: T[];
  nextCursor: string | null;
};

export type EventDetail = {
  id: string;
  title: string;
  type: string;
  startsAt: string;
  endsAt: string | null;
  isAllDay: number;
  roomId: string | null;
  roomName: string | null;
  linkedTaskId: string | null;
  contactName: string | null;
  contactPhone: string | null;
  company: string | null;
};

export type EventFormInput = {
  projectId: string;
  roomId: string | null;
  taskId: string | null;
  type: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  isAllDay: boolean;
  company: string;
  contactName: string;
  contactPhone: string;
};

function agendaCursorOf(item: AgendaItem): string {
  return `${item.startsAt}|${item.itemType}|${item.id}`;
}

export async function getAgendaPage(
  projectId: string,
  options?: { startIso?: string; endIso?: string; limit?: number; cursor?: string | null }
): Promise<CursorPage<AgendaItem>> {
  const db = await getDatabase();
  const limit = Math.max(1, Math.min(200, Math.floor(options?.limit ?? 60)));
  const startIso = options?.startIso ?? null;
  const endIso = options?.endIso ?? null;
  const cursor = options?.cursor ?? null;

  const items = await db.getAllAsync<AgendaItem>(
    `
      WITH combined AS (
        SELECT
          'event' AS itemType,
          e.id AS id,
          e.title AS title,
          e.type AS subtype,
          e.starts_at AS startsAt,
          r.name AS roomName,
          e.task_id AS linkedTaskId,
          e.is_all_day AS isAllDay
        FROM events e
        LEFT JOIN rooms r ON r.id = e.room_id
        WHERE e.project_id = ?
          AND (? IS NULL OR e.starts_at >= ?)
          AND (? IS NULL OR e.starts_at <= ?)

        UNION ALL

        SELECT
          'task' AS itemType,
          t.id AS id,
          t.title AS title,
          t.status AS subtype,
          COALESCE(t.start_at, t.due_at) AS startsAt,
          r.name AS roomName,
          t.id AS linkedTaskId,
          0 AS isAllDay
        FROM tasks t
        LEFT JOIN rooms r ON r.id = t.room_id
        WHERE t.project_id = ?
          AND t.deleted_at IS NULL
          AND COALESCE(t.start_at, t.due_at) IS NOT NULL
          AND (? IS NULL OR COALESCE(t.start_at, t.due_at) >= ?)
          AND (? IS NULL OR COALESCE(t.start_at, t.due_at) <= ?)
      )
      SELECT itemType, id, title, subtype, startsAt, roomName, linkedTaskId, isAllDay
      FROM combined
      WHERE (? IS NULL OR (startsAt || '|' || itemType || '|' || id) > ?)
      ORDER BY startsAt ASC, itemType ASC, id ASC
      LIMIT ?
    `,
    [
      projectId,
      startIso,
      startIso,
      endIso,
      endIso,
      projectId,
      startIso,
      startIso,
      endIso,
      endIso,
      cursor,
      cursor,
      limit
    ]
  );

  return {
    items,
    nextCursor: items.length === limit ? agendaCursorOf(items[items.length - 1]) : null
  };
}

export async function getAgenda(projectId: string): Promise<AgendaItem[]> {
  const page = await getAgendaPage(projectId, { limit: 200 });
  return page.items;
}

export async function getAgendaRange(projectId: string, startIso: string, endIso: string): Promise<AgendaItem[]> {
  const page = await getAgendaPage(projectId, { startIso, endIso, limit: 200 });
  return page.items;
}

export async function getEventDetail(eventId: string): Promise<EventDetail | null> {
  const db = await getDatabase();

  const event = await db.getFirstAsync<EventDetail>(
    `
      SELECT
        e.id,
        e.title,
        e.type,
        e.starts_at AS startsAt,
        e.ends_at AS endsAt,
        e.is_all_day AS isAllDay,
        e.room_id AS roomId,
        r.name AS roomName,
        e.task_id AS linkedTaskId,
        e.contact_name AS contactName,
        e.contact_phone AS contactPhone,
        e.company AS company
      FROM events e
      LEFT JOIN rooms r ON r.id = e.room_id
      WHERE e.id = ?
      LIMIT 1
    `,
    [eventId]
  );

  return event ?? null;
}

export async function createEvent(input: EventFormInput): Promise<string> {
  validateEventInput(input);
  const db = await getDatabase();
  const now = new Date().toISOString();
  const eventId = createId('event');

  await db.runAsync(
    `
      INSERT INTO events (
        id, project_id, room_id, task_id, type, title, starts_at, ends_at,
        is_all_day, company, contact_name, contact_phone, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      eventId,
      input.projectId,
      input.roomId,
      input.taskId,
      input.type,
      input.title.trim(),
      input.startsAt,
      input.endsAt,
      input.isAllDay ? 1 : 0,
      input.company.trim() || null,
      input.contactName.trim() || null,
      input.contactPhone.trim() || null,
      now,
      now
    ]
  );
  await syncScheduledNotifications(input.projectId);

  return eventId;
}

export async function updateEvent(eventId: string, input: EventFormInput): Promise<void> {
  validateEventInput(input);
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.runAsync(
    `
      UPDATE events
      SET room_id = ?, task_id = ?, type = ?, title = ?, starts_at = ?, ends_at = ?,
          is_all_day = ?, company = ?, contact_name = ?, contact_phone = ?, updated_at = ?
      WHERE id = ?
    `,
    [
      input.roomId,
      input.taskId,
      input.type,
      input.title.trim(),
      input.startsAt,
      input.endsAt,
      input.isAllDay ? 1 : 0,
      input.company.trim() || null,
      input.contactName.trim() || null,
      input.contactPhone.trim() || null,
      now,
      eventId
    ]
  );
  await syncScheduledNotifications(input.projectId);
}
