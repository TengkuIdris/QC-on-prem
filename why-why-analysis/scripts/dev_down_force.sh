#!/bin/bash

# Enhanced cleanup for Service Networking dependencies (Development Environment)
# This script handles complex cleanup scenarios when Terraform standard deletion fails

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project configuration
PROJECT_ID="jtc-why-why-chat-ai-dev"
ENVIRONMENT="dev"
TERRAFORM_DIR="terraform"

echo -e "${BLUE}🔧 Enhanced cleanup for Service Networking dependencies...${NC}"

# Step 0: Create Terraform state backup
echo -e "${GREEN}💾 Creating Terraform state backup...${NC}"
BACKUP_FILE="terraform/terraform.tfstate.d/${ENVIRONMENT}/terraform.tfstate.backup.$(date +%Y%m%d_%H%M%S)"
cp "terraform/terraform.tfstate.d/${ENVIRONMENT}/terraform.tfstate" "${BACKUP_FILE}" 2>/dev/null || true

# Step 1: Initialize Terraform and select workspace
echo -e "${GREEN}🏗️  Initializing Terraform...${NC}"
terraform -chdir=${TERRAFORM_DIR} init -input=false -upgrade
terraform -chdir=${TERRAFORM_DIR} workspace select ${ENVIRONMENT} || true

# Step 2: Remove Cloud SQL instances (dependencies first)
echo -e "${GREEN}🗄️  Step 1: Removing Cloud SQL instances...${NC}"
terraform -chdir=${TERRAFORM_DIR} destroy -var-file="${ENVIRONMENT}.tfvars" -target=module.cloud_sql_${ENVIRONMENT} -auto-approve || true

# Step 3: Check actual Cloud SQL instance status
echo -e "${GREEN}🔍 Step 2: Checking actual Cloud SQL instance status...${NC}"
if ! gcloud sql instances list --project=${PROJECT_ID} --format="value(name)" | grep -q "why-why-chat-ai-db-${ENVIRONMENT}"; then
    echo -e "${GREEN}☑️  Cloud SQL instance already deleted. Proceeding with state cleanup...${NC}"
    echo -e "${YELLOW}🧹 Removing orphaned networking resources from Terraform state...${NC}"
    terraform -chdir=${TERRAFORM_DIR} state rm google_service_networking_connection.private_service_access 2>/dev/null || true
    terraform -chdir=${TERRAFORM_DIR} state rm google_compute_global_address.private_service_access 2>/dev/null || true
fi

# Step 4: Attempt Service Networking Connection cleanup
echo -e "${GREEN}🌐 Step 3: Attempting Service Networking connection cleanup...${NC}"
if terraform -chdir=${TERRAFORM_DIR} state list | grep -q "google_service_networking_connection.private_service_access"; then
    echo -e "${YELLOW}🔄 Attempting Terraform-managed deletion...${NC}"
    if ! terraform -chdir=${TERRAFORM_DIR} destroy -var-file="${ENVIRONMENT}.tfvars" -target=google_service_networking_connection.private_service_access -auto-approve; then
        echo -e "${RED}⚠️  Terraform deletion failed. Attempting manual cleanup...${NC}"
        ./scripts/dev_manual_network_cleanup.sh
    fi
else
    echo -e "${GREEN}☑️  Service networking connection not in Terraform state. Checking manual cleanup...${NC}"
    ./scripts/dev_manual_network_cleanup.sh
fi

# Step 5: Clean up remaining Terraform resources
echo -e "${GREEN}🗑️  Step 4: Cleaning up remaining Terraform resources...${NC}"
terraform -chdir=${TERRAFORM_DIR} destroy -var-file="${ENVIRONMENT}.tfvars" -auto-approve || true

echo -e "${GREEN}✅ Enhanced cleanup completed!${NC}"
