# Transcript Lens

[![CI](https://github.com/kiyohara1021/transcript-lens/actions/workflows/ci.yml/badge.svg)](https://github.com/kiyohara1021/transcript-lens/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-c8ff3d.svg)](LICENSE)

[English](README.md) | [日本語](README.ja.md)

> 全部を聞き直さない。食い違った箇所だけを確認する。

Transcript Lens は、2つの音声認識エンジンが出力したタイムスタンプ付きJSONを比較し、結果が食い違う箇所だけをレビューキューにまとめるツールです。処理はすべてブラウザ内で完結し、文字起こしデータをサーバーへ送信しません。

## なぜ作ったのか

60分のインタビューを確認するために、もう一度60分かけて全編を聞く必要はありません。独立した音声認識エンジンの結果は、大部分で一致するのが普通です。

Transcript Lens は、文字バイグラムの類似度とタイムスタンプの重なりを使って、不確かな区間だけを抽出します。人は、判断が必要な箇所にだけ集中できます。

## 主な機能

- タイムスタンプ付きJSONをドラッグ＆ドロップして比較
- `segments`、`utterances`、`results.segments`、一般的な文字起こしフィールドに対応
- 日本語に適した文字バイグラム類似度（形態素解析器は不要）
- 一致度のしきい値を調整可能
- 食い違いの位置が分かるタイムライン
- エンジンごとの文字起こしを並べたレビューキュー
- レビュー済み状態の管理
- Markdownレポートの書き出し
- アカウント、APIキー、アップロード、アクセス解析なし
- レスポンシブ表示とキーボード操作に対応

## デモ

[ブラウザでデモを試す](https://transcript-lens.plan-k.chatgpt.site)

個人情報を含まないサンプルデータが最初から読み込まれるため、ファイルや認証情報を用意せずに一連の操作を確認できます。

## ローカルで動かす

Node.js 24 LTSが必要です。`nvm use`でリポジトリ指定のメジャーバージョンを選択できます。

```bash
npm install
npm run dev
```

ブラウザで `http://localhost:3000` を開きます。

## 対応するJSON形式

最小構成は次の形式です。

```json
{
  "segments": [
    { "start": 0, "end": 4.2, "text": "こんにちは", "speaker": "HOST" }
  ]
}
```

次のフィールドも認識します。

- `utterances`
- `results`
- `results.segments`
- `start_time` / `end_time`
- `startTime` / `endTime`
- `transcript`
- ミリ秒単位のタイムスタンプ

## 比較の仕組み

1. 1つ目のファイルを基準タイムラインとして使います。
2. 基準の各時間帯と重なる比較側のセグメントを結合します。
3. 句読点と空白を取り除きます。
4. 文字バイグラムから Sørensen–Dice 係数を計算します。
5. 指定した一致度を下回るセグメントをレビューキューへ追加します。

文字バイグラムは言語固有のトークン化を必要としないため、日本語や複数言語が混在するインタビューにも利用できます。このツールは正解を自動決定しません。人の判断が価値を持つ場所を見つけることに徹します。

## 開発

```bash
npm test
npm run lint
npm run build
```

React、TypeScript、vinext、Cloudflare互換のVite出力で構成しています。比較の中核ロジックは `app/lib/consensus.ts` にあり、ブラウザAPIへ依存しません。

## プライバシー

ファイルはブラウザのメモリ上で解析され、サーバーへ送信されません。レポートもローカルの `Blob` から生成されます。元の文字起こしに機密情報が含まれる場合は、書き出したレポートの共有範囲にも注意してください。

## コントリビューション

不具合報告、新しいJSON形式への対応、アクセシビリティの改善を歓迎します。実際のインタビュー内容ではなく、最小限の合成データを添えてください。

Pull Requestを作成する前に [コントリビューションガイド](CONTRIBUTING.md#日本語) を確認してください。参加者は [行動規範](CODE_OF_CONDUCT.md#日本語) に同意したものとします。

## プロジェクト文書

- [変更履歴](CHANGELOG.md)
- [コントリビューションガイド](CONTRIBUTING.md#日本語)
- [行動規範](CODE_OF_CONDUCT.md#日本語)
- [セキュリティポリシー](SECURITY.md#日本語)
- [サポート方針](SUPPORT.md#日本語)

## ライセンス

[MIT](LICENSE)
