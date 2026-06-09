# 必要なAPIは手動で有効化済みとして扱う
# - artifactregistry.googleapis.com
# - run.googleapis.com
# - iam.googleapis.com
# - aiplatform.googleapis.com
# - sqladmin.googleapis.com
# - servicenetworking.googleapis.com
# - compute.googleapis.com

terraform {
  required_version = ">= 1.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }

  # Backend configuration will be provided via backend-config files
  # Use: terraform init -backend-config=backend-{env}.hcl
  backend "gcs" {
    # bucket and prefix will be specified in backend-{env}.hcl files
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# VPCネットワークのIDを構築（data取得でのアクセス権限エラーを回避）
locals {
  network_id = "projects/${var.project_id}/global/networks/${var.network_name}"
}

# プライベートサービスアクセス用のIPアドレス範囲を予約
resource "google_compute_global_address" "private_service_access" {
  name          = "private-service-access-${terraform.workspace}"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = local.network_id
  project       = var.project_id
}

# プライベートサービスアクセスの接続
resource "google_service_networking_connection" "private_service_access" {
  network                 = local.network_id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_service_access.name]
}

# アプリケーション用サービスアカウントを作成
resource "google_service_account" "app_sa" {
  account_id   = "${var.service_account_prefix}app-sa-${terraform.workspace}"
  display_name = "Why Why Chat AI Application Service Account (${terraform.workspace})"
  description  = "Service account for Why Why Chat AI application in ${terraform.workspace} environment"
}

# IAM メンテナンス用サービスアカウント（Cloud SQL SUPERUSER）
resource "google_service_account" "iam_maint_sa" {
  account_id   = "${var.service_account_prefix}iam-maint-sa-${terraform.workspace}"
  display_name = "Why Why Chat AI IAM Maintenance Superuser (${terraform.workspace})"
  description  = "Superuser for Cloud SQL maintenance via IAM in ${terraform.workspace} environment"
}

# アプリケーション用サービスアカウントに必要な権限を付与
resource "google_project_iam_member" "app_sa_permissions" {
  for_each = toset([
    "roles/cloudsql.client",           # Cloud SQL接続用
    "roles/aiplatform.user",           # Vertex AI利用用
    "roles/monitoring.metricWriter",   # Cloud Monitoring メトリクス送信用
    "roles/logging.logWriter",         # Cloud Logging ログ送信用
    "roles/cloudtrace.agent",          # Cloud Trace トレース送信用
    "roles/secretmanager.secretAccessor" # Secret Manager シークレット読み取り用
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.app_sa.email}"
}

# 必要最低限の権限（Cloud SQL 接続のみ）
resource "google_project_iam_member" "iam_maint_sa_cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.iam_maint_sa.email}"
}

# 既存のCI/CDおよびテスト用サービスアカウントは手動作成済みのため、
# Terraformでは管理せず、必要な権限のみアプリケーション用サービスアカウントに付与

# サービスアカウントの権限は手動で管理

# CI/CDとテスト用サービスアカウントの権限は手動で管理

# Workload Identity Poolと関連権限は手動で管理

# アーティファクトレジストリリポジトリの作成
resource "google_artifact_registry_repository" "why_why_chat_ai_repo" {
  location      = var.region
  repository_id = "why-why-chat-ai-${terraform.workspace}"
  description   = "Why Why Chat AIアプリケーション用のコンテナイメージリポジトリ (${terraform.workspace})"
  format        = "DOCKER"
}

# Vertex AI ステージングバケット
resource "google_storage_bucket" "vertex_ai_staging" {
  name     = "${var.project_id}-vertex-ai-staging"
  location = var.region

  # 環境別の保持期間設定
  lifecycle_rule {
    condition {
      age = terraform.workspace == "prod" ? 30 : 7
    }
    action {
      type = "Delete"
    }
  }

  # 未完了のマルチパートアップロードの削除
  lifecycle_rule {
    condition {
      age = 1
    }
    action {
      type = "AbortIncompleteMultipartUpload"
    }
  }

  # アクセス制御
  uniform_bucket_level_access = true

  # 削除保護（本番環境のみ）
  force_destroy = terraform.workspace == "prod" ? false : true

  labels = {
    environment = terraform.workspace
    purpose     = "vertex-ai-staging"
    managed_by  = "terraform"
  }
}

# Cloud SQLの作成（開発環境）
module "cloud_sql_dev" {
  count = terraform.workspace == "dev" ? 1 : 0

  depends_on = [
    google_service_networking_connection.private_service_access
  ]

  source = "./modules/cloud-sql"

  project_id                    = var.project_id
  project_number                = data.google_project.project.number
  region                       = var.region
  db_name                      = "why_why_chat_ai_dev"
  db_user_name                 = "app_user"
  app_service_account_email    = google_service_account.app_sa.email
  iam_maint_service_account_email = google_service_account.iam_maint_sa.email
  network_id                   = local.network_id
  deletion_protection_enabled  = false  # 開発環境では削除保護を無効
}

# Cloud SQLの作成（本番環境）
module "cloud_sql_prod" {
  count = terraform.workspace == "prod" ? 1 : 0

  depends_on = [
    google_service_networking_connection.private_service_access
  ]

  source = "./modules/cloud-sql"

  project_id                    = var.project_id
  project_number                = data.google_project.project.number
  region                       = var.region
  db_name                      = "why_why_chat_ai_prod"
  db_user_name                 = "app_user"
  app_service_account_email    = google_service_account.app_sa.email
  iam_maint_service_account_email = google_service_account.iam_maint_sa.email
  network_id                   = local.network_id
  deletion_protection_enabled  = true   # 本番環境では削除保護を有効
}

# VPCコネクタの作成（開発環境）
module "vpc_connector_dev" {
  count = terraform.workspace == "dev" ? 1 : 0

  source = "./modules/vpc-connector"

  project_id    = var.project_id
  region        = var.region
  network_name  = var.network_name
  ip_cidr_range = "10.8.0.0/28"  # Cloud SQLのプライベートIP範囲と重複しない範囲
}

# VPCコネクタの作成（本番環境）
module "vpc_connector_prod" {
  count = terraform.workspace == "prod" ? 1 : 0

  source = "./modules/vpc-connector"

  project_id    = var.project_id
  region        = var.region
  network_name  = var.network_name
  ip_cidr_range = "10.9.0.0/28"  # Cloud SQLのプライベートIP範囲と重複しない範囲
}

# Cloud Runサービス管理はCI/CDパイプラインのdeployジョブで実行
# TerraformはインフラストラクチャのみManage

# --- API Gateway Configuration ---

# API Gateway用サービスアカウント
resource "google_service_account" "api_gateway_sa" {
  account_id   = "api-gateway-sa-${terraform.workspace}"
  display_name = "API Gateway Service Account (${terraform.workspace})"
  description  = "Service account for API Gateway to invoke Cloud Run"
}

# Cloud Run invoker権限の付与
resource "google_cloud_run_service_iam_member" "api_gateway_invoker" {
  service  = "why-why-chat-ai-${terraform.workspace}"
  location = var.region
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.api_gateway_sa.email}"
}

# API Gatewayサービスの有効化
resource "null_resource" "enable_apigateway_services" {
  provisioner "local-exec" {
    command = <<-EOT
      gcloud services enable apigateway.googleapis.com --project=${var.project_id}
      gcloud services enable servicemanagement.googleapis.com --project=${var.project_id}
      gcloud services enable servicecontrol.googleapis.com --project=${var.project_id}
    EOT
  }
}

# API Gateway API定義
resource "google_api_gateway_api" "api" {
  provider     = google-beta
  api_id       = "why-why-chat-ai-api-${terraform.workspace}"
  display_name = "Why Why Chat AI API (${terraform.workspace})"

  depends_on = [null_resource.enable_apigateway_services]
}

# Cloud Run サービスのデータソース
# Bootstrap scriptで作成されたCloud Runサービスを参照
data "google_cloud_run_service" "why_why_chat_ai" {
  name     = "why-why-chat-ai-${terraform.workspace}"
  location = var.region
}

# API Gateway設定
# OpenAPI定義のコンテンツを生成（ハッシュ計算用）
locals {
  openapi_content = templatefile("${path.module}/openapi.yaml", {
    api_gateway_host = "why-why-chat-ai-gateway-${terraform.workspace}.an.gateway.dev"
    cloud_run_url    = data.google_cloud_run_service.why_why_chat_ai.status[0].url
  })
  # OpenAPIコンテンツのハッシュを使ってバージョンを生成（最初の8文字）
  api_config_version = substr(sha256(local.openapi_content), 0, 8)
}

resource "google_api_gateway_api_config" "api_config" {
  provider      = google-beta
  api           = google_api_gateway_api.api.api_id
  api_config_id = "config-${terraform.workspace}-${local.api_config_version}"

  openapi_documents {
    document {
      path     = "openapi.yaml"
      contents = base64encode(local.openapi_content)
    }
  }

  gateway_config {
    backend_config {
      google_service_account = google_service_account.api_gateway_sa.email
    }
  }

  lifecycle {
    create_before_destroy = true  # 新しいconfigを作成してから古いものを削除
  }
}

# API Gateway
resource "google_api_gateway_gateway" "gateway" {
  provider     = google-beta
  gateway_id   = "why-why-chat-ai-gateway-${terraform.workspace}"
  api_config   = google_api_gateway_api_config.api_config.id
  region       = var.region
  display_name = "Why Why Chat AI Gateway (${terraform.workspace})"

  depends_on = [google_api_gateway_api_config.api_config]
}

# API Gateway作成後のManaged Service有効化
resource "null_resource" "enable_managed_service" {
  depends_on = [google_api_gateway_api.api]

  provisioner "local-exec" {
    command = <<-EOT
      # API作成後、少し待機（API作成の伝播待ち）
      sleep 30
      
      # Managed Service名を取得
      MANAGED_SERVICE=$(gcloud api-gateway apis describe ${google_api_gateway_api.api.api_id} \
        --project=${var.project_id} \
        --format="value(managedService)")
      
      # Managed Serviceを有効化
      if [ -n "$MANAGED_SERVICE" ]; then
        echo "Enabling managed service: $MANAGED_SERVICE"
        gcloud services enable "$MANAGED_SERVICE" --project=${var.project_id}
      else
        echo "Warning: Could not retrieve managed service name"
      fi
    EOT
  }
  
  triggers = {
    api_id = google_api_gateway_api.api.api_id
  }
}

# セキュリティモジュールは削除（API Gatewayではレート制限とAPI Key認証で対応）

# --- CI/CD Service Account IAM Permissions ---
# Note: IAM permissions for CI/CD service account are managed manually due to
# permission constraints. The CI/CD service account requires the following roles:
# - roles/cloudsql.admin
# - roles/artifactregistry.admin
# - roles/run.developer
# - roles/compute.networkAdmin
# - roles/iam.serviceAccountUser
# - roles/storage.admin  # For GCS remote state backend access

# プロジェクト番号を取得（Cloud SQLなどで利用）
data "google_project" "project" {
  project_id = var.project_id
}

# アプリケーションサービスアカウントにCloud SQL IAMユーザー権限を付与
resource "google_project_iam_member" "app_sa_cloudsql_instance_user" {
  project = var.project_id
  role    = "roles/cloudsql.instanceUser"
  member  = "serviceAccount:${google_service_account.app_sa.email}"
}
