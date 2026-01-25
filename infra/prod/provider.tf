terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }

  # Using local backend for now
  # GCS bucket will be created for production state management
  # backend "gcs" {
  #   bucket  = "oshi-high-tfstate-prod"
  #   prefix  = "terraform/prod"
  # }
}

provider "google" {
  project     = var.project_id
  region      = var.region
  zone        = var.zone
  credentials = file("${path.module}/sa-key.json")
}
