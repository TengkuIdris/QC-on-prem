# テスト実行ガイド

## 基本的なテスト実行

```bash
# すべてのテストを実行
pytest

# 特定のテストファイルを実行
pytest tests/test_specific_file.py

# 特定のテストケースを実行
pytest tests/test_specific_file.py::test_function_name

# 統合テストをスキップ
pytest -m "not integration"
```

## 実際のVertex AIを使用するテスト

実際のVertex AI APIを使用するテストには `@pytest.mark.requires_vertex_ai` マーカーが付いています。
これらのテストはデフォルトではスキップされます。

### 実行方法

```bash
# 実際のVertex AIを使用してテストを実行
USE_REAL_VERTEX_AI=true pytest tests/integration/test_agent_client_is_retry.py -v
```

### 前提条件

1. Google Cloud の認証設定が完了していること：
   ```bash
   gcloud auth application-default login
   ```

2. 適切なプロジェクトが設定されていること：
   ```bash
   gcloud config set project jtc-why-why-chat-ai-dev
   ```

## 環境変数について

このプロジェクトでは `.env.test` ファイルを**使用しません**。これは pytest-dotenv による環境変数の自動読み込みが、実際のVertex AIを使用するテストで問題を引き起こすためです。

テストで必要な環境変数は、以下の方法で設定してください：

1. **シェルで直接設定**：
   ```bash
   export GCP_PROJECT_ID=jtc-why-why-chat-ai-dev
   export GCP_LOCATION=asia-northeast1
   ```

2. **テスト実行時に設定**：
   ```bash
   GCP_PROJECT_ID=jtc-why-why-chat-ai-dev GCP_LOCATION=asia-northeast1 pytest tests/...
   ```

## トラブルシューティング

### 認証エラーが発生する場合

1. Application Default Credentials が設定されているか確認：
   ```bash
   gcloud auth application-default login
   ```

2. プロジェクトIDが正しいか確認：
   ```bash
   gcloud config get-value project
   ```

### テストがスキップされる場合

`USE_REAL_VERTEX_AI=true` が設定されているか確認してください。この環境変数が設定されていない場合、`@pytest.mark.requires_vertex_ai` のテストはスキップされます。