# GitHub Secrets セットアップガイド

このドキュメントは、GitHub Secrets を環境変数として設定するための手順を説明しています。

## 初期セットアップ（1回のみ）

### Staging 環境

1. GitHub リポジトリにアクセス:
   - https://github.com/opsdep00-blip/oshi-high

2. Settings → Secrets and variables → Actions に移動

3. 「New repository secret」をクリック

4. **Secret Name**: `STAGING_DATABASE_URL`
   **Secret Value**:
   ```
   postgresql://oshi_user:T%T!Y%fX2VHKLEt![E?gUTHx<#va})aj@/oshi_high_staging?host=/cloudsql/oshi-high:asia-northeast1:oshi-high-staging-db
   ```

5. 「Add secret」をクリック

### Production 環境

1. **Secret Name**: `PROD_DATABASE_URL`
   **Secret Value**: (Production Terraform apply 後に取得予定)

## 更新後の確認

Staging Secrets を設定した後：

```bash
git commit --allow-empty -m "trigger: redeploy staging with correct database url"
git push origin develop
```

GitHub Actions が自動実行され、Staging Cloud Run がデプロイされます。

## 今後の改善

`.github/workflows/update-secrets.yml` ワークフローを使って、Terraform 変更時に自動的に DATABASE_URL を取得できます：

1. GitHub → Actions → "Update GitHub Secrets from Terraform" を手動実行
2. ワークフロー出力に表示された DATABASE_URL をコピー
3. Settings → Secrets で更新

将来的には API トークンで完全自動化する予定です。
