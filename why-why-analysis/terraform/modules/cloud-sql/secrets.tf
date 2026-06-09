# Secret Manager for postgres password
resource "google_secret_manager_secret" "postgres_password" {
  secret_id = "postgres-password-${terraform.workspace}"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = terraform.workspace
    managed_by  = "terraform"
  }
}

# Store the postgres password in Secret Manager
resource "google_secret_manager_secret_version" "postgres_password" {
  secret      = google_secret_manager_secret.postgres_password.id
  secret_data = random_password.postgres_password.result
}

# Grant access to service accounts
locals {
  # Service accounts that need access to the postgres password
  postgres_password_accessors = [
    "serviceAccount:${var.app_service_account_email}",
    "serviceAccount:cicd-sa-${terraform.workspace}@${var.project_id}.iam.gserviceaccount.com"
  ]
}

# Grant secret accessor role
resource "google_secret_manager_secret_iam_binding" "postgres_password_access" {
  secret_id = google_secret_manager_secret.postgres_password.id
  project   = var.project_id
  role      = "roles/secretmanager.secretAccessor"
  members   = local.postgres_password_accessors
}

# Output the secret resource name for use in other modules
output "postgres_password_secret_name" {
  value       = google_secret_manager_secret.postgres_password.secret_id
  description = "The name of the postgres password secret in Secret Manager"
}

output "postgres_password_secret_version" {
  value       = google_secret_manager_secret_version.postgres_password.name
  description = "The current version of the postgres password secret"
}