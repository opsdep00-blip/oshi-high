# Terraform Service Account
resource "google_service_account" "terraform" {
  account_id   = "terraform-prod"
  display_name = "Terraform for Production Environment"
  project      = var.project_id
  description  = "Service Account for Terraform to manage GCP resources in production"
}

# Service Account Key 生成
resource "google_service_account_key" "terraform" {
  service_account_id = google_service_account.terraform.name
  public_key_type    = "TYPE_X509_PEM_FILE"

  lifecycle {
    create_before_destroy = true
  }
}

# Note: IAM ロール付与は GCP コンソール側で手動実施
# Terraform では権限不足により apply できないため、コンソールで以下のロールを付与してください：
# - roles/artifactregistry.writer
# - roles/run.admin
# - roles/cloudsql.admin
# - roles/storage.admin
# - roles/iam.serviceAccountUser
