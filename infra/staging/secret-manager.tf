# Placeholders: store secrets that Cloud Run will consume. Use `gcloud secrets versions add` or Terraform to manage values.
resource "google_secret_manager_secret" "nextauth_secret" {
  secret_id = "staging-nextauth-secret"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "firebase_private_key" {
  secret_id = "staging-firebase-private-key"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "google_client_id" {
  secret_id = "staging-google-client-id"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "google_client_secret" {
  secret_id = "staging-google-client-secret"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "phone_hash_secret" {
  secret_id = "staging-phone-hash-secret"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "firebase_project_id" {
  secret_id = "staging-firebase-project-id"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "firebase_client_email" {
  secret_id = "staging-firebase-client-email"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "firebase_api_key" {
  secret_id = "staging-firebase-api-key"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "recaptcha_site_key" {
  secret_id = "staging-recaptcha-site-key"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "recaptcha_site_key" {
  secret      = google_secret_manager_secret.recaptcha_site_key.id
  secret_data = var.recaptcha_site_key
}

resource "google_secret_manager_secret" "recaptcha_secret_key" {
  secret_id = "staging-recaptcha-secret-key"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "recaptcha_secret_key" {
  secret      = google_secret_manager_secret.recaptcha_secret_key.id
  secret_data = var.recaptcha_secret_key
}


# (Add more secrets as needed: DB password, JWT secret, Google OAuth secret, etc.)
