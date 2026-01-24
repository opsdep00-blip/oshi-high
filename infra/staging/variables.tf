variable "project_id" {
  type        = string
  description = "GCP Project ID (oshi-high)"
}

variable "region" {
  type        = string
  default     = "asia-northeast1"
  description = "Default GCP region (Tokyo)"
}

variable "zone" {
  type        = string
  default     = "asia-northeast1-a"
  description = "Default GCP zone (Tokyo)"
}

variable "environment" {
  type        = string
  default     = "staging"
  description = "Environment name"
}

variable "db_instance_name" {
  type        = string
  default     = "oshi-high-staging-db"
  description = "Cloud SQL instance name"
}

variable "db_version" {
  type        = string
  default     = "POSTGRES_15"
  description = "PostgreSQL version"
}

variable "db_tier" {
  type        = string
  default     = "db-f1-micro"
  description = "Cloud SQL machine type (minimal for staging)"
}

variable "bucket_name" {
  type        = string
  default     = "oshi-high-staging-assets"
  description = "GCS bucket name for assets"
}

variable "tfstate_bucket" {
  type        = string
  description = "GCS bucket for Terraform state (remote backend)"
}
