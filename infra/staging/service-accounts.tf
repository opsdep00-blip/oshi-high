resource "google_service_account" "cloud_run_sa" {
  account_id   = "cloud-run-staging"
  display_name = "Cloud Run service account for staging"
}

resource "google_service_account" "terraform_sa" {
  account_id   = "terraform-staging"
  display_name = "Terraform automation account for staging"
}

# Grant typical roles (adjust least-privilege later)
resource "google_project_iam_member" "terraform_sa_roles" {
  project = var.project_id
  role    = "roles/editor"
  member  = "serviceAccount:${google_service_account.terraform_sa.email}"
}

resource "google_project_iam_member" "cloud_run_sa_roles" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

resource "google_project_iam_member" "cloud_run_sa_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}
