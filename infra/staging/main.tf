# Cloud SQL Instance (PostgreSQL)
resource "google_sql_database_instance" "staging" {
  name             = var.db_instance_name
  database_version = var.db_version
  region           = var.region
  deletion_protection = false

  settings {
    tier = var.db_tier
    
    database_flags {
      name  = "cloudsql_iam_authentication"
      value = "on"
    }

    ip_configuration {
      require_ssl        = true
      enable_private_ip  = false
      authorized_networks {
        value = "0.0.0.0/0"
        name  = "allow_all_staging"
      }
    }

    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      location                       = var.region
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7
    }
  }
}

# Database
resource "google_sql_database" "oshi_high_staging" {
  name     = "oshi_high_staging"
  instance = google_sql_database_instance.staging.name
}

# Database user
resource "google_sql_user" "oshi_user" {
  name     = "oshi_user"
  instance = google_sql_database_instance.staging.name
  password = random_password.db_password.result
}

# Random password
resource "random_password" "db_password" {
  length  = 32
  special = true
}

# GCS Bucket
resource "google_storage_bucket" "assets" {
  name          = var.bucket_name
  location      = var.region
  force_destroy = true
  uniform_bucket_level_access = true
  
  versioning {
    enabled = true
  }

  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      num_newer_versions = 3
      is_live            = false
    }
  }
}

data "google_client_config" "default" {}
