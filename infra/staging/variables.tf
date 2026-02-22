variable "project_id" {
  type        = string
  description = "GCP project id for staging"
}

variable "region" {
  type        = string
  default     = "asia-northeast1"
  description = "GCP region"
}

variable "db_instance_name" {
  type    = string
  default = "oshi-high-staging-db"
}

variable "db_user" {
  type    = string
  default = "oshi_user"
}

variable "service_account_email" {
  type        = string
  description = "Service Account used by Cloud Run (optional; can be created by Terraform)"
  default     = ""
}

variable "db_password" {
  type        = string
  description = "Password for the database user; passed via env var from CI or terraform.tfvars"
  sensitive   = true
}
