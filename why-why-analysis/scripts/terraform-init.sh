#!/bin/bash
# Terraform初期化スクリプト
# 使用方法: ./scripts/terraform-init.sh [環境名]
# 環境名: dev (デフォルト) または prod

set -euo pipefail

# スクリプトのディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TERRAFORM_DIR="$PROJECT_ROOT/terraform"

# 環境名（デフォルト: dev）
ENV=${1:-dev}

# 色付き出力用の関数
print_info() {
    echo -e "\033[0;36m[INFO]\033[0m $1"
}

print_success() {
    echo -e "\033[0;32m[SUCCESS]\033[0m $1"
}

print_error() {
    echo -e "\033[0;31m[ERROR]\033[0m $1"
}

# メイン処理
main() {
    print_info "Terraform初期化を開始します"
    print_info "環境: $ENV"

    # Terraformディレクトリに移動
    cd "$TERRAFORM_DIR" || {
        print_error "Terraformディレクトリが見つかりません: $TERRAFORM_DIR"
        exit 1
    }

    # 環境に応じたbackend設定ファイルの確認
    if [ "$ENV" = "prod" ]; then
        BACKEND_CONFIG="backend-prod.hcl"
    else
        BACKEND_CONFIG="backend-dev.hcl"
    fi

    if [ ! -f "$BACKEND_CONFIG" ]; then
        print_error "Backend設定ファイルが見つかりません: $BACKEND_CONFIG"
        exit 1
    fi

    print_info "Backend設定ファイルを使用: $BACKEND_CONFIG"

    # Terraform初期化
    print_info "Terraformを初期化しています..."
    # 既存の異なるバックエンド設定がある場合は -reconfigure を使用
    if [ -f ".terraform/terraform.tfstate" ]; then
        CURRENT_BUCKET=$(grep -o '"bucket": "[^"]*"' .terraform/terraform.tfstate | cut -d'"' -f4 || echo "")
        EXPECTED_BUCKET=$(grep '^bucket' "$BACKEND_CONFIG" | cut -d'"' -f2 || echo "")

        if [ -n "$CURRENT_BUCKET" ] && [ -n "$EXPECTED_BUCKET" ] && [ "$CURRENT_BUCKET" != "$EXPECTED_BUCKET" ]; then
            print_info "バックエンドの変更を検出しました"
            print_info "  現在: $CURRENT_BUCKET"
            print_info "  変更先: $EXPECTED_BUCKET"
            print_info "-reconfigure オプションを使用して初期化します"

            if terraform init -backend-config="$BACKEND_CONFIG" -reconfigure; then
                print_success "Terraform初期化が完了しました（バックエンド再設定）"
            else
                print_error "Terraform初期化に失敗しました"
                exit 1
            fi
        else
            if terraform init -backend-config="$BACKEND_CONFIG"; then
                print_success "Terraform初期化が完了しました"
            else
                print_error "Terraform初期化に失敗しました"
                exit 1
            fi
        fi
    else
        if terraform init -backend-config="$BACKEND_CONFIG"; then
            print_success "Terraform初期化が完了しました"
        else
            print_error "Terraform初期化に失敗しました"
            exit 1
        fi
    fi

    # Workspace選択
    print_info "Workspace '$ENV' を選択しています..."
    if terraform workspace select "$ENV" 2>/dev/null; then
        print_success "Workspace '$ENV' を選択しました"
    else
        print_info "Workspace '$ENV' が存在しません。新規作成します..."
        if terraform workspace new "$ENV"; then
            print_success "Workspace '$ENV' を作成しました"
        else
            print_error "Workspace '$ENV' の作成に失敗しました"
            exit 1
        fi
    fi

    # 現在の状態を表示
    print_info "現在のTerraform設定:"
    echo "  - Backend: $BACKEND_CONFIG"
    echo "  - Workspace: $(terraform workspace show)"
    echo ""

    print_success "Terraform初期化が完了しました！"
    print_info "次のコマンドでplanを実行できます:"
    echo "  cd $TERRAFORM_DIR"
    echo "  terraform plan -var-file=${ENV}.tfvars"
}

# スクリプトを実行
main "$@"
