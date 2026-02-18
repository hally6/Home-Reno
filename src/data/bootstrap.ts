import { getDatabase } from '@/data/database';
import { createId } from '@/data/id';

export async function ensureSeedData(): Promise<string> {
  const db = await getDatabase();

  const existingProject = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM projects ORDER BY created_at ASC LIMIT 1'
  );
  if (existingProject?.id) {
    return existingProject.id;
  }

  const now = new Date();
  const nowIso = now.toISOString();

  const projectId = createId('project');

  await db.runAsync(
    `
      INSERT INTO projects (id, name, address, start_date, currency, budget_planned_total, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [projectId, 'Home Renovation', '123 Cedar Lane', nowIso.slice(0, 10), 'USD', 18000, nowIso, nowIso]
  );

  const rooms = [
    { id: createId('room'), name: 'Kitchen', type: 'kitchen', floor: 'first_floor', order: 1, budget: 9000 },
    { id: createId('room'), name: 'Bathroom', type: 'bathroom', floor: 'second_floor', order: 2, budget: 6000 },
    { id: createId('room'), name: 'Bedroom', type: 'bedroom', floor: 'second_floor', order: 3, budget: 3000 }
  ];

  for (const room of rooms) {
    await db.runAsync(
      `
      INSERT INTO rooms (id, project_id, name, type, floor, order_index, status, budget_planned, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
    `,
      [room.id, projectId, room.name, room.type, room.floor, room.order, room.budget, nowIso, nowIso]
    );
  }

  const today = new Date();
  const plusDays = (days: number, hour: number, minute: number): string => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };

  const taskSeed = [
    {
      roomId: rooms[0].id,
      title: 'Finalize kitchen layout',
      phase: 'plan',
      status: 'done',
      waiting: null,
      dueAt: plusDays(-3, 9, 0),
      priority: 'high'
    },
    {
      roomId: rooms[0].id,
      title: 'Order kitchen sink and tap',
      phase: 'buy',
      status: 'ready',
      waiting: null,
      dueAt: plusDays(0, 16, 0),
      priority: 'high'
    },
    {
      roomId: rooms[0].id,
      title: 'Prime kitchen walls',
      phase: 'finish',
      status: 'in_progress',
      waiting: null,
      dueAt: plusDays(1, 11, 0),
      priority: 'medium'
    },
    {
      roomId: rooms[1].id,
      title: 'Waterproof shower area',
      phase: 'prep',
      status: 'waiting',
      waiting: 'drying_time',
      dueAt: plusDays(2, 12, 0),
      priority: 'high'
    },
    {
      roomId: rooms[1].id,
      title: 'Install vanity unit',
      phase: 'install',
      status: 'ready',
      waiting: null,
      dueAt: plusDays(4, 10, 30),
      priority: 'medium'
    },
    {
      roomId: rooms[2].id,
      title: 'Remove old carpet',
      phase: 'prep',
      status: 'ideas',
      waiting: null,
      dueAt: null,
      priority: 'low'
    },
    {
      roomId: rooms[1].id,
      title: 'Electrical safety sign-off',
      phase: 'inspect_snag',
      status: 'ready',
      waiting: null,
      dueAt: plusDays(-1, 14, 30),
      priority: 'high'
    }
  ];

  for (const [index, task] of taskSeed.entries()) {
    await db.runAsync(
      `
        INSERT INTO tasks (
          id, project_id, room_id, title, phase, status, waiting_reason, due_at, priority,
          sort_index, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        createId('task'),
        projectId,
        task.roomId,
        task.title,
        task.phase,
        task.status,
        task.waiting,
        task.dueAt,
        task.priority,
        index,
        nowIso,
        nowIso
      ]
    );
  }

  const taskForLink = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM tasks WHERE project_id = ? ORDER BY created_at LIMIT 1',
    [projectId]
  );

  const eventSeed = [
    { type: 'trade_visit', title: 'Plumber first-fix visit', startsAt: plusDays(1, 9, 0), allDay: 0 },
    { type: 'delivery', title: 'Kitchen units delivery', startsAt: plusDays(3, 8, 0), allDay: 1 },
    { type: 'inspection', title: 'Electrical inspection', startsAt: plusDays(4, 14, 30), allDay: 0 }
  ];

  for (const [idx, event] of eventSeed.entries()) {
    await db.runAsync(
      `
        INSERT INTO events (
          id, project_id, room_id, task_id, type, title, starts_at, is_all_day, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        createId('event'),
        projectId,
        rooms[idx === 0 ? 1 : 0].id,
        idx === 0 ? (taskForLink?.id ?? null) : null,
        event.type,
        event.title,
        event.startsAt,
        event.allDay,
        nowIso,
        nowIso
      ]
    );
  }

  const expenseSeed = [
    {
      roomId: rooms[0].id,
      category: 'materials',
      vendor: 'Tile Depot',
      amount: 3200,
      date: plusDays(-6, 9, 0).slice(0, 10)
    },
    {
      roomId: rooms[1].id,
      category: 'labor',
      vendor: 'Apex Plumbing',
      amount: 2100,
      date: plusDays(-3, 9, 0).slice(0, 10)
    },
    {
      roomId: rooms[0].id,
      category: 'delivery',
      vendor: 'FastFreight',
      amount: 180,
      date: plusDays(-1, 9, 0).slice(0, 10)
    }
  ];

  for (const expense of expenseSeed) {
    await db.runAsync(
      `
        INSERT INTO expenses (
          id, project_id, room_id, category, vendor, amount, incurred_on, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        createId('expense'),
        projectId,
        expense.roomId,
        expense.category,
        expense.vendor,
        expense.amount,
        expense.date,
        nowIso,
        nowIso
      ]
    );
  }

  return projectId;
}
