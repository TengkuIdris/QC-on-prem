#!/usr/bin/env python3
"""
Cloud SQL アクセス権限付与スクリプト

このスクリプトは、指定されたメールアドレスのユーザーに
Cloud SQL データベースへのアクセス権限を付与します。

使用方法:
    USER_EMAIL=user@example.com python grant-cloud-sql-access.py
"""
import os
import sys


def grant_access():
    email = os.environ.get("USER_EMAIL", "")
    if not email:
        print("❌ No email address provided")
        print("Usage: USER_EMAIL=user@example.com python grant-cloud-sql-access.py")
        sys.exit(1)
    
    # 環境変数から情報を取得
    project_id = os.environ.get("GCP_PROJECT_ID", "")
    instance = os.environ.get("CLOUD_SQL_INSTANCE", "")
    database = os.environ.get("CLOUD_SQL_DATABASE", "")
    region = os.environ.get("CLOUD_SQL_REGION", "asia-northeast1")
    password = os.environ.get("POSTGRES_PASSWORD", "")
    
    if not all([project_id, instance, database, password]):
        print("❌ Missing required environment variables")
        print("Required: GCP_PROJECT_ID, CLOUD_SQL_INSTANCE, CLOUD_SQL_DATABASE, POSTGRES_PASSWORD")
        sys.exit(1)
    
    print(f"""
🔐 Granting Cloud SQL Access
============================
Email: {email}
Project: {project_id}
Instance: {instance}
Database: {database}
""")
    
    try:
        from psycopg_pool import ConnectionPool
        
        # PostgreSQL接続文字列を作成
        socket_path = f"/cloudsql/{project_id}:{region}:{instance}"
        conn_str = f"host={socket_path} dbname={database} user=postgres password={password}"
        
        print("📊 Creating connection to PostgreSQL...")
        pool = ConnectionPool(
            conn_str,
            min_size=1,
            max_size=5,
            open=True
        )
        
        with pool.connection() as conn:
            conn.autocommit = True
            with conn.cursor() as cur:
                # whywhyスキーマへの権限付与
                print(f"\n🔨 Granting permissions to {email}...")
                
                # ユーザーが既に存在するか確認
                cur.execute("""
                    SELECT 1 FROM pg_roles WHERE rolname = %s
                """, (email,))
                
                if not cur.fetchone():
                    # IAMユーザーを作成（Cloud SQL Studioアクセス用）
                    cur.execute(f'CREATE USER "{email}" WITH LOGIN')
                    print(f"✅ Created user: {email}")
                else:
                    print(f"ℹ️  User already exists: {email}")
                
                # whywhyスキーマへの権限
                cur.execute(f"""
                    -- スキーマへのアクセス権限
                    GRANT ALL ON SCHEMA whywhy TO "{email}";
                    GRANT ALL ON ALL TABLES IN SCHEMA whywhy TO "{email}";
                    GRANT ALL ON ALL SEQUENCES IN SCHEMA whywhy TO "{email}";
                    GRANT ALL ON ALL FUNCTIONS IN SCHEMA whywhy TO "{email}";
                    
                    -- デフォルト権限設定（将来作成されるオブジェクト用）
                    ALTER DEFAULT PRIVILEGES IN SCHEMA whywhy 
                    GRANT ALL ON TABLES TO "{email}";
                    
                    ALTER DEFAULT PRIVILEGES IN SCHEMA whywhy 
                    GRANT ALL ON SEQUENCES TO "{email}";
                    
                    ALTER DEFAULT PRIVILEGES IN SCHEMA whywhy 
                    GRANT USAGE ON TYPES TO "{email}";
                    
                    ALTER DEFAULT PRIVILEGES IN SCHEMA whywhy 
                    GRANT EXECUTE ON FUNCTIONS TO "{email}";
                """)
                print("✅ Granted permissions on whywhy schema")
                
                # publicスキーマへの権限
                cur.execute(f"""
                    -- publicスキーマへのアクセス権限
                    GRANT USAGE ON SCHEMA public TO "{email}";
                    GRANT ALL ON ALL TABLES IN SCHEMA public TO "{email}";
                    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO "{email}";
                    
                    -- デフォルト権限設定
                    ALTER DEFAULT PRIVILEGES IN SCHEMA public 
                    GRANT ALL ON TABLES TO "{email}";
                    
                    ALTER DEFAULT PRIVILEGES IN SCHEMA public 
                    GRANT ALL ON SEQUENCES TO "{email}";
                """)
                print("✅ Granted permissions on public schema")
                
                # 権限の確認
                print("\n🔍 Verifying permissions...")
                cur.execute("""
                    SELECT nspname, 
                           has_schema_privilege(%s, nspname, 'CREATE') as can_create,
                           has_schema_privilege(%s, nspname, 'USAGE') as can_use
                    FROM pg_namespace
                    WHERE nspname IN ('public', 'whywhy')
                    ORDER BY nspname
                """, (email, email))
                
                results = cur.fetchall()
                for schema, can_create, can_use in results:
                    print(f"  - {schema}: CREATE={can_create}, USAGE={can_use}")
                
                # 付与されたテーブルのリストを表示
                print("\n📋 Accessible tables in whywhy schema:")
                cur.execute("""
                    SELECT table_name
                    FROM information_schema.tables
                    WHERE table_schema = 'whywhy'
                    ORDER BY table_name
                """)
                
                tables = cur.fetchall()
                if tables:
                    for table in tables:
                        print(f"  - {table[0]}")
                else:
                    print("  (No tables found in whywhy schema)")
        
        pool.close()
        
        print(f"""
✅ Access granted successfully!
===============================
User {email} can now:
- Access Cloud SQL Studio
- View and modify tables in 'whywhy' schema
- Execute queries on the database

To access Cloud SQL Studio:
1. Go to Cloud Console > SQL
2. Select instance: {instance}
3. Click "Cloud SQL Studio"
4. Login with Google account: {email}
""")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    result = grant_access()
    sys.exit(0 if result else 1)