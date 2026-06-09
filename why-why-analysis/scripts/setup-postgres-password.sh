#!/bin/bash
set -euo pipefail

# Setup PostgreSQL password in Secret Manager
# This password is used for the postgres superuser during schema initialization

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
Usage: $0 <PROJECT_ID> [PASSWORD]

Setup PostgreSQL password in Google Secret Manager

Arguments:
  PROJECT_ID    GCP project ID (required)
  PASSWORD      PostgreSQL password (optional, will generate if not provided)

Example:
  $0 jtc-why-why-chat-ai-dev
  $0 jtc-why-why-chat-ai-dev my-secure-password

This script will:
1. Generate a secure password if not provided
2. Create or update the 'postgres-password' secret in Secret Manager
3. Grant necessary permissions to service accounts

Prerequisites:
- gcloud CLI authenticated with appropriate permissions
- Secret Manager API enabled
EOF
}

# Validate arguments
if [ $# -lt 1 ]; then
    log_error "Missing required arguments"
    usage
    exit 1
fi

PROJECT_ID=$1
PASSWORD=${2:-""}

# Generate password if not provided
if [ -z "$PASSWORD" ]; then
    log_info "Generating secure password..."
    # Generate a 24-character password with letters, numbers, and special characters
    PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-24)
    log_success "Password generated"
fi

# Main execution
main() {
    log_info "Setting up PostgreSQL password in Secret Manager"
    log_info "Project ID: $PROJECT_ID"

    # Set project
    log_info "Setting GCP project..."
    gcloud config set project "$PROJECT_ID"

    # Enable Secret Manager API
    log_info "Enabling Secret Manager API..."
    gcloud services enable secretmanager.googleapis.com --project=$PROJECT_ID
    log_success "Secret Manager API enabled"

    # Check if secret exists
    SECRET_NAME="postgres-password"
    if gcloud secrets describe $SECRET_NAME --project=$PROJECT_ID >/dev/null 2>&1; then
        log_warning "Secret '$SECRET_NAME' already exists"
        
        # Ask for confirmation to update
        read -p "Do you want to update the existing secret? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Keeping existing secret"
            
            # Just ensure permissions are correct
            log_info "Verifying permissions..."
        else
            # Create new version
            log_info "Creating new secret version..."
            echo -n "$PASSWORD" | gcloud secrets versions add $SECRET_NAME \
                --data-file=- \
                --project=$PROJECT_ID
            log_success "Secret updated with new version"
        fi
    else
        # Create new secret
        log_info "Creating secret '$SECRET_NAME'..."
        echo -n "$PASSWORD" | gcloud secrets create $SECRET_NAME \
            --data-file=- \
            --replication-policy="automatic" \
            --project=$PROJECT_ID
        log_success "Secret created"
    fi

    # Grant access to service accounts
    log_info "Granting access to service accounts..."
    
    # Service accounts that need access
    SERVICE_ACCOUNTS=(
        "app-sa-dev@$PROJECT_ID.iam.gserviceaccount.com"
        "app-sa-prod@$PROJECT_ID.iam.gserviceaccount.com"
        "cicd-sa-dev@$PROJECT_ID.iam.gserviceaccount.com"
        "cicd-sa-prod@$PROJECT_ID.iam.gserviceaccount.com"
    )

    for SA in "${SERVICE_ACCOUNTS[@]}"; do
        # Check if service account exists
        if gcloud iam service-accounts describe "$SA" --project="$PROJECT_ID" >/dev/null 2>&1; then
            log_info "  Granting access to $SA..."
            gcloud secrets add-iam-policy-binding $SECRET_NAME \
                --member="serviceAccount:$SA" \
                --role="roles/secretmanager.secretAccessor" \
                --project=$PROJECT_ID \
                --quiet || log_warning "Failed to grant access to $SA (may already exist)"
        else
            log_warning "  Service account $SA does not exist, skipping"
        fi
    done

    # Also grant to the Cloud SQL service account (for Cloud SQL Auth Proxy)
    CLOUD_SQL_SA="p${PROJECT_ID//-/}@gcp-sa-cloud-sql.iam.gserviceaccount.com"
    log_info "  Granting access to Cloud SQL service account..."
    gcloud secrets add-iam-policy-binding $SECRET_NAME \
        --member="serviceAccount:$CLOUD_SQL_SA" \
        --role="roles/secretmanager.secretAccessor" \
        --project=$PROJECT_ID \
        --quiet || log_warning "Failed to grant access to Cloud SQL SA (may already exist)"

    # Display summary
    cat << EOF

${GREEN}✅ PostgreSQL Password Setup Completed!${NC}

${BLUE}Secret Details:${NC}
- Secret Name: ${SECRET_NAME}
- Project: ${PROJECT_ID}
- Replication: Automatic

${BLUE}Password Information:${NC}
EOF

    if [ -n "$2" ]; then
        echo "- Password: (user-provided, not displayed for security)"
    else
        echo "- Password: ${PASSWORD}"
        echo ""
        echo "${YELLOW}⚠️  IMPORTANT: Save this password securely!${NC}"
        echo "This is the only time it will be displayed."
    fi

    cat << EOF

${BLUE}Service Accounts with Access:${NC}
$(for SA in "${SERVICE_ACCOUNTS[@]}"; do
    if gcloud iam service-accounts describe "$SA" --project="$PROJECT_ID" >/dev/null 2>&1; then
        echo "✓ $SA"
    fi
done)

${BLUE}Verification Commands:${NC}
# View secret details
gcloud secrets describe $SECRET_NAME --project=$PROJECT_ID

# List secret versions
gcloud secrets versions list $SECRET_NAME --project=$PROJECT_ID

# Test access (as a service account)
gcloud secrets versions access latest --secret=$SECRET_NAME --project=$PROJECT_ID

${BLUE}Next Steps:${NC}
1. The password is now stored in Secret Manager
2. Cloud Run Jobs can access it via --set-secrets flag
3. Use this password for postgres user during initialization

EOF

}

# Execute main function
main