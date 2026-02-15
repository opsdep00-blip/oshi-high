# Staging Terraform (scaffold)

このディレクトリはステージング用 Terraform スキャフォルドです。まずは最小構成を用意し、Pull Request でレビュー→改善していきます。

推奨ワークフロー:

1. `infra/staging` にブランチを切る
2. `terraform init`
3. `terraform plan -var="project_id=<PROJECT_ID>" -var="db_password=<DB_PASSWORD>"`
4. `terraform apply -var="project_id=<PROJECT_ID>" -var="db_password=<DB_PASSWORD>"`

重要:
- `db_password` 等の機密値は Git にコミットしないでください。GitHub Secrets または GCP Secret Manager を利用してください。
- このスキャフォルドは初期版です。細かい設定（VPC, private IP, backup policy）はレビューで追加します。
