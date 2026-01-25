# Cloud Run デプロイフロー ガイド

## 🚀 デプロイパイプライン概要

```
develop ブランチ
     ↓ (git push)
Staging ワークフロー実行
(cloud-run.yml)
     ↓ (自動)
oshi-service-staging
(テスト環境)
     ↓ (確認OK)
main ブランチへ PR・マージ
     ↓ (git push to main)
Production ワークフロー実行
(cloud-run-prod.yml)
     ↓ (手動承認必須)
oshi-service
(本番環境)
```

---

## 📋 ステップバイステップ

### 1️⃣ **ステージングで確認**

```bash
# 開発ブランチを作成
git checkout -b feature/my-feature

# コードを編集
# ...

# develop ブランチに push
git push origin feature/my-feature:develop

# GitHub Actions が自動実行
# cloud-run.yml → oshi-service-staging にデプロイ
```

#### 確認方法：
```bash
# GitHub Actions で実行状態を確認
# https://github.com/your-repo/actions

# または gcloud で確認
gcloud run services describe oshi-service-staging \
  --region asia-northeast1 \
  --format='value(status.url)'

# API をテスト
curl https://oshi-service-staging-xxx.a.run.app/api/idols
```

### 2️⃣ **本番環境にデプロイ**

```bash
# 確認が OK なら main にマージ
git checkout main
git pull origin main
git merge feature/my-feature
git push origin main

# GitHub Actions が自動実行
# cloud-run-prod.yml → oshi-service にデプロイ
# ⚠️ environment: production の手動承認が必須
```

#### 承認方法：
```
GitHub Actions → cloud-run-prod.yml の実行 
→ "Review deployments" ボタン
→ "Approve and deploy"
```

#### 確認方法：
```bash
# 本番環境 URL を確認
gcloud run services describe oshi-service \
  --region asia-northeast1 \
  --format='value(status.url)'

# API をテスト
curl https://oshi-service-xxx.a.run.app/api/idols
```

---

## 🔧 環境別設定

| 項目 | Staging | Production |
|------|---------|-----------|
| ブランチ | `develop` | `main` |
| ワークフロー | `cloud-run.yml` | `cloud-run-prod.yml` |
| Service 名 | `oshi-service-staging` | `oshi-service` |
| Image タグ | `staging-{sha}` | `prod-{sha}` |
| Database | `STAGING_DATABASE_URL` | `PROD_DATABASE_URL` |
| メモリ | 512 MB（デフォルト） | 1 GB |
| CPU | 1（デフォルト） | 2 |
| 最大インスタンス | 10 | 50 |
| 最小インスタンス | 0 | 2 |
| 手動承認 | ❌ 不要 | ✅ 必須 |

---

## ✅ チェックリスト

**本番環境デプロイ前に確認：**

- [ ] Staging で十分なテストを実施した
- [ ] API レスポンスが期待通り
- [ ] Database への書き込みが正常
- [ ] エラーログを確認済み
- [ ] Performance が許容範囲
- [ ] `PROD_DATABASE_URL` Secret が登録されている
- [ ] Production environment の手動承認を確認

---

## 🚨 トラブルシューティング

### Staging デプロイが失敗

```bash
# ワークフロー実行状況を確認
gh run list --workflow=cloud-run.yml

# 詳細ログを確認
gh run view {RUN_ID} --log

# develop ブランチへの push を確認
git log --oneline origin/develop | head -5
```

### Production デプロイが承認待ち

```bash
# GitHub Actions UI から承認
# または gh CLI で承認
gh run view {RUN_ID}  # 詳細確認
# Web UI → "Review deployments" で承認
```

### Service が見つからない

```bash
# Cloud Run Service 一覧を確認
gcloud run services list --region=asia-northeast1

# Staging Service 確認
gcloud run services describe oshi-service-staging --region=asia-northeast1

# Production Service 確認
gcloud run services describe oshi-service --region=asia-northeast1
```

---

## 📊 デプロイ履歴確認

```bash
# 全デプロイ履歴を表示
gcloud run revisions list --service=oshi-service --region=asia-northeast1

# Staging デプロイ履歴
gcloud run revisions list --service=oshi-service-staging --region=asia-northeast1

# 特定リビジョンの詳細
gcloud run revisions describe {REVISION_NAME} --service=oshi-service --region=asia-northeast1
```

---

## 🔄 ロールバック手順

問題が発生した場合：

```bash
# 前のリビジョンにトラフィック戻す
gcloud run services update-traffic oshi-service \
  --to-revisions {PREVIOUS_REVISION_SHA}=100 \
  --region asia-northeast1

# または Web UI から
# Cloud Run → oshi-service → Revisions → トラフィック配分
```

---

## 📝 必須 GitHub Secrets

| Secret | 値 |
|--------|-----|
| `GCP_SA_KEY_JSON` | GCP Service Account JSON |
| `GCP_PROJECT_ID` | `oshi-high` |
| `GCP_ARTIFACT_REPO` | `docker-repo` |
| `STAGING_DATABASE_URL` | Staging Cloud SQL 接続文字列 |
| `PROD_DATABASE_URL` | Production Cloud SQL 接続文字列 |

確認：
```bash
gh secret list
```

---

**最終更新**: January 25, 2026
