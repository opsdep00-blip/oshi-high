This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## SMS (Firebase) — 開発者向けメモ 🔧

このプロジェクトでは SMS ベースの電話番号検証に **Firebase** を使用します。開発時はモック（`ENABLE_SMS_MOCK=true`）を使い、本番では Firebase のサービスアカウントを使って送信してください。

### 有効化（環境変数）
- 開発（モック）:
  - `ENABLE_SMS_MOCK=true` — 実際には送信せずログ出力します。
- 本番/ステージング（Firebase）:
  - `SMS_PROVIDER=firebase` (デフォルト)
  - `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` を Secret Manager / GitHub Secrets に登録し、Cloud Run 環境に注入してください。

※ `.env.local` に本番の秘密情報を置かないでください。Secret Manager / GitHub Secrets を使用してください。

### 実装箇所
- 実際の送信ロジックは `src/lib/sms.ts` に実装済みです（Firebase 経由）。
- Firebase の REST API (`accounts:sendVerificationCode`) を利用して `sessionInfo` を取得し、クライアントでの OTP 検証フローと連携します。
- 送信対象は E.164 形式の電話番号（例: `+8190XXXXXXX`）を期待します。
- 生の電話番号は DB に保存せず、`phoneHash`（HMAC-SHA256）で照合します。

### テスト/開発の流れ
1. 開発時は `ENABLE_SMS_MOCK=true` にしておく（コンソールにコードが出ます）。
2. Firebase 実運用では、Firebase コンソールで「Phone Authentication」を有効化してください。
3. Cloud Run / 本番環境へ反映する際は、Firebase のサービスアカウント情報を Secret Manager → Cloud Run に展開してください。

### 運用上の注意
- SMS はコストが発生します。送信頻度の制御・レートリミット（既に実装済み）を必ず有効にしてください。`src/lib/rateLimiter` を参照。
- 電話番号の取り扱いは個人情報に該当します。法令に従って管理してください。

---

必要なら、この README の内容を `docs/SMS.md` に分割して、より詳しい手順（Firebase Phone Authentication の設定手順、失敗時のリトライポリシーなど）を追記します。どちらがよいですか？