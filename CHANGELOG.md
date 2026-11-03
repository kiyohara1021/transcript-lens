# Changelog

All notable changes to Transcript Lens are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- English and Japanese project documentation.
- Issue forms, a pull request template, and automated dependency updates.

### Changed

- Standardized local development, CI, and Node.js type definitions on Node.js 24 LTS.

### Fixed

- Reviewed marks are saved in this browser per pair of loaded files and come back after a reload, as the "saved on this device" label already promised.
- Reviewed marks stay on the same row when the threshold changes. They were stored by position in the flagged list, so they moved to other rows.

- Timestamp units (seconds or milliseconds) are decided once per file. The first seconds of a millisecond file were read as thousands of seconds. Keys such as `start_ms` are read as milliseconds, and the detected unit is shown after loading.

## [1.0.0] - 2026-08-14

### Added

- Local-only comparison of two timestamped speech-to-text JSON files.
- Support for common `segments`, `utterances`, and nested result formats.
- Japanese-friendly character-bigram similarity scoring.
- Adjustable review threshold and agreement timeline.
- Review completion tracking and Markdown report export.
- Responsive, keyboard-accessible interface with a synthetic demo.
- Unit, server-rendering, build, lint, and GitHub Actions checks.

[Unreleased]: https://github.com/kiyohara1021/transcript-lens/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/kiyohara1021/transcript-lens/releases/tag/v1.0.0
