#!/bin/bash
# API Gateway リソースをTerraform stateにインポートするスクリプト

set -e

# カラー設定
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🔧 API Gateway リソースのインポートを開始します${NC}"

# 環境変数の確認
if [ -z "$1" ]; then
    echo -e "${RED}エラー: 環境名（dev/prod）を指定してください${NC}"
    echo "使用方法: $0 <dev|prod>"
    exit 1
fi

ENVIRONMENT=$1
WORKSPACE=$ENVIRONMENT

# プロジェクトIDの取得
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}エラー: Google Cloud プロジェクトが設定されていません${NC}"
    echo "gcloud config set project <PROJECT_ID> を実行してください"
    exit 1
fi

echo -e "${GREEN}✓ プロジェクト: $PROJECT_ID${NC}"
echo -e "${GREEN}✓ 環境: $ENVIRONMENT${NC}"

# Terraformディレクトリに移動
cd "$(dirname "$0")/../terraform"

# Terraform初期化
echo -e "${YELLOW}📦 Terraform初期化中...${NC}"
terraform init

# ワークスペース選択
echo -e "${YELLOW}🔄 ワークスペース '$WORKSPACE' を選択中...${NC}"
terraform workspace select $WORKSPACE || terraform workspace new $WORKSPACE

# tfvarsファイルの確認
TFVARS_FILE="${ENVIRONMENT}.tfvars"
if [ ! -f "$TFVARS_FILE" ]; then
    echo -e "${RED}エラー: $TFVARS_FILE が見つかりません${NC}"
    echo "terraform/README.md を参照して tfvars ファイルを作成してください"
    exit 1
fi

# リソース情報
REGION="asia-northeast1"
API_ID="why-why-chat-ai-api-${ENVIRONMENT}"
GATEWAY_ID="why-why-chat-ai-gateway-${ENVIRONMENT}"

echo -e "${YELLOW}🔍 既存リソースの確認中...${NC}"

# API リソースの存在確認とインポート
echo -e "${YELLOW}1️⃣ API リソースの確認...${NC}"
if gcloud api-gateway apis describe $API_ID --location=global --project=$PROJECT_ID &>/dev/null; then
    echo -e "${GREEN}✓ API '$API_ID' が見つかりました${NC}"
    
    # Terraform state内の確認
    if terraform state show 'google_api_gateway_api.api' &>/dev/null; then
        echo -e "${YELLOW}⚠️  API は既にTerraform管理下にあります${NC}"
    else
        echo -e "${YELLOW}📥 API をTerraform stateにインポート中...${NC}"
        terraform import -var-file="$TFVARS_FILE" 'google_api_gateway_api.api' "projects/$PROJECT_ID/locations/global/apis/$API_ID"
    fi
else
    echo -e "${YELLOW}⚠️  API '$API_ID' が見つかりません（新規作成されます）${NC}"
fi

# API Config の確認（最新のもの）
echo -e "${YELLOW}2️⃣ API Config の確認...${NC}"
CONFIG_ID=$(gcloud api-gateway api-configs list --api=$API_ID --location=global --project=$PROJECT_ID --format="value(name)" --limit=1 2>/dev/null | awk -F'/' '{print $NF}')

if [ -n "$CONFIG_ID" ]; then
    echo -e "${GREEN}✓ API Config '$CONFIG_ID' が見つかりました${NC}"
    
    # Terraform state内の確認
    if terraform state show 'google_api_gateway_api_config.api_config' &>/dev/null; then
        echo -e "${YELLOW}⚠️  API Config は既にTerraform管理下にあります${NC}"
    else
        echo -e "${YELLOW}📥 API Config をTerraform stateにインポート中...${NC}"
        terraform import -var-file="$TFVARS_FILE" 'google_api_gateway_api_config.api_config' "projects/$PROJECT_ID/locations/global/apis/$API_ID/configs/$CONFIG_ID"
    fi
else
    echo -e "${YELLOW}⚠️  API Config が見つかりません（新規作成されます）${NC}"
fi

# Gateway の確認とインポート
echo -e "${YELLOW}3️⃣ Gateway の確認...${NC}"
if gcloud api-gateway gateways describe $GATEWAY_ID --location=$REGION --project=$PROJECT_ID &>/dev/null; then
    echo -e "${GREEN}✓ Gateway '$GATEWAY_ID' が見つかりました${NC}"
    
    # Terraform state内の確認
    if terraform state show 'google_api_gateway_gateway.gateway' &>/dev/null; then
        echo -e "${YELLOW}⚠️  Gateway は既にTerraform管理下にあります${NC}"
    else
        echo -e "${YELLOW}📥 Gateway をTerraform stateにインポート中...${NC}"
        terraform import -var-file="$TFVARS_FILE" 'google_api_gateway_gateway.gateway' "projects/$PROJECT_ID/locations/$REGION/gateways/$GATEWAY_ID"
    fi
else
    echo -e "${YELLOW}⚠️  Gateway '$GATEWAY_ID' が見つかりません（新規作成されます）${NC}"
fi

# 現在のstate確認
echo -e "${YELLOW}📋 現在のTerraform state:${NC}"
terraform state list | grep -E "(api_gateway|gateway)" || echo "API Gateway リソースなし"

# Terraform plan実行
echo -e "${YELLOW}🔍 Terraform plan を実行して変更を確認...${NC}"
terraform plan -var-file="$TFVARS_FILE"

echo -e "${GREEN}✅ インポート処理が完了しました${NC}"
echo -e "${YELLOW}📌 次のステップ:${NC}"
echo "1. 上記のplanを確認してください"
echo "2. 問題なければ CI/CD パイプラインを再実行するか、以下を実行してください:"
echo "   terraform apply -var-file=\"$TFVARS_FILE\""