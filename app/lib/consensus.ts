export type TranscriptSegment = {
  start: number;
  end: number;
  text: string;
  speaker?: string;
};

export type Transcript = {
  name: string;
  segments: TranscriptSegment[];
};

export type Comparison = {
  source: string;
  text: string;
  score: number;
};

export type ConsensusRow = TranscriptSegment & {
  comparisons: Comparison[];
  agreement: number;
  flagged: boolean;
};

const punctuation = /[\s\p{P}]/gu;

export function canonical(text: string): string {
  return String(text).replace(punctuation, "").toLowerCase();
}

export function similarity(leftText: string, rightText: string): number {
  const left = canonical(leftText);
  const right = canonical(rightText);

  if (!left && !right) return 1;
  if (left.length < 2 || right.length < 2) return left === right ? 1 : 0;

  const grams = new Map<string, number>();
  for (let index = 0; index < left.length - 1; index += 1) {
    const gram = left.slice(index, index + 2);
    grams.set(gram, (grams.get(gram) ?? 0) + 1);
  }

  let hits = 0;
  for (let index = 0; index < right.length - 1; index += 1) {
    const gram = right.slice(index, index + 2);
    const available = grams.get(gram) ?? 0;
    if (available > 0) {
      grams.set(gram, available - 1);
      hits += 1;
    }
  }

  return (2 * hits) / (left.length - 1 + right.length - 1);
}

function number(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeSegment(value: unknown, index: number): TranscriptSegment | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const text = String(item.text ?? item.transcript ?? item.value ?? "").trim();
  if (!text) return null;

  const rawStart = number(item.start ?? item.start_time ?? item.startTime);
  const rawEnd = number(item.end ?? item.end_time ?? item.endTime);
  const milliseconds = (rawStart ?? 0) > 10_000 || (rawEnd ?? 0) > 10_000;
  const start = rawStart === null ? index * 5 : rawStart / (milliseconds ? 1000 : 1);
  const end = rawEnd === null ? start + 5 : rawEnd / (milliseconds ? 1000 : 1);
  const speaker = item.speaker ?? item.speaker_label ?? item.speakerLabel;

  return {
    start,
    end: Math.max(end, start + 0.01),
    text,
    speaker: speaker ? String(speaker) : undefined,
  };
}

export function parseTranscript(value: unknown, name = "transcript"): Transcript {
  if (!value || typeof value !== "object") {
    throw new Error("JSONオブジェクトを読み込めませんでした");
  }

  const root = value as Record<string, unknown>;
  let candidates: unknown[] = [];

  if (Array.isArray(root.segments)) candidates = root.segments;
  else if (Array.isArray(root.utterances)) candidates = root.utterances;
  else if (Array.isArray(root.results)) candidates = root.results;
  else if (root.results && typeof root.results === "object") {
    const results = root.results as Record<string, unknown>;
    if (Array.isArray(results.segments)) candidates = results.segments;
    else if (Array.isArray(results.utterances)) candidates = results.utterances;
  }

  const segments = candidates
    .map((segment, index) => normalizeSegment(segment, index))
    .filter((segment): segment is TranscriptSegment => Boolean(segment));

  if (segments.length === 0 && typeof root.text === "string" && root.text.trim()) {
    segments.push({ start: 0, end: 5, text: root.text.trim() });
  }

  if (segments.length === 0) {
    throw new Error("segments / utterances / results に発話が見つかりません");
  }

  return { name, segments };
}

function overlappingText(segments: TranscriptSegment[], start: number, end: number): string {
  return segments
    .filter((segment) => segment.end > start && segment.start < end)
    .map((segment) => segment.text)
    .join(" ")
    .trim();
}

export function compareTranscripts(
  primary: Transcript,
  others: Transcript[],
  threshold = 0.72,
): ConsensusRow[] {
  return primary.segments.map((segment) => {
    const comparisons = others.map((other) => {
      const text = overlappingText(other.segments, segment.start, segment.end);
      return { source: other.name, text, score: similarity(segment.text, text) };
    });
    const agreement = comparisons.length
      ? Math.min(...comparisons.map((comparison) => comparison.score))
      : 1;

    return {
      ...segment,
      comparisons,
      agreement,
      flagged: comparisons.length > 0 && agreement < threshold,
    };
  });
}

export function timestamp(seconds: number): string {
  const rounded = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const remainder = rounded % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export function createMarkdown(primary: Transcript, rows: ConsensusRow[]): string {
  const flagged = rows.filter((row) => row.flagged);
  const lines = [
    "# Transcript Lens review report",
    "",
    `- Primary: ${primary.name}`,
    `- Review spots: ${flagged.length} / ${rows.length}`,
    "",
  ];

  for (const row of flagged) {
    lines.push(`## ${timestamp(row.start)}–${timestamp(row.end)} · ${Math.round(row.agreement * 100)}% agreement`);
    lines.push("", `- **${primary.name}:** ${row.text}`);
    for (const comparison of row.comparisons) {
      lines.push(`- **${comparison.source}:** ${comparison.text || "(no matching segment)"}`);
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}
