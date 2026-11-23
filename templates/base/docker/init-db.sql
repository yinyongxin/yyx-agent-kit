-- 容器首次初始化时执行（仅空数据卷生效）
-- 1. 向量扩展（业务库 app 用）
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Authentik 独立 database 与用户（复用同一个 PG 实例，不额外起数据库容器）
--    密码是 dev 默认值，生产环境要和 .env 的 AUTHENTIK_DB_PASSWORD 同步修改。
CREATE USER authentik WITH PASSWORD 'authentik_dev_pwd';
CREATE DATABASE authentik OWNER authentik;
