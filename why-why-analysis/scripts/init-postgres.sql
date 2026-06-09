-- PostgreSQL初期化スクリプト
-- ローカル開発環境用のデータベース初期設定

-- 必要な拡張機能を有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- デバッグ用テーブル（オプション）
CREATE TABLE IF NOT EXISTS debug_log (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    level VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB
);

-- デバッグ情報を挿入
INSERT INTO debug_log (level, message, metadata) VALUES
    ('INFO', 'Database initialized for local development', '{"version": "1.0", "environment": "development"}');

-- データベース情報を表示
SELECT version();
SELECT current_database();
SELECT current_user;
