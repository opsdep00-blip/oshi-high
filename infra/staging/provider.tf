terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  # GCS backend for staging environment
  backend "gcs" {
    bucket  = "oshi-high-tfstate-staging"
    prefix  = "terraform/staging"
  }
}

provider "google" {
  project     = var.project_id
  region      = var.region
  zone        = var.zone
  credentials = file("${path.module}/sa-key.json")
}
