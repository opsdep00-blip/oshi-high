# Service Account outputs disabled (to be created manually)
# output "terraform_service_account_email" {
#   value       = google_service_account.terraform.email
#   description = "Email address of Terraform Service Account (Prod)"
# }

# output "terraform_service_account_id" {
#   value       = google_service_account.terraform.unique_id
#   description = "Unique ID of Terraform Service Account (Prod)"
# }

# output "service_account_key_json" {
#   value       = base64decode(google_service_account_key.terraform.private_key)
#   sensitive   = true
#   description = "Service Account key JSON - save to GitHub Secrets as GCP_SA_KEY_PROD"
# }

# Cloud SQL outputs
output "cloud_sql_instance_name" {
  value       = google_sql_database_instance.prod.name
  description = "Cloud SQL instance name"
}

output "cloud_sql_connection_name" {
  value       = google_sql_database_instance.prod.connection_name
  description = "Cloud SQL connection string"
}

output "cloud_sql_public_ip" {
  value       = google_sql_database_instance.prod.public_ip_address
  description = "Cloud SQL public IP address"
}

output "db_user" {
  value       = google_sql_user.oshi_user.name
  description = "Database user name"
}

# GCS outputs
output "gcs_bucket_name" {
  value       = google_storage_bucket.assets.name
  description = "GCS bucket name for assets"
}

output "gcs_bucket_url" {
  value       = "gs://${google_storage_bucket.assets.name}"
  description = "GCS bucket URL"
}
