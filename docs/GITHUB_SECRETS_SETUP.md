# GitHub Secrets Configuration for OSHI-HIGH

GitHub Actions ワークフローで使用するシークレットの設定手順です。

## 🔐 必須 Secrets

### インフラストラクチャ

| Secret | 説明 | 例 | 注意 |
|--------|------|-----|------|
| `GCP_SA_KEY` | GCP Service Account JSON キー | `{"type": "service_account", ...}` | Staging/Prod 共用 |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Workload Identity Provider ID | `projects/123/locations/global/workloadIdentityPools/...` | オプション（WIF使用時） |
| `GCP_SERVICE_ACCOUNT_EMAIL` | Service Account メール | `terraform-staging@oshi-high.iam.gserviceaccount.com` | オプション（WIF使用時） |

### Staging 環境

| Secret | 説明 | 取得方法 |
|--------|------|---------|
| `STAGING_DATABASE_URL` | Cloud SQL 接続文字列 | `gcloud sql instances describe oshi-high-staging-db --format='get(connectionName)'` |
| `STAGING_NEXTAUTH_URL` | NextAuth URL | `https://staging.oshi-high.jp` (本番時) |
| `STAGING_REDIS_URL` | Redis 接続文字列 | Memorystore for Redis (オプション) |

### Production 環境

| Secret | 説明 | 取得方法 |
|--------|------|---------|
| `PROD_DATABASE_URL` | Cloud SQL 接続文字列 | `gcloud sql instances describe oshi-high-prod-db --format='get(connectionName)'` |
| `PROD_NEXTAUTH_URL` | NextAuth URL | `https://oshi-high.jp` |
| `PROD_REDIS_URL` | Redis 接続文字列 | Memorystore for Redis (オプション) |

### アプリケーション

| Secret | 説明 | 生成方法 |
|--------|------|---------|
| `NEXTAUTH_SECRET` | NextAuth 署名キー | `openssl rand -base64 32` |

---

## 📝 設定手順

### 1. Terraform Secret (既設定)

```bash
# 既に設定済み（セットアップ後）
# GitHub Secrets: GCP_SA_KEY → Terraform で使用
```

### 2. Staging Database Secret

```bash
# Staging Cloud SQL 接続文字列を取得
gcloud sql instances describe oshi-high-staging-db \
  --project=oshi-high \
  --format='value(connectionName)'

# 出力例: oshi-high:asia-northeast1:oshi-high-staging-db
# これを使って DATABASE_URL を作成:
# postgresql://oshi_user:${PASSWORD}@/oshi_local?host=/cloudsql/oshi-high:asia-northeast1:oshi-high-staging-db
```

GitHub Secrets に追加：
```bash
gh secret set STAGING_DATABASE_URL --body "postgresql://oshi_user:PASSWORD@/oshi_local?host=/cloudsql/oshi-high:asia-northeast1:oshi-high-staging-db"
gh secret set STAGING_NEXTAUTH_URL --body "http://localhost:3000"  # 開発時
```

### 3. Production Database Secret

```bash
# Production Cloud SQL 接続文字列を取得
gcloud sql instances describe oshi-high-prod-db \
  --project=oshi-high \
  --format='value(connectionName)'

# 出力例: oshi-high:asia-northeast1:oshi-high-prod-db
```

GitHub Secrets に追加：
```bash
gh secret set PROD_DATABASE_URL --body "postgresql://oshi_user:PASSWORD@/oshi_local?host=/cloudsql/oshi-high:asia-northeast1:oshi-high-prod-db"
gh secret set PROD_NEXTAUTH_URL --body "https://oshi-high.jp"
```

### 4. NextAuth Secret

```bash
# 32 文字のランダムキー生成
openssl rand -base64 32

# GitHub Secrets に追加
gh secret set NEXTAUTH_SECRET --body "YOUR_GENERATED_SECRET"
```

---

## 🔄 Database URL Format

**Cloud SQL with Unix Domain Socket:**
```
postgresql://USERNAME:PASSWORD@/DATABASE_NAME?host=/cloudsql/PROJECT:REGION:INSTANCE
```

例：
```
postgresql://oshi_user:my_password@/oshi_local?host=/cloudsql/oshi-high:asia-northeast1:oshi-high-staging-db
```

**パスワード取得方法:**
```bash
# GCP Secret Manager から取得
gcloud secrets versions access latest --secret="staging-db-password" --project=oshi-high
gcloud secrets versions access latest --secret="prod-db-password" --project=oshi-high
```

---

## ✅ チェックリスト

- [ ] `GCP_SA_KEY` 登録済み
- [ ] `STAGING_DATABASE_URL` 登録済み
- [ ] `STAGING_NEXTAUTH_URL` 登録済み
- [ ] `PROD_DATABASE_URL` 登録済み
- [ ] `PROD_NEXTAUTH_URL` 登録済み
- [ ] `NEXTAUTH_SECRET` 登録済み
- [ ] `STAGING_REDIS_URL` 登録済み（オプション）
- [ ] `PROD_REDIS_URL` 登録済み（オプション）

---

最終更新：January 25, 2026
