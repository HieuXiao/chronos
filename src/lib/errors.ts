import { toast } from "sonner";

export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

/** Reports a failed operation to the user instead of letting it crash the app. */
export function reportError(context: string, err: unknown): void {
  console.error(`[${context}]`, err);
  toast.error(context, { description: errorMessage(err) });
}

/** Runs `fn`, toasting on failure. Resolves to undefined when it failed. */
export async function attempt<T>(context: string, fn: () => Promise<T>): Promise<T | undefined> {
  try {
    return await fn();
  } catch (err) {
    reportError(context, err);
    return undefined;
  }
}
