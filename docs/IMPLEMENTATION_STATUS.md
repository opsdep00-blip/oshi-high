## [Dev Cleanup: Logging, Deprecations, Docs]

**日時**: 2026-02-02
**ステータス**: ✅ 完了

### 実装内容
- **A**: セキュリティ修正
  - `console.log(process.env.DATABASE_URL)` を削除
  - Debug API / SMS ライブラリの `console.*` を `src/lib/logger` に置換
- **B**: 不要コード整理
  - コメント化された不要実装の確認（`CredentialsProvider` の実装は mock 用で現状使用しているため削除は見送り）
- **C**: `phoneSalt` の扱いに関する指針を追加
  - `prisma/schema.prisma` に deprecation 注記を追加
  - `docs/DEPRECATIONS.md` を追加して、backfill / migration の手順を提案
- **D**: ログの統一化（`logger` 利用）
  - `src/lib/sms.ts`, `src/app/api/debug/sms/*`, `src/app/api/idols/*`, `src/app/api/users/route.ts`, `src/auth.ts` で `console.*` → `logger.*` に変更
- **E**: ドキュメント更新
  - `docs/LOCAL_DEVELOPMENT.md` にデバッグエンドポイントのセキュリティ注意を追加

### 変更ファイル（抜粋）
- `src/app/api/debug/sms/send/route.ts`
- `src/app/api/debug/sms/verify/route.ts`
- `src/lib/sms.ts`
- `src/app/api/idols/route.ts`
- `src/app/api/idols/[id]/route.ts`
- `src/app/api/users/route.ts`
- `src/auth.ts`
- `prisma/schema.prisma`
- `docs/DEPRECATIONS.md`
- `docs/LOCAL_DEVELOPMENT.md`

### テスト結果
- ユニットテスト: ✅ 8/8 passed
- TypeScript 型チェック: ✅ OK

### メモ
- `phoneSalt` 削除は**本番影響が大きいため保留**。上記 `docs/DEPRECATIONS.md` に migration/backfill プランを記載しました。
- 追加の希望（例: `phoneSalt` を用いた v2 ハッシュの実装 + backfill スクリプト作成）は次フェーズとして対応可能。

## [Hotfix: Auth and Logging Cleanup]

**日時**: 2026-02-08
**ステータス**: ✅ 完了

### 実装内容
- 本番での個人情報リーク防止のため、電話番号のクライアント側デバッグログを本番非表示に変更しました
- `GET /api/users` に認証および管理者権限チェックを追加しました
- `PATCH /api/idols/:id` に認証および所有者/管理者権限チェックを追加しました
- 上記を検証するユニットテストを追加しました

### 変更ファイル
- `src/app/account/phone-verification.tsx`
- `src/app/api/users/route.ts`
- `src/app/api/idols/[id]/route.ts`
- `src/app/api/__tests__/users.route.test.ts`
- `src/app/api/idols/__tests__/idols.route.test.ts`

### テスト結果
- テスト（`vitest`）を追加しました。ローカルで `pnpm` を利用できる環境での実行を推奨します。

### メモ
- `src/lib/sms.ts` の "TODO: Implement actual SMS sending" は今後のタスクとして残します。
