-- 容器首次初始化时执行（仅空数据卷生效）
-- 向量扩展（业务库 app 用）：向量检索单库搞定，不另起向量库
CREATE EXTENSION IF NOT EXISTS vector;

-- 认证状态（sessions / refreshTokens / mfa / magicLinks / oidcStates / emailTokens）
-- 由 NestJS 官方 @nestjs/authentication 的 store 在本库建表（通过 Prisma migrations），
-- 不再需要外部 IdP 的独立数据库。

-- 账号分工（RLS 兜底要求）：
--   POSTGRES_USER（bootstrap superuser）负责建库/迁移；
--   应用运行时用 app_rw：非 superuser、无 BYPASSRLS、**只授予 DML**（无 CREATE/DDL），
--   否则应用账号可自行 DISABLE ROW LEVEL SECURITY，兜底失效。
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_rw') THEN
    CREATE ROLE app_rw LOGIN PASSWORD 'app_rw_pwd_2026';
  END IF;
END $$;
DO $$
BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO app_rw', current_database());
END $$;
GRANT USAGE ON SCHEMA public TO app_rw;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_rw;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_rw;

-- 迁移由 POSTGRES_USER 执行；它新建的表自动授权给 app_rw（DEFAULT PRIVILEGES 按创建者生效）
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_rw;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_rw;
