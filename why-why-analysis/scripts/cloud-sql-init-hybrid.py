#!/usr/bin/env python3
"""
Cloud SQL初期化スクリプト（ハイブリッド認証対応）
PostgreSQL 15+の権限問題にも対応
"""
import asyncio
import os
import sys
import asyncpg
from google.cloud import secretmanager


async def get_postgres_password():
    """Secret Managerからパスワードを取得"""
    # 環境変数から取得を試みる（開発環境用）
    if password := os.getenv("POSTGRES_PASSWORD"):
        print("Using postgres password from environment variable")
        return password
    
    # Secret Managerから取得
    client = secretmanager.SecretManagerServiceClient()
    project_id = os.environ["GCP_PROJECT_ID"]
    env = os.environ.get("WORKSPACE", "dev")
    secret_name = f"postgres-password-{env}"
    name = f"projects/{project_id}/secrets/{secret_name}/versions/latest"
    
    try:
        print(f"Retrieving postgres password from Secret Manager: {secret_name}")
        response = client.access_secret_version(request={"name": name})
        return response.payload.data.decode("UTF-8")
    except Exception as e:
        print(f"❌ Failed to retrieve password from Secret Manager: {e}")
        raise


async def init_database():
    """データベースの初期化"""
    # 必須の環境変数をチェック
    required_vars = ["GCP_PROJECT_ID", "CLOUD_SQL_REGION", "CLOUD_SQL_INSTANCE", "CLOUD_SQL_DATABASE"]
    missing_vars = [var for var in required_vars if not os.environ.get(var)]
    if missing_vars:
        print(f"❌ Missing required environment variables: {', '.join(missing_vars)}")
        sys.exit(1)
    
    # 環境変数から接続情報を取得
    project_id = os.environ["GCP_PROJECT_ID"]
    region = os.environ["CLOUD_SQL_REGION"]
    instance = os.environ["CLOUD_SQL_INSTANCE"]
    database = os.environ["CLOUD_SQL_DATABASE"]
    iam_user = os.environ.get("CLOUD_SQL_IAM_USER", f"app-sa-{os.environ.get('WORKSPACE', 'dev')}@{project_id}.iam")
    
    print(f"""
🔧 Cloud SQL Database Initialization (Hybrid Auth)
================================================
Project: {project_id}
Region: {region}
Instance: {instance}
Database: {database}
IAM User: {iam_user}
""")
    
    # パスワードを取得
    password = await get_postgres_password()
    
    # パスワードの存在確認（セキュリティのため内容は表示しない）
    if password:
        print(f"Password retrieved successfully (length: {len(password)} chars)")
    else:
        print("❌ No password retrieved!")
        sys.exit(1)
    
    # Unix socketで接続
    socket_path = f"/cloudsql/{project_id}:{region}:{instance}"
    
    print(f"Connecting to database via Unix socket: {socket_path}")
    
    try:
        # PostgreSQLに接続
        conn = await asyncpg.connect(
            host=socket_path,
            database=database,
            user="postgres",
            password=password
        )
        
        try:
            print("✅ Connected to database successfully")
            
            # PostgreSQL 15対応: publicスキーマ権限
            print("\n📋 Setting up PostgreSQL 15 permissions...")
            await conn.execute("""
                -- cloudsqlsuperuserに権限付与（PostgreSQL 15対応）
                GRANT ALL ON SCHEMA public TO cloudsqlsuperuser;
                
                -- publicスキーマへのCREATE権限を復活（必要に応じて）
                GRANT CREATE ON SCHEMA public TO PUBLIC;
            """)
            print("✅ PostgreSQL 15 permissions configured")
            
            # whywhyスキーマの作成
            print(f"\n📋 Creating 'whywhy' schema and granting permissions to {iam_user}...")
            
            # スキーマが存在するかチェック
            schema_exists = await conn.fetchval("""
                SELECT EXISTS(
                    SELECT 1 FROM information_schema.schemata 
                    WHERE schema_name = 'whywhy'
                );
            """)
            
            if not schema_exists:
                await conn.execute("CREATE SCHEMA whywhy;")
                print("✅ Schema 'whywhy' created")
            else:
                print("ℹ️  Schema 'whywhy' already exists")
            
            # IAMユーザーに権限付与
            await conn.execute(f"""
                -- スキーマへのアクセス権限
                GRANT ALL ON SCHEMA whywhy TO "{iam_user}";
                
                -- 既存のテーブルへの権限
                GRANT ALL ON ALL TABLES IN SCHEMA whywhy TO "{iam_user}";
                GRANT ALL ON ALL SEQUENCES IN SCHEMA whywhy TO "{iam_user}";
                GRANT ALL ON ALL FUNCTIONS IN SCHEMA whywhy TO "{iam_user}";
                
                -- デフォルト権限設定（将来作成されるオブジェクト用）
                ALTER DEFAULT PRIVILEGES IN SCHEMA whywhy 
                GRANT ALL ON TABLES TO "{iam_user}";
                
                ALTER DEFAULT PRIVILEGES IN SCHEMA whywhy 
                GRANT ALL ON SEQUENCES TO "{iam_user}";
                
                ALTER DEFAULT PRIVILEGES IN SCHEMA whywhy 
                GRANT USAGE ON TYPES TO "{iam_user}";
                
                ALTER DEFAULT PRIVILEGES IN SCHEMA whywhy 
                GRANT EXECUTE ON FUNCTIONS TO "{iam_user}";
            """)
            print(f"✅ Permissions granted to {iam_user}")
            
            # publicスキーマへのアクセス権限も付与（LangGraphのデフォルト動作のため）
            print(f"\n📋 Granting permissions on public schema to {iam_user}...")
            await conn.execute(f"""
                -- publicスキーマへのアクセス権限
                GRANT USAGE ON SCHEMA public TO "{iam_user}";
                
                -- publicスキーマ内のテーブルへの権限
                GRANT ALL ON ALL TABLES IN SCHEMA public TO "{iam_user}";
                GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO "{iam_user}";
                
                -- デフォルト権限設定
                ALTER DEFAULT PRIVILEGES IN SCHEMA public 
                GRANT ALL ON TABLES TO "{iam_user}";
                
                ALTER DEFAULT PRIVILEGES IN SCHEMA public 
                GRANT ALL ON SEQUENCES TO "{iam_user}";
            """)
            print(f"✅ Public schema permissions granted to {iam_user}")
            
            # 権限の確認
            print("\n📋 Verifying permissions...")
            
            # スキーマ権限の確認
            schema_privs = await conn.fetch(f"""
                SELECT nspname, has_schema_privilege('{iam_user}', nspname, 'CREATE') as can_create,
                       has_schema_privilege('{iam_user}', nspname, 'USAGE') as can_use
                FROM pg_namespace
                WHERE nspname IN ('public', 'whywhy');
            """)
            
            print("\nSchema permissions:")
            for row in schema_privs:
                print(f"  - {row['nspname']}: CREATE={row['can_create']}, USAGE={row['can_use']}")
            
            print(f"""
✅ Database initialization completed successfully!
================================================
- Schema 'whywhy' is ready
- Permissions granted to {iam_user}
- PostgreSQL 15 compatibility ensured

Next steps:
1. Set INIT_MODE=false in your environment
2. Start the application with CLOUD_SQL_AUTH_TYPE=hybrid
3. The application will use IAM authentication
""")
            
        finally:
            await conn.close()
            print("\n🔒 Database connection closed")
            
    except Exception as e:
        print(f"\n❌ Database initialization failed: {type(e).__name__}: {e}")
        raise


if __name__ == "__main__":
    print("Starting Cloud SQL initialization script...")
    print(f"INIT_MODE: {os.getenv('INIT_MODE', 'not set')}")
    
    # 初期化モードの確認
    if os.getenv("INIT_MODE", "false").lower() != "true":
        print("""
⚠️  WARNING: INIT_MODE is not set to 'true'
This script should only be run in initialization mode.

Please set the environment variable:
  export INIT_MODE=true

Then run this script again.
""")
        sys.exit(1)
    
    try:
        print("Running database initialization...")
        # 非同期で実行
        asyncio.run(init_database())
        print("Script completed successfully")
        sys.exit(0)
    except Exception as e:
        print(f"Script failed with error: {type(e).__name__}: {e}")
        sys.exit(1)