#!/bin/bash

# CI/CD Service Account Setup Script
# This script creates and configures CI/CD service accounts for both dev and prod environments
# Based on the configuration in terraform/README.md section 3.1.5

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
Usage: $0 <PROJECT_ID> <WIF_POOL_NAME> [GITHUB_REPO]

Setup CI/CD service accounts for Why Why Chat AI

Arguments:
  PROJECT_ID      GCP project ID (required)
  WIF_POOL_NAME   Workload Identity Federation pool name (required)
  GITHUB_REPO     GitHub repository (default: blavusai/jatco-why-why-chat-ai)

Example:
  $0 jtc-why-why-chat-ai-dev github-pool
  $0 jtc-why-why-chat-ai-dev github-pool myorg/myrepo

This script will:
1. Create CI/CD service accounts for both dev and prod environments
2. Grant necessary permissions for Terraform and application deployment
3. Configure Workload Identity Federation for GitHub Actions
4. Optionally grant additional permissions for app service account management

Prerequisites:
- gcloud CLI authenticated with project owner permissions
- PROJECT_NUMBER will be automatically fetched
EOF
}

# Validate arguments
if [ $# -lt 2 ]; then
    log_error "Missing required arguments"
    usage
    exit 1
fi

PROJECT_ID=$1
WIF_POOL_NAME=$2
GITHUB_REPO=${3:-"blavusai/jatco-why-why-chat-ai"}

# Main execution
main() {
    log_info "Starting CI/CD service account setup"
    log_info "Project ID: $PROJECT_ID"
    log_info "WIF Pool Name: $WIF_POOL_NAME"
    log_info "GitHub Repository: $GITHUB_REPO"

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
    log_info "Enabling required APIs..."
    gcloud services enable \
        iam.googleapis.com \
        iamcredentials.googleapis.com \
        cloudresourcemanager.googleapis.com \
        sqladmin.googleapis.com \
        artifactregistry.googleapis.com \
        run.googleapis.com \
        compute.googleapis.com \
        aiplatform.googleapis.com \
        storage.googleapis.com \
        servicenetworking.googleapis.com \
        secretmanager.googleapis.com \
        vpcaccess.googleapis.com \
        logging.googleapis.com \
        monitoring.googleapis.com \
        apigateway.googleapis.com \
        servicemanagement.googleapis.com \
        servicecontrol.googleapis.com \
        --project=${PROJECT_ID}
    log_success "APIs enabled successfully"

    # Process both environments
    for ENV in dev prod; do
        log_info "========================================="
        log_info "Setting up CI/CD service account for $ENV environment"
        log_info "========================================="

        SERVICE_ACCOUNT_ID="cicd-sa-${ENV}"
        SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_ID}@${PROJECT_ID}.iam.gserviceaccount.com"

        # Create service account
        log_info "Creating service account: $SERVICE_ACCOUNT_EMAIL"
        if gcloud iam service-accounts describe "$SERVICE_ACCOUNT_EMAIL" --project="$PROJECT_ID" >/dev/null 2>&1; then
            log_warning "Service account already exists, skipping creation"
        else
            gcloud iam service-accounts create "$SERVICE_ACCOUNT_ID" \
                --display-name="CI/CD Service Account ($ENV)" \
                --description="Service account for GitHub Actions CI/CD pipeline in $ENV environment" \
                --project="$PROJECT_ID"
            log_success "Service account created"
        fi

        # Grant base permissions
        log_info "Granting base permissions..."
        BASE_ROLES=(
            "roles/cloudsql.admin"              # Cloud SQL管理
            "roles/artifactregistry.admin"      # Dockerイメージ管理
            "roles/run.admin"                   # Cloud Runデプロイ（developerからadminに変更）
            "roles/compute.networkAdmin"        # ネットワーク管理
            "roles/compute.loadBalancerAdmin"   # Load Balancer管理
            "roles/compute.admin"               # VPCコネクタ、ネットワークエンドポイントグループ管理
            "roles/iam.serviceAccountUser"      # サービスアカウント使用
            "roles/iam.serviceAccountCreator"   # サービスアカウント作成（Terraform用）
            "roles/iam.serviceAccountAdmin"     # サービスアカウントへのIAMポリシー設定（Terraform用）
            "roles/resourcemanager.projectIamAdmin" # プロジェクトレベルのIAMポリシー設定（Terraform用）
            "roles/storage.admin"               # GCSバケット管理
            "roles/aiplatform.user"             # Vertex AI利用
            "roles/secretmanager.admin"         # Secret Manager管理（Terraform用）
            "roles/vpcaccess.admin"             # VPCアクセスコネクタ管理（Terraform用）
            "roles/servicenetworking.networksAdmin" # サービスネットワーキング（Cloud SQL用）
            "roles/logging.admin"               # Cloud Logging管理
            "roles/monitoring.metricWriter"     # メトリクス書き込み
            "roles/apigateway.admin"            # API Gateway管理
            "roles/servicemanagement.admin"     # Service Management管理（API Gateway用）
            "roles/serviceusage.serviceUsageAdmin" # Service Usage管理（API有効化用）
        )

        for role in "${BASE_ROLES[@]}"; do
            log_info "  Granting $role..."
            gcloud projects add-iam-policy-binding ${PROJECT_ID} \
                --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
                --role="$role" \
                --condition=None \
                --quiet || log_warning "Failed to grant $role (may already exist)"
        done

        # Grant self-impersonation permission for Workload Identity Federation
        log_info "Granting self-impersonation permission..."
        gcloud iam service-accounts add-iam-policy-binding ${SERVICE_ACCOUNT_EMAIL} \
            --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
            --role="roles/iam.serviceAccountTokenCreator" \
            --project="$PROJECT_ID" \
            --quiet || log_warning "Failed to grant token creator permission (may already exist)"

        # Configure Workload Identity Federation access
        log_info "Configuring Workload Identity Federation..."
        WIF_PRINCIPAL="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${WIF_POOL_NAME}/attribute.repository/${GITHUB_REPO}"

        gcloud iam service-accounts add-iam-policy-binding ${SERVICE_ACCOUNT_EMAIL} \
            --member="$WIF_PRINCIPAL" \
            --role="roles/iam.workloadIdentityUser" \
            --project="$PROJECT_ID" \
            --quiet || log_warning "Failed to grant WIF access (may already exist)"

        # Grant permission to impersonate app service account
        log_info "Granting permission to impersonate app service account..."
        APP_SA_EMAIL="app-sa-${ENV}@${PROJECT_ID}.iam.gserviceaccount.com"

        # Check if app service account exists
        if gcloud iam service-accounts describe "$APP_SA_EMAIL" --project="$PROJECT_ID" >/dev/null 2>&1; then
            log_info "  App service account exists, granting impersonation permission..."
            gcloud iam service-accounts add-iam-policy-binding ${APP_SA_EMAIL} \
                --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
                --role="roles/iam.serviceAccountTokenCreator" \
                --project="$PROJECT_ID" \
                --quiet || log_warning "Failed to grant app SA impersonation (may already exist)"
        else
            log_warning "  App service account does not exist yet (will be created by Terraform)"
        fi

        # Additional permissions for Cloud Armor (if using Load Balancer)
        log_info "Granting Cloud Armor permissions..."
        gcloud projects add-iam-policy-binding ${PROJECT_ID} \
            --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
            --role="roles/compute.securityAdmin" \
            --condition=None \
            --quiet || log_warning "Failed to grant security admin permission (may already exist)"

        log_success "CI/CD service account setup completed for $ENV environment"
        log_info ""
    done

    # Display summary
    cat << EOF

${GREEN}✅ CI/CD Service Account Setup Completed!${NC}

${BLUE}Service Accounts Created:${NC}
- cicd-sa-dev@${PROJECT_ID}.iam.gserviceaccount.com
- cicd-sa-prod@${PROJECT_ID}.iam.gserviceaccount.com

${BLUE}Workload Identity Federation Configuration:${NC}
- Pool: ${WIF_POOL_NAME}
- Repository: ${GITHUB_REPO}
- Principal Pattern: principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${WIF_POOL_NAME}/attribute.repository/${GITHUB_REPO}

${BLUE}Next Steps:${NC}
1. ${YELLOW}Configure GitHub Secrets:${NC}
   - CICD_SERVICE_ACCOUNT: Use the appropriate service account email based on environment
   - Or better: Create DEV_CICD_SERVICE_ACCOUNT and PROD_CICD_SERVICE_ACCOUNT

2. ${YELLOW}Run Bootstrap:${NC}
   ./scripts/bootstrap-deployment.sh ${PROJECT_ID} dev
   ./scripts/bootstrap-deployment.sh ${PROJECT_ID} prod

3. ${YELLOW}Run Terraform:${NC}
   Use GitHub Actions "Terraform Apply and Update Secrets" workflow

4. ${YELLOW}Deploy Application:${NC}
   Push to main branch or manually trigger CI/CD workflow

${BLUE}Verification Commands:${NC}
# List service accounts
gcloud iam service-accounts list --project=${PROJECT_ID}

# Check permissions for a service account
gcloud projects get-iam-policy ${PROJECT_ID} --flatten="bindings[].members" --filter="bindings.members:serviceAccount:cicd-sa-dev@${PROJECT_ID}.iam.gserviceaccount.com" --format="table(bindings.role)"

EOF
}

# Execute main function
main
