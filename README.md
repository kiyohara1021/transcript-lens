# Transcript Lens

[![CI](https://github.com/kiyohara1021/transcript-lens/actions/workflows/ci.yml/badge.svg)](https://github.com/kiyohara1021/transcript-lens/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-c8ff3d.svg)](LICENSE)

[English](README.md) | [日本語](README.ja.md)

> Stop re-listening. Review the disagreement.

Transcript Lens compares the timestamped JSON from two speech-to-text engines and creates a focused review queue for the moments where they disagree. Everything runs in the browser: transcripts are never uploaded.

## Why

A 60-minute interview does not need another 60-minute listen. Independent ASR engines usually agree on most of it. Transcript Lens uses character-bigram similarity and timestamp overlap to surface only the uncertain segments, so a human can spend attention where it changes the result.

## Features

- Drag-and-drop comparison for timestamped JSON
- Supports `segments`, `utterances`, nested `results.segments`, and generic transcript fields
- Japanese-friendly character-bigram similarity (no tokenizer required)
- Adjustable agreement threshold and at-a-glance timeline
- Review queue with per-segment source text and completion state
- Markdown report export
- Local-first: no account, API key, server upload, or analytics
- Responsive and keyboard-accessible

## Try it locally

Requires Node.js 22.13 or later.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. A synthetic demo is loaded automatically, so the complete workflow is visible without credentials or personal data.

## Accepted JSON shapes

The smallest supported format is:

```json
{
  "segments": [
    { "start": 0, "end": 4.2, "text": "Hello world", "speaker": "HOST" }
  ]
}
```

Transcript Lens also recognizes `utterances`, `results`, `results.segments`, `start_time`, `end_time`, `startTime`, `endTime`, `transcript`, and millisecond timestamps.

## How matching works

1. The first file is the timeline source.
2. Comparison segments that overlap each primary time range are joined.
3. Punctuation and whitespace are removed.
4. A Sørensen–Dice score is calculated from character bigrams.
5. Segments below the selected threshold enter the review queue.

Character bigrams work without language-specific tokenization, which makes the approach useful for Japanese and mixed-language interviews. The tool deliberately does not choose a winner; it identifies where human judgment is valuable.

## Development

```bash
npm test
npm run lint
npm run build
```

The app uses React, TypeScript, vinext, and Cloudflare-compatible Vite output. Core matching logic lives in `app/lib/consensus.ts` and has no browser dependencies.

## Privacy

Files are parsed in browser memory and are not sent to a server. Exported reports are created with a local `Blob`. Avoid sharing an exported report if the source transcript contains sensitive information.

## Contributing

Bug reports and format adapters are welcome. Please include a minimal synthetic JSON fixture rather than a real interview transcript.

## License

[MIT](LICENSE)
