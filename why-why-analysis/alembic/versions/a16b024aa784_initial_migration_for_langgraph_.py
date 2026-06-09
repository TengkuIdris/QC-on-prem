"""Initial migration for LangGraph PostgresSaver

Revision ID: a16b024aa784
Revises:
Create Date: 2025-06-09 10:44:48.590661

"""
from typing import Sequence, Union

from alembic import op
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision: str = 'a16b024aa784'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # LangGraphのPostgreSaverに必要なテーブルを作成
    # 実際のテーブル作成はPostgreSaver.create_tables()で行うため、
    # ここでは接続確認用の一時テーブルを作成して削除する

    # チェックポイント関連テーブルは実行時にPostgreSaver.create_tables()で自動作成される
    # このマイグレーションは主にスキーマバージョン管理のためのプレースホルダー

    # 基本的な接続確認
    connection = op.get_bind()
    connection.execute(text("SELECT 1"))


def downgrade() -> None:
    """Downgrade schema."""
    # LangGraphのテーブルは自動管理されるため、
    # ダウングレード時の明示的な削除は行わない
    pass
