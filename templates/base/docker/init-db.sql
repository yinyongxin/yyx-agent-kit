-- 容器首次初始化时执行（仅空数据卷生效）
-- 安装 pgvector 扩展，供后续向量检索使用
CREATE EXTENSION IF NOT EXISTS vector;

-- 单租户默认租户（登录系统骨架启用后使用；现阶段可保留）
-- CREATE TABLE IF NOT EXISTS tenants (
--   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--   name text NOT NULL,
--   created_at timestamptz NOT NULL DEFAULT now()
-- );
