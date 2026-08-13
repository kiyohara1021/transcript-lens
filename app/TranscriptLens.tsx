"use client";

import { ChangeEvent, DragEvent, useMemo, useRef, useState } from "react";
import {
  compareTranscripts,
  createMarkdown,
  parseTranscript,
  timestamp,
  type ConsensusRow,
  type Transcript,
} from "./lib/consensus";

const demoPrimary: Transcript = {
  name: "whisper.json",
  segments: [
    { start: 0, end: 7.4, speaker: "HOST", text: "今日は小さなチームで品質を守る方法について伺います。" },
    { start: 7.4, end: 15.8, speaker: "GUEST", text: "私たちはリリース前の確認を自動化して、判断に集中しています。" },
    { start: 15.8, end: 24.2, speaker: "HOST", text: "具体的にはどんな部分から始めたのでしょうか。" },
    { start: 24.2, end: 33.6, speaker: "GUEST", text: "最初は障害の多かった請求処理から始めました。" },
    { start: 33.6, end: 41.8, speaker: "HOST", text: "数字で見える変化はありましたか。" },
    { start: 41.8, end: 52.1, speaker: "GUEST", text: "確認時間は週に八時間から一時間半まで減りました。" },
    { start: 52.1, end: 61.5, speaker: "HOST", text: "それなら現場の納得も得やすそうですね。" },
    { start: 61.5, end: 72.3, speaker: "GUEST", text: "はい。ただ、例外を消すのではなく見つけやすくするのが大切です。" },
  ],
};

const demoOther: Transcript = {
  name: "elevenlabs.json",
  segments: [
    { start: 0, end: 7.1, text: "今日は小さなチームで品質を守る方法について伺います。" },
    { start: 7.1, end: 15.6, text: "私たちはリリース前の確認を自動化して、判断に集中しています。" },
    { start: 15.6, end: 24.5, text: "具体的にはどんな部分から始めたのでしょうか。" },
    { start: 24.5, end: 33.8, text: "最初は障害の多かった集計処理から始めました。" },
    { start: 33.8, end: 42, text: "数字で見える変化はありましたか。" },
    { start: 42, end: 52.4, text: "確認時間は週に八時間から一時間半まで減りました。" },
    { start: 52.4, end: 61.2, text: "それなら現場の納得も得やすそうですね。" },
    { start: 61.2, end: 72.5, text: "はい。ただ例外を消すのではなく、見つけやすくするのが大切です。" },
  ],
};

function FileDrop({
  label,
  transcript,
  onFile,
  accent,
}: {
  label: string;
  transcript: Transcript;
  onFile: (file: File) => void;
  accent: "lime" | "violet";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) onFile(file);
  };

  return (
    <button
      className={`file-drop ${accent} ${dragging ? "dragging" : ""}`}
      onClick={() => inputRef.current?.click()}
      onDragEnter={() => setDragging(true)}
      onDragLeave={() => setDragging(false)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
      type="button"
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
        }}
        tabIndex={-1}
      />
      <span className="file-kicker">{label}</span>
      <span className="file-name"><span className="file-dot" />{transcript.name}</span>
      <span className="file-meta">{transcript.segments.length} segments · JSON</span>
      <span className="replace-file">Drop or click to replace</span>
    </button>
  );
}

function AgreementPill({ value }: { value: number }) {
  const percent = Math.round(value * 100);
  const tone = percent >= 90 ? "good" : percent >= 72 ? "medium" : "review";
  return <span className={`agreement ${tone}`}>{percent}% match</span>;
}

export default function TranscriptLens() {
  const [primary, setPrimary] = useState(demoPrimary);
  const [comparison, setComparison] = useState(demoOther);
  const [threshold, setThreshold] = useState(72);
  const [resolved, setResolved] = useState<Set<number>>(new Set());
  const [showAll, setShowAll] = useState(false);
  const [notice, setNotice] = useState("Demo loaded — replace either file with your own JSON.");

  const rows = useMemo(
    () => compareTranscripts(primary, [comparison], threshold / 100),
    [primary, comparison, threshold],
  );
  const reviewRows = rows.filter((row) => row.flagged);
  const visibleRows = showAll ? rows : reviewRows;
  const duration = Math.max(...primary.segments.map((segment) => segment.end));
  const reviewDuration = reviewRows.reduce((total, row) => total + row.end - row.start, 0);
  const savedPercent = duration ? Math.max(0, Math.round((1 - reviewDuration / duration) * 100)) : 0;

  const loadFile = async (file: File, setter: (transcript: Transcript) => void) => {
    try {
      const data = JSON.parse(await file.text());
      setter(parseTranscript(data, file.name));
      setResolved(new Set());
      setNotice(`${file.name} loaded locally. Nothing was uploaded.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not read that file.");
    }
  };

  const toggleResolved = (index: number) => {
    setResolved((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const downloadReport = () => {
    const blob = new Blob([createMarkdown(primary, rows)], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "transcript-lens-report.md";
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Markdown report downloaded.");
  };

  return (
    <main>
      <nav className="nav" aria-label="Main navigation">
        <a className="brand" href="#top" aria-label="Transcript Lens home">
          <span className="brand-mark">TL</span>
          <span>Transcript Lens</span>
        </a>
        <div className="nav-links">
          <a href="#how">How it works</a>
          <a href="#review">Review queue</a>
          <a className="github-link" href="https://github.com/kiyohara1021/transcript-lens" target="_blank" rel="noreferrer">GitHub <span aria-hidden="true">↗</span></a>
        </div>
      </nav>

      <section className="hero" id="top">
        <div className="eyebrow"><span /> Local-first transcript QA</div>
        <h1>Stop re-listening.<br /><em>Review the disagreement.</em></h1>
        <p className="hero-copy">
          Compare outputs from two speech-to-text engines. Transcript Lens finds the few seconds
          they disagree on — entirely in your browser.
        </p>
        <div className="privacy-note"><span aria-hidden="true">⌁</span> Your audio and transcripts never leave this device.</div>
      </section>

      <section className="workspace" aria-label="Transcript comparison workspace">
        <div className="workspace-top">
          <div>
            <span className="section-index">01</span>
            <h2>Add two transcripts</h2>
          </div>
          <button className="demo-button" type="button" onClick={() => {
            setPrimary(demoPrimary);
            setComparison(demoOther);
            setResolved(new Set());
            setNotice("Demo restored.");
          }}>Reset demo</button>
        </div>

        <div className="file-grid">
          <FileDrop label="Primary timeline" transcript={primary} accent="lime" onFile={(file) => loadFile(file, setPrimary)} />
          <div className="versus" aria-hidden="true">VS</div>
          <FileDrop label="Comparison" transcript={comparison} accent="violet" onFile={(file) => loadFile(file, setComparison)} />
        </div>

        <div className="status-line" role="status"><span />{notice}</div>

        <div className="control-row">
          <label htmlFor="threshold">Flag below <strong>{threshold}%</strong> agreement</label>
          <input
            id="threshold"
            type="range"
            min="50"
            max="95"
            value={threshold}
            onChange={(event) => setThreshold(Number(event.target.value))}
          />
          <span className="format-list">Whisper · ElevenLabs · Deepgram · generic segments JSON</span>
        </div>
      </section>

      <section className="results" id="review">
        <div className="results-heading">
          <div>
            <span className="section-index">02</span>
            <h2>Your review map</h2>
          </div>
          <button className="export-button" type="button" onClick={downloadReport}>Export report <span aria-hidden="true">↓</span></button>
        </div>

        <div className="metric-grid">
          <article><span>Audio length</span><strong>{timestamp(duration)}</strong><small>{rows.length} aligned segments</small></article>
          <article className="accent-card"><span>Needs review</span><strong>{reviewRows.length}</strong><small>{timestamp(reviewDuration)} of audio</small></article>
          <article><span>Listening avoided</span><strong>{savedPercent}%</strong><small>based on flagged duration</small></article>
          <article><span>Reviewed</span><strong>{resolved.size}<i>/{reviewRows.length}</i></strong><small>saved on this device</small></article>
        </div>

        <div className="timeline-card" id="how">
          <div className="timeline-header">
            <div><span className="pulse" />Agreement timeline</div>
            <div className="legend"><span className="legend-good" />Aligned <span className="legend-review" />Review</div>
          </div>
          <div className="timeline" aria-label={`${reviewRows.length} review spots across ${timestamp(duration)}`}>
            {rows.map((row, index) => (
              <div
                key={`${row.start}-${index}`}
                className={row.flagged ? "segment flagged" : "segment"}
                style={{ flexGrow: Math.max(1, row.end - row.start) }}
                title={`${timestamp(row.start)} · ${Math.round(row.agreement * 100)}% match`}
              />
            ))}
          </div>
          <div className="timeline-scale"><span>00:00</span><span>{timestamp(duration / 2)}</span><span>{timestamp(duration)}</span></div>
        </div>

        <div className="queue-heading">
          <div>
            <h3>Review queue</h3>
            <p>{showAll ? "Showing every aligned segment." : "Only low-agreement segments are shown."}</p>
          </div>
          <button className="filter-button" type="button" onClick={() => setShowAll((value) => !value)}>
            {showAll ? "Show flagged only" : `Show all ${rows.length}`}
          </button>
        </div>

        <div className="queue">
          {visibleRows.length === 0 ? (
            <div className="empty-state"><strong>Everything aligns.</strong><span>Raise the threshold to inspect smaller differences.</span></div>
          ) : visibleRows.map((row: ConsensusRow) => {
            const rowIndex = rows.indexOf(row);
            const reviewIndex = reviewRows.indexOf(row);
            const isResolved = resolved.has(reviewIndex);
            return (
              <article className={`review-card ${isResolved ? "resolved" : ""}`} key={`${row.start}-${row.text}`}>
                <div className="review-meta">
                  <span className="timecode">{timestamp(row.start)}–{timestamp(row.end)}</span>
                  <AgreementPill value={row.agreement} />
                  {row.speaker && <span className="speaker">{row.speaker}</span>}
                  <span className="row-number">#{String(rowIndex + 1).padStart(2, "0")}</span>
                </div>
                <div className="transcript-pair">
                  <div><span className="source-name"><i className="source-dot lime" />{primary.name}</span><p>{row.text}</p></div>
                  <div><span className="source-name"><i className="source-dot violet" />{comparison.name}</span><p>{row.comparisons[0]?.text || <em>No overlapping segment</em>}</p></div>
                </div>
                {row.flagged && (
                  <button className="resolve-button" type="button" onClick={() => toggleResolved(reviewIndex)}>
                    <span aria-hidden="true">{isResolved ? "✓" : "○"}</span>{isResolved ? "Reviewed" : "Mark reviewed"}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="closing">
        <span className="closing-kicker">Open source · No account · No upload</span>
        <h2>Let machines disagree.<br /><em>You decide where it matters.</em></h2>
        <a href="#top">Compare another transcript <span aria-hidden="true">↑</span></a>
      </section>

      <footer><span>Transcript Lens</span><span>Built for journalists, researchers, and careful humans.</span><span>MIT License</span></footer>
    </main>
  );
}
