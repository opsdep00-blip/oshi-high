terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
  # Remote state backend is configured at init time with
  # `-backend-config="bucket=..."` rather than being hardcoded here.
  # This makes bootstrapping (creating the bucket) simpler: the first
  # `terraform init` uses the local backend, then after the bucket exists
  # you can re-run `terraform init -backend-config="bucket=oshi-high-tfstate-staging"`.
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "random" {}
