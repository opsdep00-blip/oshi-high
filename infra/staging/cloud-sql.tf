resource "google_sql_database_instance" "postgres" {
  name             = var.db_instance_name
  database_version = "POSTGRES_15"
  region           = var.region
  deletion_protection = false

  settings {
    tier = "db-f1-micro"
    ip_configuration {
      ipv4_enabled    = true
      ssl_mode        = "ALLOW_UNENCRYPTED_AND_ENCRYPTED"
    }
  }
}

resource "google_sql_database" "oshi_db" {
  name     = "oshi_staging"
  instance = google_sql_database_instance.postgres.name
}

resource "google_sql_user" "oshi_user" {
  name     = var.db_user
  instance = google_sql_database_instance.postgres.name
  password = var.db_password
}

# PostgreSQLのデフォルト管理者ユーザー(postgres)のパスワード設定
resource "google_sql_user" "postgres" {
  name     = "postgres"
  instance = google_sql_database_instance.postgres.name
  password = var.db_password
}

output "instance_connection_name" {
  value = google_sql_database_instance.postgres.connection_name
}
