# Security Policy

[English](#english) | [日本語](#日本語)

## English

### Supported versions

Only the latest version on the `main` branch is supported with security updates.

### Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Use GitHub's **Security → Report a vulnerability** flow for this repository. Include the affected behavior, reproduction steps, impact, and any suggested mitigation. Do not include real transcript data.

You should receive an initial response within seven days. Please allow time for investigation and a coordinated fix before public disclosure.

### Security model

Transcript files are parsed in browser memory. The application does not intentionally upload transcript contents, require credentials, or persist transcripts on a server. A vulnerability that violates these guarantees is considered high priority.

## 日本語

### サポート対象

`main` ブランチの最新版だけをセキュリティ更新の対象とします。

### 脆弱性の報告

脆弱性の疑いがある場合は、公開Issueを作らないでください。このリポジトリの **Security → Report a vulnerability** から非公開で報告してください。影響する動作、再現手順、想定される影響、対策案があれば記載してください。実際の文字起こしデータは含めないでください。

7日以内の初回返信を目標とします。調査と修正の公開準備が整うまで、情報公開をお待ちください。

### セキュリティモデル

文字起こしファイルはブラウザのメモリ上で解析されます。アプリは文字起こし内容を意図的にアップロードせず、認証情報を要求せず、サーバーへ保存しません。この保証を破る脆弱性は優先度を高く扱います。
