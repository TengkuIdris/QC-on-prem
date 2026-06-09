# Cloud Run関連の出力は削除
# サービスURLやサービス名はdeployジョブで管理

output "service_account_email" {
  description = "サービスアカウントのメールアドレス"
  value       = google_service_account.app_sa.email
}

output "artifact_registry_repository" {
  description = "作成されたアーティファクトレジストリリポジトリ名"
  value       = google_artifact_registry_repository.why_why_chat_ai_repo.name
}

output "vertex_ai_staging_bucket" {
  description = "Vertex AI ステージングバケット名"
  value       = google_storage_bucket.vertex_ai_staging.name
}

output "api_gateway_url" {
  description = "API GatewayのエンドポイントURL"
  value       = google_api_gateway_gateway.gateway.default_hostname
}

output "api_gateway_managed_service" {
  description = "API Gatewayの管理サービス名（API Key設定用）"
  value       = google_api_gateway_api_config.api_config.name
}

# CI/CD、テスト用サービスアカウント、Workload Identity Providerの情報は手動で管理

# Cloud SQL関連の出力（開発環境）
output "dev_database_url" {
  description = "開発環境のデータベース接続文字列（後方互換性のため）"
  value       = terraform.workspace == "dev" && length(module.cloud_sql_dev) > 0 ? module.cloud_sql_dev[0].database_url : null
  sensitive   = true
}

output "dev_database_url_iam" {
  description = "開発環境のIAM認証用データベース接続文字列"
  value       = terraform.workspace == "dev" && length(module.cloud_sql_dev) > 0 ? module.cloud_sql_dev[0].database_url_iam : null
  sensitive   = true
}

output "dev_cloud_sql_instance_connection_name" {
  description = "開発環境のCloud SQLインスタンス接続名"
  value       = terraform.workspace == "dev" && length(module.cloud_sql_dev) > 0 ? module.cloud_sql_dev[0].instance_connection_name : null
}

output "dev_postgres_password" {
  description = "開発環境のpostgresユーザーパスワード（初期設定用）"
  value       = terraform.workspace == "dev" && length(module.cloud_sql_dev) > 0 ? module.cloud_sql_dev[0].postgres_password : null
  sensitive   = true
}

# Cloud SQL関連の出力（本番環境）
output "prod_database_url" {
  description = "本番環境のデータベース接続文字列（後方互換性のため）"
  value       = terraform.workspace == "prod" && length(module.cloud_sql_prod) > 0 ? module.cloud_sql_prod[0].database_url : null
  sensitive   = true
}

output "prod_database_url_iam" {
  description = "本番環境のIAM認証用データベース接続文字列"
  value       = terraform.workspace == "prod" && length(module.cloud_sql_prod) > 0 ? module.cloud_sql_prod[0].database_url_iam : null
  sensitive   = true
}

output "prod_cloud_sql_instance_connection_name" {
  description = "本番環境のCloud SQLインスタンス接続名"
  value       = terraform.workspace == "prod" && length(module.cloud_sql_prod) > 0 ? module.cloud_sql_prod[0].instance_connection_name : null
}

# API Gateway関連の出力
output "api_gateway_service_account" {
  description = "API Gateway用サービスアカウント"
  value       = google_service_account.api_gateway_sa.email
}

# VPCコネクタ関連の出力（開発環境）
output "dev_vpc_connector_name" {
  description = "開発環境のVPCコネクタ名"
  value       = terraform.workspace == "dev" && length(module.vpc_connector_dev) > 0 ? module.vpc_connector_dev[0].connector_name : null
}

# VPCコネクタ関連の出力（本番環境）
output "prod_vpc_connector_name" {
  description = "本番環境のVPCコネクタ名"
  value       = terraform.workspace == "prod" && length(module.vpc_connector_prod) > 0 ? module.vpc_connector_prod[0].connector_name : null
}
