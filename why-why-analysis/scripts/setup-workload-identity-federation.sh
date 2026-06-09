#!/bin/bash

# Workload Identity Federation Setup Script
# This script sets up Workload Identity Federation for GitHub Actions
# Must be run before setup-cicd-service-account.sh

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
Usage: $0 <PROJECT_ID> [POOL_NAME] [PROVIDER_NAME]

Setup Workload Identity Federation for GitHub Actions

Arguments:
  PROJECT_ID      GCP project ID (required)
  POOL_NAME       WIF pool name (default: github-pool)
  PROVIDER_NAME   WIF provider name (default: github-provider)

Example:
  $0 jtc-why-why-chat-ai-dev
  $0 jtc-why-why-chat-ai-dev github-pool github-provider

This script will:
1. Create a Workload Identity Pool
2. Create a Workload Identity Provider for GitHub
3. Configure attribute mappings for repository-based access
4. Output the provider ID for GitHub Actions configuration

Prerequisites:
- gcloud CLI authenticated with project owner permissions
- APIs will be enabled automatically if not already enabled
EOF
}

# Validate arguments
if [ $# -lt 1 ]; then
    log_error "Missing required arguments"
    usage
    exit 1
fi

PROJECT_ID=$1
POOL_NAME=${2:-"github-pool"}
PROVIDER_NAME=${3:-"github-provider"}

# Main execution
main() {
    log_info "Starting Workload Identity Federation setup"
    log_info "Project ID: $PROJECT_ID"
    log_info "Pool Name: $POOL_NAME"
    log_info "Provider Name: $PROVIDER_NAME"

    # Get project number
    log_info "Fetching project number..."
    PROJECT_NUMBER=$(gcloud projects describe ${PROJECT_ID} --format="value(projectNumber)")
    if [ -z "$PROJECT_NUMBER" ]; then
        log_error "Failed to fetch project number. Ensure project ID is correct and you have access."
        exit 1
    fi
    log_success "Project number: $PROJECT_NUMBER"

    # Set project
    log_info "Setting GCP project..."
    gcloud config set project "$PROJECT_ID"

    # Enable required APIs
    log_info "Enabling required APIs for Workload Identity Federation..."
    gcloud services enable \
        iam.googleapis.com \
        iamcredentials.googleapis.com \
        cloudresourcemanager.googleapis.com \
        sts.googleapis.com \
        --project=${PROJECT_ID}
    log_success "APIs enabled successfully"

    # Create Workload Identity Pool
    log_info "Creating Workload Identity Pool: $POOL_NAME"
    if gcloud iam workload-identity-pools describe "$POOL_NAME" --location=global --project="$PROJECT_ID" >/dev/null 2>&1; then
        log_warning "Workload Identity Pool already exists, skipping creation"
    else
        gcloud iam workload-identity-pools create "$POOL_NAME" \
            --location=global \
            --display-name="GitHub Actions Pool" \
            --description="Workload Identity Pool for GitHub Actions CI/CD" \
            --project="$PROJECT_ID"
        log_success "Workload Identity Pool created"
    fi

    # Create Workload Identity Provider
    log_info "Creating Workload Identity Provider: $PROVIDER_NAME"
    if gcloud iam workload-identity-pools providers describe "$PROVIDER_NAME" \
        --workload-identity-pool="$POOL_NAME" \
        --location=global \
        --project="$PROJECT_ID" >/dev/null 2>&1; then
        log_warning "Workload Identity Provider already exists, skipping creation"
    else
        gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_NAME" \
            --location=global \
            --workload-identity-pool="$POOL_NAME" \
            --display-name="GitHub Provider" \
            --description="OIDC provider for GitHub Actions" \
            --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
            --attribute-condition="assertion.repository_owner == 'blavusai'" \
            --issuer-uri="https://token.actions.githubusercontent.com" \
            --project="$PROJECT_ID"
        log_success "Workload Identity Provider created"
    fi

    # Wait for provider to be ready
    log_info "Waiting for provider to be ready..."
    sleep 5

    # Get provider resource name
    PROVIDER_RESOURCE_NAME=$(gcloud iam workload-identity-pools providers describe "$PROVIDER_NAME" \
        --workload-identity-pool="$POOL_NAME" \
        --location=global \
        --project="$PROJECT_ID" \
        --format="value(name)")

    # Display summary
    cat << EOF

${GREEN}✅ Workload Identity Federation Setup Completed!${NC}

${BLUE}Configuration Details:${NC}
- Project ID: ${PROJECT_ID}
- Project Number: ${PROJECT_NUMBER}
- Pool Name: ${POOL_NAME}
- Provider Name: ${PROVIDER_NAME}
- Provider Resource: ${PROVIDER_RESOURCE_NAME}

${BLUE}GitHub Actions Configuration:${NC}
Add the following secrets to your GitHub repository:

1. ${YELLOW}WIF_PROVIDER:${NC}
   ${PROVIDER_RESOURCE_NAME}

2. ${YELLOW}GCP_PROJECT_ID:${NC}
   ${PROJECT_ID}

${BLUE}Example GitHub Actions Workflow:${NC}
\`\`\`yaml
- name: Authenticate to Google Cloud
  uses: 'google-github-actions/auth@v2'
  with:
    workload_identity_provider: '\${{ secrets.WIF_PROVIDER }}'
    service_account: 'cicd-sa-dev@${PROJECT_ID}.iam.gserviceaccount.com'
    project_id: '\${{ secrets.GCP_PROJECT_ID }}'
\`\`\`

${BLUE}Next Steps:${NC}
1. Add the GitHub secrets mentioned above
2. Run the CI/CD service account setup script:
   ${YELLOW}./scripts/setup-cicd-service-account.sh ${PROJECT_ID} ${POOL_NAME}${NC}

${BLUE}Verification Commands:${NC}
# List workload identity pools
gcloud iam workload-identity-pools list --location=global --project=${PROJECT_ID}

# Describe the pool
gcloud iam workload-identity-pools describe ${POOL_NAME} --location=global --project=${PROJECT_ID}

# List providers
gcloud iam workload-identity-pools providers list --workload-identity-pool=${POOL_NAME} --location=global --project=${PROJECT_ID}

EOF
}

# Execute main function
main
