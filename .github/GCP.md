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

## 注意事項
- GCP の Service Account キー(JSON)はコミットしない（`.gitignore` により `*.json` は除外済み）
- Secrets は GitHub のリポジトリ設定から追加し、ワークフロー `.github/workflows/cloud-run.yml` が参照します
