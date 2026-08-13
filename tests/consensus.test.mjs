import assert from "node:assert/strict";
import test from "node:test";
import {
  compareTranscripts,
  createMarkdown,
  parseTranscript,
  similarity,
  timestamp,
} from "../app/lib/consensus.ts";

test("similarity ignores Japanese punctuation and spacing", () => {
  assert.equal(similarity("今日は、晴れです。", "今日は晴れです"), 1);
  assert.ok(similarity("請求処理", "集計処理") < 0.72);
});

test("parses common segment fields and millisecond timestamps", () => {
  const transcript = parseTranscript({
    utterances: [{ start_time: 12000, end_time: 15500, transcript: "テスト", speaker_label: "A" }],
  }, "engine.json");

  assert.deepEqual(transcript, {
    name: "engine.json",
    segments: [{ start: 12, end: 15.5, text: "テスト", speaker: "A" }],
  });
});

test("aligns by time and flags disagreement", () => {
  const primary = parseTranscript({ segments: [
    { start: 0, end: 3, text: "同じ文章" },
    { start: 3, end: 6, text: "請求処理" },
  ]}, "primary");
  const comparison = parseTranscript({ segments: [
    { start: 0, end: 3.1, text: "同じ文章" },
    { start: 3.1, end: 6, text: "集計処理" },
  ]}, "other");

  const rows = compareTranscripts(primary, [comparison], 0.72);
  assert.equal(rows[0].flagged, false);
  assert.equal(rows[1].flagged, true);
  assert.match(createMarkdown(primary, rows), /Transcript Lens review report/);
});

test("formats short and long timestamps", () => {
  assert.equal(timestamp(72.8), "01:12");
  assert.equal(timestamp(3723), "1:02:03");
});
