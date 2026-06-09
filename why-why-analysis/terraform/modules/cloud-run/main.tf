resource "google_cloud_run_service" "service" {
  name     = var.service_name
  location = var.region
  project  = var.project_id

  metadata {
    annotations = {
      "run.googleapis.com/ingress" = var.ingress_settings
    }
  }

  template {
    spec {
      containers {
        image = var.image

        resources {
          limits = {
            cpu    = var.cpu
            memory = var.memory
          }
        }

        dynamic "env" {
          for_each = var.environment_variables
          content {
            name  = env.key
            value = env.value
          }
        }
      }

      container_concurrency = var.concurrency
      timeout_seconds      = var.timeout_seconds
      service_account_name = var.service_account_email != "" ? var.service_account_email : null
    }

    metadata {
      annotations = merge({
        "autoscaling.knative.dev/minScale" = var.min_instances,
        "autoscaling.knative.dev/maxScale" = var.max_instances
      }, var.annotations)
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  autogenerate_revision_name = true
}
