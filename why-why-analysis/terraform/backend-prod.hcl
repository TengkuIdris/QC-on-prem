# Production environment backend configuration
# This file is used with: terraform init -backend-config=backend-prod.hcl

# TODO: Update bucket name with actual production project ID
# Example: bucket = "jatco-5why-terraform-state"
bucket = "jatco-5why-terraform-state"
prefix = "terraform/state"
