variable "project_id" {
  description = "GCPプロジェクトID"
  type        = string
}

variable "region" {
  description = "リージョン"
  type        = string
}

variable "network_name" {
  description = "VPCネットワーク名"
  type        = string
}

variable "ip_cidr_range" {
  description = "VPCコネクタが使用するIPアドレス範囲（例: 10.8.0.0/28）"
  type        = string
  default     = "10.8.0.0/28"
}