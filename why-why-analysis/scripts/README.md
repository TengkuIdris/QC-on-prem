# Setup Scripts

このディレクトリには、Why Why Chat AI プロジェクトのインフラストラクチャとCI/CD環境をセットアップするためのスクリプトが含まれています。

## スクリプト一覧

### 1. setup-terraform-backend.sh

**目的**: Terraform Remote State管理用のGCSバケットを作成・設定します。

**使用方法**:
```bash
./scripts/setup-terraform-backend.sh <PROJECT_ID> [REGION]

# 例
./scripts/setup-terraform-backend.sh jtc-why-why-chat-ai-dev
./scripts/setup-terraform-backend.sh jtc-why-why-chat-ai-dev us-central1
```

**実行内容**:
- GCSバケットの作成（`{PROJECT_ID}-terraform-state`）
- バージョニングの有効化（state履歴管理）
- ライフサイクルポリシーの設定（古いバージョンの自動削除）
- セキュリティ設定（uniform bucket-level access）

### 2. setup-workload-identity-federation.sh

**目的**: GitHub ActionsからGCPへの安全な認証を実現するWorkload Identity Federation (WIF) を設定します。

**使用方法**:
```bash
./scripts/setup-workload-identity-federation.sh <PROJECT_ID> [POOL_NAME] [PROVIDER_NAME]

# 例
./scripts/setup-workload-identity-federation.sh jtc-why-why-chat-ai-dev
```

**実行内容**:
- Workload Identity Poolの作成
- GitHub用のOIDCプロバイダーの作成
- 属性マッピングの設定
- GitHub Secretsに設定すべき値の出力

### 3. setup-cicd-service-account.sh

**目的**: CI/CDパイプライン用のサービスアカウントを作成し、必要な権限を付与します。

**使用方法**:
```bash
./scripts/setup-cicd-service-account.sh <PROJECT_ID> <WIF_POOL_NAME> [GITHUB_REPO]

# 例
./scripts/setup-cicd-service-account.sh jtc-why-why-chat-ai-dev github-pool
```

**実行内容**:
- 開発環境と本番環境用のCI/CDサービスアカウント作成
- Terraform実行とアプリケーションデプロイに必要な権限付与
- Workload Identity Federationアクセスの設定
- アプリケーションサービスアカウントへのimpersonate権限設定

**付与される権限**:
- `roles/cloudsql.admin` - Cloud SQL管理
- `roles/artifactregistry.admin` - Dockerイメージ管理
- `roles/run.developer` - Cloud Runデプロイ
- `roles/compute.networkAdmin` - ネットワーク管理
- `roles/compute.loadBalancerAdmin` - Load Balancer管理
- `roles/iam.serviceAccountUser` - サービスアカウント使用
- `roles/storage.admin` - GCSバケット管理
- `roles/aiplatform.user` - Vertex AI利用
- `roles/compute.securityAdmin` - Cloud Armor管理

### 4. bootstrap-deployment.sh

**目的**: Terraform実行前に必要な最小限のCloud Runサービスを作成します。

**使用方法**:
```bash
./scripts/bootstrap-deployment.sh <PROJECT_ID> [ENVIRONMENT]

# 例
./scripts/bootstrap-deployment.sh jtc-why-why-chat-ai-dev dev
./scripts/bootstrap-deployment.sh jatco-5why prod
```

**実行内容**:
- プレースホルダーイメージを使用したCloud Runサービスの作成
- デフォルトサービスアカウントを使用（後でTerraformが適切なSAに更新）
- Terraform Data Sourceパターンのための初期サービス作成
- 最小リソース（128Mi RAM, 0.08 CPU）での実行
- TerraformのData Sourceが参照可能な状態を作成

## セットアップ手順

新しいGCPプロジェクトでゼロから環境を構築する場合：

### 1. 前提条件の確認

- gcloud CLIがインストールされていること
- プロジェクトオーナー権限を持つアカウントでログインしていること
  ```bash
  gcloud auth login
  gcloud auth application-default login
  ```

### 2. Terraform Backend の設定

```bash
# Terraform stateを保存するGCSバケットを作成
./scripts/setup-terraform-backend.sh YOUR_PROJECT_ID
```

スクリプト実行後に表示される手順に従って、Terraform設定ファイルを更新してください。

### 3. Workload Identity Federationの設定

```bash
# WIFプールとプロバイダーを作成
./scripts/setup-workload-identity-federation.sh YOUR_PROJECT_ID
```

出力された`WIF_PROVIDER`の値をGitHub Secretsに設定してください。

### 4. CI/CDサービスアカウントの作成

```bash
# 前のステップで作成したプール名を使用
./scripts/setup-cicd-service-account.sh YOUR_PROJECT_ID github-pool
```

### 5. GitHub Secretsの設定

以下のシークレットをGitHubリポジトリに設定：

- `WIF_PROVIDER`: WIFプロバイダーのリソース名
- `GCP_PROJECT_ID`: GCPプロジェクトID
- `CICD_SERVICE_ACCOUNT`: CI/CDサービスアカウントのメールアドレス
  - または環境別に：
  - `DEV_CICD_SERVICE_ACCOUNT`: `cicd-sa-dev@PROJECT_ID.iam.gserviceaccount.com`
  - `PROD_CICD_SERVICE_ACCOUNT`: `cicd-sa-prod@PROJECT_ID.iam.gserviceaccount.com`

### 6. Bootstrapの実行

```bash
# 各環境でプレースホルダーサービスを作成
./scripts/bootstrap-deployment.sh YOUR_PROJECT_ID dev
./scripts/bootstrap-deployment.sh YOUR_PROJECT_ID prod
```

### 7. Terraformの実行

GitHub Actionsの「Terraform Apply and Update Secrets」ワークフローを実行します。

### 8. アプリケーションのデプロイ

mainブランチにプッシュするか、CI/CDワークフローを手動実行します。

## トラブルシューティング

### 権限エラーが発生する場合

1. サービスアカウントの権限を確認：
   ```bash
   gcloud projects get-iam-policy PROJECT_ID \
     --flatten="bindings[].members" \
     --filter="bindings.members:serviceAccount:cicd-sa-dev@PROJECT_ID.iam.gserviceaccount.com" \
     --format="table(bindings.role)"
   ```

2. APIが有効になっているか確認：
   ```bash
   gcloud services list --enabled --project=PROJECT_ID
   ```

### WIFが機能しない場合

1. プールとプロバイダーの存在を確認：
   ```bash
   gcloud iam workload-identity-pools list --location=global
   gcloud iam workload-identity-pools providers list \
     --workload-identity-pool=github-pool --location=global
   ```

2. GitHub Secretsが正しく設定されているか確認

### サービスアカウントが見つからない場合

アプリケーションサービスアカウント（`app-sa-{env}`）はTerraformで作成されるため、
初回実行時は存在しません。これは正常な動作です。

## セキュリティに関する注意事項

- CI/CDサービスアカウントには強力な権限が付与されています
- 定期的に権限を見直し、不要な権限は削除してください
- 本番環境では最小権限の原則に従ってください
- サービスアカウントキーの作成は避け、常にWorkload Identity Federationを使用してください
