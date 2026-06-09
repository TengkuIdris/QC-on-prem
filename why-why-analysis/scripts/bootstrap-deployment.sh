#!/bin/bash

# Bootstrap script for Option A: Data Source Pattern implementation
# This script creates minimal Cloud Run service before Terraform execution
# to resolve the circular dependency between Terraform and CI/CD pipelines
#
# Service Account Strategy:
# - Bootstrap phase: Uses default service account (temporary, minimal risk)
# - Terraform phase: Creates dedicated application service account
# - CI/CD phase: Updates Cloud Run to use dedicated service account

set -euo pipefail

# Configuration
PROJECT_ID=${1:-""}
ENVIRONMENT=${2:-"dev"}
REGION="asia-northeast1"
SERVICE_NAME="why-why-chat-ai-${ENVIRONMENT}"
PLACEHOLDER_IMAGE="gcr.io/cloudrun/placeholder"

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
Usage: $0 <PROJECT_ID> [ENVIRONMENT]

Bootstrap deployment for Option A implementation

Arguments:
  PROJECT_ID    GCP project ID (required)
  ENVIRONMENT   Target environment (default: dev)

Example:
  $0 jtc-why-why-chat-ai-dev
  $0 jatco-5why prod

Description:
This script performs the initial setup required for Option A implementation:
1. Creates a placeholder Cloud Run service that Terraform can reference via data source
2. Prepares the environment for proper Terraform execution
3. Enables subsequent CI/CD pipeline execution

This resolves the circular dependency between:
- terraform job → build job (Cloud Run deployment needs container image)
- build job → terraform job (Build needs Artifact Registry)

After running this script:
1. Run 'terraform apply' to create infrastructure
2. Run CI/CD pipeline to deploy actual application
EOF
}

# Validate arguments
if [ -z "$PROJECT_ID" ]; then
    log_error "PROJECT_ID is required"
    usage
    exit 1
fi

# Main execution
main() {
    log_info "Starting bootstrap deployment for Option A implementation"
    log_info "Project: $PROJECT_ID"
    log_info "Environment: $ENVIRONMENT"
    log_info "Service: $SERVICE_NAME"
    log_info "Region: $REGION"

    # Check if gcloud is authenticated
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        log_error "No active gcloud authentication found"
        log_info "Please run: gcloud auth login"
        exit 1
    fi

    # Set project
    log_info "Setting GCP project..."
    gcloud config set project "$PROJECT_ID"

    # Check if Cloud Run service already exists
    log_info "Checking if Cloud Run service already exists..."
    if gcloud run services describe "$SERVICE_NAME" --region="$REGION" --quiet >/dev/null 2>&1; then
        log_warning "Cloud Run service '$SERVICE_NAME' already exists"
        log_info "Current service status:"
        gcloud run services describe "$SERVICE_NAME" --region="$REGION" --format="value(status.url)"
        log_info "Bootstrap may not be necessary, but continuing..."
    else
        log_info "Cloud Run service '$SERVICE_NAME' does not exist. Creating placeholder service..."

        # Create placeholder Cloud Run service
        # Note: Using default service account for bootstrap placeholder only
        # Actual application will use dedicated service account created by Terraform
        log_info "Creating placeholder Cloud Run service..."
        log_info "Using default service account (temporary - will be replaced by CI/CD)"
        gcloud run deploy "$SERVICE_NAME" \
            --image="$PLACEHOLDER_IMAGE" \
            --region="$REGION" \
            --platform=managed \
            --no-allow-unauthenticated \
            --max-instances=1 \
            --memory=128Mi \
            --cpu=0.08 \
            --timeout=60 \
            --quiet

        log_success "Placeholder Cloud Run service created successfully"
    fi

    # Verify service exists and get details
    log_info "Verifying Cloud Run service..."
    SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" --format="value(status.url)")
    SERVICE_STATE=$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" --format="value(status.conditions[0].status)")

    log_success "Cloud Run service verification completed"
    log_info "Service URL: $SERVICE_URL"
    log_info "Service State: $SERVICE_STATE"

    # Display next steps
    cat << EOF

${GREEN}✅ Bootstrap deployment completed successfully!${NC}

${BLUE}Next steps:${NC}
1. ${YELLOW}Run Terraform:${NC}
   cd terraform
   terraform workspace select $ENVIRONMENT || terraform workspace new $ENVIRONMENT
   terraform plan -var="project_id=$PROJECT_ID" -var="environment=$ENVIRONMENT"
   terraform apply -var="project_id=$PROJECT_ID" -var="environment=$ENVIRONMENT"

2. ${YELLOW}Run CI/CD pipeline:${NC}
   Push to main branch or manually trigger GitHub Actions workflow
   This will deploy the actual application container to replace the placeholder

3. ${YELLOW}Verify deployment:${NC}
   Check that the final application is accessible and functioning correctly

${BLUE}Note:${NC} The placeholder service created by this script will be replaced by the actual
application when the CI/CD pipeline runs. This placeholder only exists to satisfy
Terraform's data source requirements.

EOF
}

# Execute main function
main
