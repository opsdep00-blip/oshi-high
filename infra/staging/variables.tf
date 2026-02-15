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

variable "db_password" {
  type        = string
  description = "DB password (use Terraform variable or secret)"
  sensitive   = true
}

variable "service_account_email" {
  type        = string
  description = "Service Account used by Cloud Run (optional; can be created by Terraform)"
  default     = ""
}
