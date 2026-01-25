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
- **Cloud Run 自動デプロイ**: `cloud-run.yml` ✅ **既に実装済み**
  - トリガー: `main` ブランチへの push または `workflow_dispatch` (手動)
  - 自動: Docker ビルド → Artifact Registry → Cloud Run
  - Service: `oshi-service` (本番)
- **Cloud Build 統合**: `cloudbuild.yaml` ✅ **既に実装済み**
  - GCP Cloud Build でも自動ビルド・デプロイ可能

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

### Phase 1: GitHub Secrets 設定（Secrets の確認） ⏳
既存の `cloud-run.yml` で必要な Secrets:

```bash
# 既に登録されているか確認
gh secret list

# 必要な Secrets（未設定の場合）
gh secret set GCP_SA_KEY_JSON --body "$(cat path/to/service-account.json)"
gh secret set GCP_PROJECT_ID --body "oshi-high"
gh secret set GCP_ARTIFACT_REPO --body "docker-repo"
gh secret set GCP_SERVICE_NAME --body "oshi-service"
```

### Phase 2: 自動デプロイテスト
```bash
# 既存の cloud-run.yml で自動実行
git push origin fix/agent-handoffs:main

# または GitHub Actions UI から手動実行
# → Actions タブ → "Deploy to Cloud Run" → "Run workflow"

# デプロイ確認
gcloud run services list --region=asia-northeast1 --project=oshi-high
gcloud run services describe oshi-service --region=asia-northeast1 --project=oshi-high
```

### Phase 3: Cloud Build 統合の確認
```bash
# Cloud Build の自動トリガーが設定されているか確認
gcloud builds list --limit=5

# 手動トリガー
gcloud builds submit --config=cloudbuild.yaml
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
