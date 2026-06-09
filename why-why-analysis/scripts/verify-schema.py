#!/usr/bin/env python3
"""
Cloud SQLのスキーマとテーブルを検証するスクリプト
"""
import os
import sys
import asyncio
import asyncpg

async def verify_schema():
    # 環境変数から情報を取得
    project_id = os.environ.get("GCP_PROJECT_ID", "jtc-why-why-chat-ai-dev")
    env = os.environ.get("WORKSPACE", "dev")
    region = os.environ.get("CLOUD_SQL_REGION", "asia-northeast1")
    
    # パスワードは環境変数から取得（Cloud Runでは自動的にマウント）
    password = os.environ.get("POSTGRES_PASSWORD", "")
    
    if not password:
        print("❌ No password found in POSTGRES_PASSWORD environment variable")
        return False
    
    # データベース接続情報
    instance_connection_name = f"{project_id}:{region}:why-why-chat-ai-db-{env}"
    socket_path = f"/cloudsql/{instance_connection_name}"
    database = f"why_why_chat_ai_{env}"
    
    print("🔍 Verifying Cloud SQL schema and tables...")
    print(f"   Instance: {instance_connection_name}")
    print(f"   Database: {database}")
    
    try:
        # Unix socketを使用して接続
        conn = await asyncpg.connect(
            host=socket_path,
            database=database,
            user="postgres",
            password=password
        )
        
        print("✅ Connected to database successfully")
        
        # すべてのスキーマを確認
        print("\n📋 Available schemas:")
        schemas = await conn.fetch("""
            SELECT schema_name 
            FROM information_schema.schemata 
            WHERE schema_name NOT IN ('pg_catalog', 'information_schema')
            ORDER BY schema_name
        """)
        
        for schema in schemas:
            print(f"   - {schema['schema_name']}")
        
        # whywhyスキーマの存在確認
        whywhy_exists = await conn.fetchval("""
            SELECT EXISTS(
                SELECT 1 FROM information_schema.schemata 
                WHERE schema_name = 'whywhy'
            )
        """)
        
        if whywhy_exists:
            print("\n✅ Schema 'whywhy' exists")
            
            # whywhyスキーマ内のテーブルを確認
            tables = await conn.fetch("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'whywhy'
                ORDER BY table_name
            """)
            
            print(f"\n📋 Tables in 'whywhy' schema: {len(tables)} found")
            for table in tables:
                print(f"   - {table['table_name']}")
                
                # 各テーブルの行数を確認
                count = await conn.fetchval(f"SELECT COUNT(*) FROM whywhy.{table['table_name']}")
                print(f"     Rows: {count}")
        else:
            print("\n❌ Schema 'whywhy' does NOT exist")
        
        # publicスキーマ内のテーブルも確認
        public_tables = await conn.fetch("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)
        
        print(f"\n📋 Tables in 'public' schema: {len(public_tables)} found")
        for table in public_tables:
            print(f"   - {table['table_name']}")
        
        # 権限の確認
        print(f"\n🔐 Checking permissions for app-sa-{env}@{project_id}.iam:")
        permissions = await conn.fetch("""
            SELECT 
                nspname as schema_name,
                has_schema_privilege($1, nspname, 'CREATE') as has_create,
                has_schema_privilege($1, nspname, 'USAGE') as has_usage
            FROM pg_namespace
            WHERE nspname IN ('public', 'whywhy')
        """, f"app-sa-{env}@{project_id}.iam")
        
        for perm in permissions:
            print(f"   - {perm['schema_name']}: CREATE={perm['has_create']}, USAGE={perm['has_usage']}")
        
        await conn.close()
        return whywhy_exists
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    result = asyncio.run(verify_schema())
    sys.exit(0 if result else 1)