# OSHI-HIGH 運用ガイド

## 🔐 シークレット管理

### GCP Secret Manager からパスワード取得

```bash
# Staging DB パスワード
gcloud secrets versions access latest --secret="staging-db-password" --project=oshi-high

# Production DB パスワード
gcloud secrets versions access latest --secret="prod-db-password" --project=oshi-high
```

### GitHub Secrets（CI/CD 用）

| Name | Purpose | Location |
|------|---------|----------|
| `GCP_SA_KEY` | Staging Terraform 認証 | GitHub Settings → Secrets |
| `GCP_SA_KEY_PROD` | Production Terraform 認証 | GitHub Settings → Secrets |

---

## 🚀 デプロイメント自動化

### **Staging 環境（完全自動化）**

| トリガー | 内容 | ファイル |
|---------|------|---------|
| **PR 作成・更新** | `terraform plan` 実行 → コメント表示 | `terraform-staging-plan.yml` |
| **main ブランチにマージ** | `terraform apply -auto-approve` 実行 → 自動デプロイ | `terraform-staging-apply.yml` |

**フロー：**
```
Feature Branch
    ↓
PR 作成 → terraform-staging-plan.yml 実行 → plan 結果をコメント表示
    ↓
Approve & Merge to main
    ↓
terraform-staging-apply.yml 実行 → 自動 apply → リソース更新
```

### **Production 環境（手動トリガー - 安全性重視）**

| トリガー | 内容 | ファイル |
|---------|------|---------|
| **PR 作成・更新** | `terraform plan` 実行 → 本番警告付きコメント表示 | `terraform-prod-plan.yml` |
| **Manual Trigger** | GitHub Actions 画面から手動実行 → `terraform apply -auto-approve` | `terraform-prod-apply.yml` |

**フロー：**
```
Feature Branch (prod/)
    ↓
PR 作成 → terraform-prod-plan.yml 実行 → ⚠️ 本番警告付きコメント表示
    ↓
Approve & Merge to main
    ↓
GitHub Actions → "Terraform Prod - Apply (Manual Approval)" 手動トリガー
    ↓
terraform-prod-apply.yml 実行 → 手動確認後 apply → 本番リソース更新
```

---

## 📋 本番環境デプロイ手順

### Step 1: 変更を main にマージ

```bash
# 機能ブランチから main へ PR
# Staging plan 確認 → Approve → Merge
```

### Step 2: GitHub Actions から手動トリガー

1. GitHub リポジトリ → **Actions** タブ
2. **"Terraform Prod - Apply (Manual Approval)"** をクリック
3. **Run workflow** → ブランチ選択 → **Run workflow** をクリック
4. ワークフロー実行中 → 完了待機

### Step 3: 結果確認

```bash
# Cloud SQL connection 確認
gcloud sql connect oshi-high-prod-db \
  --user=oshi_user \
  --project=oshi-high
```

---

## 🔍 トラブルシューティング

### Terraform Plan エラー：「credentials not found」

```bash
# 原因：GCP 認証情報が無い
# 解決：bash ターミナルで実行（gcloud auth login の認証が保持される）

cd ~/Desktop/git_hub/oshi-high/infra/staging
terraform plan
```

### Cloud SQL パスワード忘れた場合

```bash
# Terraform state から取得（sensitive 値は出力されないため、Secret Manager から取得）
gcloud secrets versions access latest --secret="staging-db-password" --project=oshi-high
```

### GitHub Actions ワークフロー失敗時

1. GitHub リポジトリ → **Actions** タブ
2. 失敗したワークフロー をクリック
3. **Logs** で詳細確認
4. 通常はシークレット（GCP_SA_KEY）or IAM 権限不足

---

## 📊 インフラリソース一覧

### Staging

```
Cloud SQL: oshi-high-staging-db
  - Instance: db-f1-micro (ZONAL)
  - Database: oshi_high_staging
  - User: oshi_user
  - Connection: oshi-high:asia-northeast1:oshi-high-staging-db
  - IP: 35.189.132.106

GCS Bucket: oshi-high-staging-assets
  - Region: asia-northeast1
  - Versioning: 3 versions
```

### Production

```
Cloud SQL: oshi-high-prod-db
  - Instance: db-custom-4-16384 (REGIONAL HA)
  - Database: oshi_high_prod
  - User: oshi_user
  - Connection: oshi-high:asia-northeast1:oshi-high-prod-db
  - IP: 34.84.229.146
  - Deletion Protection: ✅ 有効

GCS Bucket: oshi-high-prod-assets
  - Region: asia-northeast1
  - Versioning: 5 versions
  - Force Destroy: ❌ 無効（誤削除防止）
```

---

## 🛠️ よくあるコマンド

### Terraform State 確認

```bash
# Staging state
cd ~/Desktop/git_hub/oshi-high/infra/staging
terraform state list
terraform state show google_sql_database_instance.staging

# Production state
cd ~/Desktop/git_hub/oshi-high/infra/prod
terraform state list
```

### Cloud SQL に接続

```bash
# Staging
psql -h 35.189.132.106 -U oshi_user -d oshi_high_staging

# Production
psql -h 34.84.229.146 -U oshi_user -d oshi_high_prod
```

### GCS にアップロード

```bash
# Staging
gsutil cp local-file gs://oshi-high-staging-assets/

# Production
gsutil cp local-file gs://oshi-high-prod-assets/
```

---

## ⚠️ 重要な注意事項

| 項目 | 内容 | リスク |
|-----|------|--------|
| **Staging delete** | `terraform destroy` で OK | 安い環境なので再作成可能 |
| **Production delete** | 絶対禁止（deletion_protection=true） | 本番データ消失 → 重大インシデント |
| **State ファイル** | Git で commit しない（.gitignore 済み） | 秘密情報露出 |
| **Service Account キー** | JSON は Git に push しない | 認証情報流出 |

---

## 📞 連絡先・ドキュメント

| 項目 | リンク |
|-----|--------|
| **セットアップガイド** | [INFRASTRUCTURE_SETUP.md](INFRASTRUCTURE_SETUP.md) |
| **Terraform Provider** | https://registry.terraform.io/providers/hashicorp/google/latest/docs |
| **Cloud SQL** | https://cloud.google.com/sql/docs/postgres |
| **GCP Secret Manager** | https://cloud.google.com/secret-manager/docs |

---

**最終更新：** January 25, 2026  
**バージョン：** 1.0  
**実装者：** GitHub Copilot - Developer Mode
