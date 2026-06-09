variable "project_id" {
  description = "Google CloudプロジェクトID"
  type        = string
}

variable "project_number" {
  description = "Google CloudプロジェクトNumber"
  type        = string
}

variable "region" {
  description = "Cloud SQLインスタンスを作成するリージョン"
  type        = string
}

variable "db_name" {
  description = "作成するデータベース名"
  type        = string
  default     = "why_why_chat_ai"
}

variable "db_user_name" {
  description = "データベースユーザー名（非推奨：IAM認証を使用）"
  type        = string
  default     = "app_user"
}

variable "app_service_account_email" {
  description = "アプリケーション用サービスアカウントのメールアドレス"
  type        = string
}

variable "iam_maint_service_account_email" {
  description = "メンテナンス用 IAM Superuser サービスアカウントのメールアドレス"
  type        = string
}

variable "network_id" {
  description = "Cloud SQLインスタンスを接続するVPCネットワークのID"
  type        = string
}

variable "deletion_protection_enabled" {
  description = "削除保護の有効化（本番環境では true を推奨）"
  type        = bool
  default     = false
}
