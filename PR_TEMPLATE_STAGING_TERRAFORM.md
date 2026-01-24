# Terraform ステージング環境自動化 PR

## 概要
GCP ステージング環境を Terraform で完全自動化し、GitHub Actions による CI/CD パイプラインを構築します。

### 実装内容
- **Terraform IaC**: Cloud SQL、Cloud Storage、IAM 設定をコード化
- **GitHub Actions**: `staging` branch へのプッシュで自動デプロイ
- **GCP リソース自動構築**: 環境再構築が数分で実行可能
- **State 管理**: GCS バケット（バージョニング付き）で state 永続化

---

## 変更ファイル一覧

```
infra/staging/
  ├── variables.tf       (Terraform 変数定義)
  ├── provider.tf        (Google Cloud provider + GCS backend)
  ├── main.tf            (Cloud SQL, GCS, IAM リソース)
  └── outputs.tf         (出力値: 接続情報等)

.github/workflows/
  └── deploy-staging.yml (GitHub Actions ワークフロー)

docs/
  └── GCP_SETUP.md       (セットアップ・トラブルシューティングガイド)
```

---

## テスト方法

### 1. ローカル検証

```bash
cd infra/staging/

# フォーマット・検証
terraform fmt -recursive
terraform validate

# Plan 確認
terraform plan -out=tfplan

# 計画結果を表示
terraform show tfplan
```

**期待結果**:
```
Plan: 6 to add, 0 to change, 0 to destroy.
```

### 2. ローカル適用（オプション）

前提条件:
- GCP Service Account キー (`~/.gcp/oshi-high-terraform-sa.json`)
- State bucket 存在 (`oshi-high-tfstate-staging`)
- GitHub Secrets 登録済み

```bash
# 環境変数設定
export GOOGLE_APPLICATION_CREDENTIALS="$HOME/.gcp/oshi-high-terraform-sa.json"
export TF_VAR_project_id="oshi-high"
export TF_VAR_region="asia-northeast1"

# Terraform init
terraform init \
  -backend-config="bucket=oshi-high-tfstate-staging" \
  -backend-config="prefix=staging"

# Apply
terraform apply tfplan
```

### 3. GitHub Actions での自動実行

```bash
# staging branch へプッシュ
git checkout staging
git merge feature/infra-setup
git push origin staging

# GitHub Actions ワークフロー自動実行
# → Terraform init → plan → apply
```

ワークフロー実行状況: **GitHub** → **Actions** タブで確認

---

## リスク評価

### リスク 1: State bucket 作成失敗
**影響**: GitHub Actions デプロイ失敗  
**対策**: ローカルでバケット事前作成（docs/GCP_SETUP.md ステップ 2 参照）

### リスク 2: 権限不足（Service Account）
**影響**: Cloud SQL/GCS API 呼び出し失敗  
**対策**: Service Account に IAM ロール付与確認（docs/GCP_SETUP.md トラブルシューティング参照）

### リスク 3: Terraform state 競合
**影響**: 並行 apply による リソース重複・削除  
**対策**: GCS state locking 自動有効化（provider.tf で設定）

### リスク 4: ステージング環境の誤削除
**影響**: Running なサービス停止  
**対策**: Manual trigger のみ（`workflow_dispatch`）で `destroy` 実行

---

## ロールバック手順

### シナリオ A: Terraform apply 失敗時（自動ロールバック）

GitHub Actions が失敗した場合、state は変更されません。以下で確認：

```bash
# ローカルで state 確認
cd infra/staging/
terraform state list

# 問題リソース削除（例）
terraform destroy -target=google_sql_database.oshi_db
```

### シナリオ B: リソース不具合発見時（手動削除）

```bash
# 全リソース削除
terraform destroy -auto-approve

# または GCP Console で手動削除
```

### シナリオ C: 前のバージョンに戻す

```bash
# Git revert
git revert HEAD
git push origin staging

# GitHub Actions が古い state から apply
```

---

## デプロイ後の確認項目

### 1. Cloud SQL インスタンス

```bash
gcloud sql instances list --project=oshi-high

# 期待結果:
# NAME                          DATABASE_VERSION  LOCATION       TIER          STATUS
# oshi-high-staging-db          POSTGRES_15       asia-northeast1  shared-core   RUNNABLE
```

### 2. Database & User

```bash
gcloud sql databases list --instance=oshi-high-staging-db --project=oshi-high

# 期待結果:
# oshi_db
```

### 3. Cloud Storage バケット

```bash
gsutil ls -p oshi-high

# 期待結果:
# gs://oshi-high-staging-assets/
```

### 4. GCS バージョニング確認

```bash
gsutil versioning get gs://oshi-high-tfstate-staging/

# 期待結果:
# Enabled
```

---

## 承認者メモ

### Code Review チェックリスト
- [ ] Terraform 構文エラーなし（`terraform validate` 通過）
- [ ] リソース命名規則に準拠（`-staging-` suffix）
- [ ] セキュリティ: シークレット・キーがコミットされていない
- [ ] Cost: リソース規模が本番より小さい（shared-core など）
- [ ] Disaster Recovery: backup_configuration が設定されている

### マージ条件
- [ ] GitHub Actions **lint / validate** 通過
- [ ] ローカル `terraform plan` で 6 リソース追加確認
- [ ] `@devops` & `@teamlead` 承認

---

## 運用メモ

### State 管理
- **Location**: GCS バケット `oshi-high-tfstate-staging`
- **Locking**: 自動有効（state locking）
- **Versioning**: 有効化済み（復旧時に使用）

### 監視・アラート
今後設定予定:
- Cloud SQL CPU / Memory アラート
- GCS 容量モニタリング
- API 呼び出し量追跡

### 次フェーズ
1. ✅ ステージング自動化 (this PR)
2. ⏳ Cloud Run デプロイ自動化
3. ⏳ 本番環境 IaC (Leader 承認 + 手動トリガー)
4. ⏳ 監視・ロギング統合（Sentry, Cloud Logging）

---

**PR 作成者**: Developer Agent  
**タイプ**: `chore(infra)`  
**対象環境**: Staging  
**デプロイ方法**: GitHub Actions (`staging` branch push)  
**バージョン**: 1.0.0  
