# Cloud SQLインスタンス
resource "google_sql_database_instance" "postgres_instance" {
  name             = "why-why-chat-ai-db-${terraform.workspace}"
  database_version = "POSTGRES_15"
  project          = var.project_id
  region           = var.region

  deletion_protection = var.deletion_protection_enabled

  settings {
    tier              = "db-g1-small"
    availability_type = "ZONAL"
    disk_type         = "PD_SSD"
    disk_size         = 20

    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7
      backup_retention_settings {
        retained_backups = 7
        retention_unit   = "COUNT"
      }
    }

    # Private IP専用設定
    ip_configuration {
      ipv4_enabled                                  = false  # パブリックIPを無効化
      private_network                               = var.network_id
      enable_private_path_for_google_cloud_services = true
    }

    # IAM認証を有効化
    database_flags {
      name  = "cloudsql.iam_authentication"
      value = "on"
    }

    database_flags {
      name  = "log_checkpoints"
      value = "on"
    }

    database_flags {
      name  = "log_connections"
      value = "on"
    }

    database_flags {
      name  = "log_disconnections"
      value = "on"
    }

    database_flags {
      name  = "log_lock_waits"
      value = "on"
    }

    database_flags {
      name  = "log_min_duration_statement"
      value = "1000"
    }
  }

  depends_on = [
    # プライベートサービスアクセスの設定が完了してから作成
  ]
}

# データベースの作成
resource "google_sql_database" "database" {
  name     = var.db_name
  instance = google_sql_database_instance.postgres_instance.name
  project  = var.project_id
}

# アプリケーション用のIAMデータベースユーザー
# .gserviceaccount.comサフィックスを削除
resource "google_sql_user" "app_iam_user" {
  name     = replace(var.app_service_account_email, ".gserviceaccount.com", "")
  instance = google_sql_database_instance.postgres_instance.name
  type     = "CLOUD_IAM_SERVICE_ACCOUNT"
  project  = var.project_id
}

# IAM メンテナンス用 SUPERUSER
resource "google_sql_user" "iam_maint_superuser" {
  name     = replace(var.iam_maint_service_account_email, ".gserviceaccount.com", "")
  instance = google_sql_database_instance.postgres_instance.name
  type     = "CLOUD_IAM_SERVICE_ACCOUNT"
  project  = var.project_id

  # SUPERUSER 付与はプロビジョナーで実行
}

# postgresユーザーのパスワード設定（初回スキーマ設定用）
resource "random_password" "postgres_password" {
  length  = 16
  special = true
}

resource "google_sql_user" "postgres" {
  name     = "postgres"
  instance = google_sql_database_instance.postgres_instance.name
  password = random_password.postgres_password.result
  project  = var.project_id
}

# --- スキーマ作成と権限付与 ---------------------------------------------------

locals {
  checkpoint_schema = "whywhy"
  app_sa_db_user    = replace(var.app_service_account_email, ".gserviceaccount.com", "")
}

# 注意: 組織ポリシーにより、Terraformからの直接的なCloud SQL接続はできません。
# スキーマ作成と権限付与は、以下のいずれかの方法で行ってください：
# 1. Cloud Runアプリケーション起動時に自動的に実行
# 2. Cloud Console経由で手動実行
# 3. Cloud Shellから実行（VPC内）
