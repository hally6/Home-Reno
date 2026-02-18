export const INPUT_LIMITS = {
  taskTitle: 120,
  taskDescription: 4000,
  waitingReason: 100,
  tagName: 100,
  eventTitle: 120,
  eventCompany: 120,
  eventContactName: 120,
  eventContactPhone: 40,
  eventType: 40,
  expenseCategory: 60,
  expenseVendor: 120,
  expenseNotes: 2000,
  quoteTitle: 120,
  quoteScope: 4000,
  quoteBuilderName: 120,
  quoteCurrency: 10,
  quoteNotes: 4000,
  attachmentKind: 40,
  attachmentUri: 2000,
  attachmentFileName: 255,
  attachmentMimeType: 100,
  roomName: 120,
  roomType: 40,
  roomFloor: 40,
  projectName: 120,
  projectCurrency: 10,
  projectAddress: 255
} as const;

export function assertMaxLength(value: string | null | undefined, max: number, label: string): void {
  if (!value) {
    return;
  }
  if (value.trim().length > max) {
    throw new Error(`${label} must be ${max} characters or fewer`);
  }
}
