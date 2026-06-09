#!/bin/bash

# ====================================================================
# インフラストラクチャクリーンアップ状態確認スクリプト
#
# 目的: Terraformで管理されるリソースが完全に削除されているか確認
# 使用方法: ./scripts/check_cleanup_status.sh [dev|prod]
# ====================================================================

set -euo pipefail

# 色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 環境変数の設定
ENVIRONMENT="${1:-dev}"
if [ "$ENVIRONMENT" = "prod" ]; then
    PROJECT_ID="jatco-5why"
else
    PROJECT_ID="jtc-why-why-chat-ai-dev"
fi

TERRAFORM_DIR="terraform"
REGION="${REGION:-asia-northeast1}"  # 環境変数で上書き可能、デフォルトはasia-northeast1

# gcloud パスの設定
if command -v gcloud &> /dev/null; then
    GCLOUD_CMD="gcloud"
else
    GCLOUD_CMD="$HOME/google-cloud-sdk/bin/gcloud"
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}インフラストラクチャクリーンアップ状態確認${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "環境: ${YELLOW}${ENVIRONMENT}${NC}"
echo -e "プロジェクト: ${YELLOW}${PROJECT_ID}${NC}"
echo ""

# 結果を格納する配列
declare -a cleanup_results=()
ALL_CLEAN=true

# 1. Terraform ステートの確認
echo -e "${BLUE}[1/7] Terraform ステートの確認...${NC}"
cd "${TERRAFORM_DIR}"
terraform workspace select "${ENVIRONMENT}" > /dev/null 2>&1 || true
cd - > /dev/null

TERRAFORM_RESOURCES=$(terraform -chdir="${TERRAFORM_DIR}" state list 2>/dev/null | wc -l | tr -d ' ')
if [ "$TERRAFORM_RESOURCES" -eq "0" ]; then
    echo -e "${GREEN}✓ Terraform ステート: クリーン（リソースなし）${NC}"
    cleanup_results+=("${GREEN}✓ Terraform ステート: クリーン${NC}")
else
    echo -e "${RED}✗ Terraform ステート: ${TERRAFORM_RESOURCES} 個のリソースが残っています${NC}"
    cleanup_results+=("${RED}✗ Terraform ステート: ${TERRAFORM_RESOURCES} 個のリソース${NC}")
    ALL_CLEAN=false
    terraform -chdir="${TERRAFORM_DIR}" state list 2>/dev/null | sed 's/^/  - /'
fi
echo ""

# 2. Cloud SQL インスタンスの確認
echo -e "${BLUE}[2/7] Cloud SQL インスタンスの確認...${NC}"
SQL_INSTANCES=$($GCLOUD_CMD sql instances list --project="${PROJECT_ID}" --format="value(name)" 2>/dev/null | grep -c "why-why-chat-ai-db-${ENVIRONMENT}" || echo "0")
if [ "$SQL_INSTANCES" -eq "0" ]; then
    echo -e "${GREEN}✓ Cloud SQL: インスタンスなし${NC}"
    cleanup_results+=("${GREEN}✓ Cloud SQL: クリーン${NC}")
else
    echo -e "${RED}✗ Cloud SQL: ${SQL_INSTANCES} 個のインスタンスが残っています${NC}"
    cleanup_results+=("${RED}✗ Cloud SQL: ${SQL_INSTANCES} 個のインスタンス${NC}")
    ALL_CLEAN=false
    $GCLOUD_CMD sql instances list --project="${PROJECT_ID}" --format="table(name,state)" 2>/dev/null | grep "why-why-chat-ai-db-${ENVIRONMENT}"
fi
echo ""

# 3. VPC ピアリング接続の確認
echo -e "${BLUE}[3/7] VPC ピアリング接続の確認...${NC}"
PEERINGS=$($GCLOUD_CMD compute networks peerings list --network=default --project="${PROJECT_ID}" --format="value(name)" 2>/dev/null | grep -c "service-networking" || true)
PEERINGS=${PEERINGS:-0}
if [ "$PEERINGS" -eq "0" ]; then
    echo -e "${GREEN}✓ VPC ピアリング: 接続なし${NC}"
    cleanup_results+=("${GREEN}✓ VPC ピアリング: クリーン${NC}")
else
    echo -e "${RED}✗ VPC ピアリング: ${PEERINGS} 個の接続が残っています${NC}"
    cleanup_results+=("${RED}✗ VPC ピアリング: ${PEERINGS} 個の接続${NC}")
    ALL_CLEAN=false
    $GCLOUD_CMD compute networks peerings list --network=default --project="${PROJECT_ID}" --format="table(name,state)" 2>/dev/null
fi
echo ""

# 4. グローバルアドレスの確認
echo -e "${BLUE}[4/7] グローバルアドレスの確認...${NC}"
ADDRESSES=$($GCLOUD_CMD compute addresses list --global --project="${PROJECT_ID}" --format="value(name)" 2>/dev/null | grep -c "private-service-access-${ENVIRONMENT}" || echo "0")
if [ "$ADDRESSES" -eq "0" ]; then
    echo -e "${GREEN}✓ グローバルアドレス: なし${NC}"
    cleanup_results+=("${GREEN}✓ グローバルアドレス: クリーン${NC}")
else
    echo -e "${RED}✗ グローバルアドレス: ${ADDRESSES} 個のアドレスが残っています${NC}"
    cleanup_results+=("${RED}✗ グローバルアドレス: ${ADDRESSES} 個のアドレス${NC}")
    ALL_CLEAN=false
    $GCLOUD_CMD compute addresses list --global --project="${PROJECT_ID}" --format="table(name,purpose,status)" 2>/dev/null | grep "private-service-access-${ENVIRONMENT}"
fi
echo ""

# 5. Cloud Run サービスの確認
echo -e "${BLUE}[5/7] Cloud Run サービスの確認...${NC}"
CLOUD_RUN_SERVICES=$($GCLOUD_CMD run services list --project="${PROJECT_ID}" --region="${REGION}" --format="value(name)" 2>/dev/null | grep -c "why-why-chat-ai-${ENVIRONMENT}" || true)
CLOUD_RUN_SERVICES=${CLOUD_RUN_SERVICES:-0}
if [ "$CLOUD_RUN_SERVICES" -eq "0" ]; then
    echo -e "${GREEN}✓ Cloud Run: サービスなし${NC}"
    cleanup_results+=("${GREEN}✓ Cloud Run: クリーン${NC}")
else
    echo -e "${RED}✗ Cloud Run: ${CLOUD_RUN_SERVICES} 個のサービスが残っています${NC}"
    cleanup_results+=("${RED}✗ Cloud Run: ${CLOUD_RUN_SERVICES} 個のサービス${NC}")
    ALL_CLEAN=false
    $GCLOUD_CMD run services list --project="${PROJECT_ID}" --region="${REGION}" --format="table(name,status.url)" 2>/dev/null | grep "why-why-chat-ai-${ENVIRONMENT}"
fi
echo ""

# 6. Artifact Registry リポジトリの確認
echo -e "${BLUE}[6/7] Artifact Registry リポジトリの確認...${NC}"
REPOSITORIES=$($GCLOUD_CMD artifacts repositories list --project="${PROJECT_ID}" --location="${REGION}" --format="value(name)" 2>/dev/null | grep -c "why-why-chat-ai-repo" || echo "0")
if [ "$REPOSITORIES" -eq "0" ]; then
    echo -e "${GREEN}✓ Artifact Registry: リポジトリなし${NC}"
    cleanup_results+=("${GREEN}✓ Artifact Registry: クリーン${NC}")
else
    echo -e "${RED}✗ Artifact Registry: ${REPOSITORIES} 個のリポジトリが残っています${NC}"
    cleanup_results+=("${RED}✗ Artifact Registry: ${REPOSITORIES} 個のリポジトリ${NC}")
    ALL_CLEAN=false
    $GCLOUD_CMD artifacts repositories list --project="${PROJECT_ID}" --location="${REGION}" --format="table(name,format)" 2>/dev/null | grep "why-why-chat-ai-repo"
fi
echo ""

# 7. Load Balancer 関連リソースの確認
echo -e "${BLUE}[7/7] Load Balancer 関連リソースの確認...${NC}"
LB_FORWARDING_RULES=$($GCLOUD_CMD compute forwarding-rules list --global --project="${PROJECT_ID}" --format="value(name)" 2>/dev/null | grep -c "why-why-chat-ai-${ENVIRONMENT}" || echo "0")
LB_TARGET_PROXIES=$($GCLOUD_CMD compute target-https-proxies list --global --project="${PROJECT_ID}" --format="value(name)" 2>/dev/null | grep -c "why-why-chat-ai-${ENVIRONMENT}" || echo "0")
LB_URL_MAPS=$($GCLOUD_CMD compute url-maps list --global --project="${PROJECT_ID}" --format="value(name)" 2>/dev/null | grep -c "why-why-chat-ai-${ENVIRONMENT}" || echo "0")
LB_BACKEND_SERVICES=$($GCLOUD_CMD compute backend-services list --global --project="${PROJECT_ID}" --format="value(name)" 2>/dev/null | grep -c "why-why-chat-ai-${ENVIRONMENT}" || echo "0")
LB_NEGS=$($GCLOUD_CMD compute network-endpoint-groups list --project="${PROJECT_ID}" --format="value(name)" 2>/dev/null | grep -c "why-why-chat-ai-${ENVIRONMENT}" || echo "0")

LB_TOTAL=$((LB_FORWARDING_RULES + LB_TARGET_PROXIES + LB_URL_MAPS + LB_BACKEND_SERVICES + LB_NEGS))
if [ "$LB_TOTAL" -eq "0" ]; then
    echo -e "${GREEN}✓ Load Balancer: リソースなし${NC}"
    cleanup_results+=("${GREEN}✓ Load Balancer: クリーン${NC}")
else
    echo -e "${RED}✗ Load Balancer: ${LB_TOTAL} 個のリソースが残っています${NC}"
    cleanup_results+=("${RED}✗ Load Balancer: ${LB_TOTAL} 個のリソース${NC}")
    ALL_CLEAN=false
    [ "$LB_FORWARDING_RULES" -gt "0" ] && echo -e "  - Forwarding Rules: ${LB_FORWARDING_RULES}"
    [ "$LB_TARGET_PROXIES" -gt "0" ] && echo -e "  - Target Proxies: ${LB_TARGET_PROXIES}"
    [ "$LB_URL_MAPS" -gt "0" ] && echo -e "  - URL Maps: ${LB_URL_MAPS}"
    [ "$LB_BACKEND_SERVICES" -gt "0" ] && echo -e "  - Backend Services: ${LB_BACKEND_SERVICES}"
    [ "$LB_NEGS" -gt "0" ] && echo -e "  - Network Endpoint Groups: ${LB_NEGS}"
fi
echo ""

# 結果サマリーの表示
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}クリーンアップ状態サマリー${NC}"
echo -e "${BLUE}========================================${NC}"
for result in "${cleanup_results[@]}"; do
    echo -e "$result"
done
echo ""

if [ "$ALL_CLEAN" = true ]; then
    echo -e "${GREEN}✨ すべてのリソースが正常にクリーンアップされています！${NC}"
    echo -e "${GREEN}   make ${ENVIRONMENT}_up を実行する準備が整っています。${NC}"
    exit 0
else
    echo -e "${RED}⚠️  一部のリソースが残っています。${NC}"
    echo -e "${YELLOW}   make ${ENVIRONMENT}_down_force を実行してクリーンアップを完了してください。${NC}"
    exit 1
fi
