#!/usr/bin/env python3
"""
直接LangGraphテーブルを作成する最小限のスクリプト
"""
import os
import sys


# langgraph.checkpoint.postres.base.MIGRATIONS を参考にして作成
MIGRATIONS = [
    """CREATE TABLE IF NOT EXISTS whywhy.checkpoint_migrations (
    v INTEGER PRIMARY KEY
);""",
    """CREATE TABLE IF NOT EXISTS whywhy.checkpoints (
    thread_id TEXT NOT NULL,
    checkpoint_ns TEXT NOT NULL DEFAULT '',
    checkpoint_id TEXT NOT NULL,
    parent_checkpoint_id TEXT,
    type TEXT,
    checkpoint JSONB NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id)
);""",
    """CREATE TABLE IF NOT EXISTS whywhy.checkpoint_blobs (
    thread_id TEXT NOT NULL,
    checkpoint_ns TEXT NOT NULL DEFAULT '',
    channel TEXT NOT NULL,
    version TEXT NOT NULL,
    type TEXT NOT NULL,
    blob BYTEA,
    PRIMARY KEY (thread_id, checkpoint_ns, channel, version)
);""",
    """CREATE TABLE IF NOT EXISTS whywhy.checkpoint_writes (
    thread_id TEXT NOT NULL,
    checkpoint_ns TEXT NOT NULL DEFAULT '',
    checkpoint_id TEXT NOT NULL,
    task_id TEXT NOT NULL,
    idx INTEGER NOT NULL,
    channel TEXT NOT NULL,
    type TEXT,
    blob BYTEA NOT NULL,
    PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id, task_id, idx)
);""",
    "ALTER TABLE whywhy.checkpoint_blobs ALTER COLUMN blob DROP not null;",
    # NOTE: this is a no-op migration to ensure that the versions in the migrations table are correct.
    # This is necessary due to an empty migration previously added to the list.
    "SELECT 1;",
    """
    CREATE INDEX CONCURRENTLY IF NOT EXISTS checkpoints_thread_id_idx ON whywhy.checkpoints(thread_id);
    """,
    """
    CREATE INDEX CONCURRENTLY IF NOT EXISTS checkpoint_blobs_thread_id_idx ON whywhy.checkpoint_blobs(thread_id);
    """,
    """
    CREATE INDEX CONCURRENTLY IF NOT EXISTS checkpoint_writes_thread_id_idx ON whywhy.checkpoint_writes(thread_id);
    """,
    """ALTER TABLE whywhy.checkpoint_writes ADD COLUMN task_path TEXT NOT NULL DEFAULT '';""",
]


def init_langgraph_tables():
    print("🔧 Direct LangGraph table initialization...")

    try:
        # 必要なインポート

        # 環境変数から情報を取得
        project_id = os.environ.get("GCP_PROJECT_ID", "jtc-why-why-chat-ai-dev")
        env = os.environ.get("WORKSPACE", "dev")
        region = os.environ.get("CLOUD_SQL_REGION", "asia-northeast1")
        instance = f"why-why-chat-ai-db-{env}"
        database = f"why_why_chat_ai_{env}"
        password = os.environ.get("POSTGRES_PASSWORD", "")

        if not password:
            print("❌ No password found in POSTGRES_PASSWORD environment variable")
            return False

        print("📊 Creating connection to PostgreSQL...")
        print(f"   Project: {project_id}")
        print(f"   Region: {region}")
        print(f"   Instance: {instance}")
        print(f"   Database: {database}")

        # PostgreSQL接続文字列を作成（search_pathを含める）
        socket_path = f"/cloudsql/{project_id}:{region}:{instance}"
        conn_str = f"host={socket_path} dbname={database} user=postgres password={password} options='-c search_path=whywhy,public'"

        print("\n🔨 Creating connection pool...")
        # psycopgを使用して接続プールを作成
        from psycopg_pool import ConnectionPool
        pool = ConnectionPool(
            conn_str,
            min_size=1,
            max_size=5,
            open=True
        )

        print("✅ Connection pool created")

        # スキーマを作成
        print("\n🔨 Creating schema 'whywhy' if not exists...")
        with pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute("CREATE SCHEMA IF NOT EXISTS whywhy")
                conn.commit()
        print("✅ Schema created/verified")

        # 手動でLangGraphのテーブルを作成（CREATE INDEX CONCURRENTLYエラーを回避）
        print("\n🔨 Creating LangGraph tables manually...")
        with pool.connection() as conn:
            conn.autocommit = True  # 自動コミットモードを有効化
            with conn.cursor() as cur:
                for migration in MIGRATIONS:
                    cur.execute(migration)

        print("✅ LangGraph tables created successfully")

        # IAMユーザーに権限を付与
        print("\n🔐 Granting permissions to IAM users...")
        with pool.connection() as conn:
            conn.autocommit = True
            with conn.cursor() as cur:
                # 環境に応じたIAMユーザー名を取得
                env = os.environ.get("WORKSPACE", "dev")
                project_id = os.environ.get("GCP_PROJECT_ID", "jtc-why-why-chat-ai-dev")
                iam_user = f"app-sa-{env}@{project_id}.iam"

                # whywhyスキーマ内のすべてのテーブルに権限を付与
                cur.execute(f"""
                    GRANT ALL ON ALL TABLES IN SCHEMA whywhy TO "{iam_user}";
                    GRANT ALL ON ALL SEQUENCES IN SCHEMA whywhy TO "{iam_user}";
                    GRANT USAGE ON SCHEMA whywhy TO "{iam_user}";
                """)
                print(f"✅ Permissions granted to {iam_user}")

        # 作成されたテーブルを確認
        print("\n🔍 Verifying tables...")
        with pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT table_name
                    FROM information_schema.tables
                    WHERE table_schema = 'whywhy'
                    ORDER BY table_name
                """)
                tables = cur.fetchall()

                print(f"\n📋 Tables created: {len(tables)}")
                for table in tables:
                    print(f"   ✅ {table[0]}")

        pool.close()

        if len(tables) > 0:
            print("\n✅ LangGraph tables successfully created!")
            return True
        else:
            print("\n❌ No tables were created")
            return False

    except Exception as e:
        print(f"\n❌ Error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    # PYTHONPATH設定（念のため）
    sys.path.insert(0, '/app')

    result = init_langgraph_tables()
    sys.exit(0 if result else 1)
