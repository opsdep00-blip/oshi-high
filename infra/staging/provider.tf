terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  backend "gcs" {
    bucket  = "REPLACE_WITH_TFSTATE_BUCKET"
    prefix  = "terraform/staging"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}
