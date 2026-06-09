# Terraform 運用手順

## 1. 概要

このドキュメントでは、Why Why Chat AI アプリケーションのインフラストラクチャを Terraform を使用して管理するための手順について説明します。

### 1.1 Terraform + Data Source パターンのアーキテクチャ

本プロジェクトでは、CI/CDパイプラインの循環依存を解決するため、**Terraform + Data Source パターン**を採用しています。

```mermaid
graph TB
    subgraph "Phase 1: Bootstrap"
        B1[Bootstrap Script] -->|Creates| CR1[Placeholder Cloud Run<br/>128Mi RAM, 0.08 CPU]
        style CR1 fill:#f9f,stroke:#333,stroke-width:2px
    end

    subgraph "Phase 2: Terraform"
        TF[Terraform Apply] -->|Creates| AR[Artifact Registry]
        TF -->|Creates| SQL[Cloud SQL]
        TF -->|Creates| AG[API Gateway]
        TF -->|Creates| AK[API Key]

        style TF fill:#9f9,stroke:#333,stroke-width:2px
    end

    subgraph "Phase 3: CI/CD"
        subgraph "GitHub Actions"
            Build[build job] -->|Push Image| AR
            Deploy[deploy job] -->|Updates| CR2[Production Cloud Run<br/>2CPU, 2Gi RAM]
        end

        Build -.->|Parallel Execution| TF
        style CR2 fill:#6f6,stroke:#333,stroke-width:2px
    end

    subgraph "運用時の状態"
        AG2[API Gateway] -->|Routes to| CR2
        AK2[API Key] -->|Authenticates| AG2
        CLIENT[Client] -->|HTTPS Request<br/>with API Key| AG2
    end

    B1 ==>|Step 1| TF
    TF ==>|Step 2| Build
    Build ==>|Step 3| Deploy
    Deploy ==>|Continuous| AG2
```

### 1.2 責任分離

- **Terraform**: インフラリソース管理（Cloud SQL、Artifact Registry、API Gateway、サービスアカウント）
- **CI/CD**: アプリケーション管理（Cloud Run サービス）
- **API Gateway**: 外部からのアクセスポイント（API Key認証付き）

### 1.3 サービスアカウント管理戦略

本プロジェクトでは、セキュリティベストプラクティスに従い、以下の戦略でサービスアカウントを管理します：

1. **Bootstrap フェーズ（デフォルトサービスアカウント使用）**
   - プレースホルダーCloud Runサービスのみデフォルトサービスアカウントを使用
   - セキュリティリスクが最小（プレースホルダーイメージは何も実行しない）
   - Terraform実行前に必要なため、この段階ではカスタムSAは使用不可

2. **Terraform フェーズ（サービスアカウント作成）**
   - アプリケーション専用のサービスアカウント（`app-sa-{env}`）を作成
   - 最小権限の原則に従い、必要な権限のみを付与
   - 各環境（dev/prod）で独立したサービスアカウントを使用

3. **CI/CD フェーズ（サービスアカウント指定）**
   - 実際のアプリケーションデプロイ時にTerraformで作成したSAを指定
   - `--service-account`フラグで明示的に設定
   - デフォルトサービスアカウントから専用SAへの切り替えが自動化

## 2. 前提条件

### 2.1 必要なツール

- [Terraform](https://www.terraform.io/downloads.html) v1.0以上
- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) (`gcloud` コマンド)
- Bash互換シェル

### 2.2 権限要件

実行ユーザーまたはサービスアカウントに以下の権限が必要です：

- `roles/cloudsql.admin` - Cloud SQL インスタンスの管理
- `roles/artifactregistry.admin` - Artifact Registry の管理
- `roles/run.developer` - Cloud Run サービスの管理
- `roles/compute.networkAdmin` - ネットワーク設定の管理
- `roles/iam.serviceAccountUser` - サービスアカウントの使用
- `roles/storage.admin` - GCS remote state backend へのアクセス


### 2.3 事前準備

1. Google Cloud SDK の認証設定：
   ```bash
   gcloud auth application-default login
   ```

2. プロジェクトの設定：
   ```bash
   gcloud config set project YOUR_PROJECT_ID
   ```

## 3. 初回環境構築ガイド

新しい環境を構築する場合は、以下の3段階のプロセスで実行します。

### 3.1 環境準備

#### 3.1.1 Remote State Backend の設定

Terraform stateを管理するGCSバケットを作成します（初回のみ）。専用のセットアップスクリプトを使用します：

```bash
# Terraform Remote State Backend のセットアップ
./scripts/setup-terraform-backend.sh YOUR_PROJECT_ID [REGION]

# 例
./scripts/setup-terraform-backend.sh jtc-why-why-chat-ai-dev
./scripts/setup-terraform-backend.sh jtc-why-why-chat-ai-dev us-central1
```

このスクリプトは以下を実行します：
- GCSバケットの作成（`{PROJECT_ID}-terraform-state`）
- バージョニングの有効化（state履歴管理）
- ライフサイクルポリシーの設定（古いstateの自動削除）
- セキュリティ設定（uniform bucket-level access）

**注意**：
- バケット名は`backend-{env}.hcl`の設定と一致させる必要があります
- このバケットにはTerraform実行者が`roles/storage.admin`権限を持つ必要があります
- スクリプト実行後、表示される手順に従ってTerraformの設定を更新してください

#### 3.1.2 Backend設定

このプロジェクトでは環境別のbackend設定ファイルを使用しています。Terraformの初期化時に適切な設定ファイルを指定してください。

##### 設定ファイル

- `backend-dev.hcl`: 開発環境用のGCSバケット設定
- `backend-prod.hcl`: 本番環境用のGCSバケット設定

##### 初期化方法

```bash
# 開発環境
cd terraform
terraform init -backend-config=backend-dev.hcl
terraform workspace select dev

# 本番環境
cd terraform
terraform init -backend-config=backend-prod.hcl
terraform workspace select prod
```

##### スクリプトを使用した初期化

便利なスクリプトを用意しています：

```bash
# 開発環境（デフォルト）
./scripts/terraform-init.sh

# 本番環境
./scripts/terraform-init.sh prod
```

このスクリプトは以下を自動的に実行します：
- 環境に応じたbackend設定ファイルの選択
- Terraformの初期化
- 適切なworkspaceの選択または作成

**注意**: 本番環境を使用する場合は、`backend-prod.hcl`内のバケット名を実際の本番プロジェクトIDに基づいて更新してください。

#### 3.1.3 tfvarsファイルの設定

1. サンプルファイルをコピー：
   ```bash
   # 開発環境
   cp terraform/dev.tfvars.example terraform/dev.tfvars

   # 本番環境
   cp terraform/dev.tfvars.example terraform/prod.tfvars
   ```

2. 環境に応じて変数を設定：
   - `project_id`: GCPプロジェクトID
   - その他環境固有の設定

   **注意:** これらのファイルはローカルでの `make dev_up` コマンドや、Terraformコードの開発時に参照されます。GitHub Actionsによる正式なデプロイでは、後述するGitHub Secretsの値が使用されます。

#### 3.1.4 GitHub Secrets と Environments の設定 (必須)

GitHub Actionsによるインフラの自動デプロイでは、`.tfvars` ファイルの代わりにGitHub Secretsを使用します。本プロジェクトでは**GitHub Environments**を使用して環境ごとのSecretsを管理しています。

##### GitHub Environmentsの作成

1. **環境の作成**
   - GitHubリポジトリの `Settings` > `Environments` > `New environment`
   - `dev` 環境と `prod` 環境を作成

2. **環境保護ルール（本番環境推奨）**
   - `prod` 環境には以下の保護ルールを設定することを推奨：
     - Required reviewers: 1名以上のレビュアーを指定
     - Deployment branches: `main` ブランチのみに制限

##### 環境別Secretsの設定

各環境（`dev`、`prod`）の設定画面で、以下のSecretsを追加してください：

1. **共通のSecret名（環境ごとに異なる値）**
   - `WIF_PROVIDER`: Workload Identity Federation Provider（環境別）
   - `CICD_SERVICE_ACCOUNT`: CI/CDサービスアカウント（環境別）
   - `GCP_PROJECT_ID`: GCPプロジェクトID（環境別）
   - `TFVARS_DEV` または `TFVARS_PROD`: Terraform変数ファイルの内容

2. **開発環境 (`dev`) の値の例**
   ```
   WIF_PROVIDER: projects/223071611301/locations/global/workloadIdentityPools/github-pool-dev/providers/github-actions-provider
   CICD_SERVICE_ACCOUNT: cicd-sa-dev@jtc-why-why-chat-ai-dev.iam.gserviceaccount.com
   GCP_PROJECT_ID: jtc-why-why-chat-ai-dev
   TFVARS_DEV: dev.tfvars.example の内容をコピーし、実際の値に書き換えて貼り付け
   ```

3. **本番環境 (`prod`) の値の例**
   ```
   WIF_PROVIDER: projects/861100387757/locations/global/workloadIdentityPools/github-pool/providers/github-provider
   CICD_SERVICE_ACCOUNT: cicd-sa-prod@jatco-5why.iam.gserviceaccount.com
   GCP_PROJECT_ID: jatco-5why
   TFVARS_PROD: prod.tfvars.example の内容をコピーし、実際の値に書き換えて貼り付け
   ```

**注意**: GitHub Environmentsを使用することで、同じSecret名で環境ごとに異なる値を管理できます。ワークフローは自動的に適切な環境のSecretsを使用します。

#### 3.1.5 ワークスペースの作成

```bash
cd terraform
terraform init
terraform workspace new dev   # 開発環境用
terraform workspace new prod  # 本番環境用
```

※ 3.1.2 で scripts/terraform-init.sh を実行していれば、この手順は不要です。

#### 3.1.6 サービスアカウント権限設定

CI/CDパイプライン用のサービスアカウントの作成と権限設定は、専用のセットアップスクリプトを使用します。

**セキュリティのベストプラクティス**：
- 最小権限の原則に従い、必要最小限の権限のみを付与
- 本番環境では、Terraformの実行とアプリケーションのデプロイで別々のサービスアカウントを使用することを推奨
- 定期的に権限を見直し、不要な権限は削除

**セットアップ手順**：

1. **Workload Identity Federation の設定**（初回のみ）:
   ```bash
   ./scripts/setup-workload-identity-federation.sh YOUR_PROJECT_ID
   ```

   このスクリプトは以下を実行します：
   - Workload Identity Pool の作成
   - GitHub Actions 用の OIDC プロバイダーの設定
   - 必要な API の有効化

2. **CI/CD サービスアカウントの作成**:
   ```bash
   ./scripts/setup-cicd-service-account.sh YOUR_PROJECT_ID github-pool
   ```

   このスクリプトは以下を実行します：
   - 開発環境と本番環境用の CI/CD サービスアカウント作成
   - Terraform 実行とアプリケーションデプロイに必要な全権限の付与
   - Workload Identity Federation アクセスの設定
   - アプリケーションサービスアカウントへの impersonate 権限設定

3. **GitHub Secrets の設定**:
   スクリプト実行後に表示される WIF Provider の値を、対応する GitHub Environment の `WIF_PROVIDER` Secret に設定してください。

   詳細な設定手順は「3.1.4 GitHub Secrets と Environments の設定」を参照してください。

詳細な手順とトラブルシューティングについては、[scripts/README.md](../scripts/README.md) を参照してください。

### 3.2 3段階デプロイプロセス

#### Phase 1: Bootstrap実行

TerraformのData Sourceが参照できるプレースホルダーCloud Runサービスを作成：

```bash
# 開発環境
./scripts/bootstrap-deployment.sh YOUR_PROJECT_ID dev

# 本番環境
./scripts/bootstrap-deployment.sh YOUR_PROJECT_ID prod
```

**注意**:
- Bootstrapは各環境で一度だけ実行
- プレースホルダーは最小リソース（128Mi RAM, 0.08 CPU）で作成

#### Phase 2: Terraform適用 (GitHub Actions経由)

インフラリソースの作成・更新は、**GitHub Actionsのワークフローを通じて行うのが公式な手順です。** これにより、安全かつ一貫性のあるデプロイが保証されます。

1.  **GitHub Actionsのワークフローを開く:**
    -   リポジトリの `Actions` タブに移動します。
    -   左のサイドバーから `Terraform Apply and Update Secrets` を選択します。

2.  **ワークフローを実行:**
    -   `Run workflow` ドロップダウンをクリックします。
    -   `デプロイ環境を選択` で `dev` または `prod` を選びます。
    -   `Run workflow` ボタンを押して、デプロイを開始します。

このワークフローは、指定された環境に対応する `TFVARS_DEV` または `TFVARS_PROD` シークレットを読み込み、Terraformを適用します。

作成されるリソース：
- Artifact Registry repository
- Cloud SQL インスタンス
- Vertex AI ステージングバケット
- Load Balancer + Cloud Armor（設定による）
- Network Endpoint Group（Data SourceでCloud Runを参照）

#### Phase 3: CI/CDパイプライン実行

実際のアプリケーションをデプロイ：

```bash
# mainブランチにプッシュしてCI/CDを起動
git push origin main

# または手動でGitHub Actionsを実行
```

### 3.3 環境構築後の設定

#### 3.3.1 IAP認証設定（Load Balancer使用時）

Load Balancerを使用する場合、以下の手動設定が必要です：

1. **IAP Service Agentの作成**：
   ```bash
   gcloud beta services identity create \
     --service=iap.googleapis.com \
     --project=YOUR_PROJECT_ID
   ```

2. **Cloud Run Invoker権限の付与**：
   ```bash
   gcloud run services add-iam-policy-binding why-why-chat-ai-${ENV} \
     --region=asia-northeast1 \
     --member='serviceAccount:service-PROJECT_NUMBER@gcp-sa-iap.iam.gserviceaccount.com' \
     --role='roles/run.invoker'
   ```

3. **Backend ServiceでIAP有効化**：
   ```bash
   gcloud compute backend-services update why-why-chat-ai-${ENV}-backend-default \
     --global \
     --iap=enabled
   ```

4. **Cloud Run Ingress制限**：
   ```bash
   gcloud run services update why-why-chat-ai-${ENV} \
     --region=asia-northeast1 \
     --ingress=internal-and-cloud-load-balancing
   ```

5. **ユーザーアクセス権限設定**：
   ```bash
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="user:USER_EMAIL" \
     --role="roles/iap.httpsResourceAccessor"
   ```

## 4. 通常運用ガイド

### 4.1 インフラ変更

既存環境のインフラを変更する場合は、**常に `Terraform Apply and Update Secrets` ワークフローを使用します。**

1.  **Terraformコードを編集**
    - `main.tf` や `modules/` 以下のファイルを変更します。
2.  **変更をmainブランチにプッシュ**
3.  **GitHub Actionsワークフローを実行**
    - 上記の「Phase 2: Terraform適用」の手順に従って、対象の環境（`dev` or `prod`）にワークフローを実行します。

**ローカルでのテスト (任意):**
大きな変更を加える前に、ローカルで動作確認を行いたい場合は `make dev_up` コマンドが利用できます。

```bash
# dev.tfvars を編集して動作確認
make dev_up
```
このコマンドはローカルでの迅速なテストを目的としており、公式な環境へのデプロイには使用しません。

### 4.2 Vertex AIステージングバケット

Vertex AI用のステージングバケットはTerraformで自動管理されます：

#### 設定内容
- **バケット名**: `${project_id}-vertex-ai-staging`（プロジェクトごとに1つ、環境共通）
- **ライフサイクルポリシー**:
  - 開発環境（`terraform.workspace == "dev"`）: 7日後に自動削除
  - 本番環境（`terraform.workspace == "prod"`）: 30日後に自動削除
  - 未完了のマルチパートアップロード: 1日後に自動削除
- **アクセス制御**: Uniform bucket-level access有効
- **削除保護**: 本番環境のみ有効（`force_destroy = false`）

#### CI/CDパイプラインでの利用
1. `terraform`ジョブがバケットを作成し、名前をoutputとして出力
2. `deploy`ジョブが`needs.terraform.outputs.staging_bucket`から名前を取得
3. Vertex AI関連サービスでのデプロイ時に環境変数`VERTEXAI_STAGING_BUCKET`として使用

#### 手動での確認方法
```bash
# Terraformから出力値を取得
cd terraform
terraform output vertex_ai_staging_bucket

# Google Cloud Storage で確認
gsutil ls -b gs://$(terraform output -raw vertex_ai_staging_bucket)
```

### 4.3 アプリケーション更新

アプリケーションの更新はCI/CDパイプラインで実行：

1. **コード変更をコミット**
2. **mainブランチにプッシュ**
3. **GitHub Actionsが自動実行**

#### 4.3.1 アプリケーションのロールバック

```bash
# Cloud Runの以前のリビジョンにロールバック
gcloud run services update-traffic why-why-chat-ai-${ENV} \
  --region=asia-northeast1 \
  --to-revisions=REVISION_NAME=100
```

#### 4.3.2 データベースマイグレーションのロールバック

データベースマイグレーションに問題が発生した場合の手順：

##### 事前準備

1. **マイグレーション履歴の確認**：
   ```bash
   # Cloud SQL Proxyを起動（ローカルから実行する場合）
   cloud_sql_proxy -instances=PROJECT_ID:REGION:INSTANCE_NAME=tcp:5432 &

   # 現在のマイグレーション状態を確認
   export DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
   alembic current

   # マイグレーション履歴を確認
   alembic history
   ```

##### ロールバック実行

1. **特定のリビジョンへのロールバック**：
   ```bash
   # 1つ前のリビジョンに戻す
   alembic downgrade -1

   # 特定のリビジョンに戻す
   alembic downgrade REVISION_ID

   # 初期状態に戻す（注意：全マイグレーションが取り消される）
   alembic downgrade base
   ```

2. **GitHub Actions経由でのロールバック**：
   ```bash
   # 環境変数を設定してロールバック用のワークフローを実行
   # （注意：現在は手動実行が必要）
   ```

##### ロールバック後の確認

1. **データベース状態の確認**：
   ```bash
   # 現在のマイグレーション状態を確認
   alembic current

   # アプリケーションの動作確認
   curl https://YOUR_CLOUD_RUN_URL/health
   ```

2. **ログの確認**：
   ```bash
   # Cloud Runのログを確認
   gcloud logging read "resource.type=cloud_run_revision \
     AND resource.labels.service_name=why-why-chat-ai-${ENV}" \
     --limit=50 --format=json
   ```

##### 注意事項

- **データ損失のリスク**: ロールバックによってデータが失われる可能性があります
- **依存関係**: 新しいアプリケーションコードが新しいスキーマに依存している場合は、アプリケーションも同時にロールバックが必要
- **本番環境での実行**: 本番環境でのロールバックは慎重に計画し、可能であればメンテナンスウィンドウ中に実行

##### 緊急時の対応

1. **アプリケーションの即時ロールバック**：
   上記のCloud Runロールバックを先に実行し、サービスを安定化

2. **データベースの手動修正**：
   必要に応じてSQLを直接実行してスキーマを修正

3. **インシデント記録**：
   ロールバックの理由、実行手順、影響範囲を記録

## 5. Cloud SQL 初期化

### 5.1 概要

Cloud SQL の初期化（スキーマ作成、権限設定）は Cloud Run Job 経由で自動実行されます。組織ポリシー `constraints/sql.restrictAuthorizedNetworks` によるパブリックIPアクセス制限を回避するため、VPCコネクタ経由でプライベート接続を使用します。

### 5.2 初期化アーキテクチャ

```
GitHub Actions
    ↓
Cloud Run Job（VPCコネクタ経由）
    ↓
Cloud SQL（プライベートIP）
    ↓
スキーマ作成 & 権限設定
```

### 5.3 初期化実行方法

#### 自動実行（Terraform適用後）

以下のファイルが変更されると自動的に実行されます：
- `.github/workflows/init-cloud-sql.yml`
- `why_why_chat_ai/agent/engine.py`
- `scripts/cloud-sql-init-ci.py`

#### 手動実行

GitHub Actions UI から手動実行：

1. Actions タブを開く
2. "Initialize Cloud SQL Schema via Cloud Run Job" を選択
3. "Run workflow" をクリック
4. 環境を選択（dev/stg/prod）
5. "Run workflow" を実行

#### コマンドライン実行

```bash
# 開発環境
gh workflow run "Initialize Cloud SQL Schema via Cloud Run Job" --field environment=dev

# 本番環境
gh workflow run "Initialize Cloud SQL Schema via Cloud Run Job" --field environment=prod
```

### 5.4 初期化内容

#### スキーマ作成
- `whywhy` スキーマの作成（LangGraphチェックポイント用）

#### 権限設定
- IAMサービスアカウント（app-sa-{env}）への権限付与
  - データベース接続権限
  - スキーマ使用権限
  - テーブル作成権限
  - デフォルト権限の設定

#### PostgreSQL 15+ 対応
- public スキーマへの明示的な権限付与
- CREATE権限の個別設定

### 5.5 トラブルシューティング

#### エラー: role "@***.iam" does not exist

環境変数 `CLOUD_SQL_IAM_USER` が正しく設定されていません。

```bash
# Cloud Run Job の環境変数を確認
gcloud run jobs describe init-cloud-sql-schema-{env} \
  --region=asia-northeast1 \
  --format="value(spec.template.spec.template.spec.containers[0].env[?(@.name=='CLOUD_SQL_IAM_USER')].value)"
```

#### エラー: permission denied for schema public

PostgreSQL 15+ では public スキーマへのアクセスが制限されています。

```bash
# 手動で権限を付与（緊急時のみ）
echo "GRANT CREATE ON SCHEMA public TO \"app-sa-{env}@{project}.iam\";" | \
  gcloud sql databases execute-sql {database} \
  --instance={instance} \
  --project={project}
```

#### Cloud Run Job のログ確認

```bash
# 実行ログを確認
gcloud logging read \
  "resource.type=cloud_run_job AND resource.labels.job_name=init-cloud-sql-schema-{env}" \
  --project={project} \
  --limit=100 \
  --format="table(timestamp, severity, textPayload)"
```

### 5.6 関連ファイル

- `.github/workflows/init-cloud-sql.yml` - GitHub Actions ワークフロー
- `scripts/cloud-sql-init-ci.py` - 初期化スクリプト
- `terraform/modules/cloud-sql/secrets.tf` - パスワード管理

## 6. 環境別設定ガイド

### 6.1 開発環境 (dev)

#### 環境一貫性のための設定

開発環境でも本番環境と同じ構成でテストを行うため、Load BalancerとCloud Armorを有効化：

```hcl
# dev.tfvars
deploy_load_balancer_and_armor = true
allow_ips_for_cloud_armor = ["0.0.0.0/0"]  # 開発環境では全IPを許可
domain_name = ""  # ドメインが必要な場合は設定
```

**注意事項**：
- 開発環境と本番環境の構成を統一することで、環境差異による問題を防止
- 開発環境は `make dev_down` で完全に削除可能なため、使用時のみ起動する運用を推奨
- テスト用途のため、Cloud Armorは全IPアドレスからのアクセスを許可

### 6.2 本番環境 (prod)

#### 必須セキュリティ設定

```hcl
# prod.tfvars
deploy_load_balancer_and_armor = true
allow_ips_for_cloud_armor = ["ALLOWED_IP_RANGES"]
domain_name = "prod.your-domain.com"
```

#### SSL証明書設定

1. tfvarsで`domain_name`を設定
2. Terraform適用後、Load Balancer IPを取得：
   ```bash
   terraform output load_balancer_ip
   ```
3. DNSのAレコードを設定
4. Google Managed SSL証明書の自動プロビジョニングを待機（15-60分）

## 6. API Gateway 設定

### 6.1 概要

本プロジェクトでは、外部からのAPIアクセスを管理するために Google Cloud API Gateway を使用しています。これにより以下の利点があります：

- **シンプルな構成**: Load Balancer + Cloud Armor よりも管理が容易
- **API Key 認証**: 簡単で効果的な認証メカニズム
- **ドメイン不要**: 自動的にHTTPSエンドポイントが提供される
- **組織ポリシー準拠**: allUsers/allAuthenticatedUsers を使用しない

### 6.2 API Gateway アクセス方法

#### 開発環境
- **URL**: `https://why-why-chat-ai-gateway-dev-2uh72sv9.an.gateway.dev`
- **認証**: API Key（`x-api-key` ヘッダーで指定）

> **API Gateway アドレスの永続性について**
>
> API Gateway のアドレスに含まれる `2uh72sv9` のような部分は、API Gateway 作成時に自動的に生成される一意のIDです。このアドレスは以下の場合にのみ変更されます：
>
> - API Gateway リソース（`google_api_gateway_gateway`）を削除して再作成した場合
> - Terraform で `terraform destroy` を実行後、再度 `terraform apply` した場合
> - リソース名を変更して新しいゲートウェイを作成した場合
>
> **通常の運用では、このアドレスは変わりません**。設定変更、API仕様の更新、Cloud Runサービスの再デプロイなどではアドレスは維持されます。

#### アクセス例
```bash
# ヘルスチェック
curl -X GET "https://why-why-chat-ai-gateway-dev-2uh72sv9.an.gateway.dev/health" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Accept: application/json"

# スレッド作成
curl -X POST "https://why-why-chat-ai-gateway-dev-2uh72sv9.an.gateway.dev/v1/threads" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"problem": {"title": "テスト", "language": "ja"}}'
```

### 6.3 API Key 管理

API Key は gcloud コマンドで管理します：

```bash
# API Key 一覧
gcloud services api-keys list --project=YOUR_PROJECT_ID

# 新しい API Key を作成
gcloud services api-keys create \
  --display-name="アプリケーション名" \
  --api-target=service=API_GATEWAY_SERVICE_NAME \
  --project=YOUR_PROJECT_ID
```

詳細は [API Gateway評価ドキュメント](../docs/api-gateway-evaluation.md) を参照してください。

## 7. コマンドリファレンス

### 7.1 Terraformコマンド

| コマンド | 説明 |
|---------|------|
| `terraform init` | Terraformを初期化 |
| `terraform workspace list` | ワークスペース一覧表示 |
| `terraform workspace select ENV` | ワークスペース切り替え |
| `terraform plan -var-file="ENV.tfvars"` | 変更内容確認 |
| `terraform apply -var-file="ENV.tfvars"` | 変更適用 |
| `terraform output OUTPUT_NAME` | 出力値確認 |
| `terraform destroy -var-file="ENV.tfvars"` | リソース削除（注意） |
| `make dev_up` | [開発用] Terraformコードをローカルでテスト |
| `make dev_down` | [開発用] 開発環境リソースを削除 |

### 6.2 よく使う出力値

```bash
# データベースURL
terraform output dev_database_url
terraform output prod_database_url

# Load Balancer IP（有効時）
terraform output load_balancer_ip

# Vertex AI ステージングバケット名
terraform output vertex_ai_staging_bucket
```

## 7. トラブルシューティング

### 7.1 Data Source関連のエラー

**エラー**: `Error: Error retrieving Cloud Run service`

**解決方法**：
```bash
# Cloud Runサービスの存在確認
gcloud run services list --region=asia-northeast1

# Bootstrap再実行（必要な場合）
./scripts/bootstrap-deployment.sh YOUR_PROJECT_ID ENV
```

### 7.2 権限関連のエラー

**エラー**: `Error 403: Permission denied`

**解決方法**：
1. サービスアカウントの権限を確認
2. 必要な権限を付与（セクション3.1.5参照）

### 7.3 Terraform State関連

**エラー**: `Error acquiring the state lock`

**解決方法**：
```bash
# 強制的にロック解除（他に実行中のプロセスがないことを確認）
terraform force-unlock LOCK_ID
```

### 7.4 Cloud SQL初期化エラー

**エラー**: `Organization Policy check failure: the authorized networks of this instance violates the constraints/sql.restrictAuthorizedNetworks`

**原因**: 組織ポリシーによりCloud SQLへのパブリックIPアクセスが制限されています。

**解決方法**：

#### 方法1: Cloud Shellから手動実行（推奨）
```bash
# 1. Google Cloud Shellにログイン
gcloud cloud-shell ssh

# 2. リポジトリをクローン
git clone https://github.com/your-org/jatco-why-why-chat-ai.git
cd jatco-why-why-chat-ai

# 3. スクリプトを実行
./scripts/init-cloud-sql-schema.sh PROJECT_ID INSTANCE_NAME DATABASE_NAME APP_SERVICE_ACCOUNT SCHEMA_NAME

# 例（開発環境）:
./scripts/init-cloud-sql-schema.sh jtc-why-why-chat-ai-dev why-why-chat-ai-db-dev why_why_chat_ai_dev app-sa-dev@jtc-why-why-chat-ai-dev.iam whywhy
```

#### 方法2: アプリケーション起動時の自動初期化
アプリケーションは起動時にスキーマの作成を試行します。ただし、初回は権限設定が必要なため、方法1を実行してください。

**エラー**: `permission denied for schema public`

**原因**: IAMサービスアカウントにスキーマ作成権限がありません。

**解決方法**：
1. 上記の方法1を実行してスキーマと権限を設定
2. Cloud Runを再デプロイ: `make deploy_cloud_run_dev`
3. ヘルスチェックでデータベース接続を確認

## 8. リファレンス

### 8.1 アーキテクチャ詳細

#### Data Sourceの実装

```hcl
data "google_cloud_run_service" "app" {
  name     = "why-why-chat-ai-${terraform.workspace}"
  location = var.region
  project  = var.project_id
}

resource "google_compute_region_network_endpoint_group" "cloud_run_neg" {
  cloud_run {
    service = data.google_cloud_run_service.app.name
  }
}
```

### 8.2 ディレクトリ構造

```
terraform/
├── main.tf                 # メインのTerraform設定
├── variables.tf            # 変数定義
├── outputs.tf              # 出力定義
├── backend.tf              # Remote state設定
├── modules/                # Terraformモジュール
│   └── cloud-sql/          # Cloud SQLモジュール
├── dev.tfvars.example      # 開発環境設定サンプル
├── prod.tfvars.example     # 本番環境設定サンプル
├── dev.tfvars              # 開発環境設定（Git管理外）
└── prod.tfvars             # 本番環境設定（Git管理外）
```

### 8.3 主要変数一覧

| 変数名 | 説明 | デフォルト |
|--------|------|------------|
| `project_id` | GCPプロジェクトID | 必須 |
| `region` | デプロイリージョン | `asia-northeast1` |
| `deploy_load_balancer_and_armor` | Load Balancer有効化 | `false` |
| `allow_ips_for_cloud_armor` | 許可IPリスト | `[]` |
| `domain_name` | ドメイン名 | `""` |
| `use_advanced_security` | 高度なセキュリティ機能の有効化 | `false` |

### 8.4 Remote State設定

Terraform stateはGCSバケットで管理されています。設定内容：

- **バケット名**: `{PROJECT_ID}-terraform-state`
- **Stateファイル**: `terraform/state/{workspace}.tfstate`
- **ロック機能**: 有効（同時実行防止）
- **バージョニング**: 有効（state履歴の管理）

初回セットアップ手順は「3.1.1 Remote State Backend の設定」を参照してください。

## 9. セキュリティ機能

### 9.1 サービスアカウント管理

本プロジェクトでは、最小権限の原則に基づいてサービスアカウントを管理しています：

#### アプリケーションサービスアカウント（Terraformで管理）
- **名前**: `app-sa-{env}@{project-id}.iam.gserviceaccount.com`
- **作成**: Terraformにより自動作成
- **権限**:
  - `roles/cloudsql.client` - Cloud SQLデータベースへの接続
  - `roles/aiplatform.user` - Vertex AIの利用
  - `roles/monitoring.metricWriter` - メトリクスの送信
  - `roles/logging.logWriter` - ログの送信
  - `roles/cloudtrace.agent` - トレースデータの送信

#### CI/CDサービスアカウント（手動管理）
- **名前**: `cicd-sa-{env}@{project-id}.iam.gserviceaccount.com`
- **用途**: GitHub ActionsからのWorkload Identity Federation
- **権限**: インフラストラクチャのデプロイとアプリケーションのデプロイに必要な権限

#### セキュリティのベストプラクティス
1. **デフォルトサービスアカウントの使用を最小化**
   - Bootstrapプレースホルダーのみで使用
   - 実際のアプリケーションは専用SAを使用

2. **環境ごとの分離**
   - 開発環境と本番環境で別々のサービスアカウント
   - 権限の相互アクセスを防止

3. **定期的な権限レビュー**
   - 不要な権限の削除
   - 最小権限の原則の維持

### 9.2 高度なセキュリティ機能

`use_advanced_security = true` を設定すると、以下の高度なセキュリティ機能が有効になります：

#### Cloud Armor
- **OWASP Top 10 保護**: SQL Injection, XSS, LFI, RFI, RCE などの攻撃を自動的にブロック
- **レート制限**: デフォルトで 100リクエスト/分 を超えるアクセスを制限
- **IP許可リスト**: 指定されたIPアドレスのみアクセスを許可
- **詳細ログ**: すべてのリクエストをロギング

#### SSL/TLS
- **TLS 1.2 以上**: 古いプロトコルを無効化
- **強力な暗号スイート**: ECDHE_RSA_AES_GCM のみ許可
- **HTTPS リダイレクト**: HTTPアクセスを自動的にHTTPSへリダイレクト

### 9.2 環境別推奨設定

#### 開発環境
```hcl
# dev.tfvars
use_advanced_security = false  # シンプルな設定
deploy_load_balancer_and_armor = false  # コスト削減
```

#### 本番環境
```hcl
# prod.tfvars
use_advanced_security = true  # 高度なセキュリティ有効
deploy_load_balancer_and_armor = true
allow_ips_for_cloud_armor = ["許可するIPアドレス"]
domain_name = "your-domain.com"
```

### 9.3 セキュリティ監視

セキュリティイベントの監視方法：

```bash
# Cloud Armorのブロックログを確認
gcloud logging read "resource.type=gce_security_policy \
  AND jsonPayload.enforcedSecurityPolicy.name=~'why-why-chat-ai.*' \
  AND jsonPayload.enforcedSecurityPolicy.outcome='DENY'" \
  --limit=50 --format=json

# レート制限によるブロックを確認
gcloud logging read "resource.type=gce_security_policy \
  AND jsonPayload.enforcedSecurityPolicy.name=~'why-why-chat-ai.*' \
  AND jsonPayload.enforcedSecurityPolicy.priority='2000'" \
  --limit=50 --format=json
```

## 注意事項

- `.tfvars`ファイルはGitにコミットしない（`.gitignore`で除外）
- 本番環境への変更は開発環境でテスト後に実施
- `terraform destroy`は慎重に実行（データ損失の可能性）
- 高度なセキュリティ機能は追加のコストが発生する可能性があります
