# Cloud SQL Instance (PostgreSQL)
resource "google_sql_database_instance" "prod" {
  name             = var.db_instance_name
  database_version = var.db_version
  region           = var.region
  deletion_protection = true  # Production safety

  settings {
    tier              = var.db_tier
    availability_type = "REGIONAL"  # High availability for production

    database_flags {
      name  = "cloudsql_iam_authentication"
      value = "on"
    }

    ip_configuration {
      ipv4_enabled   = true
      ssl_mode       = "ENCRYPTED_ONLY"
      authorized_networks {
        value = "0.0.0.0/0"
        name  = "allow_all_prod"
      }
    }

    backup_configuration {
      enabled                        = true
      start_time                     = "02:00"
      location                       = var.region
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 30  # Extended for production
    }
  }
}

# Database
resource "google_sql_database" "oshi_high_prod" {
  name     = "oshi_high_prod"
  instance = google_sql_database_instance.prod.name
}

# Database user
resource "google_sql_user" "oshi_user" {
  name     = "oshi_user"
  instance = google_sql_database_instance.prod.name
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
  force_destroy = false  # Prevent accidental deletion
  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      num_newer_versions = 5  # Keep more versions for production
    }
  }
}

data "google_client_config" "default" {}
