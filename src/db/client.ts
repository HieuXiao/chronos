import Database from "@tauri-apps/plugin-sql";

/**
 * Resolved by tauri-plugin-sql relative to the app config dir
 * (`%APPDATA%\chronos\data.db` on Windows). Migrations are registered
 * for this exact URL in `src-tauri/src/db.rs`.
 */
export const DB_URL = "sqlite:data.db";

let dbPromise: Promise<Database> | null = null;

/** Returns the shared connection, opening it (and running migrations) on first call. */
export function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = Database.load(DB_URL).catch((err: unknown) => {
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

export async function closeDb(): Promise<void> {
  if (!dbPromise) return;
  const db = await dbPromise;
  dbPromise = null;
  await db.close();
}
