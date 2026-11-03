import assert from "node:assert/strict";
import test from "node:test";
import { compareTranscripts } from "../app/lib/consensus.ts";
import { loadReviewed, reviewStorageKey, saveReviewed } from "../app/lib/review-state.ts";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    values,
  };
}

const primary = { name: "a.json", segments: [
  { start: 0, end: 3, text: "同じ文章" },
  { start: 3, end: 6, text: "請求処理" },
  { start: 6, end: 9, text: "少し違う文章です" },
]};
const comparison = { name: "b.json", segments: [
  { start: 0, end: 3, text: "同じ文章" },
  { start: 3, end: 6, text: "集計処理" },
  { start: 6, end: 9, text: "少し違う文章だ" },
]};

test("saves and restores reviewed rows for the same pair of files", () => {
  const storage = memoryStorage();
  const key = reviewStorageKey(primary, comparison);
  saveReviewed(storage, key, new Set([2, 1]));

  assert.deepEqual([...loadReviewed(storage, reviewStorageKey(primary, comparison))], [1, 2]);
});

test("does not carry marks over to different files or content", () => {
  const storage = memoryStorage();
  saveReviewed(storage, reviewStorageKey(primary, comparison), new Set([1]));
  const edited = { ...comparison, segments: comparison.segments.map((s, i) => (i === 1 ? { ...s, text: "請求処理" } : s)) };

  assert.notEqual(reviewStorageKey(primary, edited), reviewStorageKey(primary, comparison));
  assert.equal(loadReviewed(storage, reviewStorageKey(primary, edited)).size, 0);
  assert.equal(loadReviewed(storage, reviewStorageKey({ ...primary, name: "c.json" }, comparison)).size, 0);
});

test("keeps a mark on the same row when the threshold changes", () => {
  const strict = compareTranscripts(primary, [comparison], 0.95);
  const loose = compareTranscripts(primary, [comparison], 0.5);
  // The flagged lists differ, but marks use the row's index in the primary timeline.
  assert.notDeepEqual(strict.map((row) => row.flagged), loose.map((row) => row.flagged));
  const marked = new Set([1]);
  for (const rows of [strict, loose]) {
    assert.equal(rows.find((_, index) => marked.has(index)).text, "請求処理");
  }
});

test("survives missing, broken, or throwing storage", () => {
  assert.equal(loadReviewed(undefined, "k").size, 0);
  const broken = memoryStorage();
  broken.setItem("k", "{not json");
  assert.equal(loadReviewed(broken, "k").size, 0);
  broken.setItem("k", JSON.stringify([1, -1, 1.5, "2"]));
  assert.deepEqual([...loadReviewed(broken, "k")], [1]);
  const throwing = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("full"); }, removeItem() { throw new Error("blocked"); } };
  assert.equal(loadReviewed(throwing, "k").size, 0);
  assert.doesNotThrow(() => saveReviewed(throwing, "k", new Set([1])));
});

test("removes the entry when nothing is marked", () => {
  const storage = memoryStorage();
  const key = reviewStorageKey(primary, comparison);
  saveReviewed(storage, key, new Set([1]));
  saveReviewed(storage, key, new Set());
  assert.equal(storage.values.has(key), false);
});

test("keeps marks in memory for the visit when the browser has no storage", async () => {
  const { reviewedSnapshot, storeReviewed, subscribeReviewed, parseReviewed } = await import("../app/lib/review-state.ts");
  let notified = 0;
  const unsubscribe = subscribeReviewed(() => { notified += 1; });
  storeReviewed("transcript-lens:reviewed:memory-test", new Set([3]));
  unsubscribe();
  assert.equal(notified, 1);
  assert.deepEqual([...parseReviewed(reviewedSnapshot("transcript-lens:reviewed:memory-test"))], [3]);
});
