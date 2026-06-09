# セキュリティモジュールの変数定義

variable "project_id" {
  description = "GCPプロジェクトID"
  type        = string
}

variable "name_prefix" {
  description = "リソース名のプレフィックス"
  type        = string
  default     = "why-why-chat-ai"
}

variable "enable_cloud_armor" {
  description = "Cloud Armorを有効にするか"
  type        = bool
  default     = false
}

variable "enable_load_balancer" {
  description = "ロードバランサーを有効にするか"
  type        = bool
  default     = false
}

variable "allowed_ip_ranges" {
  description = "許可するIPアドレス範囲のリスト"
  type        = list(string)
  default     = []
}

variable "rate_limit_threshold" {
  description = "レート制限のしきい値（リクエスト数）"
  type        = number
  default     = 100
}

variable "rate_limit_interval_sec" {
  description = "レート制限の測定間隔（秒）"
  type        = number
  default     = 60
}

variable "ban_duration_sec" {
  description = "レート制限違反時のBAN期間（秒）"
  type        = number
  default     = 600
}

variable "enable_iap" {
  description = "Identity-Aware Proxyを有効にするか"
  type        = bool
  default     = false
}

variable "iap_oauth2_client_id" {
  description = "IAP OAuth2クライアントID"
  type        = string
  default     = ""
}

variable "iap_oauth2_client_secret" {
  description = "IAP OAuth2クライアントシークレット"
  type        = string
  default     = ""
  sensitive   = true
}

variable "ssl_policy_min_tls_version" {
  description = "SSLポリシーの最小TLSバージョン"
  type        = string
  default     = "TLS_1_2"
}

variable "enable_logging" {
  description = "Cloud Armorのロギングを有効にするか"
  type        = bool
  default     = true
}

variable "log_level" {
  description = "ログレベル（NORMAL or VERBOSE）"
  type        = string
  default     = "NORMAL"
}
