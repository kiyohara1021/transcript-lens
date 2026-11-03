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
    timeUnit: "milliseconds",
  });
});

test("decides milliseconds once per file, including the first seconds", () => {
  const transcript = parseTranscript({ segments: [
    { start: 0, end: 4000, text: "一" },
    { start: 4000, end: 9000, text: "二" },
    { start: 9000, end: 15000, text: "三" },
  ]});

  assert.equal(transcript.timeUnit, "milliseconds");
  assert.deepEqual(transcript.segments.map(({ start, end }) => [start, end]), [[0, 4], [4, 9], [9, 15]]);
});

test("keeps a three-hour recording in seconds", () => {
  const transcript = parseTranscript({ segments: [
    { start: 0, end: 6, text: "冒頭" },
    { start: 10_795, end: 10_800, text: "終わり" },
  ]});

  assert.equal(transcript.timeUnit, "seconds");
  assert.deepEqual(transcript.segments.map(({ start, end }) => [start, end]), [[0, 6], [10_795, 10_800]]);
});

test("keeps a short file with one long segment in seconds", () => {
  const transcript = parseTranscript({ segments: [{ start: 0, end: 90, text: "長い独白" }] });
  assert.equal(transcript.timeUnit, "seconds");
  assert.equal(transcript.segments[0].end, 90);
});

test("prefers key names that say milliseconds", () => {
  const transcript = parseTranscript({ segments: [{ start_ms: 500, end_ms: 1500, text: "短い" }] });
  assert.equal(transcript.timeUnit, "milliseconds");
  assert.deepEqual([transcript.segments[0].start, transcript.segments[0].end], [0.5, 1.5]);
});

test("leaves the unit unset when the file has no timestamps", () => {
  assert.equal(parseTranscript({ text: "全文だけ" }).timeUnit, undefined);
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
