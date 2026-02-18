type TransactionDb = {
  execAsync: (sql: string) => Promise<unknown>;
};

function toMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export async function rollbackAndThrow(db: TransactionDb, operation: string, originalError: unknown): Promise<never> {
  try {
    await db.execAsync('ROLLBACK;');
  } catch (rollbackError) {
    throw new Error(
      `${operation} failed: ${toMessage(originalError)}. Rollback also failed: ${toMessage(rollbackError)}`
    );
  }

  throw new Error(`${operation} failed: ${toMessage(originalError)}`);
}
