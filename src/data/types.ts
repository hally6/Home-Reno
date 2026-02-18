export type TaskStatus = 'ideas' | 'ready' | 'in_progress' | 'waiting' | 'done';
export type WaitingReason = 'materials' | 'trades' | 'drying_time' | 'access' | 'approvals' | 'other';
export type TaskPhase = 'plan' | 'buy' | 'prep' | 'install' | 'finish' | 'inspect_snag';

export type TaskBase = {
  id: string;
  projectId: string;
  roomId: string;
  title: string;
  description: string | null;
  phase: TaskPhase;
  dueAt: string | null;
  startAt: string | null;
  completedAt: string | null;
  priority: 'low' | 'medium' | 'high';
  estimateLabor: number | null;
  estimateMaterials: number | null;
  actualLabor: number | null;
  actualMaterials: number | null;
  sortIndex: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type WaitingTask = TaskBase & {
  status: 'waiting';
  waitingReason: WaitingReason;
};

export type ActiveTask = TaskBase & {
  status: Exclude<TaskStatus, 'waiting'>;
  waitingReason: null;
};

export type Task = WaitingTask | ActiveTask;
