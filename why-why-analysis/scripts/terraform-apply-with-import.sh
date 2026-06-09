#!/bin/bash
# Terraform apply with automatic import of existing resources

set -e

# カラー設定
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 引数チェック
if [ $# -lt 2 ]; then
    echo "Usage: $0 <tfvars-file> <workspace>"
    exit 1
fi

TFVARS_FILE=$1
WORKSPACE=$2
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
REGION="asia-northeast1"

echo -e "${YELLOW}🔧 Terraform apply with auto-import starting...${NC}"
echo -e "${GREEN}✓ Workspace: $WORKSPACE${NC}"
echo -e "${GREEN}✓ Project: $PROJECT_ID${NC}"

# 既存リソースのインポート関数
import_if_exists() {
    local RESOURCE_TYPE=$1
    local RESOURCE_NAME=$2
    local IMPORT_ID=$3
    
    # リソースが既にstate内にあるかチェック
    if terraform state show "$RESOURCE_TYPE.$RESOURCE_NAME" &>/dev/null; then
        echo -e "${YELLOW}✓ $RESOURCE_TYPE.$RESOURCE_NAME is already in state${NC}"
        return 0
    fi
    
    # リソースが実際に存在するかチェックして、存在すればインポート
    echo -e "${YELLOW}Checking if $IMPORT_ID exists...${NC}"
    case "$RESOURCE_TYPE" in
        "google_api_gateway_api")
            if gcloud api-gateway apis describe "why-why-chat-ai-api-${WORKSPACE}" --location=global &>/dev/null; then
                echo -e "${GREEN}Importing existing API...${NC}"
                terraform import -var-file="$TFVARS_FILE" "$RESOURCE_TYPE.$RESOURCE_NAME" "$IMPORT_ID" || true
            fi
            ;;
        "google_api_gateway_gateway")
            if gcloud api-gateway gateways describe "why-why-chat-ai-gateway-${WORKSPACE}" --location=$REGION &>/dev/null; then
                echo -e "${GREEN}Importing existing Gateway...${NC}"
                terraform import -var-file="$TFVARS_FILE" "$RESOURCE_TYPE.$RESOURCE_NAME" "$IMPORT_ID" || true
            fi
            ;;
        "google_api_gateway_api_config")
            # API configの存在確認（APIが存在する場合のみ）
            if gcloud api-gateway apis describe "why-why-chat-ai-api-${WORKSPACE}" --location=global &>/dev/null; then
                # 最新のconfigを取得（作成日時で降順ソート、最初の1つを取得）
                echo -e "${YELLOW}Looking for existing API configs...${NC}"
                LATEST_CONFIG=$(gcloud api-gateway api-configs list \
                    --api="why-why-chat-ai-api-${WORKSPACE}" \
                    --location=global \
                    --sort-by="~createTime" \
                    --limit=1 \
                    --format="value(name)" 2>/dev/null || echo "")
                
                if [ -n "$LATEST_CONFIG" ]; then
                    echo -e "${GREEN}Found existing API config: $LATEST_CONFIG${NC}"
                    # configのIDだけを取得（projects/.../configs/以降の部分）
                    CONFIG_ID=$(echo "$LATEST_CONFIG" | awk -F'/' '{print $NF}')
                    # 既存のconfigをインポート
                    terraform import -var-file="$TFVARS_FILE" "$RESOURCE_TYPE.$RESOURCE_NAME" "$LATEST_CONFIG" || true
                else
                    echo -e "${YELLOW}No existing API config found${NC}"
                fi
            else
                echo -e "${YELLOW}API does not exist, skipping config import${NC}"
            fi
            ;;
    esac
}

# API Gateway リソースのインポート試行
echo -e "${YELLOW}🔍 Checking for existing API Gateway resources...${NC}"
import_if_exists "google_api_gateway_api" "api" "projects/$PROJECT_ID/locations/global/apis/why-why-chat-ai-api-${WORKSPACE}"
# Note: api_configのインポートは、import_if_exists関数内で動的にIDを取得するため、ダミーのIDを渡す
import_if_exists "google_api_gateway_api_config" "api_config" "dummy-will-be-replaced"
import_if_exists "google_api_gateway_gateway" "gateway" "projects/$PROJECT_ID/locations/$REGION/gateways/why-why-chat-ai-gateway-${WORKSPACE}"

# Terraform plan実行
echo -e "${YELLOW}📋 Running terraform plan...${NC}"
terraform plan -var-file="$TFVARS_FILE" -out=tfplan

# Terraform apply実行
echo -e "${YELLOW}🚀 Running terraform apply...${NC}"
terraform apply -auto-approve tfplan