# VPC Access Connector for Cloud Run
resource "google_vpc_access_connector" "connector" {
  name          = "cloud-run-connector-${terraform.workspace}"
  project       = var.project_id
  region        = var.region
  network       = var.network_name
  ip_cidr_range = var.ip_cidr_range

  # 最小・最大インスタンス数
  min_instances = 2
  max_instances = 10

  # マシンタイプ
  machine_type = "e2-micro"
}