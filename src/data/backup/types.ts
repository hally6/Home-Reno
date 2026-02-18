export type BackupRow = Record<string, string | number | null>;

export type BackupPayload = {
  projects: BackupRow[];
  rooms: BackupRow[];
  tasks: BackupRow[];
  events: BackupRow[];
  expenses: BackupRow[];
  builder_quotes: BackupRow[];
  attachments: BackupRow[];
  tags: BackupRow[];
  task_tags: BackupRow[];
};

export type BackupFileV1 = {
  schemaVersion: '1';
  exportedAt: string;
  appVersion: string;
  projectId: string;
  payload: BackupPayload;
  warnings?: string[];
};

export type BackupValidationResult = { ok: true; backup: BackupFileV1 } | { ok: false; reason: string };
