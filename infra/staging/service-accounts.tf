# infra/staging/service-accounts.tf
# Terraform 実行用 Service Account と IAM ロール付与

# Terraform 実行用 Service Account
resource "google_service_account" "terraform" {
  account_id   = "terraform-staging"
  display_name = "Terraform for Staging Environment"
  project      = var.project_id
  description  = "Service Account for Terraform to manage GCP resources in staging"
}

# Cloud SQL Admin ロール付与
# resource "google_project_iam_member" "terraform_cloudsql_admin" {
#   project = var.project_id
#   role    = "roles/cloudsql.admin"
#   member  = "serviceAccount:${google_service_account.terraform.email}"
# }

# Cloud Storage Admin ロール付与
# resource "google_project_iam_member" "terraform_storage_admin" {
#   project = var.project_id
#   role    = "roles/storage.admin"
#   member  = "serviceAccount:${google_service_account.terraform.email}"
# }

# Service Account User ロール付与
# resource "google_project_iam_member" "terraform_service_account_user" {
#   project = var.project_id
#   role    = "roles/iam.serviceAccountUser"
#   member  = "serviceAccount:${google_service_account.terraform.email}"
# }

# Service Account Key 生成
resource "google_service_account_key" "terraform" {
  service_account_id = google_service_account.terraform.name
  public_key_type    = "TYPE_X509_PEM_FILE"

  lifecycle {
    create_before_destroy = true
  }
}

# ============================================
# Outputs
# ============================================

output "terraform_service_account_email" {
  value       = google_service_account.terraform.email
  description = "Email address of Terraform Service Account"
}

output "terraform_service_account_id" {
  value       = google_service_account.terraform.unique_id
  description = "Unique ID of Terraform Service Account"
}

output "service_account_key_json" {
  value       = base64decode(google_service_account_key.terraform.private_key)
  sensitive   = true
  description = "Service Account key JSON - save to GitHub Secrets as GCP_SA_KEY"
}
