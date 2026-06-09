variable "project_id" {
  description = "GCPプロジェクトID"
  type        = string
}

variable "region" {
  description = "デプロイ先のリージョン"
  type        = string
  default     = "asia-northeast1"
}

variable "service_name" {
  description = "Cloud Runサービス名"
  type        = string
  default     = "why-why-chat-ai"
}

variable "image" {
  description = "デプロイするコンテナイメージのURL"
  type        = string
}

variable "cpu" {
  description = "割り当てるCPUユニット数"
  type        = number
  default     = 1
}

variable "memory" {
  description = "割り当てるメモリ量（MB）"
  type        = string
  default     = "512Mi"
}

variable "concurrency" {
  description = "インスタンスあたりの同時リクエスト数"
  type        = number
  default     = 80
}

variable "min_instances" {
  description = "最小インスタンス数"
  type        = number
  default     = 0
}

variable "max_instances" {
  description = "最大インスタンス数"
  type        = number
  default     = 10
}

variable "timeout_seconds" {
  description = "リクエストタイムアウト秒数"
  type        = number
  default     = 300
}

variable "environment_variables" {
  description = "環境変数のマップ"
  type        = map(string)
  default     = {}
}

variable "service_account_email" {
  description = "サービスが使用するサービスアカウントのメールアドレス"
  type        = string
  default     = ""
}

variable "ingress_settings" {
  description = "Cloud Runサービスに到達できるトラフィックを制御します。有効な値は ALLOW_ALL, ALLOW_INTERNAL_ONLY, ALLOW_INTERNAL_AND_CLOUD_LOAD_BALANCING です。"
  type        = string
  default     = "ALLOW_INTERNAL_AND_CLOUD_LOAD_BALANCING"
}

variable "annotations" {
  description = "追加のアノテーション"
  type        = map(string)
  default     = {}
}
