import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

let dbInstance: SQLite.SQLiteDatabase | null = null;
const OPEN_TIMEOUT_MS = 15000;
const QUERY_TIMEOUT_MS = 15000;

async function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstance) {
    const openedDb = await withTimeout(
      SQLite.openDatabaseAsync('home_planner.db'),
      OPEN_TIMEOUT_MS,
      'Opening local database timed out. Try refreshing the page.'
    );
    dbInstance = wrapDatabaseWithTimeouts(openedDb);
  }
  return dbInstance;
}

function wrapDatabaseWithTimeouts(db: SQLite.SQLiteDatabase): SQLite.SQLiteDatabase {
  const marker = '__queryTimeoutWrapped';
  const wrappedDb = db as SQLite.SQLiteDatabase & { __queryTimeoutWrapped?: boolean };
  if (wrappedDb.__queryTimeoutWrapped) {
    return db;
  }

  const wrap = (methodName: 'runAsync' | 'execAsync' | 'getFirstAsync' | 'getAllAsync'): void => {
    const original = (db as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>)[methodName].bind(db);
    (db as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>)[methodName] = (...args: unknown[]) =>
      withTimeout(original(...args), QUERY_TIMEOUT_MS, `Database query timed out while running ${methodName}.`);
  };

  wrap('runAsync');
  wrap('execAsync');
  wrap('getFirstAsync');
  wrap('getAllAsync');

  wrappedDb.__queryTimeoutWrapped = true;
  return db;
}

async function setupSearchFts(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE VIRTUAL TABLE IF NOT EXISTS search_fts
    USING fts5(
      project_id UNINDEXED,
      entity_kind UNINDEXED,
      entity_id UNINDEXED,
      content,
      tokenize = 'unicode61 remove_diacritics 2'
    );

    CREATE TRIGGER IF NOT EXISTS trg_search_fts_tasks_insert
    AFTER INSERT ON tasks
    BEGIN
      INSERT INTO search_fts (project_id, entity_kind, entity_id, content)
      VALUES (
        NEW.project_id,
        'task',
        NEW.id,
        COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.description, '')
      );
    END;

    CREATE TRIGGER IF NOT EXISTS trg_search_fts_tasks_update
    AFTER UPDATE ON tasks
    BEGIN
      DELETE FROM search_fts WHERE entity_kind = 'task' AND entity_id = NEW.id;
      INSERT INTO search_fts (project_id, entity_kind, entity_id, content)
      VALUES (
        NEW.project_id,
        'task',
        NEW.id,
        COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.description, '')
      );
    END;

    CREATE TRIGGER IF NOT EXISTS trg_search_fts_tasks_delete
    AFTER DELETE ON tasks
    BEGIN
      DELETE FROM search_fts WHERE entity_kind = 'task' AND entity_id = OLD.id;
    END;

    CREATE TRIGGER IF NOT EXISTS trg_search_fts_events_insert
    AFTER INSERT ON events
    BEGIN
      INSERT INTO search_fts (project_id, entity_kind, entity_id, content)
      VALUES (
        NEW.project_id,
        'event',
        NEW.id,
        COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.description, '') || ' ' || COALESCE(NEW.type, '')
      );
    END;

    CREATE TRIGGER IF NOT EXISTS trg_search_fts_events_update
    AFTER UPDATE ON events
    BEGIN
      DELETE FROM search_fts WHERE entity_kind = 'event' AND entity_id = NEW.id;
      INSERT INTO search_fts (project_id, entity_kind, entity_id, content)
      VALUES (
        NEW.project_id,
        'event',
        NEW.id,
        COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.description, '') || ' ' || COALESCE(NEW.type, '')
      );
    END;

    CREATE TRIGGER IF NOT EXISTS trg_search_fts_events_delete
    AFTER DELETE ON events
    BEGIN
      DELETE FROM search_fts WHERE entity_kind = 'event' AND entity_id = OLD.id;
    END;

    CREATE TRIGGER IF NOT EXISTS trg_search_fts_expenses_insert
    AFTER INSERT ON expenses
    BEGIN
      INSERT INTO search_fts (project_id, entity_kind, entity_id, content)
      VALUES (
        NEW.project_id,
        'expense',
        NEW.id,
        COALESCE(NEW.category, '') || ' ' || COALESCE(NEW.vendor, '')
      );
    END;

    CREATE TRIGGER IF NOT EXISTS trg_search_fts_expenses_update
    AFTER UPDATE ON expenses
    BEGIN
      DELETE FROM search_fts WHERE entity_kind = 'expense' AND entity_id = NEW.id;
      INSERT INTO search_fts (project_id, entity_kind, entity_id, content)
      VALUES (
        NEW.project_id,
        'expense',
        NEW.id,
        COALESCE(NEW.category, '') || ' ' || COALESCE(NEW.vendor, '')
      );
    END;

    CREATE TRIGGER IF NOT EXISTS trg_search_fts_expenses_delete
    AFTER DELETE ON expenses
    BEGIN
      DELETE FROM search_fts WHERE entity_kind = 'expense' AND entity_id = OLD.id;
    END;
  `);

  await db.execAsync(`DELETE FROM search_fts;`);
  await db.execAsync(`
    INSERT INTO search_fts (project_id, entity_kind, entity_id, content)
    SELECT
      project_id,
      'task',
      id,
      COALESCE(title, '') || ' ' || COALESCE(description, '')
    FROM tasks;
  `);
  await db.execAsync(`
    INSERT INTO search_fts (project_id, entity_kind, entity_id, content)
    SELECT
      project_id,
      'event',
      id,
      COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(type, '')
    FROM events;
  `);
  await db.execAsync(`
    INSERT INTO search_fts (project_id, entity_kind, entity_id, content)
    SELECT
      project_id,
      'expense',
      id,
      COALESCE(category, '') || ' ' || COALESCE(vendor, '')
    FROM expenses;
  `);
}

export async function initDatabase(): Promise<void> {
  const db = await getDb();

  try {
    await db.execAsync(`PRAGMA foreign_keys = ON;`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to enable foreign key enforcement: ${message}`);
  }

  if (Platform.OS !== 'web') {
    try {
      await db.execAsync(`PRAGMA journal_mode = WAL;`);
    } catch {
      // Continue even if pragma is unsupported on a given platform.
    }
  }

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      address TEXT,
      start_date TEXT,
      target_end_date TEXT,
      currency TEXT NOT NULL,
      home_layout TEXT NOT NULL DEFAULT 'standard',
      theme_preference TEXT NOT NULL DEFAULT 'system',
      budget_planned_total REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      archived_at TEXT
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY NOT NULL,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      floor TEXT,
      order_index INTEGER NOT NULL,
      status TEXT NOT NULL,
      budget_planned REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY NOT NULL,
      project_id TEXT NOT NULL,
      room_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      phase TEXT NOT NULL,
      status TEXT NOT NULL,
      waiting_reason TEXT,
      due_at TEXT,
      start_at TEXT,
      completed_at TEXT,
      priority TEXT NOT NULL DEFAULT 'medium',
      estimate_labor REAL,
      estimate_materials REAL,
      actual_labor REAL,
      actual_materials REAL,
      sort_index INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (room_id) REFERENCES rooms(id)
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY NOT NULL,
      project_id TEXT NOT NULL,
      room_id TEXT,
      task_id TEXT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      starts_at TEXT NOT NULL,
      ends_at TEXT,
      is_all_day INTEGER NOT NULL DEFAULT 0,
      company TEXT,
      contact_name TEXT,
      contact_phone TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (room_id) REFERENCES rooms(id),
      FOREIGN KEY (task_id) REFERENCES tasks(id)
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY NOT NULL,
      project_id TEXT NOT NULL,
      room_id TEXT,
      task_id TEXT,
      category TEXT NOT NULL,
      vendor TEXT,
      amount REAL NOT NULL,
      tax_amount REAL,
      incurred_on TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (room_id) REFERENCES rooms(id),
      FOREIGN KEY (task_id) REFERENCES tasks(id)
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY NOT NULL,
      project_id TEXT NOT NULL,
      room_id TEXT,
      task_id TEXT,
      expense_id TEXT,
      kind TEXT NOT NULL,
      uri TEXT NOT NULL,
      file_name TEXT,
      mime_type TEXT,
      size_bytes INTEGER,
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (room_id) REFERENCES rooms(id),
      FOREIGN KEY (task_id) REFERENCES tasks(id),
      FOREIGN KEY (expense_id) REFERENCES expenses(id)
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY NOT NULL,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      color_token TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS task_tags (
      task_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (task_id, tag_id),
      FOREIGN KEY (task_id) REFERENCES tasks(id),
      FOREIGN KEY (tag_id) REFERENCES tags(id)
    );

    CREATE TABLE IF NOT EXISTS notification_preferences (
      project_id TEXT PRIMARY KEY NOT NULL,
      task_due_enabled INTEGER NOT NULL DEFAULT 1,
      event_enabled INTEGER NOT NULL DEFAULT 1,
      waiting_enabled INTEGER NOT NULL DEFAULT 0,
      lead_minutes INTEGER NOT NULL DEFAULT 60,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS notification_queue (
      id TEXT PRIMARY KEY NOT NULL,
      project_id TEXT NOT NULL,
      source_type TEXT NOT NULL,
      source_id TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      fire_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS notification_history (
      id TEXT PRIMARY KEY NOT NULL,
      project_id TEXT NOT NULL,
      queue_id TEXT,
      source_type TEXT NOT NULL,
      source_id TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      fire_at TEXT NOT NULL,
      fired_at TEXT NOT NULL,
      recorded_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS builder_quotes (
      id TEXT PRIMARY KEY NOT NULL,
      project_id TEXT NOT NULL,
      room_id TEXT,
      title TEXT NOT NULL,
      scope TEXT,
      builder_name TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'received',
      notes TEXT,
      selected_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (room_id) REFERENCES rooms(id)
    );

    CREATE TABLE IF NOT EXISTS backup_snapshots (
      id TEXT PRIMARY KEY NOT NULL,
      project_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      backup_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_project_status_due ON tasks(project_id, status, due_at);
    CREATE INDEX IF NOT EXISTS idx_tasks_project_room_phase_sort ON tasks(project_id, room_id, phase, sort_index);
    CREATE INDEX IF NOT EXISTS idx_tasks_project_due ON tasks(project_id, due_at);
    CREATE INDEX IF NOT EXISTS idx_tasks_project_deleted_updated ON tasks(project_id, deleted_at, updated_at);
    CREATE INDEX IF NOT EXISTS idx_tasks_room_deleted_status_due ON tasks(room_id, deleted_at, status, due_at, sort_index);
    CREATE INDEX IF NOT EXISTS idx_events_project_starts_all_day ON events(project_id, starts_at, is_all_day);
    CREATE INDEX IF NOT EXISTS idx_events_project_task ON events(project_id, task_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_project_incurred_on ON expenses(project_id, incurred_on);
    CREATE INDEX IF NOT EXISTS idx_expenses_project_room_category ON expenses(project_id, room_id, category);
    CREATE INDEX IF NOT EXISTS idx_expenses_project_created ON expenses(project_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_rooms_project_order ON rooms(project_id, order_index);
    CREATE INDEX IF NOT EXISTS idx_attachments_project_created ON attachments(project_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_attachments_room_created ON attachments(room_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_tags_project_name_type ON tags(project_id, name, type);
    CREATE INDEX IF NOT EXISTS idx_task_tags_tag_task ON task_tags(tag_id, task_id);
    CREATE INDEX IF NOT EXISTS idx_notification_queue_project_fire ON notification_queue(project_id, fire_at);
    CREATE INDEX IF NOT EXISTS idx_notification_history_project_fired ON notification_history(project_id, fired_at);
    CREATE INDEX IF NOT EXISTS idx_builder_quotes_project_status_amount ON builder_quotes(project_id, status, amount);
    CREATE INDEX IF NOT EXISTS idx_builder_quotes_project_room_updated ON builder_quotes(project_id, room_id, updated_at);
    CREATE INDEX IF NOT EXISTS idx_backup_snapshots_project_created ON backup_snapshots(project_id, created_at);
  `);

  try {
    const projectColumns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(projects)`);
    const hasHomeLayout = projectColumns.some((column) => column.name === 'home_layout');
    const hasThemePreference = projectColumns.some((column) => column.name === 'theme_preference');
    if (!hasHomeLayout) {
      await db.execAsync(`ALTER TABLE projects ADD COLUMN home_layout TEXT NOT NULL DEFAULT 'standard'`);
    }
    if (!hasThemePreference) {
      await db.execAsync(`ALTER TABLE projects ADD COLUMN theme_preference TEXT NOT NULL DEFAULT 'system'`);
    }
  } catch (error) {
    console.error('Schema upgrade failed for projects.home_layout/theme_preference', error);
  }

  try {
    const roomColumns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(rooms)`);
    const hasFloor = roomColumns.some((column) => column.name === 'floor');
    if (!hasFloor) {
      await db.execAsync(`ALTER TABLE rooms ADD COLUMN floor TEXT`);
    }
  } catch (error) {
    console.error('Schema upgrade failed for rooms.floor', error);
  }

  try {
    const eventColumns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(events)`);
    const hasCompany = eventColumns.some((column) => column.name === 'company');
    const hasLocation = eventColumns.some((column) => column.name === 'location');

    if (!hasCompany) {
      await db.execAsync(`ALTER TABLE events ADD COLUMN company TEXT`);
    }

    if (hasLocation) {
      await db.execAsync(`
        UPDATE events
        SET company = COALESCE(company, location)
        WHERE company IS NULL AND location IS NOT NULL
      `);
    }
  } catch (error) {
    console.error('Schema upgrade failed for events.company migration', error);
  }

  try {
    await setupSearchFts(db);
  } catch (error) {
    console.warn('FTS setup skipped or failed', error);
  }
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  return getDb();
}
