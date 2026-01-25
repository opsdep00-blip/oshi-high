terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  # Using local backend for now
  # GCS bucket created for future migration
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
