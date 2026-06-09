output "service_url" {
  description = "Cloud RunサービスのURL"
  value       = google_cloud_run_service.service.status[0].url
}

output "service_name" {
  description = "Cloud Runサービス名"
  value       = google_cloud_run_service.service.name
}

output "service_location" {
  description = "Cloud Runサービスのリージョン"
  value       = google_cloud_run_service.service.location
}

output "service_project" {
  description = "Cloud RunサービスがデプロイされているプロジェクトID"
  value       = google_cloud_run_service.service.project
}
