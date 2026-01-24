terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  # Temporarily using local backend for staging initialization
  # Will migrate to GCS after state bucket is created
  # backend "gcs" {
  #   bucket  = "oshi-high-tfstate-staging"
  #   prefix  = "terraform/staging"
  # }
}

provider "google" {
  project     = var.project_id
  region      = var.region
  zone        = var.zone
  credentials = file("${path.module}/sa-key.json")
}
