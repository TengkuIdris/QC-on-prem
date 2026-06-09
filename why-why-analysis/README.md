# なぜなぜ分析AI支援システム
## 概要
このシステムは、ユーザーの入力した問題、原因、及び観測情報に対してなぜなぜ分析を実施し、真因を特定するためのAI支援ツールです。大規模言語モデル (LLM) をベースに構築されており、問題に対して繰り返し「なぜ」と問いかけることで真因に迫る手法を自動化・支援します。
本システムは、製造業や品質管理の現場で発生する問題の根本原因（真因）を効率的に特定することを目的としています。
## 特徴
- 問題情報を5M1E（Man, Machine, Material, Method, Measurement, Environment）フレームワークで構造化入力
- LLMを活用した「なぜ」の連鎖の自動生成
- チャットによるインタラクティブな追加情報収集
- 確信度評価による真因候補の優先順位表示
- 各真因に対する解決策（アクション）の提案
## 技術スタック
- **言語**: Python 3.12+
- **フレームワーク**: Streamlit
- **大規模言語モデル**: Google Cloud Vertex AI Gemini
- **LLMフレームワーク**: LangChain, LangGraph
- **クラウドサービス**: Google Cloud Platform
- **アプリケーション**: Streamlit
## 開発環境のセットアップ
開発を始める前に、ローカルマシンに以下のツールをインストールしてください。
- **Python 3.12 以上**: [公式サイト](https://www.python.org/downloads/) からダウンロードしてインストールしてください。
- **uv**: 高速なPythonパッケージインストーラです。インストール手順は [公式ドキュメント](https://github.com/astral-sh/uv) を参照してください。
### 1. リポジトリのクローン
```bash
git clone https://github.com/blavusai/jatco-why-why-chat-ai.git
cd jatco-why-why-chat-ai
```
### 2. 仮想環境の作成と有効化
`uv` を使ってPythonの仮想環境を作成し、有効化します。
```bash
# 仮想環境を作成 (.venvディレクトリが生成されます)
uv venv
# 仮想環境を有効化 (macOS / Linux)
source .venv/bin/activate
# (Windowsの場合)
# .venv\Scripts\activate
```
### 3. 依存関係のインストール
`uv sync` を使って、`uv.lock` ファイルに記録されているバージョンの依存関係を正確にインストールします。これにより、全開発者で環境の一貫性が保たれます。
```bash
# 依存関係を uv.lock からインストールします (開発用の依存関係も含む)
uv sync --extra dev
```
続いて、プロジェクト自体を編集可能モードでインストールします。
```bash
# --no-deps をつけて、依存関係の再インストールをスキップするのがポイントです
uv pip install -e . --no-deps
```
### 4. 環境変数の設定
アプリケーションは `.env` ファイルからデータベース接続情報などの環境変数を読み込みます。
1.  **`.env.example` をコピー**
    ```bash
    cp .env.example .env
    ```
2.  **`.env` ファイルを編集**
    ローカル開発では、主にデータベース接続URL `DATABASE_URL` の設定が必要です。
    **Docker Compose を使用する場合:**
    `docker-compose.yml` 内で `DATABASE_URL` が設定されているため、`.env` ファイルでの設定は不要です。
    **ローカルで直接サーバーを起動する場合:**
    インフラがTerraformで構築済みの場合、以下のコマンドで開発用データベースの接続URLを取得できます。
    ```bash
    # (別ターミナルで)
    cd terraform
    terraform workspace select dev
    terraform output database_url
    ```
    取得したURLを、プロジェクトルートの `.env` ファイルに `DATABASE_URL="取得したURL"` のように設定してください。
    その他の環境変数（APIキーなど）も必要に応じて `.env` ファイルに設定します。
### 5. データベースマイグレーション
データベースにテーブルスキーマを適用（マイグレーション）します。
```bash
# .env ファイルに DATABASE_URL が設定されている必要があります
alembic upgrade head
```
これで、ローカル開発環境の準備は完了です。
## ローカルでの実行
### APIサーバーの起動
FastAPIで実装されたAPIサーバーを起動します。
```bash
uvicorn why_why_chat_ai.api.app:app --reload
```
`--reload` オプションにより、コードを変更するとサーバーが自動的に再起動します。APIは `http://127.0.0.1:8000` で利用可能になります。
### Streamlit UIの起動
```bash
streamlit run why_why_chat_ai/poc/app.py
```
ブラウザで新しいタブが開き、アプリケーションのUIが表示されます。
### Docker
```bash
# APIサーバーを起動
docker compose up -d api
# APIサーバーログ
docker compose logs -f api
# Streamlit UIを起動
docker compose up -d streamlit
# Streamlitサーバーログ
docker compose logs -f streamlit
```
## 開発者向け情報
### プロジェクト構成
```
why-why-chat-ai/
├── alembic/                   # DBマイグレーション管理
│   ├── env.py
│   ├── README
│   ├── script.py.mako
│   └── versions/
├── docs/                      # ドキュメント
│   ├── api_usage_guide.md
│   ├── detail_design.md       # 詳細設計書
│   ├── references/
│   ├── spec.md                # 要件定義書
├── why_why_chat_ai/           # ソースコード
│   ├── __init__.py
│   ├── agent/
│   │   ├── __init__.py
│   │   ├── action.py
│   │   ├── agent_builder.py
│   │   ├── config.py
│   │   ├── dummy_agent.py
│   │   ├── models.py
│   │   ├── sample_agent.py
│   │   ├── utils.py
│   │   ├── why_why_action.py
│   │   └── why_why_agent.py
│   ├── api/
│   │   ├── __init__.py
│   │   ├── __main__.py
│   │   ├── app.py
│   │   ├── auth.py
│   │   ├── callbacks.py
│   │   ├── config.py
│   │   ├── lifespan.py
│   │   ├── middleware.py
│   │   ├── models.py
│   │   ├── rate_limiting.py
│   │   ├── routers/
│   │   ├── security.py
│   │   ├── services/
│   │   └── telemetry.py
│   ├── poc/
│   │   ├── __main__.py
│   │   ├── app.py
│   │   └── utils.py
├── tests/                     # テストコード
│   ├── agent/
│   ├── api/
│   │   ├── routers/
│   │   └── services/
│   ├── integration/
│   └── poc/
├── scripts/                   # ユーティリティスクリプト
├── terraform/                 # IaC (Terraform)
│   ├── modules/
│   ├── outputs.tf
│   ├── variables.tf
│   └── ...
├── pyproject.toml             # パッケージ設定
├── uv.lock                    # 依存関係ロックファイル
├── .env.example               # 環境変数ファイルサンプル
├── makefile                   # ビルドスクリプト
├── docker-compose.yml         # Docker構成
├── Dockerfile                 # Dockerビルド用
└── README.md                  # このファイル
```
### テスト実行
```bash
pytest
```
### デバッグモード
デバッグ情報を表示するには、`.env`ファイルで`DEBUG_MODE=True`を設定します。
## デプロイメント・インフラストラクチャ
インフラストラクチャの構築・管理、CI/CDパイプライン、デプロイメント手順については以下のドキュメントを参照してください：
:book: **[Terraform運用手順とインフラ設定](terraform/README.md)**
- Terraformを使用したリソース管理
- CI/CDサービスアカウント権限設定
- 開発・本番環境のデプロイ手順
- API Gatewayの設定とAPI Key管理
- トラブルシューティング
### API Gateway アクセス情報（開発環境）
- **URL**: `https://why-why-chat-ai-gateway-dev-2uh72sv9.an.gateway.dev`
- **認証**: API Key（`x-api-key` ヘッダーで指定）
- 詳細は [API Gateway評価ドキュメント](docs/api-gateway-evaluation.md) を参照
17:07
# なぜなぜ分析AI支援システム
## 概要
このシステムは、ユーザーの入力した問題、原因、及び観測情報に対してなぜなぜ分析を実施し、真因を特定するためのAI支援ツールです。大規模言語モデル (LLM) をベースに構築されており、問題に対して繰り返し「なぜ」と問いかけることで真因に迫る手法を自動化・支援します。
本システムは、製造業や品質管理の現場で発生する問題の根本原因（真因）を効率的に特定することを目的としています。
## 特徴
- 問題情報を5M1E（Man, Machine, Material, Method, Measurement, Environment）フレームワークで構造化入力
- LLMを活用した「なぜ」の連鎖の自動生成
- チャットによるインタラクティブな追加情報収集
- 確信度評価による真因候補の優先順位表示
- 各真因に対する解決策（アクション）の提案
## 技術スタック
- **言語**: Python 3.12+
- **フレームワーク**: Streamlit
- **大規模言語モデル**: Google Cloud Vertex AI Gemini
- **LLMフレームワーク**: LangChain, LangGraph
- **クラウドサービス**: Google Cloud Platform
- **アプリケーション**: Streamlit
## 開発環境のセットアップ
開発を始める前に、ローカルマシンに以下のツールをインストールしてください。
- **Python 3.12 以上**: [公式サイト](https://www.python.org/downloads/) からダウンロードしてインストールしてください。
- **uv**: 高速なPythonパッケージインストーラです。インストール手順は [公式ドキュメント](https://github.com/astral-sh/uv) を参照してください。
### 1. リポジトリのクローン
```bash
git clone https://github.com/blavusai/jatco-why-why-chat-ai.git
cd jatco-why-why-chat-ai
```
### 2. 仮想環境の作成と有効化
`uv` を使ってPythonの仮想環境を作成し、有効化します。
```bash
# 仮想環境を作成 (.venvディレクトリが生成されます)
uv venv
# 仮想環境を有効化 (macOS / Linux)
source .venv/bin/activate
# (Windowsの場合)
# .venv\Scripts\activate
```
### 3. 依存関係のインストール
`uv sync` を使って、`uv.lock` ファイルに記録されているバージョンの依存関係を正確にインストールします。これにより、全開発者で環境の一貫性が保たれます。
```bash
# 依存関係を uv.lock からインストールします (開発用の依存関係も含む)
uv sync --extra dev
```
続いて、プロジェクト自体を編集可能モードでインストールします。
```bash
# --no-deps をつけて、依存関係の再インストールをスキップするのがポイントです
uv pip install -e . --no-deps
```
### 4. 環境変数の設定
アプリケーションは `.env` ファイルからデータベース接続情報などの環境変数を読み込みます。
1.  **`.env.example` をコピー**
    ```bash
    cp .env.example .env
    ```
2.  **`.env` ファイルを編集**
    ローカル開発では、主にデータベース接続URL `DATABASE_URL` の設定が必要です。
    **Docker Compose を使用する場合:**
    `docker-compose.yml` 内で `DATABASE_URL` が設定されているため、`.env` ファイルでの設定は不要です。
    **ローカルで直接サーバーを起動する場合:**
    インフラがTerraformで構築済みの場合、以下のコマンドで開発用データベースの接続URLを取得できます。
    ```bash
    # (別ターミナルで)
    cd terraform
    terraform workspace select dev
    terraform output database_url
    ```
    取得したURLを、プロジェクトルートの `.env` ファイルに `DATABASE_URL="取得したURL"` のように設定してください。
    その他の環境変数（APIキーなど）も必要に応じて `.env` ファイルに設定します。
### 5. データベースマイグレーション
データベースにテーブルスキーマを適用（マイグレーション）します。
```bash
# .env ファイルに DATABASE_URL が設定されている必要があります
alembic upgrade head
```
これで、ローカル開発環境の準備は完了です。
## ローカルでの実行
### APIサーバーの起動
FastAPIで実装されたAPIサーバーを起動します。
```bash
uvicorn why_why_chat_ai.api.app:app --reload
```
`--reload` オプションにより、コードを変更するとサーバーが自動的に再起動します。APIは `http://127.0.0.1:8000` で利用可能になります。
### Streamlit UIの起動
```bash
streamlit run why_why_chat_ai/poc/app.py
```
ブラウザで新しいタブが開き、アプリケーションのUIが表示されます。
### Docker
```bash
# APIサーバーを起動
docker compose up -d api
# APIサーバーログ
docker compose logs -f api
# Streamlit UIを起動
docker compose up -d streamlit
# Streamlitサーバーログ
docker compose logs -f streamlit
```
## 開発者向け情報
### プロジェクト構成
```
why-why-chat-ai/
├── alembic/                   # DBマイグレーション管理
│   ├── env.py
│   ├── README
│   ├── script.py.mako
│   └── versions/
├── docs/                      # ドキュメント
│   ├── api_usage_guide.md
│   ├── detail_design.md       # 詳細設計書
│   ├── references/
│   ├── spec.md                # 要件定義書
├── why_why_chat_ai/           # ソースコード
│   ├── __init__.py
│   ├── agent/
│   │   ├── __init__.py
│   │   ├── action.py
│   │   ├── agent_builder.py
│   │   ├── config.py
│   │   ├── dummy_agent.py
│   │   ├── models.py
│   │   ├── sample_agent.py
│   │   ├── utils.py
│   │   ├── why_why_action.py
│   │   └── why_why_agent.py
│   ├── api/
│   │   ├── __init__.py
│   │   ├── __main__.py
│   │   ├── app.py
│   │   ├── auth.py
│   │   ├── callbacks.py
│   │   ├── config.py
│   │   ├── lifespan.py
│   │   ├── middleware.py
│   │   ├── models.py
│   │   ├── rate_limiting.py
│   │   ├── routers/
│   │   ├── security.py
│   │   ├── services/
│   │   └── telemetry.py
│   ├── poc/
│   │   ├── __main__.py
│   │   ├── app.py
│   │   └── utils.py
├── tests/                     # テストコード
│   ├── agent/
│   ├── api/
│   │   ├── routers/
│   │   └── services/
│   ├── integration/
│   └── poc/
├── scripts/                   # ユーティリティスクリプト
├── terraform/                 # IaC (Terraform)
│   ├── modules/
│   ├── outputs.tf
│   ├── variables.tf
│   └── ...
├── pyproject.toml             # パッケージ設定
├── uv.lock                    # 依存関係ロックファイル
├── .env.example               # 環境変数ファイルサンプル
├── makefile                   # ビルドスクリプト
├── docker-compose.yml         # Docker構成
├── Dockerfile                 # Dockerビルド用
└── README.md                  # このファイル
```
### テスト実行
```bash
pytest
```
### デバッグモード
デバッグ情報を表示するには、`.env`ファイルで`DEBUG_MODE=True`を設定します。
## デプロイメント・インフラストラクチャ
インフラストラクチャの構築・管理、CI/CDパイプライン、デプロイメント手順については以下のドキュメントを参照してください：
:book: **[Terraform運用手順とインフラ設定](terraform/README.md)**
- Terraformを使用したリソース管理
- CI/CDサービスアカウント権限設定
- 開発・本番環境のデプロイ手順
- API Gatewayの設定とAPI Key管理
- トラブルシューティング
### API Gateway アクセス情報（開発環境）
- **URL**: `https://why-why-chat-ai-gateway-dev-2uh72sv9.an.gateway.dev`
- **認証**: API Key（`x-api-key` ヘッダーで指定）
- 詳細は [API Gateway評価ドキュメント](docs/api-gateway-evaluation.md) を参照

Python.orgPython.org
Download Python
The official home of the Python Programming Language
