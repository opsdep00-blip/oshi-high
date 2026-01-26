output "cloud_sql_instance_name" {
  value       = google_sql_database_instance.staging.name
  description = "Cloud SQL instance name"
}

output "cloud_sql_connection_name" {
  value       = google_sql_database_instance.staging.connection_name
  description = "Cloud SQL connection string for Cloud Run"
}

output "cloud_sql_public_ip" {
  value       = google_sql_database_instance.staging.public_ip_address
  description = "Cloud SQL public IP"
}

output "db_user" {
  value = google_sql_user.oshi_user.name
}

output "db_password" {
  value       = random_password.db_password.result
  sensitive   = true
  description = "Database password (sensitive - store in Secret Manager)"
}

output "database_url" {
  value       = "postgresql://${google_sql_user.oshi_user.name}:${urlencode(random_password.db_password.result)}@/${google_sql_database.oshi_high_staging.name}?host=/cloudsql/${google_sql_database_instance.staging.connection_name}"
  sensitive   = true
  description = "Full DATABASE_URL for Cloud Run with URL-encoded password (store as STAGING_DATABASE_URL)"
}

output "gcs_bucket_name" {
  value       = google_storage_bucket.assets.name
  description = "GCS bucket for assets"
}

output "gcs_bucket_url" {
  value = "gs://${google_storage_bucket.assets.name}"
}
