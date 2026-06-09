-- Bootstrap script for the shared postgres container in the top-level
-- docker-compose. Postgres' init image runs the POSTGRES_DB+POSTGRES_USER
-- combination for us; this script creates the second DB the agent needs
-- plus the schema the checkpointer expects.

-- Agent DB (used by langgraph-checkpoint-postgres)
CREATE DATABASE why_why_chat_ai WITH OWNER app_user;

-- The agent stores checkpoints under a dedicated schema (CHECKPOINT_SCHEMA=whywhy).
-- The agent creates tables itself on first run, but the schema must exist.
\connect why_why_chat_ai
CREATE SCHEMA IF NOT EXISTS whywhy AUTHORIZATION app_user;
