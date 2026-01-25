# Service Account creation disabled due to permission constraints
# Will be created manually or via GitHub Actions with appropriate IAM role
# To enable: uncomment below and ensure terraform service account has iam.serviceAccounts.create permission

# # Terraform Service Account
# resource "google_service_account" "terraform" {
#   account_id   = "terraform-prod"
#   display_name = "Terraform for Production Environment"
#   project      = var.project_id
#   description  = "Service Account for Terraform to manage GCP resources in production"
# }

# # Service Account Key 生成
# resource "google_service_account_key" "terraform" {
#   service_account_id = google_service_account.terraform.name
#   public_key_type    = "TYPE_X509_PEM_FILE"
#
#   lifecycle {
#     create_before_destroy = true
#   }
# }
