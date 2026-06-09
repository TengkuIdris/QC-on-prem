# セキュリティモジュールの出力定義

output "security_policy_id" {
  description = "Cloud Armorセキュリティポリシーのリソースパス"
  value       = var.enable_cloud_armor ? google_compute_security_policy.advanced_policy[0].id : null
}

output "security_policy_name" {
  description = "Cloud Armorセキュリティポリシーの名前"
  value       = var.enable_cloud_armor ? google_compute_security_policy.advanced_policy[0].name : null
}

output "ssl_policy_id" {
  description = "SSLポリシーのリソースパス"
  value       = var.enable_load_balancer ? google_compute_ssl_policy.strict_ssl_policy[0].id : null
}

output "ssl_policy_name" {
  description = "SSLポリシーの名前"
  value       = var.enable_load_balancer ? google_compute_ssl_policy.strict_ssl_policy[0].name : null
}

output "security_config_summary" {
  description = "セキュリティ設定のサマリー"
  value = {
    cloud_armor_enabled      = var.enable_cloud_armor
    load_balancer_enabled    = var.enable_load_balancer
    allowed_ip_count        = length(var.allowed_ip_ranges)
    rate_limit_enabled      = var.enable_cloud_armor
    rate_limit_threshold    = var.rate_limit_threshold
    owasp_protection        = var.enable_cloud_armor
    ssl_min_version         = var.ssl_policy_min_tls_version
    iap_enabled             = var.enable_iap
  }
}
