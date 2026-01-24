# GCP セットアップガイド（ステージング環境自動化）

このドキュメントは OSHI-HIGH プロジェクトの GCP ステージング環境を Terraform で自動構築するための手順です。

**対象環境**: Google Cloud Platform (GCP)
**プロジェクト ID**: `oshi-high`
**リージョン**: `asia-northeast1` (東京)
**環境**: ステージング（自動デプロイ）

---

## 前提条件

### 1. GCP プロジェクト・コンソール
- GCP プロジェクト `oshi-high` が存在する
- 課金が有効化されている
- ローカル環境で `gcloud` CLI がインストール・認証済み（`gcloud auth login`）

### 2. ローカル環境
- **Terraform** `>= 1.0` がインストール済み
  ```bash
  terraform version
  ```
- **Google Cloud SDK** (gcloud CLI)
  ```bash
  gcloud --version
  ```
- **Git** がインストール済み
- **GitHub** リポジトリへのアクセス権

### 3. GitHub リポジトリ
- ローカルクローンが存在
  ```bash
  git clone https://github.com/opsdep00-blip/oshi-high.git
  cd oshi-high
  ```

---

## ステップ 1: GCP 認証情報の準備

### 1.1 Service Account キーの作成（ローカル開発用）

GCP Console で以下を実行：

1. **GCP コンソール** → **プロジェクト選択** → `oshi-high`
2. **サービスアカウント** → **サービスアカウント作成**
   - アカウント名: `terraform-staging`
   - 説明: "Terraform for staging environment automation"
3. **ロール付与**:
   - `Cloud SQL Admin`
   - `Storage Object Admin`
   - `Cloud Run Developer`
   - `Service Account User`
4. **キーを作成**:
   - タイプ: JSON
   - ダウンロード → ローカル保存（例: `~/.gcp/oshi-high-terraform-sa.json`）

### 1.2 環境変数設定

```bash
export GOOGLE_APPLICATION_CREDENTIALS="$HOME/.gcp/oshi-high-terraform-sa.json"
export TF_VAR_project_id="oshi-high"
export TF_VAR_region="asia-northeast1"
```

---

## ステップ 2: Terraform State Bucket の手動作成

GitHub Actions が state 管理に使用する GCS バケットを作成します。

### 2.1 GCP Console で作成

1. **GCS** (Cloud Storage) → **バケット作成**
   - 名前: `oshi-high-tfstate-staging`
   - ロケーション: `asia-northeast1` (東京)
   - ストレージクラス: Standard
   - アクセス制御: Uniform
2. **バージョニング有効化**:
   - バケット設定 → **バージョニング** → **有効化**
3. **権限**: Service Account `terraform-staging` に以下を付与
   - `roles/storage.objectAdmin`

### 2.2 コマンドライン（gcloud）で作成

```bash
gsutil mb -p oshi-high -l asia-northeast1 gs://oshi-high-tfstate-staging/
gsutil versioning set on gs://oshi-high-tfstate-staging/
```

---

## ステップ 3: ローカル Terraform 実行

### 3.1 ディレクトリ構成確認

```
infra/staging/
  ├── variables.tf
  ├── provider.tf
  ├── main.tf
  ├── outputs.tf
  └── terraform.tfvars (未作成、ローカル専用)
```

### 3.2 terraform.tfvars 作成（ローカル開発用、git 無視）

```bash
cat > infra/staging/terraform.tfvars <<EOF
project_id      = "oshi-high"
region           = "asia-northeast1"
db_instance_name = "oshi-high-staging-db"
bucket_name      = "oshi-high-staging-assets"
tfstate_bucket   = "oshi-high-tfstate-staging"
EOF
```

### 3.3 Terraform 初期化 & 計画

```bash
cd infra/staging/

# Terraform 初期化（バックエンド設定）
terraform init

# Terraform フォーマット・検証
terraform fmt -recursive
terraform validate

# Terraform 計画（ドライラン）
terraform plan -out=tfplan

# 計画を確認（リソース作成予定を表示）
terraform show tfplan
```

**出力例：**
```
Plan: 6 to add, 0 to change, 0 to destroy.

Resources that will be added:
  + google_sql_database.oshi_db
  + google_sql_database_instance.oshi_staging_db
  + google_sql_user.oshi_user
  + google_storage_bucket.staging_assets
  + (other resources)
```

### 3.4 Terraform Apply（リソース作成）

```bash
# ステージング環境へのリソース適用（確認プロンプト後実行）
terraform apply tfplan

# または直接実行（確認なし）
terraform apply -auto-approve
```

**確認内容：**
- Cloud SQL インスタンス作成（PostgreSQL 15）
- データベース `oshi_db` 作成
- ユーザー `oshi_user` 作成
- GCS バケット `oshi-high-staging-assets` 作成

### 3.5 出力値確認

```bash
terraform output

# 期待値:
#   cloud_sql_instance_name = "oshi-high-staging-db"
#   cloud_sql_connection_name = "oshi-high:asia-northeast1:oshi-high-staging-db"
#   cloud_sql_public_ip_address = "***.***.***.**"
#   storage_bucket_name = "oshi-high-staging-assets"
#   storage_bucket_url = "gs://oshi-high-staging-assets"
```

---

## ステップ 4: GitHub Actions での自動デプロイ設定

### 4.1 GitHub Secrets 登録

GitHub リポジトリ設定 → **Secrets and variables** → **Actions**

以下のシークレットを登録：

| Secret 名 | 値 | 備考 |
|-----------|-----|------|
| `GCP_PROJECT` | `oshi-high` | プロジェクト ID |
| `GCP_SA_KEY` | Service Account JSON 全文 | `~/.gcp/oshi-high-terraform-sa.json` の内容 |
| `TF_STATE_BUCKET` | `oshi-high-tfstate-staging` | State バケット名 |

### 4.2 GitHub Actions ワークフロー

`.github/workflows/deploy-staging.yml` がステージング branch へのプッシュ時に自動実行：

```yaml
on:
  push:
    branches:
      - staging
  workflow_dispatch:

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: hashicorp/setup-terraform@v2
      
      - name: Terraform Init
        run: terraform init
        env:
          TF_CLI_ARGS_init: "-backend-config=bucket=${{ secrets.TF_STATE_BUCKET }}"
      
      - name: Terraform Plan
        run: terraform plan -out=tfplan
        env:
          GOOGLE_CREDENTIALS: ${{ secrets.GCP_SA_KEY }}
      
      - name: Terraform Apply
        run: terraform apply tfplan
        env:
          GOOGLE_CREDENTIALS: ${{ secrets.GCP_SA_KEY }}
```

### 4.3 デプロイ実行

```bash
# staging branch へのプッシュで自動デプロイ
git checkout -b feature/infra-setup
git commit -am "chore: setup staging Terraform"
git push origin feature/infra-setup

# PR 作成・マージ（CI が実行）
# または staging branch へ直接プッシュ
git checkout staging
git merge feature/infra-setup
git push origin staging  # GitHub Actions 自動実行
```

---

## トラブルシューティング

### 問題 1: "Failed to load backend"

**原因**: State bucket が存在しない

**解決**:
```bash
# 手動でバケット作成
gsutil mb -p oshi-high -l asia-northeast1 gs://oshi-high-tfstate-staging/
```

### 問題 2: "Permission denied: Cloud SQL API"

**原因**: Service Account に必要ロールがない

**解決**:
```bash
# ローカルで gcloud を使用して権限確認
gcloud projects get-iam-policy oshi-high \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:terraform-staging@oshi-high.iam.gserviceaccount.com"

# ロール追加
gcloud projects add-iam-policy-binding oshi-high \
  --member="serviceAccount:terraform-staging@oshi-high.iam.gserviceaccount.com" \
  --role="roles/cloudsql.admin"
```

### 問題 3: "Terraform state lock timeout"

**原因**: 前回の apply が中断された

**解決**:
```bash
# State lock 強制解除（注意！並行実行がないことを確認）
terraform force-unlock <LOCK_ID>
```

### 問題 4: GitHub Actions workflow の失敗

**原因**: Secret が未登録 または不正な JSON

**解決**:
```bash
# Secret 値確認（ローカルのみ）
cat ~/.gcp/oshi-high-terraform-sa.json | jq . | head -10

# GitHub で Secret 削除・再登録
```

---

## 運用・監視

### Terraform State 管理

State ファイルは GCS に自動保存：
```bash
# State バックアップ確認
gsutil versioning get gs://oshi-high-tfstate-staging/

# State リスト
gsutil ls -r gs://oshi-high-tfstate-staging/
```

### リソース監視

#### Cloud SQL

```bash
# インスタンス確認
gcloud sql instances list

# 接続情報確認
gcloud sql instances describe oshi-high-staging-db
```

#### Cloud Storage

```bash
# バケット内容確認
gsutil ls -r gs://oshi-high-staging-assets/

# バージョン確認
gsutil ls -ar gs://oshi-high-staging-assets/
```

---

## ロールバック手順

### シナリオ: Terraform Apply 失敗時

#### 1. ローカル復旧
```bash
# State 確認
terraform state list

# 問題リソース削除（例）
terraform destroy -target=google_sql_database.oshi_db

# または全削除
terraform destroy -auto-approve
```

#### 2. GitHub Actions ロールバック
```bash
# 前のコミットに戻す
git revert HEAD
git push origin staging

# GitHub Actions が destroy を実行（要設定）
```

---

## チェックリスト

- [ ] GCP Service Account 作成 & JSON キー取得
- [ ] `GOOGLE_APPLICATION_CREDENTIALS` 環境変数設定
- [ ] Terraform State bucket (`oshi-high-tfstate-staging`) 作成
- [ ] ローカルで `terraform init` → `terraform plan` → `terraform apply` 実行
- [ ] Cloud SQL インスタンス確認 (`gcloud sql instances list`)
- [ ] GCS バケット確認 (`gsutil ls`)
- [ ] GitHub Secrets 登録 (`GCP_PROJECT`, `GCP_SA_KEY`, `TF_STATE_BUCKET`)
- [ ] `.github/workflows/deploy-staging.yml` 確認
- [ ] `staging` branch へプッシュ → GitHub Actions 実行確認

---

## 参考リンク

- [Terraform Google Cloud Provider](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
- [Google Cloud SQL Documentation](https://cloud.google.com/sql/docs)
- [Google Cloud Storage Documentation](https://cloud.google.com/storage/docs)
- [Terraform Remote State (GCS)](https://www.terraform.io/language/settings/backends/gcs)

---

**保守者**: @devops  
**最終更新**: 2026-01-24
