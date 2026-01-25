# OSHI-HIGH 環境構築完了ガイド

✅ **基本開発環境・インフラストラクチャの自動化がすべて完成しました。**

---

## 📊 完成したもの

### 1. ✅ ローカル開発環境
- **PostgreSQL 15** (Docker): `localhost:5432`
- **Redis 7** (Docker): `localhost:6379`
- **MinIO** (S3-互換): `localhost:9000-9001`
- **Prisma ORM** + マイグレーション実行済み
- **Next.js API** 基本エンドポイント実装済み

**起動方法:**
```bash
docker-compose up -d
npm run dev
# http://localhost:3000 でアクセス
```

---

### 2. ✅ GCP インフラストラクチャ（自動化）
- **Terraform** で Staging + Production リソース自動化
- **Cloud SQL** (PostgreSQL 15)
  - Staging: `db-f1-micro` (開発用)
  - Production: `db-custom-4-16384` (本番用, REGIONAL HA)
- **Cloud Storage** (GCS)
  - Staging: `oshi-high-staging-assets` (3 versions)
  - Production: `oshi-high-prod-assets` (5 versions, protected)
- **Secret Manager** でパスワード安全管理

**状態確認:**
```bash
cd infra/staging
terraform plan      # 変更予定を確認
terraform apply     # リソース作成

cd ../prod
terraform plan
terraform apply
```

---

### 3. ✅ CI/CD パイプライン（自動化）

#### Terraform パイプライン
- **PR検証**: `terraform-staging-plan.yml` / `terraform-prod-plan.yml`
- **自動適用**: `terraform-staging-apply.yml`
- **手動デプロイ**: `terraform-prod-apply.yml`

#### アプリケーション デプロイパイプライン
- **Staging 自動デプロイ**: `app-deploy-staging.yml`
  - トリガー: `main` ブランチへの push
  - 自動: Docker ビルド → Artifact Registry → Cloud Run
- **Production 手動デプロイ**: `app-deploy-prod.yml`
  - トリガー: `workflow_dispatch` (GitHub Actions UI から手動実行)
  - 環境保護: Production environment の手動承認

---

### 4. ✅ Prisma データベーススキーマ

**作成テーブル (8 個):**
1. `User` - ユーザー（ファン・推し・管理者）
2. `Account` - SNS/SMS 認証アカウント
3. `Session` - NextAuth セッション
4. `VerificationToken` - SMS/Email 認証トークン
5. `Idol` - 推しプロフィール
6. `Ad` - スポンサー広告
7. `YellMaterial` - ドット絵素材（32x32 pixel art）
8. `SupportTransaction` - 推し支援取引記録

**実行済み:**
```bash
npm run prisma:migrate        # マイグレーション実行（ローカル）
docker-compose ps             # DB 確認
docker exec oshi-high-postgres psql -U oshi_user -d oshi_local -c "\dt"  # テーブル確認
```

---

### 5. ✅ API エンドポイント（実装済み）

| エンドポイント | メソッド | 説明 | 状態 |
|-------|---------|------|------|
| `/api/idols` | GET | 全推し取得 | ✅ 動作確認済み |
| `/api/idols` | POST | 推し作成 | ✅ 動作確認済み |
| `/api/idols/:id` | GET | 推し詳細取得 | ✅ 実装済み |
| `/api/idols/:id` | PATCH | 推し更新 | ✅ 実装済み |
| `/api/users` | GET | ユーザー一覧 | ✅ 実装済み |

**テスト方法:**
```bash
# ローカルで API テスト
curl.exe http://localhost:3000/api/idols

# または PowerShell
$body = @{ name = "My Idol"; snsHandle = "@myidol" } | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost:3000/api/idols" -Method POST -ContentType "application/json" -Body $body -UseBasicParsing | ConvertFrom-Json | ConvertTo-Json
```

---

## 🚀 次のステップ（Developer の役割）

### Phase 1: GitHub Secrets 設定 ⏳
```bash
# 1. Database URL 取得
gcloud sql instances describe oshi-high-staging-db --project=oshi-high --format='get(connectionName)'
# 出力: oshi-high:asia-northeast1:oshi-high-staging-db

# 2. パスワード取得
gcloud secrets versions access latest --secret="staging-db-password" --project=oshi-high

# 3. GitHub Secrets 登録
gh secret set STAGING_DATABASE_URL --body "postgresql://oshi_user:PASSWORD@/oshi_local?host=/cloudsql/oshi-high:asia-northeast1:oshi-high-staging-db"
gh secret set STAGING_NEXTAUTH_URL --body "http://localhost:3000"
gh secret set PROD_DATABASE_URL --body "postgresql://oshi_user:PASSWORD@/oshi_local?host=/cloudsql/oshi-high:asia-northeast1:oshi-high-prod-db"
gh secret set PROD_NEXTAUTH_URL --body "https://oshi-high.jp"
gh secret set NEXTAUTH_SECRET --body "$(openssl rand -base64 32)"

# ドキュメント: docs/GITHUB_SECRETS_SETUP.md
```

### Phase 2: Artifact Registry セットアップ
```bash
# Artifact Registry を有効化
gcloud services enable artifactregistry.googleapis.com --project=oshi-high

# Docker リポジトリ作成
gcloud artifacts repositories create docker-repo \
  --repository-format=docker \
  --location=asia-northeast1 \
  --project=oshi-high
```

### Phase 3: Cloud Run Service アカウント設定
```bash
# Cloud Run 実行用サービスアカウント作成
gcloud iam service-accounts create cloud-run-app \
  --display-name="Cloud Run Application" \
  --project=oshi-high

# Cloud SQL Client IAM ロール付与
gcloud projects add-iam-policy-binding oshi-high \
  --member=serviceAccount:cloud-run-app@oshi-high.iam.gserviceaccount.com \
  --role=roles/cloudsql.client

# Artifact Registry 読み取り権限
gcloud projects add-iam-policy-binding oshi-high \
  --member=serviceAccount:cloud-run-app@oshi-high.iam.gserviceaccount.com \
  --role=roles/artifactregistry.reader
```

### Phase 4: Staging デプロイテスト
```bash
# 1. main ブランチに push
git push origin fix/agent-handoffs:main

# 2. GitHub Actions で自動デプロイ実行
# → app-deploy-staging.yml が自動実行

# 3. Cloud Run で確認
gcloud run services list --region=asia-northeast1 --project=oshi-high
gcloud run services describe oshi-high-staging --region=asia-northeast1 --project=oshi-high

# 4. Health check
STAGING_URL=$(gcloud run services describe oshi-high-staging --region=asia-northeast1 --format='value(status.url)' --project=oshi-high)
curl $STAGING_URL/api/idols
```

### Phase 5: Production デプロイ準備
```bash
# 1. リリース版タグをつける
git tag v1.0.0-staging
git push origin v1.0.0-staging

# 2. Docker イメージをビルド & Push
docker build -t asia-northeast1-docker.pkg.dev/oshi-high/docker-repo/oshi-high-app:v1.0.0 .
docker push asia-northeast1-docker.pkg.dev/oshi-high/docker-repo/oshi-high-app:v1.0.0

# 3. GitHub Actions で手動デプロイ
# → Actions タブ → "Deploy Application to Cloud Run (Production)" 
# → "Run workflow" → version: "v1.0.0"

# 4. Production 確認
PROD_URL=$(gcloud run services describe oshi-high-production --region=asia-northeast1 --format='value(status.url)' --project=oshi-high)
curl $PROD_URL/api/idols
```

---

## 📚 ドキュメント一覧

| ドキュメント | 用途 |
|-----------|------|
| [INFRASTRUCTURE_SETUP.md](INFRASTRUCTURE_SETUP.md) | GCP リソース詳細 & 接続情報 |
| [OPERATIONS_GUIDE.md](OPERATIONS_GUIDE.md) | 運用手順 & Secret 管理 |
| [LOCAL_DEVELOPMENT.md](docs/LOCAL_DEVELOPMENT.md) | ローカル環境セットアップ |
| [GITHUB_SECRETS_SETUP.md](docs/GITHUB_SECRETS_SETUP.md) | GitHub Actions シークレット設定 |

---

## 🔧 よく使う Developer コマンド

### インフラ管理
```bash
# Staging を確認・更新
cd infra/staging
terraform init
terraform plan
terraform apply -auto-approve

# Production を確認・更新
cd ../prod
terraform plan
terraform apply  # 手動承認必須

# State ファイル確認
terraform output
terraform state list
```

### アプリケーション
```bash
# ローカル開発
npm run dev                    # Next.js 起動
npm run prisma:studio         # Prisma UI
npm run prisma:migrate        # マイグレーション実行

# ビルド & デプロイ
npm run build                  # 本番ビルド
docker build -t oshi-high-app .  # Docker イメージビルド

# テスト
curl http://localhost:3000/api/idols
curl -X POST http://localhost:3000/api/idols -H "Content-Type: application/json" -d '{"name": "Test"}'
```

### Git & CI/CD
```bash
# コミット・プッシュ
git add .
git commit -m "feat: description"
git push origin fix/agent-handoffs:main

# ワークフロー実行
gh workflow list
gh workflow run app-deploy-staging.yml
gh workflow run app-deploy-prod.yml -f version=v1.0.0
```

---

## ⚠️ 重要な注意事項

### セキュリティ
- ❌ `.env.local` はコミットしない（`.gitignore` で除外）
- ❌ Service Account JSON キーをコミットしない
- ✅ 全シークレットは GitHub Secrets または GCP Secret Manager に保存

### 環境分離
- **Staging**: 自動デプロイ（main push）→ 開発・テスト用
- **Production**: 手動デプロイ（workflow_dispatch）→ 本番環境

### Cloud SQL 接続
- **ローカル**: `postgresql://oshi_user:password@localhost:5432/oshi_local`
- **Cloud Run**: `postgresql://oshi_user:password@/oshi_local?host=/cloudsql/oshi-high:region:instance`

---

## ✅ 完成チェックリスト

- [x] ローカル Docker Compose 環境
- [x] GCP Terraform インフラストラクチャ
- [x] Prisma スキーマ & マイグレーション
- [x] Next.js API エンドポイント
- [x] GitHub Actions CI/CD パイプライン
- [x] Dockerfile & Cloud Run デプロイ設定
- [ ] GitHub Secrets 設定（次: 🚀 Phase 1）
- [ ] Artifact Registry セットアップ（次: 🚀 Phase 2）
- [ ] Cloud Run Service Account（次: 🚀 Phase 3）
- [ ] Staging デプロイテスト（次: 🚀 Phase 4）
- [ ] Production デプロイ準備（次: 🚀 Phase 5）

---

**Status**: 🚀 **Ready for deployment configuration**  
**Last Updated**: January 25, 2026  
**Owner**: Developer Agent (インフラストラクチャ統括)
