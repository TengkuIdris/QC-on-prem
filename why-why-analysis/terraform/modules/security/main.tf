# セキュリティ設定モジュール

# Cloud Armor セキュリティポリシーの強化
resource "google_compute_security_policy" "advanced_policy" {
  count   = var.enable_cloud_armor ? 1 : 0
  name    = "${var.name_prefix}-advanced-security-policy"
  project = var.project_id

  # デフォルトルール：全て拒否
  rule {
    action   = "deny(403)"
    priority = 2147483647
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    description = "Default deny all traffic"
  }

  # 許可IPアドレス
  rule {
    action   = "allow"
    priority = 1000
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = var.allowed_ip_ranges
      }
    }
    description = "Allow traffic from whitelisted IPs"
  }

  # レート制限ルール
  rule {
    action   = "rate_based_ban"
    priority = 2000

    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }

    rate_limit_options {
      conform_action = "allow"
      exceed_action  = "deny(429)"

      enforce_on_key = "IP"

      rate_limit_threshold {
        count        = var.rate_limit_threshold
        interval_sec = var.rate_limit_interval_sec
      }

      ban_duration_sec = var.ban_duration_sec
    }

    description = "Rate limiting rule"
  }

  # OWASP Top 10 攻撃からの保護
  rule {
    action   = "deny(403)"
    priority = 3000

    match {
      expr {
        expression = <<-EOT
          // SQL Injection
          evaluatePreconfiguredExpr('sqli-v33-stable') ||
          // Cross-site Scripting
          evaluatePreconfiguredExpr('xss-v33-stable') ||
          // Local File Inclusion
          evaluatePreconfiguredExpr('lfi-v33-stable') ||
          // Remote File Inclusion
          evaluatePreconfiguredExpr('rfi-v33-stable') ||
          // Remote Code Execution
          evaluatePreconfiguredExpr('rce-v33-stable')
        EOT
      }
    }

    description = "OWASP Top 10 protection"
  }

  # ログ設定
  rule {
    action   = "allow"
    priority = 4000

    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }

    # ヘッダーベースのロギング
    header_action {
      request_headers_to_adds {
        header_name  = "X-Cloud-Armor-Action"
        header_value = "logged"
      }
    }

    description = "Log all requests"
  }
}

# SSL ポリシー（より厳格な設定）
resource "google_compute_ssl_policy" "strict_ssl_policy" {
  count           = var.enable_load_balancer ? 1 : 0
  name            = "${var.name_prefix}-strict-ssl-policy"
  project         = var.project_id
  profile         = "CUSTOM"
  min_tls_version = "TLS_1_2"

  custom_features = [
    "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256",
    "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384",
    "TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256"
  ]
}
