export type TranscriptSegment = {
  start: number;
  end: number;
  text: string;
  speaker?: string;
};

export type TimeUnit = "seconds" | "milliseconds";

export type Transcript = {
  name: string;
  segments: TranscriptSegment[];
  /** How the file's timestamps were read. Absent when the file had no timestamps. */
  timeUnit?: TimeUnit;
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

/**
 * NFKC first, so full-width and half-width forms (８ / 8, ＡＩ / AI) compare equal,
 * the same as asr-consensus does.
 */
export function canonical(text: string): string {
  return String(text).normalize("NFKC").replace(punctuation, "").toLowerCase();
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

type RawSegment = {
  index: number;
  text: string;
  start: number | null;
  end: number | null;
  /** The value came from a key that names milliseconds, such as `start_ms`. */
  namedMilliseconds: boolean;
  speaker?: string;
};

function readSegment(value: unknown, index: number): RawSegment | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const text = String(item.text ?? item.transcript ?? item.value ?? "").trim();
  if (!text) return null;

  const startMs = number(item.start_ms ?? item.startMs);
  const endMs = number(item.end_ms ?? item.endMs);
  const namedMilliseconds = startMs !== null || endMs !== null;
  const speaker = item.speaker ?? item.speaker_label ?? item.speakerLabel;

  return {
    index,
    text,
    start: namedMilliseconds ? startMs : number(item.start ?? item.start_time ?? item.startTime),
    end: namedMilliseconds ? endMs : number(item.end ?? item.end_time ?? item.endTime),
    namedMilliseconds,
    speaker: speaker ? String(speaker) : undefined,
  };
}

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * Decides the unit once per file. Deciding per segment mixed units inside one file: the
 * first seconds of a millisecond file (0–5000) were read as 5000 seconds.
 */
function detectTimeUnit(segments: RawSegment[]): TimeUnit | undefined {
  if (segments.some((segment) => segment.namedMilliseconds)) return "milliseconds";
  const durations = segments.flatMap((segment) =>
    segment.start !== null && segment.end !== null && segment.end > segment.start ? [segment.end - segment.start] : [],
  );
  const times = segments.flatMap((segment) => [segment.start, segment.end].filter((value): value is number => value !== null));
  if (times.length === 0) return undefined;
  // A spoken segment is a few seconds long, so a typical length above a minute means milliseconds.
  // The second check keeps a short file with one long monologue (e.g. 0–90 s) in seconds.
  if (durations.length > 0) return median(durations) > 60 && Math.max(...times) > 1000 ? "milliseconds" : "seconds";
  // Without durations, fall back to the size of the timestamps: more than a day in seconds is implausible.
  return Math.max(...times) > 86_400 ? "milliseconds" : "seconds";
}

function toSegment(raw: RawSegment, scale: number): TranscriptSegment {
  const start = raw.start === null ? raw.index * 5 : raw.start / scale;
  const end = raw.end === null ? start + 5 : raw.end / scale;
  return {
    start,
    end: Math.max(end, start + 0.01),
    text: raw.text,
    speaker: raw.speaker,
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

  const raw = candidates
    .map((segment, index) => readSegment(segment, index))
    .filter((segment): segment is RawSegment => Boolean(segment));
  const timeUnit = detectTimeUnit(raw);
  const segments = raw.map((segment) => toSegment(segment, timeUnit === "milliseconds" ? 1000 : 1));

  if (segments.length === 0 && typeof root.text === "string" && root.text.trim()) {
    segments.push({ start: 0, end: 5, text: root.text.trim() });
  }

  if (segments.length === 0) {
    throw new Error("segments / utterances / results に発話が見つかりません");
  }

  return timeUnit ? { name, segments, timeUnit } : { name, segments };
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
