import { getDatabase } from '@/data/database';
import { createId } from '@/data/id';
import { assertMaxLength, INPUT_LIMITS } from './inputLimits';

export type AttachmentFormInput = {
  projectId: string;
  roomId: string;
  kind: string;
  uri: string;
  fileName: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
};

export type AttachmentEditRecord = {
  id: string;
  projectId: string;
  roomId: string;
  kind: string;
  uri: string;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
};

function validateAttachmentInput(input: AttachmentFormInput): void {
  if (!input.roomId) {
    throw new Error('Room is required');
  }
  if (!input.kind.trim()) {
    throw new Error('Attachment kind is required');
  }
  assertMaxLength(input.kind, INPUT_LIMITS.attachmentKind, 'Attachment kind');
  if (!input.uri.trim()) {
    throw new Error('Attachment URI is required');
  }
  assertMaxLength(input.uri, INPUT_LIMITS.attachmentUri, 'Attachment URI');
  assertMaxLength(input.fileName, INPUT_LIMITS.attachmentFileName, 'Attachment file name');
  assertMaxLength(input.mimeType, INPUT_LIMITS.attachmentMimeType, 'Attachment MIME type');
}

export async function createRoomAttachment(input: AttachmentFormInput): Promise<string> {
  validateAttachmentInput(input);

  const db = await getDatabase();
  const now = new Date().toISOString();
  const attachmentId = createId('attachment');

  await db.runAsync(
    `
      INSERT INTO attachments (
        id, project_id, room_id, kind, uri, file_name, mime_type, size_bytes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      attachmentId,
      input.projectId,
      input.roomId,
      input.kind.trim(),
      input.uri.trim(),
      input.fileName.trim() || null,
      input.mimeType?.trim() || null,
      input.sizeBytes ?? null,
      now
    ]
  );

  return attachmentId;
}

export async function getAttachmentForEdit(attachmentId: string): Promise<AttachmentEditRecord | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<AttachmentEditRecord>(
    `
      SELECT
        id,
        project_id AS projectId,
        room_id AS roomId,
        kind,
        uri,
        file_name AS fileName,
        mime_type AS mimeType,
        size_bytes AS sizeBytes
      FROM attachments
      WHERE id = ?
      LIMIT 1
    `,
    [attachmentId]
  );

  if (!row) {
    return null;
  }

  return {
    ...row,
    sizeBytes: row.sizeBytes == null ? null : Number(row.sizeBytes)
  };
}

export async function updateAttachment(attachmentId: string, input: AttachmentFormInput): Promise<void> {
  validateAttachmentInput(input);
  const db = await getDatabase();
  await db.runAsync(
    `
      UPDATE attachments
      SET room_id = ?, kind = ?, uri = ?, file_name = ?, mime_type = ?, size_bytes = ?
      WHERE id = ? AND project_id = ?
    `,
    [
      input.roomId,
      input.kind.trim(),
      input.uri.trim(),
      input.fileName.trim() || null,
      input.mimeType?.trim() || null,
      input.sizeBytes ?? null,
      attachmentId,
      input.projectId
    ]
  );
}

export async function deleteAttachment(attachmentId: string, projectId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM attachments WHERE id = ? AND project_id = ?`, [attachmentId, projectId]);
}
