variable "environment" {
  description = "環境名 (dev, stg, prod など)"
  type        = string
}

variable "project_id" {
  description = "GCPプロジェクトID"
  type        = string
}

variable "region" {
  description = "リソースをデプロイするリージョン"
  type        = string
  default     = "asia-northeast1"
}

variable "log_level" {
  description = "ログレベル (DEBUG, INFO, WARNING, ERROR, CRITICAL)"
  type        = string
  default     = "INFO"
}

variable "github_repository_owner" {
  description = "GitHubリポジトリのオーナー名（組織名またはユーザー名）"
  type        = string
  default     = "blavusai"
}

variable "github_repository" {
  description = "GitHubリポジトリの完全名（例: owner/repository）"
  type        = string
  default     = "blavusai/jatco-why-why-chat-ai"
}

variable "service_account_prefix" {
  description = "サービスアカウントのプレフィックス（本番環境では他アプリと区別するため必要）"
  type        = string
  default     = ""  # dev.tfvarsでは空、prod.tfvarsでは"why-why-chat-ai-"など
}

variable "network_name" {
  description = "使用するVPCネットワーク名"
  type        = string
  default     = "default"
}
