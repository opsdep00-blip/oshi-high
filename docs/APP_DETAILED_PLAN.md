# OSHI-HIGH — 詳細設計書（常時更新）

**目的**: OSHI-HIGH Web アプリの設計・実装情報を一元管理するドキュメント。Leader エージェントが常に最新状態へ更新する。

---

## 1. 概要
- ミッション: 推し活の熱狂を可視化し、ファンの活動（Activity）を推進するプラットフォーム
- コアループ: 広告（YellMaterial）消費 → SupportTransaction → Activity 加算 → ランク/特典
- 技術スタック（現状）: Next.js (App Router), TypeScript, TailwindCSS, Prisma, PostgreSQL, NextAuth (JWT), GCP (Cloud Run, Cloud SQL, Secret Manager)

---

## 2. 現状サマリ
- 実装済み:
  - Pixel-art ベースの `app/login/page.tsx`（2ステップ SMS）
  - Docker/Prisma/DB 初期セットアップ
  - SMS mock ライブラリ `src/lib/sms.ts`（モック & Twilio/Firebase のテンプレ実装あり）
  - NextAuth CredentialsProvider を用いた SMS 認証基盤（修正中）
- 進行中:
  - Firebase Identity Platform を用いた SMS 送信フローに切替（`send` & `verify` API の修正済み）
  - phoneHash の不整合修正（salt-less SHA-256 に統一）
- 決定済み（ユーザー指示）:
  - 本番 SMS プロバイダ: **Firebase Identity Platform** を採用（ステージング用 Firebase プロジェクトのプロビジョニングを必須とする）
  - セッション方式: **JWT のまま**
  - 電話番号ポリシー: **1 phone → 1 user**（電話番号切替はクールダウン制）
  - 電話番号切替クールダウン: **72 時間（3日）**
- 未着手/要検討:
  - Twilio を使った自前OTP運用のコスト見積と比較（必要なら行う）

---

## 3. 優先機能一覧（推奨順）
1. SMS 認証フローの安定化（Firebase モードの E2E テスト）
2. phoneSalt 削除マイグレーション（3段階）
3. ダッシュボード（認証後のユーザー情報表示）
4. SupportTransaction の堅牢化（原子トランザクション・冪等性・ログ）
5. YellMaterial（広告アイテム）CRUD と pixel art editor

---

## 4. 認証・認可 詳細
- 開発: `ENABLE_SMS_MOCK=true` でモック送信
- 本番: `SMS_PROVIDER=firebase`（Identity Platform）の `sessionInfo + code` フローを採用
  - **ステージング用 Firebase プロジェクトを必須**（プロビジョニング TODO を追加）
- セッション: JWT を継続（DB セッションは採用しない）
- 電話番号ポリシー: 1 電話番号は 1 ユーザーに紐づけ、切替は **72時間のクールダウン** を実施
- セキュリティ設計: 電話番号は保存せず、`SHA-256(phone)` のハッシュ（`phoneHash`）のみ DB に保存

---

## 5. SMS ポリシー
- 送信試行制限:
  - **1時間あたり 3 回**
  - **24時間あたり 5 回**
- 失敗時の挙動:
  - ユーザーにエラーを表示し、ユーザー操作で再送を促す
  - 自動リトライは行わない
- フォールバック:
  - Firebase → Twilio の切替は **手動のみ**（自動フェイルオーバはしない）

---

## 6. 電話切替の UI 要件
- 切替は「**切替申請（Switch Request）**」画面を用意し、残りクールダウン時間を明示表示すること
- 切替中に未完了の `SupportTransaction` がある場合は切替を **ブロック**（完了または中断後に再試行可能）

---

## 7. phoneSalt 削除: 3 段階マイグレーション（Zero-downtime）
**前提**: 既存 `phoneSalt` は現在利用されておらず、削除はゼロダウンタイムで可能

### ステップ 1: コード側参照の完全除去（安全デプロイ可）
- やること:
  - Prisma スキーマから `phoneSalt` に関する参照を消す（ただしカラムは DB に残す）
  - 認証ロジック・API・その他コードから `phoneSalt` 参照を削除
  - 全リポジトリで `phoneSalt` の参照検索を実行し未使用を確認
- 注意: この段階では DB にカラムは残す。デプロイは安全（ローリング）

### ステップ 2: DB から `phoneSalt` カラムを削除（マイグレーション）
- 実行予定日: **2026-02-07**（2 週間後）
- やること:
  - `prisma migrate` で `DROP COLUMN` を実行
  - 既存データはそのまま（移行不要）
- 注意: コードは既に参照していないため安全。ダウンタイム不要を想定

### ステップ 3: クリーンアップ
- やること:
  - Prisma クライアント再生成 (`prisma generate`)
  - 型定義・テスト・不要コードの削除
  - テスト実行で回帰確認

### 追記: マイグレーションの運用手順
1. ステージングで Step1→Step2→Step3 をリハーサル
2. 本番では Step1 をデプロイ → モニタリングで問題なしを確認 → Step2 (migration) → Step3
3. ロールバック手順を用意（migration 前のバックアップ）

---

## 8. SupportTransaction の整合性要件
- 処理は必ず**原子トランザクション**で行う（`prisma.$transaction` を利用）
- 冪等性キー:
  - 形式: **UUID**
  - TTL: **24 時間**
- ロールバック挙動: **自動ロールバックのみ**（部分ロールバックは運用負荷が高いため採用しない）
- 監査ログ（必須項目）:
  - `idempotency_key`, `request_payload`, `status`, `user_id`, `timestamp`
- テスト: 同時実行テスト、ネットワーク障害シミュレーション、重複リクエストシミュレーション

---

## 9. 主要ファイル & 責務（更新）
- `src/app/login/page.tsx` — 送信/検証 UI（sessionInfo の保持、sessionInfo+code で検証）
- `src/app/api/auth/sms/send/route.ts` — send API（Firebase 分岐: Firebase は sessionInfo を返す）
- `src/app/api/auth/sms/verify/route.ts` — verify API（Firebase の signInWithPhoneNumber 呼び出し → phoneNumber を取得）
- `src/lib/sms.ts` — SMS 送信ロジック（mock / firebase / twilio の抽象）
- `src/lib/firebaseAdmin.ts` — Firebase Admin 初期化（env から鍵読み込み）
- `src/auth.ts` — NextAuth 設定（CredentialsProvider、JWT）

---

## 10. API 仕様の要点（更新）
- POST `/api/auth/sms/send` — body: { phone }
  - Firebase モード: Returns `{ success, sessionInfo, isNewUser, expiresIn }` (sessionInfo must be stored client-side until verification)
  - Twilio モード: Returns `{ success, phoneHash, isNewUser, expiresIn }`
- POST `/api/auth/sms/verify` — body: { sessionInfo, code } (Firebase)
  - サーバは Firebase の `signInWithPhoneNumber` を呼び出して `phoneNumber` を受け取り、`phoneHash` を算出して User 作成/ログインを実施

---

## 11. DB スキーマ（要約・注記）
- `User` (id, phoneHash UNIQUE, role, ...) — phoneHash はインデックス／ユニーク
- `VerificationToken` は Firebase フローでは不要だが、Twilioモード運用時は利用可能

---

## 12. テスト戦略（更新）
- ユニット: 認証ロジック、hash 関数、lib/sms (mock)
- 統合: Firebase send→verify の E2E（sessionInfo の取り回しを含める）
- E2E: UI（login → dashboard）
- 移行テスト: phoneSalt 削除の各ステップをステージングで検証（smoke + rollback テストを必須化）
- SupportTransaction: 冪等性・同時実行テストを必須化

---

## 13. 監視・バックアップ・アラート
- DB バックアップ: **日次バックアップ、保持期間 30 日**
- アラート閾値:
  - **SMS 失敗率 > 5%**
  - **SupportTransaction 失敗率 > 1%**
- 監視ツール: **Cloud Monitoring** + **Sentry**（エラー追跡）

---

## 14. プライバシー・コンプライアンス
- アカウント削除時: **phoneHash を即時削除**（ログは監査用途のみ保持だが、個人識別子は削除）
- GDPR 対象ユーザー: **いいえ（現状想定なし）**

---

## 15. ロードマップ（短期・中期）
- Short (今週〜1ヶ月):
  - Firebase フローの E2E テスト完了（合格基準: 100% / 10 回）
  - Step1: コードから phoneSalt 参照の削除とデプロイ（実施済 or 実施予定）
- Mid (1〜3ヶ月):
  - Step2: DB から phoneSalt を削除する migration 実施（予定日: 2026-02-07）
  - SupportTransaction の冪等性対応とテスト（TTL: 24 時間）
- Long (3ヶ月〜):
  - ダッシュボード、YellMaterial エディタ、ミニゲーム基盤へ着手

---

## 16. TODO & 進捗ログ (leader-managed)
- [2026-01-18] phoneHash salt-less 化を実施（send と auth の検索ロジックを修正） — 実装済
- [2026-01-18] `src/lib/firebaseAdmin.ts` を追加、Firebase 初期化処理を追加 — 実装済
- [2026-01-18] `src/lib/sms.ts` を修正し Firebase / Twilio モードを実装 — 実装済
- [2026-01-24] **決定**: `SMS_PROVIDER=firebase` を採用、JWT 継続、1phone→1user、電話切替クールダウン72時間 — 決定済
- [2026-01-24] TODO: **Provision STAGING Firebase project** — 担当: @team
- [2026-01-24] Step1: コードから phoneSalt 参照を完全に削除 → 担当: @teamlead (タスク登録済)
- [2026-02-07] Step2: DB から phoneSalt カラムを削除（マイグレーション）→ ステージング検証後 実施 → 担当: @teamlead
- [NEXT] SupportTransaction: 冪等性キー (UUID, TTL24h) + `prisma.$transaction` 内で監査ログ作成を実装 → 担当: @teamlead

---

## 17. 更新手順（Leader エージェント向け）
1. 進捗が発生したら `manage_todo_list` を更新（ID/題目/状態）する
2. ドキュメントの `TODO & 進捗ログ` セクションにタイムスタンプ付きで要約を書く
3. 大きな設計変更は、変更前の状態と影響範囲を明記し、移行手順を提示

---

*このファイルは Leader エージェントにより管理され、必要な都度更新されます。変更を希望する場合は、Leader に指示し、エージェントと対話して仕様を確定してください。*