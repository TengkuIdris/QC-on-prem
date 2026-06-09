#!/bin/bash

# Terraform Remote State Backend Setup Script
# This script creates and configures a GCS bucket for Terraform state management

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Usage function
usage() {
    cat << EOF
Usage: $0 <PROJECT_ID> [REGION]

Setup Terraform remote state backend in Google Cloud Storage

Arguments:
  PROJECT_ID    GCP project ID (required)
  REGION        GCS bucket location (default: asia-northeast1)

Example:
  $0 jtc-why-why-chat-ai-dev
  $0 jtc-why-why-chat-ai-dev us-central1

This script will:
1. Create a GCS bucket for Terraform state storage
2. Enable versioning for state history management
3. Set lifecycle policy to clean up old state versions
4. Configure the bucket for secure state management

Prerequisites:
- gcloud CLI authenticated with appropriate permissions
- roles/storage.admin on the project
EOF
}

# Validate arguments
if [ $# -lt 1 ]; then
    log_error "Missing required arguments"
    usage
    exit 1
fi

PROJECT_ID=$1
REGION=${2:-"asia-northeast1"}
BUCKET_NAME="${PROJECT_ID}-terraform-state"

# Main execution
main() {
    log_info "Starting Terraform backend setup"
    log_info "Project ID: $PROJECT_ID"
    log_info "Region: $REGION"
    log_info "Bucket Name: $BUCKET_NAME"

    # Set project
    log_info "Setting GCP project..."
    gcloud config set project "$PROJECT_ID"

    # Check if bucket already exists
    log_info "Checking if bucket already exists..."
    if gsutil ls -p "$PROJECT_ID" "gs://${BUCKET_NAME}" >/dev/null 2>&1; then
        log_warning "Bucket gs://${BUCKET_NAME} already exists"

        # Check current settings
        log_info "Current bucket configuration:"
        log_info "  Versioning: $(gsutil versioning get gs://${BUCKET_NAME} | grep -oE '(Enabled|Disabled)')"
        log_info "  Location: $(gsutil ls -L -b gs://${BUCKET_NAME} | grep 'Location constraint:' | awk '{print $3}')"

        read -p "Do you want to update the existing bucket configuration? [y/N] " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Skipping bucket update"
            display_summary
            exit 0
        fi
    else
        # Create GCS bucket
        log_info "Creating GCS bucket for Terraform state..."
        gsutil mb -p "${PROJECT_ID}" -l "${REGION}" "gs://${BUCKET_NAME}" || {
            log_error "Failed to create bucket. Please check your permissions."
            exit 1
        }
        log_success "Bucket created successfully"
    fi

    # Enable versioning
    log_info "Enabling versioning for state history management..."
    gsutil versioning set on "gs://${BUCKET_NAME}"
    log_success "Versioning enabled"

    # Create lifecycle configuration
    log_info "Setting lifecycle policy for automatic cleanup of old state versions..."

    cat > lifecycle.json << 'EOF'
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {
          "numNewerVersions": 10,
          "isLive": false
        }
      }
    ]
  }
}
EOF

    gsutil lifecycle set lifecycle.json "gs://${BUCKET_NAME}"
    rm -f lifecycle.json
    log_success "Lifecycle policy configured"

    # Set bucket permissions (uniform bucket-level access)
    log_info "Configuring bucket security settings..."
    gsutil uniformbucketlevelaccess set on "gs://${BUCKET_NAME}" || log_warning "Uniform bucket-level access may already be enabled"

    # Display summary
    display_summary
}

# Display configuration summary
display_summary() {
    cat << EOF

${GREEN}✅ Terraform Backend Setup Completed!${NC}

${BLUE}Bucket Configuration:${NC}
- Name: gs://${BUCKET_NAME}
- Location: ${REGION}
- Versioning: Enabled
- Lifecycle: Keep latest 10 versions
- Access: Uniform bucket-level access

${BLUE}Next Steps:${NC}

1. ${YELLOW}Update your Terraform backend configuration:${NC}

   Edit terraform/backend.tf (or main.tf) to include:

   terraform {
     backend "gcs" {
       bucket = "${BUCKET_NAME}"
       prefix = "terraform/state"
     }
   }

2. ${YELLOW}Initialize Terraform:${NC}

   cd terraform
   terraform init

3. ${YELLOW}Grant permissions to CI/CD service account:${NC}

   The CI/CD service account needs roles/storage.admin on this bucket.
   This is handled by the setup-cicd-service-account.sh script.

${BLUE}Verification Commands:${NC}
# Check bucket details
gsutil ls -L -b gs://${BUCKET_NAME}

# View versioning status
gsutil versioning get gs://${BUCKET_NAME}

# View lifecycle configuration
gsutil lifecycle get gs://${BUCKET_NAME}

${BLUE}Important Notes:${NC}
- This bucket contains sensitive infrastructure state
- Ensure only authorized users/service accounts have access
- Regular backups are maintained through versioning
- Old versions are automatically cleaned up after 10 newer versions exist

EOF
}

# Execute main function
main
