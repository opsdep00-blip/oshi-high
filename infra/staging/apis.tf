# 必要なGoogle Cloud APIの有効化管理
resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com",              # Cloud Run
    "sqladmin.googleapis.com",         # Cloud SQL
    "secretmanager.googleapis.com",    # Secret Manager
    "iam.googleapis.com",              # IAM
    "cloudresourcemanager.googleapis.com", # Resource Manager
    "serviceusage.googleapis.com",     # Service Usage
    "artifactregistry.googleapis.com", # Artifact Registry
    "identitytoolkit.googleapis.com",  # Firebase Auth (Identity Toolkit)
  ])

  project = var.project_id
  service = each.key

  # terraform destroy 時にAPIを無効化しない（安全のため）
  disable_on_destroy = false
  disable_dependent_services = false
}