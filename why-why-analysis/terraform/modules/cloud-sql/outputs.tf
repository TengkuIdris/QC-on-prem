output "instance_connection_name" {
  description = "Cloud SQL インスタンスの接続名"
  value       = google_sql_database_instance.postgres_instance.connection_name
}

output "database_name" {
  description = "データベース名"
  value       = google_sql_database.database.name
}

output "app_iam_user" {
  description = "アプリケーション用IAMデータベースユーザー名"
  value       = google_sql_user.app_iam_user.name
}

output "database_url_iam" {
  description = "IAM認証用のデータベース接続文字列（パスワード不要）"
  value = format(
    "postgresql+asyncpg://%s@/%s?host=/cloudsql/%s",
    google_sql_user.app_iam_user.name,
    google_sql_database.database.name,
    google_sql_database_instance.postgres_instance.connection_name
  )
}

output "private_ip_address" {
  description = "Cloud SQL インスタンスのプライベートIPアドレス"
  value       = google_sql_database_instance.postgres_instance.private_ip_address
}

# 後方互換性のため残す（非推奨）
output "db_user" {
  description = "データベースユーザー名（非推奨：IAM認証を使用）"
  value       = google_sql_user.app_iam_user.name
}

output "db_password" {
  description = "データベースパスワード（非推奨：IAM認証を使用）"
  value       = "IAM_AUTH_USED"
  sensitive   = true
}

output "database_url" {
  description = "データベース接続文字列（非推奨：database_url_iamを使用）"
  value       = format(
    "postgresql+asyncpg://%s@/%s?host=/cloudsql/%s",
    google_sql_user.app_iam_user.name,
    google_sql_database.database.name,
    google_sql_database_instance.postgres_instance.connection_name
  )
  sensitive   = true
}

output "postgres_password" {
  description = "Postgres user password (for initial setup only)"
  value       = random_password.postgres_password.result
  sensitive   = true
}
