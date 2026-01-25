# Terraform Service Account
resource "google_service_account" "terraform" {
  account_id   = "terraform-prod"
  display_name = "Terraform for Production Environment"
  project      = var.project_id
  description  = "Service Account for Terraform to manage GCP resources in production"
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
