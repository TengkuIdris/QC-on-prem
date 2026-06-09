#!/bin/bash

# ====================================================================
# インフラストラクチャ状態確認スクリプト
#
# 目的: Terraformで管理されるリソースが正常に構築されているか確認
# 使用方法: ./scripts/check_infrastructure_status.sh [dev|prod]
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
echo -e "${BLUE}インフラストラクチャ状態確認${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "環境: ${YELLOW}${ENVIRONMENT}${NC}"
echo -e "プロジェクト: ${YELLOW}${PROJECT_ID}${NC}"
echo ""

# 結果を格納する配列
declare -a status_results=()
ALL_GOOD=true

# 1. Terraform ステートの確認
echo -e "${BLUE}[1/7] Terraform ステートの確認...${NC}"
cd "${TERRAFORM_DIR}"
terraform workspace select "${ENVIRONMENT}" > /dev/null 2>&1 || true
cd - > /dev/null

TERRAFORM_RESOURCES=$(terraform -chdir="${TERRAFORM_DIR}" state list 2>/dev/null | wc -l | tr -d ' ')
if [ "$TERRAFORM_RESOURCES" -gt "0" ]; then
    echo -e "${GREEN}✓ Terraform ステート: ${TERRAFORM_RESOURCES} 個のリソースが管理されています${NC}"
    status_results+=("${GREEN}✓ Terraform: ${TERRAFORM_RESOURCES} リソース${NC}")
    echo -e "  管理されているリソース:"
    terraform -chdir="${TERRAFORM_DIR}" state list 2>/dev/null | sed 's/^/    - /'
else
    echo -e "${RED}✗ Terraform ステート: リソースがありません${NC}"
    status_results+=("${RED}✗ Terraform: リソースなし${NC}")
    ALL_GOOD=false
fi
echo ""

# 2. Cloud SQL インスタンスの確認
echo -e "${BLUE}[2/7] Cloud SQL インスタンスの確認...${NC}"
SQL_INSTANCE=$($GCLOUD_CMD sql instances describe "why-why-chat-ai-db-${ENVIRONMENT}" --project="${PROJECT_ID}" --format="value(state)" 2>/dev/null || echo "NOT_FOUND")
if [ "$SQL_INSTANCE" = "RUNNABLE" ]; then
    echo -e "${GREEN}✓ Cloud SQL: インスタンスが正常に稼働しています${NC}"
    status_results+=("${GREEN}✓ Cloud SQL: 稼働中${NC}")
    DB_VERSION=$($GCLOUD_CMD sql instances describe "why-why-chat-ai-db-${ENVIRONMENT}" --project="${PROJECT_ID}" --format="value(databaseVersion)" 2>/dev/null)
    TIER=$($GCLOUD_CMD sql instances describe "why-why-chat-ai-db-${ENVIRONMENT}" --project="${PROJECT_ID}" --format="value(settings.tier)" 2>/dev/null)
    echo -e "    - バージョン: ${DB_VERSION}"
    echo -e "    - マシンタイプ: ${TIER}"
elif [ "$SQL_INSTANCE" = "NOT_FOUND" ]; then
    echo -e "${RED}✗ Cloud SQL: インスタンスが見つかりません${NC}"
    status_results+=("${RED}✗ Cloud SQL: 未作成${NC}")
    ALL_GOOD=false
else
    echo -e "${YELLOW}⚠ Cloud SQL: インスタンスの状態が異常です (${SQL_INSTANCE})${NC}"
    status_results+=("${YELLOW}⚠ Cloud SQL: ${SQL_INSTANCE}${NC}")
    ALL_GOOD=false
fi
echo ""

# 3. VPC ピアリング接続の確認
echo -e "${BLUE}[3/7] VPC ピアリング接続の確認...${NC}"
PEERING_STATE=$($GCLOUD_CMD compute networks peerings list --network=default --project="${PROJECT_ID}" --format="value(state)" 2>/dev/null | head -1 || echo "NOT_FOUND")
if [ "$PEERING_STATE" = "ACTIVE" ]; then
    echo -e "${GREEN}✓ VPC ピアリング: 接続が確立されています${NC}"
    status_results+=("${GREEN}✓ VPC ピアリング: 確立${NC}")
    PEERING_NAME=$($GCLOUD_CMD compute networks peerings list --network=default --project="${PROJECT_ID}" --format="value(name)" 2>/dev/null | head -1)
    echo -e "    - 接続名: ${PEERING_NAME}"
elif [ "$PEERING_STATE" = "NOT_FOUND" ]; then
    echo -e "${RED}✗ VPC ピアリング: 接続が見つかりません${NC}"
    status_results+=("${RED}✗ VPC ピアリング: 未設定${NC}")
    ALL_GOOD=false
else
    echo -e "${YELLOW}⚠ VPC ピアリング: 接続状態が異常です (${PEERING_STATE})${NC}"
    status_results+=("${YELLOW}⚠ VPC ピアリング: ${PEERING_STATE}${NC}")
    ALL_GOOD=false
fi
echo ""

# 4. グローバルアドレスの確認
echo -e "${BLUE}[4/7] グローバルアドレスの確認...${NC}"
ADDRESS_STATUS=$($GCLOUD_CMD compute addresses describe "private-service-access-${ENVIRONMENT}" --global --project="${PROJECT_ID}" --format="value(status)" 2>/dev/null || echo "NOT_FOUND")
if [ "$ADDRESS_STATUS" = "RESERVED" ]; then
    echo -e "${GREEN}✓ グローバルアドレス: 予約済み${NC}"
    status_results+=("${GREEN}✓ グローバルアドレス: 予約済み${NC}")
    ADDRESS=$($GCLOUD_CMD compute addresses describe "private-service-access-${ENVIRONMENT}" --global --project="${PROJECT_ID}" --format="value(address)" 2>/dev/null)
    PREFIX=$($GCLOUD_CMD compute addresses describe "private-service-access-${ENVIRONMENT}" --global --project="${PROJECT_ID}" --format="value(prefixLength)" 2>/dev/null)
    echo -e "    - アドレス範囲: ${ADDRESS}/${PREFIX}"
elif [ "$ADDRESS_STATUS" = "NOT_FOUND" ]; then
    echo -e "${RED}✗ グローバルアドレス: 見つかりません${NC}"
    status_results+=("${RED}✗ グローバルアドレス: 未作成${NC}")
    ALL_GOOD=false
else
    echo -e "${YELLOW}⚠ グローバルアドレス: 状態が異常です (${ADDRESS_STATUS})${NC}"
    status_results+=("${YELLOW}⚠ グローバルアドレス: ${ADDRESS_STATUS}${NC}")
    ALL_GOOD=false
fi
echo ""

# 5. Cloud Run サービスの確認
echo -e "${BLUE}[5/7] Cloud Run サービスの確認...${NC}"
CLOUD_RUN_URL=$($GCLOUD_CMD run services describe "why-why-chat-ai-${ENVIRONMENT}" --project="${PROJECT_ID}" --region="${REGION}" --format="value(status.url)" 2>/dev/null || echo "NOT_FOUND")
if [ "$CLOUD_RUN_URL" != "NOT_FOUND" ]; then
    echo -e "${GREEN}✓ Cloud Run: サービスがデプロイされています${NC}"
    status_results+=("${GREEN}✓ Cloud Run: デプロイ済み${NC}")
    echo -e "    - URL: ${CLOUD_RUN_URL}"
    TRAFFIC=$($GCLOUD_CMD run services describe "why-why-chat-ai-${ENVIRONMENT}" --project="${PROJECT_ID}" --region="${REGION}" --format="value(status.traffic[0].percent)" 2>/dev/null)
    echo -e "    - トラフィック: ${TRAFFIC}%"
else
    echo -e "${YELLOW}⚠ Cloud Run: サービスが見つかりません（初回デプロイ前の場合は正常）${NC}"
    status_results+=("${YELLOW}⚠ Cloud Run: 未デプロイ${NC}")
fi
echo ""

# 6. Artifact Registry リポジトリの確認
echo -e "${BLUE}[6/7] Artifact Registry リポジトリの確認...${NC}"
# リポジトリ名は環境によって異なる可能性があるので、プロジェクト全体から検索
REPO_NAME=$($GCLOUD_CMD artifacts repositories list --project="${PROJECT_ID}" --format="value(name)" 2>/dev/null | grep -E "why-why-chat-ai-(repo|${ENVIRONMENT})" | head -1 || echo "NOT_FOUND")
if [ "$REPO_NAME" != "NOT_FOUND" ]; then
    REPO_LOCATION=$($GCLOUD_CMD artifacts repositories list --project="${PROJECT_ID}" --format="table(name,location)" 2>/dev/null | grep "$REPO_NAME" | awk '{print $2}')
    REPO_FORMAT=$($GCLOUD_CMD artifacts repositories describe "$REPO_NAME" --project="${PROJECT_ID}" --location="$REPO_LOCATION" --format="value(format)" 2>/dev/null || echo "NOT_FOUND")
else
    REPO_FORMAT="NOT_FOUND"
fi
if [ "$REPO_FORMAT" = "DOCKER" ]; then
    echo -e "${GREEN}✓ Artifact Registry: リポジトリが作成されています${NC}"
    status_results+=("${GREEN}✓ Artifact Registry: 作成済み${NC}")
    echo -e "    - フォーマット: ${REPO_FORMAT}"
    echo -e "    - リポジトリ名: ${REPO_NAME}"
    echo -e "    - ロケーション: ${REPO_LOCATION}"
    echo -e "    - リポジトリURI: ${REPO_LOCATION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}"
elif [ "$REPO_FORMAT" = "NOT_FOUND" ]; then
    echo -e "${RED}✗ Artifact Registry: リポジトリが見つかりません${NC}"
    status_results+=("${RED}✗ Artifact Registry: 未作成${NC}")
    ALL_GOOD=false
else
    echo -e "${YELLOW}⚠ Artifact Registry: 予期しないフォーマット (${REPO_FORMAT})${NC}"
    status_results+=("${YELLOW}⚠ Artifact Registry: ${REPO_FORMAT}${NC}")
    ALL_GOOD=false
fi
echo ""

# 7. Load Balancer 関連リソースの確認
echo -e "${BLUE}[7/7] Load Balancer 関連リソースの確認...${NC}"
LB_EXISTS=false
LB_URL=$($GCLOUD_CMD compute forwarding-rules describe "why-why-chat-ai-${ENVIRONMENT}-forwarding-rule" --global --project="${PROJECT_ID}" --format="value(IPAddress)" 2>/dev/null || echo "NOT_FOUND")
if [ "$LB_URL" != "NOT_FOUND" ]; then
    LB_EXISTS=true
    echo -e "${GREEN}✓ Load Balancer: 設定されています${NC}"
    status_results+=("${GREEN}✓ Load Balancer: 設定済み${NC}")
    echo -e "    - IPアドレス: ${LB_URL}"

    # バックエンドサービスの状態確認
    BACKEND_HEALTH=$($GCLOUD_CMD compute backend-services get-health "why-why-chat-ai-${ENVIRONMENT}-default" --global --project="${PROJECT_ID}" 2>/dev/null | grep -c "HEALTHY" || echo "0")
    if [ "$BACKEND_HEALTH" -gt "0" ]; then
        echo -e "    - バックエンド: ${GREEN}正常${NC}"
    else
        echo -e "    - バックエンド: ${YELLOW}ヘルスチェック待機中${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Load Balancer: 未設定（オプション）${NC}"
    status_results+=("${YELLOW}⚠ Load Balancer: 未設定${NC}")
fi
echo ""

# 結果サマリーの表示
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}インフラストラクチャ状態サマリー${NC}"
echo -e "${BLUE}========================================${NC}"
for result in "${status_results[@]}"; do
    echo -e "$result"
done
echo ""

if [ "$ALL_GOOD" = true ]; then
    echo -e "${GREEN}✨ すべての必須リソースが正常に構築されています！${NC}"
    if [ "$CLOUD_RUN_URL" = "NOT_FOUND" ]; then
        echo -e "${YELLOW}   Cloud Runサービスはアプリケーションの初回デプロイ時に作成されます。${NC}"
    fi
    exit 0
else
    echo -e "${RED}⚠️  一部のリソースに問題があります。${NC}"
    echo -e "${YELLOW}   ログを確認して問題を解決してください。${NC}"
    exit 1
fi
