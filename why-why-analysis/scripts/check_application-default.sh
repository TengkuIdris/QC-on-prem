#!/bin/bash

# アプリケーションデフォルト認証(ADC) の有効期限をチェックし、
# 有効期限が切れている場合は認証を更新する

if ! gcloud auth application-default print-access-token &>/dev/null; then
    echo "アプリケーションデフォルト認証(ADC) の有効期限が切れているか、未認証です"
    echo "認証を開始します..."
    # 既存の認証情報をクリーンアップ
    gcloud auth application-default revoke
    # 認証の実行
    if gcloud auth application-default login; then
        echo "認証に成功しました"
        echo "セキュリティ上の理由により、ADC の有効期限はデフォルトで 1 時間です"
        exit 0
    else
        echo "認証に失敗しました"
        exit 1
    fi
else
    echo "アプリケーションデフォルト認証(ADC) は有効です"
    exit 0
fi
