import Database from "@tauri-apps/plugin-sql";
import { getDataLocation } from "@/lib/native";

let dbPromise: Promise<Database> | null = null;
/** Set while the database file is being moved, so nothing reopens it mid-copy. */
let locked = false;

/** Returns the shared connection, opening it (and running migrations) on first call. */
export function getDb(): Promise<Database> {
  if (locked) return Promise.reject(new Error("Đang chuyển vị trí dữ liệu"));
  if (!dbPromise) {
    // The location is chosen in Settings; migrations are registered in Rust
    // (`src-tauri/src/storage.rs`) for exactly this URL.
    dbPromise = getDataLocation()
      .then((loc) => Database.load(loc.dbUrl))
      .catch((err: unknown) => {
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

/**
 * Closes the connection and blocks reopening it until `unlock` is called
 * (or the app restarts), so the file on disk is complete for copying.
 */
export async function closeDbForMove(): Promise<{ unlock: () => void }> {
  locked = true;
  try {
    // A pending open must settle before it can be closed.
    if (dbPromise) await dbPromise.catch(() => undefined);
    await closeDb();
  } catch (err) {
    locked = false;
    throw err;
  }
  return { unlock: () => (locked = false) };
}
