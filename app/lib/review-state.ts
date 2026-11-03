import type { Transcript } from "./consensus";

/** The parts of `Storage` this module uses, so tests can pass a plain object. */
export type ReviewStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const PREFIX = "transcript-lens:reviewed:";

/** FNV-1a: a small, stable hash so the key does not embed transcript text. */
function hash(value: string): string {
  let result = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 0x01000193);
  }
  return (result >>> 0).toString(36);
}

/**
 * One key per pair of loaded files. Loading a different file, or the same name with
 * different content, starts from an empty review instead of inheriting old marks.
 */
export function reviewStorageKey(primary: Transcript, comparison: Transcript): string {
  return PREFIX + hash(JSON.stringify([primary.name, primary.segments, comparison.name, comparison.segments]));
}

/** `localStorage` can be missing (server render) or throw (private mode, blocked storage). */
export function browserStorage(): ReviewStorage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

/** Reviewed rows are stored by their index in the primary timeline, which does not move with the threshold. */
export function parseReviewed(raw: string | null | undefined): Set<number> {
  try {
    const parsed: unknown = JSON.parse(raw || "[]");
    return new Set(Array.isArray(parsed) ? parsed.filter((value): value is number => Number.isInteger(value) && value >= 0) : []);
  } catch {
    return new Set();
  }
}

function serializeReviewed(rows: ReadonlySet<number>): string {
  return rows.size === 0 ? "" : JSON.stringify([...rows].sort((left, right) => left - right));
}

export function loadReviewed(storage: ReviewStorage | undefined, key: string): Set<number> {
  try {
    return parseReviewed(storage?.getItem(key));
  } catch {
    return new Set();
  }
}

export function saveReviewed(storage: ReviewStorage | undefined, key: string, rows: ReadonlySet<number>): void {
  try {
    const raw = serializeReviewed(rows);
    if (raw) storage?.setItem(key, raw);
    else storage?.removeItem(key);
  } catch {
    // Saving is a convenience; the in-memory copy below keeps the marks for this visit.
  }
}

// A tiny external store for useSyncExternalStore. The in-memory copy wins over storage,
// so marks keep working even when the browser refuses to save them.
const memory = new Map<string, string>();
const listeners = new Set<() => void>();

export function subscribeReviewed(listener: () => void): () => void {
  listeners.add(listener);
  // Another tab changed the same review.
  const onStorage = (event: StorageEvent) => {
    if (event.key?.startsWith(PREFIX)) listener();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

/** A string snapshot, so React can compare it by value between renders. */
export function reviewedSnapshot(key: string): string {
  const cached = memory.get(key);
  if (cached !== undefined) return cached;
  try {
    return browserStorage()?.getItem(key) ?? "";
  } catch {
    return "";
  }
}

export function storeReviewed(key: string, rows: ReadonlySet<number>): void {
  memory.set(key, serializeReviewed(rows));
  saveReviewed(browserStorage(), key, rows);
  for (const listener of listeners) listener();
}
