#!/bin/bash

# Manual network resource cleanup script (Development environment only)
# This script handles cleanup of orphaned network resources that Terraform cannot remove

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Development environment only
ENVIRONMENT="dev"
PROJECT_ID="jtc-why-why-chat-ai-dev"
echo -e "${BLUE}🔧 Manual network resource cleanup (Development environment)...${NC}"

# VPC peering connection cleanup
echo -e "${GREEN}🔍 Checking VPC peering connections...${NC}"
if gcloud compute networks peerings list --network=default --project=${PROJECT_ID} --format="value(name)" | grep -q "servicenetworking-googleapis-com"; then
    echo -e "${YELLOW}🗑️  Deleting VPC peering connection...${NC}"
    gcloud compute networks peerings delete servicenetworking-googleapis-com --network=default --project=${PROJECT_ID} --quiet || true
else
    echo -e "${GREEN}☑️  No VPC peering connections found.${NC}"
fi

# Global Address cleanup
echo -e "${GREEN}🔍 Checking global addresses...${NC}"
if gcloud compute addresses list --global --project=${PROJECT_ID} --format="value(name)" | grep -q "private-service-access-${ENVIRONMENT}"; then
    echo -e "${YELLOW}🗑️  Deleting global address...${NC}"
    gcloud compute addresses delete "private-service-access-${ENVIRONMENT}" --global --project=${PROJECT_ID} --quiet || true
else
    echo -e "${GREEN}☑️  No orphaned global addresses found.${NC}"
fi

echo -e "${GREEN}✅ Manual network cleanup completed.${NC}"
