resource "google_cloud_run_service" "oshi_service" {
  name     = "oshi-service-staging"
  location = var.region

  template {
     metadata {
      annotations = {
        # Cloud SQLへの接続(Unix Socket)を有効化
        "run.googleapis.com/cloudsql-instances" = google_sql_database_instance.postgres.connection_name
      }
    }
    spec {
      containers {
        image = "gcr.io/${var.project_id}/oshi-service-staging:latest" # build & push image via CI
        ports {
          container_port = 3000
        }
        env {
          name  = "DATABASE_URL"
          # Unix Socket経由での接続文字列を構築
          value = "postgresql://${var.db_user}:${var.db_password}@localhost/${google_sql_database.oshi_db.name}?host=/cloudsql/${google_sql_database_instance.postgres.connection_name}"
        }
        
        # Secret Managerから環境変数を注入
        env {
          name = "NEXTAUTH_SECRET"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.nextauth_secret.secret_id
              key  = "latest"
            }
          }
        }
        env {
          name = "FIREBASE_PRIVATE_KEY" # アプリ側の変数名に合わせて変更してください
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.firebase_private_key.secret_id
              key  = "latest"
            }
          }
        }
        env {
          name = "FIREBASE_PROJECT_ID"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.firebase_project_id.secret_id
              key  = "latest"
            }
          }
        }
        env {
          name = "FIREBASE_CLIENT_EMAIL"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.firebase_client_email.secret_id
              key  = "latest"
            }
          }
        }
        env {
          name = "FIREBASE_API_KEY"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.firebase_api_key.secret_id
              key  = "latest"
            }
          }
        }
        env {
          name  = "SMS_PROVIDER"
          value = "firebase"
        }
        env {
          name = "PHONE_HASH_SECRET"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.phone_hash_secret.secret_id
              key  = "latest"
            }
          }
        }

        # NextAuth URL (Cloud RunのURLを設定)
        env {
          name  = "NEXTAUTH_URL"
          value = "https://oshi-service-staging-zzrx5al33q-an.a.run.app"
        }
        env {
          name  = "AUTH_TRUST_HOST"
          value = "true"
        }

        # Google Login Secrets
        env {
          name = "GOOGLE_CLIENT_ID"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.google_client_id.secret_id
              key  = "latest"
            }
          }
        }
        env {
          name = "GOOGLE_CLIENT_SECRET"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.google_client_secret.secret_id
              key  = "latest"
            }
          }
        }
      }
      service_account_name = google_service_account.cloud_run_sa.email
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }
}

# IAM binding to allow unauthenticated invocations (remove if you require auth)
resource "google_cloud_run_service_iam_member" "invoker" {
  project        = var.project_id
  location       = var.region
  service         = google_cloud_run_service.oshi_service.name
  role           = "roles/run.invoker"
  member         = "allUsers"
}

output "cloud_run_url" {
  value = google_cloud_run_service.oshi_service.status[0].url
}
