type TaskFactoryInput = {
  id?: string;
  title?: string;
  phase?: string;
  status?: string;
  dueAt?: string | null;
  startAt?: string | null;
  roomName?: string;
  reasons?: string[];
};

export function buildTaskFactory(input?: TaskFactoryInput) {
  return {
    id: input?.id ?? 'task_1',
    title: input?.title ?? 'Install vanity',
    phase: input?.phase ?? 'install',
    status: input?.status ?? 'ready',
    dueAt: input?.dueAt ?? '2026-02-20T10:00:00.000Z',
    startAt: input?.startAt ?? '2026-02-19T10:00:00.000Z',
    roomName: input?.roomName ?? 'Bathroom',
    reasons: input?.reasons ?? ['due_soon']
  };
}

type EventFactoryInput = {
  id?: string;
  title?: string;
  type?: string;
  startsAt?: string;
  roomName?: string | null;
};

export function buildEventFactory(input?: EventFactoryInput) {
  return {
    id: input?.id ?? 'event_1',
    title: input?.title ?? 'Plumber visit',
    type: input?.type ?? 'trade_visit',
    startsAt: input?.startsAt ?? '2026-02-20T09:00:00.000Z',
    roomName: input?.roomName ?? 'Bathroom'
  };
}
