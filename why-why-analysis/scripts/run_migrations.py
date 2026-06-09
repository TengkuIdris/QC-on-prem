#!/usr/bin/env python3
"""
Alembicマイグレーション実行スクリプト

Cloud Run起動時に自動的にマイグレーションを実行するためのスクリプト。
環境変数DATABASE_URLが設定されている場合のみ実行される。
"""
import os
import sys
import logging
import subprocess
from pathlib import Path

# ロギングの設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def run_migrations():
    """
    Alembicマイグレーションを実行
    """
    # 環境変数でマイグレーション実行を制御
    run_migrations_flag = os.environ.get('RUN_MIGRATIONS', 'true').lower()
    if run_migrations_flag == 'false':
        logger.info("RUN_MIGRATIONS is set to false. Skipping migrations.")
        return True

    # データベースURLの確認
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        logger.warning("DATABASE_URL is not set. Skipping migrations.")
        return True

    logger.info("DATABASE_URL is set. Running migrations...")

    try:
        # プロジェクトルートディレクトリを取得
        project_root = Path(__file__).parent.parent

        # Alembicマイグレーションを実行
        result = subprocess.run(
            [sys.executable, "-m", "alembic", "upgrade", "head"],
            cwd=project_root,
            capture_output=True,
            text=True,
            check=True
        )

        logger.info("Database migrations completed successfully")
        if result.stdout:
            logger.info(f"Migration output:\n{result.stdout}")

        return True

    except subprocess.CalledProcessError as e:
        logger.error(f"Database migration failed: {e}")
        if e.stderr:
            logger.error(f"Migration error output:\n{e.stderr}")
        # マイグレーションエラーは致命的ではないため、続行する
        return False
    except Exception as e:
        logger.error(f"Unexpected error during database migration: {e}")
        # 予期しないエラーも致命的ではないため、続行する
        return False


def main():
    """
    メイン関数
    """
    success = run_migrations()
    if success:
        logger.info("Migration script completed successfully")
        sys.exit(0)
    else:
        logger.warning("Migration script completed with errors")
        # マイグレーションが失敗してもアプリケーションは起動させる
        sys.exit(0)


if __name__ == "__main__":
    main()
