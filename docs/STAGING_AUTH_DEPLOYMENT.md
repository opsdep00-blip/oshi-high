# ステージング環境への認証デプロイ手順

**目的**: ローカルウォークスルー完成後、GCP Staging 環境での Google OAuth + SMS 認証の展開

**完成日時**: 2026-02-07（ローカル環境完成）
**ステップ**: Staging → Production の段階的展開

---

## 📋 デプロイ計画（5フェーズ）

### Phase 1: GCP リソース準備（Infrastructure）

**期限** 1-2日
**担当** Developer エージェント

#### Task 1.1 GCP Service Account 確認
- [ ] GCP Console で `terraform-staging` Service Account 存在確認
- [ ] 必要ロール: `Editor` (簡略), または `Cloud Run Admin`, `Cloud SQL Admin`, `Secret Manager Secret Accessor`
- [ ] ローカルに `infra/staging/sa-key.json` が存在
- [ ] git .gitignore に含まれていることを確認

#### Task 1.2 Cloud SQL Staging インスタンス作成
- [ ] GCP_SETUP.md のステップ 2-3 に従い Terraform で作成
- [ ] PostgreSQL 15, asia-northeast1, Always-free tier（開発費用削減）
- [ ] パスワード生成: `openssl rand -base64 32`
- [ ] インスタンス接続情報取得:
  ```bash
  gcloud sql instances describe oshi-high-staging-db \
    --format='get(connectionName)'
  # 出力例: oshi-high:asia-northeast1:oshi-high-staging-db
  ```

#### Task 1.3 Cloud Run Staging サービス作成
- [ ] Terraform で `oshi-service-staging` Cloud Run サービス定義
- [ ] リージョン: `asia-northeast1`
- [ ] メモリ: 512MB（Staging 想定）
- [ ] ポートマッピング: 3000
- [ ] Service Account: `cloud-run-staging@oshi-high.iam.gserviceaccount.com`
- [ ] コールドスタート対応: concurrency 設定

**関連ファイル提案**:
```
infra/staging/
├── main.tf         (GCP プロバイダー設定)
├── cloud-sql.tf    (Cloud SQL インスタンス)
├── cloud-run.tf    (Cloud Run サービス)
├── secret-manager.tf (Secret Manager キー定義)
└── terraform.tfvars (環境別変数)
```

---

### Phase 2: GitHub Secrets 設定

**期限** 0.5-1日
**担当** Lead または DevOps

#### Task 2.1 GCP Service Account Key を GitHub Secret に登録
- [ ] Secret 名: `GCP_SA_KEY`
- [ ] 値: `infra/staging/sa-key.json` の内容（JSON）
- [ ] スコープ: Repository (または Environment 別)
- [ ] 確認: GitHub Actions ログで base64 decode 成功

#### Task 2.2 Staging 環 환경変数 Secret 登録

| Secret 名 | 説明 | 例 |
|-----------|------|-----|
| `STAGING_DATABASE_URL` | Cloud SQL 接続文字列 | `postgresql://oshi_user:PASSWORD@35.x.x.x:5432/oshi_staging` |
| `STAGING_NEXTAUTH_URL` | NextAuth コールバック URL | `https://staging-oshi-high.run.app` (Cloud Run URL) または `https://staging.oshi-high.jp` |
| `STAGING_NEXTAUTH_SECRET` | NextAuth 署名キー | `openssl rand -base64 32` で生成 |
| `STAGING_JWT_SECRET` | JWT 署名キー | `openssl rand -base64 32` で生成 |
| `STAGING_SESSION_SECRET` | セッション署名キー | `openssl rand -base64 32` で生成 |
| `STAGING_GOOGLE_CLIENT_ID` | Google OAuth Client ID | GCP Console より取得 |
| `STAGING_GOOGLE_CLIENT_SECRET` | Google OAuth Secret | GCP Console より取得 |
| `STAGING_PHONE_HASH_SECRET` | 電話ハッシング HMAC キー | `openssl rand -hex 32` で生成 |
| `STAGING_NEXT_PUBLIC_FIREBASE_API_KEY` | Next.js 用クライアント Firebase API キー（ビルド時に埋め込む） | `AIza...` |
| `STAGING_NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Next.js 用 Firebase authDomain（例: *.firebaseapp.com） | `oshi-high-485811.firebaseapp.com` |
| `STAGING_NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Next.js 用 Firebase projectId | `oshi-high-485811` |
| `STAGING_NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Next.js 用 Storage bucket | `oshi-high-485811.firebasestorage.app` |
| `STAGING_NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Next.js 用 messagingSenderId | `35997924832` |
| `STAGING_NEXT_PUBLIC_FIREBASE_APP_ID` | Next.js 用 appId | `1:35997924832:web:...` |

**参考**: docs/GITHUB_SECRETS_SETUP.md

---

### Phase 3: Google OAuth Staging 設定

**期限** 1-2日
**担当** Codex（実装） + Lead（確認）

#### Task 3.1 GCP Console で OAuth 2.0 Staging Client 作成
1. **GCP Console** → 認証情報 → 「認証情報を作成」 → 「OAuth 2.0 クライアント ID」
2. **アプリケーションの種類**: ウェブアプリケーション
3. **名前**: `oshi-high-staging-web`
4. **認可済みリダイレクト URI**:
   ```
   https://staging-oshi-high.run.app/api/auth/callback/google
   https://localhost:3000/api/auth/callback/google    (ローカル検証用)
   ```
5. **クライアント ID・シークレット取得**
6. GitHub Secret に登録: `STAGING_GOOGLE_CLIENT_ID`, `STAGING_GOOGLE_CLIENT_SECRET`

#### Task 3.2 NextAuth.js 設定: env.staging ファイル作成（または Secret Manager 利用）
- [ ] Cloud Run 環境変数で動的注入（推奨）
  ```
  NEXTAUTH_SECRET=${STAGING_NEXTAUTH_SECRET}
  NEXTAUTH_URL=${STAGING_NEXTAUTH_URL}
  GOOGLE_CLIENT_ID=${STAGING_GOOGLE_CLIENT_ID}
  GOOGLE_CLIENT_SECRET=${STAGING_GOOGLE_CLIENT_SECRET}
  ```
- [ ] または GCP Secret Manager に保存して Cloud Run がマウント

#### Task 3.3 テスト
- [ ] Staging Cloud Run にデプロイ後、`https://staging-oshi-high.run.app/login`
- [ ] "Google でサインイン" リンク表示
- [ ] Google OAuth flow 完走
- [ ] Account ページ表示（`/account`）

---

### Phase 4: SMS Staging 設定

**期限** 2-3日
**担当** Codex

#### Task 4.1 SMS プロバイダー選定

Use **Firebase Admin SDK** (推奨):
- [ ] Firebase Project (GCP と同一) で Firebase プロジェクトを有効化
- [ ] Firebase Console → Authentication → Phone Authentication を有効化
- [ ] Service Account キー生成 & GitHub Secret に登録
- [ ] Env: `SMS_PROVIDER=firebase`, `FIREBASE_PROJECT_ID=oshi-high`, `FIREBASE_CLIENT_EMAIL=...`, `FIREBASE_PRIVATE_KEY=...`



#### Task 4.2 環境変数設定
```env
# .env.staging (Secret Manager または Cloud Run 環境変数)
ENABLE_SMS_MOCK=false                                 # Staging では実送信
# SMS_PROVIDER=firebase (推奨)
SMS_PROVIDER=firebase
FIREBASE_PROJECT_ID=${STAGING_FIREBASE_PROJECT_ID}
FIREBASE_CLIENT_EMAIL=${STAGING_FIREBASE_CLIENT_EMAIL}
FIREBASE_PRIVATE_KEY=${STAGING_FIREBASE_PRIVATE_KEY}  # JSON の private_key をそのまま登録
SMS_SEND_LIMIT_PER_HOUR=5
PHONE_HASH_SECRET=${STAGING_PHONE_HASH_SECRET}
```
#### Task 4.3 実装: src/lib/sms.ts 更新
- [ ] `sendViaFirebase()` 実装（Firebase Admin SDK 使用）

- [ ] ハンドラーtest 実装: `src/lib/__tests__/sms.test.ts`

#### Task 4.4 テスト
- [ ] Staging `/account` ページ、Phone Verification フォーム
- [ ] 実際の Japanese 電話番号 (test 用) で SMS 送信テスト
- [ ] SMS 受信 & コード確認
- [ ] Account ページで "Phone verified: Yes" が表示

---

### Phase 5: Cloud Run Staging デプロイ

**期限** 1-2日
**担当** Developer + Codex

#### Task 5.1 GitHub Actions ワークフロー設定 (既存確認)
- [ ] `.github/workflows/cloud-run.yml` 存在確認
- [ ] `develop` ブランチ push 時に自動実行
- [ ] 環境変数注入セクション確認:\
  ```yaml
  env:
    DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
    NEXTAUTH_URL: ${{ secrets.STAGING_NEXTAUTH_URL }}
    NEXTAUTH_SECRET: ${{ secrets.STAGING_NEXTAUTH_SECRET }}
    GOOGLE_CLIENT_ID: ${{ secrets.STAGING_GOOGLE_CLIENT_ID }}
    GOOGLE_CLIENT_SECRET: ${{ secrets.STAGING_GOOGLE_CLIENT_SECRET }}
    SMS_PROVIDER: firebase
    FIREBASE_PROJECT_ID: oshi-high
    FIREBASE_CLIENT_EMAIL: ${{ secrets.STAGING_FIREBASE_CLIENT_EMAIL }}
    FIREBASE_PRIVATE_KEY: ${{ secrets.STAGING_FIREBASE_PRIVATE_KEY }}
  ```

#### Task 5.2 Dockerfile / Cloud Run イメージビルド確認
- [ ] Dockerfile: Node.js alpine base, `npm run build`, `npm start`
- [ ] ENV_FILE 注入タイミング確認（ビルドタイム or ランタイム）
- [ ] Secret Manager マウント確認（オプション）

#### Task 5.3 Cloud Run デプロイ実行
```bash
# ローカルテスト（オプション）
cd oshi-high
docker build -t oshi-service-staging:latest .

# または GitHub Actions で push
git push origin develop

# GitHub Actions ログで実行確認
# https://github.com/opsdep00/oshi-high/actions
```

#### Task 5.4 Staging URL & 動作確認
- [ ] Cloud Run URL 確認: `https://oshi-service-staging-xxx.run.app`
- [ ] または カスタムドメイン: `https://staging-oshi-high.run.app`
- [ ] ホームページ `/` 表示
- [ ] ログインフロー: `/login` → Google OAuth → `/account`
- [ ] SMS フロー: `/account` → Phone Verification → SMS 送信・受信 → Verified

---

## 🔄 Production 環境 (Phase 6)

**タイミング**: Staging 全テスト 完了 & Lead 承認後

### Task 6.1 本番環境リソース作成 (Terraform)
- [ ] `infra/production/` ディレクトリ作成
- [ ] Cloud SQL 本番インスタンス: `oshi-high-prod-db`
- [ ] Cloud Run 本番サービス: `oshi-service`
- [ ] バックアップ、監視、アラート設定

### Task 6.2 本番 Google OAuth アプリ登録
- [ ] GCP Console で本番用 OAuth Client ID 作成
- [ ] Redirect URI: `https://oshi-high.jp/api/auth/callback/google`
- [ ] GitHub Secret: `PROD_GOOGLE_CLIENT_ID`, `PROD_GOOGLE_CLIENT_SECRET`

### Task 6.3 本番 SMS プロバイダー設定
- [ ] Firebase で本番環境専用設定（推奨）
- [ ] 日本国内対応の電話番号・プロバイダー確保（Firebase が必要な場合）
- [ ] レート制限・コスト管理設定

### Task 6.4 本番デプロイ (手動承認)
- [ ] `main` ブランチへ PR・マージ
- [ ] GitHub Actions: `cloud-run-prod.yml` が手動承認待ち
- [ ] Lead が確認後、「Approve and Deploy」実行
- [ ] デプロイ完了 → `https://oshi-high.jp` 疎通確認

---

## 📊 進捗ログ

| フェーズ | タスク | ステータス | 完了日 | 担当 | メモ |
|---------|--------|-----------|--------|------|------|
| Phase 1 | GCP リソース準備 | ⏳ 未開始 | - | Developer | Task 1.1 から開始 |
| Phase 2 | GitHub Secrets | ⏳ 未開始 | - | Lead | GCP_SA_KEY は既設定? |
| Phase 3 | Google OAuth Staging | ⏳ 未開始 | - | Codex | OAuth 設定後テスト |
| Phase 4 | SMS Staging | ⏳ 未開始 | - | Codex | Firebase 構成完了後 |
| Phase 5 | Cloud Run Staging | ⏳ 未開始 | - | Developer | Workflow 確認から |
| Phase 6 | Production | ⏳ 未開始 | - | All | Staging 完了後 |

---

## 🤝 質問・ブロッカー

- [ ] Firebase（既定）で運用する
- [ ] Domain: custom domain (`staging.oshi-high.jp`) をセットアップ済み？
- [ ] SSL/TLS: Cloud Run の managed certificate or 既存?
- [ ] 本番 GCP プロジェクト: 同一 or 別プロジェクト?
