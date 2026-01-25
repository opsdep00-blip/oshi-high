variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "asia-northeast1"
}

variable "zone" {
  description = "GCP zone"
  type        = string
  default     = "asia-northeast1-a"
}

variable "db_instance_name" {
  description = "Cloud SQL instance name"
  type        = string
}

variable "db_version" {
  description = "PostgreSQL version"
  type        = string
  default     = "POSTGRES_15"
}

variable "db_tier" {
  description = "Database tier"
  type        = string
  default     = "db-custom-4-16384" # 4 vCPU, 16GB RAM for production
}

variable "bucket_name" {
  description = "GCS bucket name for assets"
  type        = string
}

variable "tfstate_bucket" {
  description = "GCS bucket for Terraform state"
  type        = string
}
