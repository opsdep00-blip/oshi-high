# GCP 設定メモ

このリポジトリの Cloud Run デプロイ設定で使用する GCP 情報のメモです。認証情報や秘密情報は GitHub にコミットしないでください。

## プロジェクト情報
- プロジェクト名: Oshi-High
- プロジェクトID: oshi-high
- プロジェクト番号: 1027059523217

## デプロイ関連
- リージョン: asia-northeast1 (東京) ✓
- Cloud Run サービス名: oshi-high-web （確定予定）
- Artifact Registry リポジトリ名: oshi-high-repo ✓

## GitHub Actions 用 Secrets（設定が必要）
- `GCP_PROJECT_ID`: oshi-high
- `GCP_REGION`: asia-northeast1
- `GCP_SERVICE_NAME`: oshi-high-web
- `GCP_ARTIFACT_REPO`: oshi-high-repo
- `GCP_SA_KEY_JSON`: サービスアカウントキー(JSON文字列)

## GCP Secret Manager 用 Secrets（設定が必要）

本番環境で使用する秘密情報は GCP Secret Manager で管理します。

```bash
# 秘密を作成（各値を置き換えてください）
gcloud secrets create NEXTAUTH_SECRET --data-file=- << 'EOF'
openssl rand -base64 32 の出力
EOF

gcloud secrets create DATABASE_URL --data-file=- << 'EOF'
postgresql://user:password@cloudsql-host:5432/oshi_high_prod
EOF

gcloud secrets create FIREBASE_PROJECT_ID --data-file=- << 'EOF'
oshi-high
EOF

gcloud secrets create FIREBASE_CLIENT_EMAIL --data-file=- << 'EOF'
cloud-run-service@oshi-high.iam.gserviceaccount.com
EOF

gcloud secrets create FIREBASE_PRIVATE_KEY --data-file=- << 'EOF'
-----BEGIN PRIVATE KEY-----
...秘密鍵の内容...
-----END PRIVATE KEY-----
EOF
```

Cloud Run サービスアカウントに Secret Accessor ロールを付与：

```bash
gcloud secrets add-iam-policy-binding NEXTAUTH_SECRET \
  --member="serviceAccount:cloud-run-service@oshi-high.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# 他の SECRET も同様に設定
```

## 環境変数の分け方

| 環境 | 管理場所 | 例 |
|------|---------|-----|
| **開発** | `.env.local` | ENABLE_SMS_MOCK=true |
| **本番** | GCP Secret Manager | FIREBASE_PROJECT_ID、DATABASE_URL等 |

詳細は [.env.md](/../.env.md) を参照。

## 注意事項
- GCP の Service Account キー(JSON)はコミットしない（`.gitignore` により `*.json` は除外済み）
- Secrets は GitHub のリポジトリ設定から追加し、ワークフロー `.github/workflows/cloud-run.yml` が参照します
- `.env.local` は絶対にコミットしない

