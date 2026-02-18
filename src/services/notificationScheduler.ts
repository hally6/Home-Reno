export type NotificationPreferences = {
  taskDueEnabled: boolean;
  eventEnabled: boolean;
  waitingEnabled: boolean;
  leadMinutes: number;
};

export type TaskReminderCandidate = {
  id: string;
  title: string;
  dueAt: string | null;
  status: string;
  waitingReason: string | null;
};

export type EventReminderCandidate = {
  id: string;
  title: string;
  startsAt: string;
};

export type ScheduledReminder = {
  sourceType: 'task' | 'event';
  sourceId: string;
  category: 'task_due' | 'event_start' | 'waiting_followup';
  title: string;
  fireAt: string;
};

function toDate(value: string | null): Date | null {
  if (!value) {
    return null;
  }
  const isoLike = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{3})?)?(Z|[+-]\d{2}:\d{2})$/;
  if (!isoLike.test(value)) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function minusLeadMinutes(target: Date, leadMinutes: number): Date {
  return new Date(target.getTime() - leadMinutes * 60_000);
}

export function buildScheduledReminders(
  now: Date,
  prefs: NotificationPreferences,
  tasks: TaskReminderCandidate[],
  events: EventReminderCandidate[]
): ScheduledReminder[] {
  const reminders: ScheduledReminder[] = [];

  if (prefs.taskDueEnabled) {
    for (const task of tasks) {
      if (task.status === 'done') {
        continue;
      }
      const due = toDate(task.dueAt);
      if (!due) {
        continue;
      }
      const fireAt = minusLeadMinutes(due, prefs.leadMinutes);
      if (fireAt <= now) {
        continue;
      }
      reminders.push({
        sourceType: 'task',
        sourceId: task.id,
        category: 'task_due',
        title: `Task due: ${task.title}`,
        fireAt: fireAt.toISOString()
      });
    }
  }

  if (prefs.waitingEnabled) {
    for (const task of tasks) {
      if (task.status !== 'waiting') {
        continue;
      }
      const followUp = new Date(now.getTime() + prefs.leadMinutes * 60_000);
      reminders.push({
        sourceType: 'task',
        sourceId: task.id,
        category: 'waiting_followup',
        title: `Waiting follow-up: ${task.title}`,
        fireAt: followUp.toISOString()
      });
    }
  }

  if (prefs.eventEnabled) {
    for (const event of events) {
      const startsAt = toDate(event.startsAt);
      if (!startsAt) {
        continue;
      }
      const fireAt = minusLeadMinutes(startsAt, prefs.leadMinutes);
      if (fireAt <= now) {
        continue;
      }
      reminders.push({
        sourceType: 'event',
        sourceId: event.id,
        category: 'event_start',
        title: `Upcoming event: ${event.title}`,
        fireAt: fireAt.toISOString()
      });
    }
  }

  return reminders.sort((a, b) => a.fireAt.localeCompare(b.fireAt));
}
