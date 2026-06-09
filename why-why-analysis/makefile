# 現在のプロジェクトのバージョン
CURRENT_VERSION := `gitversion | jq '.MajorMinorPatch' | sed 's/"//g'`
# プロジェクトルートディレクトリ
PROJECT_ROOT := $(shell pwd)
# PYTHONPATHを設定
export PYTHONPATH := $(PROJECT_ROOT):$(PYTHONPATH)

# Terraform command with working directory set to terraform/
TERRAFORM = terraform -chdir=terraform

# deploy の デフォルトのオプション
BUILDER = WhyWhyAgentBuilder

# 仮想環境を構築
setup_env:
	uv venv --allow-existing
	source .venv/bin/activate
	uv sync

# タグを作成してリモートリポジトリにプッシュ
tag:
	git tag ${CURRENT_VERSION}
	git push origin ${CURRENT_VERSION}

# Google Cloud の設定をチェック
check:
	./scripts/check_gcloud_config.sh
	./scripts/check_application-default.sh

# Google Cloud Run に PoC アプリをデプロイ
deploy_poc: check
	gcloud run deploy why-why-chat-ai --source . --region us-central1 --platform managed --allow-unauthenticated

# Reasoning Engine に Agent をデプロイ
deploy_agent: check
	uv run python why_why_chat_ai/agent/engine.py --display-name why-why-agent-v${CURRENT_VERSION}

# ローカル開発環境
local_up:
	docker compose up -d postgres
	@echo "Waiting for PostgreSQL to be ready..."
	@sleep 5
	@echo "PostgreSQL is ready. You can now run 'make local_run' to start the application."

local_down:
	docker compose down

local_run:
	@echo "Starting application locally..."
	source .venv/bin/activate && \
	export $$(cat .env.local | xargs) && \
	uvicorn why_why_chat_ai.api.app:app --host localhost --port 8000 --reload

local_streamlit:
	@echo "Starting Streamlit application locally..."
	source .venv/bin/activate && \
	export $$(cat .env.local | xargs) && \
	python -m why_why_chat_ai.poc --server.port 8501

local_full:
	docker compose up

local_setup: ## 開発環境の初期セットアップ（マイグレーション含む）
	@echo "Setting up development environment..."
	docker compose up -d postgres
	@echo "Waiting for PostgreSQL to be ready..."
	@sleep 5
	docker compose run --rm app python scripts/run_migrations.py
	@echo "Starting all services..."
	docker compose up

local_logs:
	docker compose logs -f

local_clean:
	docker compose down -v
	docker system prune -f

# データベース関連
db_migrate:
	source .venv/bin/activate && \
	export $$(cat .env.local | xargs) && \
	alembic upgrade head

db_revision:
	source .venv/bin/activate && \
	export $$(cat .env.local | xargs) && \
	alembic revision --autogenerate -m "$(MSG)"

db_reset:
	docker compose down postgres
	docker volume rm why-why-chat-ai_postgres_data || true
	docker compose up -d postgres

# Terraform で開発環境をデプロイ
# (Terraform の設定変更時などで使用。正式な環境デプロイは .workflows/terraform_apply.yml で GitHub Actions で実行)
dev_up:
	$(TERRAFORM) init -input=false -upgrade
	$(TERRAFORM) workspace select dev || $(TERRAFORM) workspace new dev
	@echo "📋 Generating Terraform plan..."
	$(TERRAFORM) plan -var-file="dev.tfvars" -out=tfplan
	@echo "-----------------------------------------------------"
	@echo "✅ Plan generated. Review the plan above. This is going to be applied, or Ctrl+C within 10 seconds to cancel..."
	@sleep 10
	@echo
	@echo "🚀 Applying Terraform plan..."
	$(TERRAFORM) apply -auto-approve tfplan

# Terraform で開発環境を削除
dev_down:
	@echo "⚠️  WARNING: This will destroy ALL dev environment resources!"
	@echo "Press Ctrl+C within 10 seconds to cancel..."
	@sleep 10

	# 初期化 & ワークスペース選択
	$(TERRAFORM) init -input=false -upgrade
	$(TERRAFORM) workspace select dev

	# プラン確認（削除対象を明確化）
	@echo "📋 Showing destruction plan..."
	$(TERRAFORM) plan -destroy -var-file="dev.tfvars"

	# 標準的な削除を試行
	@echo "🗑️  Attempting standard destruction..."
	if ! $(TERRAFORM) destroy -var-file="dev.tfvars" -auto-approve; then \
		echo "⚠️  Standard destruction failed. Attempting enhanced cleanup..."; \
		$(MAKE) dev_down_force; \
	else \
		echo "✅ Environment destroyed successfully!"; \
	fi

# 強制削除（Service Networking問題対応）- スクリプト版
dev_down_force:
	./scripts/dev_down_force.sh

# 開発環境の状態確認コマンド
check_dev_up:
	@echo "🔍 Checking development infrastructure status..."
	@./scripts/check_infrastructure_status.sh dev

check_dev_down:
	@echo "🔍 Checking development cleanup status..."
	@./scripts/check_cleanup_status.sh dev

# Cloud Run デプロイ（環境設定可能版）
# 使用例: make deploy_cloud_run ENV=dev PROJECT_ID=jtc-why-why-chat-ai-dev
deploy_cloud_run:
	@if [ -z "$(ENV)" ] || [ -z "$(PROJECT_ID)" ]; then \
		echo "❌ Error: ENV and PROJECT_ID are required"; \
		echo "Usage: make deploy_cloud_run ENV=dev PROJECT_ID=your-project-id"; \
		echo "       make deploy_cloud_run ENV=prod PROJECT_ID=your-project-id"; \
		exit 1; \
	fi
	@echo "🚀 Deploying to Cloud Run ($(ENV) environment)..."
	@echo "Building Docker image..."
	docker build -t asia-northeast1-docker.pkg.dev/$(PROJECT_ID)/why-why-chat-ai-$(ENV)/why-why-chat-ai:latest .
	@echo "Pushing to Artifact Registry..."
	docker push asia-northeast1-docker.pkg.dev/$(PROJECT_ID)/why-why-chat-ai-$(ENV)/why-why-chat-ai:latest
	@echo "Deploying to Cloud Run..."
	gcloud run deploy why-why-chat-ai-$(ENV) \
		--image asia-northeast1-docker.pkg.dev/$(PROJECT_ID)/why-why-chat-ai-$(ENV)/why-why-chat-ai:latest \
		--region asia-northeast1 \
		--platform managed \
		--service-account app-sa-$(ENV)@$(PROJECT_ID).iam.gserviceaccount.com \
		--set-env-vars "USE_CLOUD_SQL=true,GCP_PROJECT_ID=$(PROJECT_ID),GOOGLE_CLOUD_PROJECT=$(PROJECT_ID),CLOUD_SQL_REGION=asia-northeast1,CLOUD_SQL_INSTANCE=why-why-chat-ai-db-$(ENV),CLOUD_SQL_DATABASE=why_why_chat_ai_$(ENV),CLOUD_SQL_USER=why-why-chat-ai-app-$(ENV)@$(PROJECT_ID).iam,CLOUD_SQL_USE_IAM_AUTH=true,CHECKPOINT_SCHEMA=whywhy,ENVIRONMENT=$(ENV),RUN_MIGRATIONS=true,OTEL_SDK_DISABLED=true,LOG_LEVEL=DEBUG,DATABASE_URL=postgresql+asyncpg://app-sa-$(ENV)@$(PROJECT_ID).iam@/why_why_chat_ai_$(ENV)?host=/cloudsql/$(PROJECT_ID):asia-northeast1:why-why-chat-ai-db-$(ENV)" \
		--add-cloudsql-instances $(PROJECT_ID):asia-northeast1:why-why-chat-ai-db-$(ENV) \
		--max-instances 10 \
		--memory 2Gi \
		--cpu 2 \
		--allow-unauthenticated
	@echo "✅ Deployment complete!"

# 下位互換性のため、dev環境用のショートカットを残す
deploy_cloud_run_dev:
	@echo "⚠️  Warning: This command is deprecated. Please use 'make deploy_cloud_run ENV=dev PROJECT_ID=your-project-id'"
	@echo "For now, assuming dev environment with jtc-why-why-chat-ai-dev project..."
	$(MAKE) deploy_cloud_run ENV=dev PROJECT_ID=jtc-why-why-chat-ai-dev

# ヘルプ表示
help:
	@echo "📖 Why Why Chat AI - Available Make Commands"
	@echo ""
	@echo "🔧 Environment Setup:"
	@echo "  setup_env          - Set up Python virtual environment with uv"
	@echo "  check              - Check Google Cloud configuration"
	@echo ""
	@echo "🚀 Development Environment (for local testing of Terraform code):"
	@echo "  dev_up             - Deploy development environment to GCP"
	@echo "  dev_down           - Destroy development environment (safe)"
	@echo "  dev_down_force     - Force destroy development environment (enhanced cleanup)"
	@echo ""
	@echo "✅ Official deployment to any environment must be done via GitHub Actions."
	@echo ""
	@echo "🐳 Local Development:"
	@echo "  local_up           - Start local PostgreSQL container"
	@echo "  local_down         - Stop local containers"
	@echo "  local_run          - Run FastAPI app locally"
	@echo "  local_streamlit    - Run Streamlit app locally"
	@echo "  local_full         - Start all local services"
	@echo "  local_setup        - Complete local setup with migrations"
	@echo "  local_clean        - Clean local containers and volumes"
	@echo ""
	@echo "🗄️  Database:"
	@echo "  db_migrate         - Run database migrations"
	@echo ""
	@echo "🧪 Testing:"
	@echo "  test               - Run unit tests"
	@echo "  test-integration   - Run integration tests"
	@echo "  test-all           - Run all tests (unit + integration)"
	@echo "  test-coverage      - Run tests with coverage report"
	@echo "  db_revision        - Create new migration (MSG='description')"
	@echo "  db_reset           - Reset local database"
	@echo ""
	@echo "🚢 Deployment:"
	@echo "  deploy_poc         - Deploy PoC app to Cloud Run"
	@echo "  deploy_agent       - Deploy Agent to Vertex AI Reasoning Engine"
	@echo "  tag                - Create and push git tag"
	@echo ""
	@echo "⚠️  Note: Enhanced cleanup commands automatically handle Service Networking issues"

# テストコマンド
test:
	@echo "🧪 Running unit tests..."
	uv run pytest tests/ -v -m "not integration"

test-integration:
	@echo "🧪 Running integration tests..."
	@cp .env.test.template .env.test 2>/dev/null || true
	uv run pytest tests/integration/ -v -m integration

test-all:
	@echo "🧪 Running all tests..."
	@cp .env.test.template .env.test 2>/dev/null || true
	uv run pytest tests/ -v

test-coverage:
	@echo "📊 Running tests with coverage..."
	@cp .env.test.template .env.test 2>/dev/null || true
	uv run pytest tests/ --cov=why_why_chat_ai --cov-report=html --cov-report=term
	@echo "📁 Coverage report generated in htmlcov/"

.PHONY: help dev_up dev_down dev_down_force setup_env tag check deploy_poc deploy_agent local_up local_down local_run local_streamlit local_full local_setup local_logs local_clean db_migrate db_revision db_reset check_dev_up check_dev_down test test-integration test-all test-coverage
