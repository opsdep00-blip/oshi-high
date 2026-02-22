// This file declares the Cloud Storage bucket used to hold
// the Terraform remote state. It's intentionally separate from the
// backend configuration because the bucket must exist before the
// backend can be initialized. The typical workflow is:
//
//   1. `terraform apply -target=google_storage_bucket.state`
//      (or run the step in CI listed below) to create the bucket.
//   2. `terraform init` as usual, which will then be able to use
//      the bucket as a remote backend.
//
// Alternatively, the bucket can be created with `gsutil` or via the
// console. Having it in Terraform at least ensures it is codified
// for future reprovisions.

resource "google_storage_bucket" "state" {
  name          = "oshi-high-tfstate-staging"
  location      = var.region
  force_destroy = true    // state bucket may contain objects

  uniform_bucket_level_access = true

  // optional lifecycle rules, encryption, etc.
}
