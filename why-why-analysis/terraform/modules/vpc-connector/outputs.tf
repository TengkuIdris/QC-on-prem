output "connector_name" {
  description = "VPCコネクタの名前"
  value       = google_vpc_access_connector.connector.name
}

output "connector_id" {
  description = "VPCコネクタのID"
  value       = google_vpc_access_connector.connector.id
}