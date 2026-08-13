# Contributing to Transcript Lens

[English](#english) | [日本語](#日本語)

## English

Thank you for helping improve Transcript Lens. Bug fixes, transcript format adapters, tests, documentation, and accessibility improvements are welcome.

### Before you start

- Search existing issues before opening a new one.
- Use synthetic transcript text. Do not attach real interviews, API keys, personal information, or confidential audio.
- For a substantial behavior or UI change, open a feature request before investing in an implementation.

### Development setup

Requires Node.js 24 LTS. Run `nvm use` to select the repository's pinned major version.

```bash
npm install
npm run dev
```

Before submitting a change, run:

```bash
npm test
npm run lint
npm run build
```

### Pull requests

1. Fork the repository and create a focused branch.
2. Keep the change small enough to review independently.
3. Add or update tests when behavior changes.
4. Update both READMEs when user-facing behavior changes.
5. Explain what changed, why it changed, and how it was verified.

By contributing, you agree that your contribution is licensed under the project's MIT License.

## 日本語

Transcript Lensへのコントリビューションに関心を持っていただき、ありがとうございます。不具合修正、文字起こし形式への対応、テスト、文書、アクセシビリティの改善を歓迎します。

### 作業を始める前に

- 新しいIssueを作る前に、同じ内容がないか検索してください。
- 文字起こしの例には合成データを使ってください。実際のインタビュー、APIキー、個人情報、機密音声を添付しないでください。
- 大きな仕様変更やUI変更は、実装前にFeature Requestで相談してください。

### 開発環境

Node.js 24 LTSが必要です。`nvm use`でリポジトリ指定のメジャーバージョンを選択できます。

```bash
npm install
npm run dev
```

変更を提出する前に次を実行してください。

```bash
npm test
npm run lint
npm run build
```

### Pull Request

1. リポジトリをForkし、目的を絞ったブランチを作ります。
2. 単独でレビューできる大きさに変更をまとめます。
3. 動作を変更した場合はテストも追加・更新します。
4. 利用者向けの変更では英語・日本語のREADMEを更新します。
5. 変更内容、理由、確認方法を説明します。

コントリビューションは、このプロジェクトのMITライセンスで提供されることに同意したものとします。
