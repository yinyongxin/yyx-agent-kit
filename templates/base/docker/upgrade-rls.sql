-- 已有数据库（数据卷非空）升级到 RLS 兜底所需的账号与授权。
-- init-db.sql 只在空数据卷首次初始化时执行；已运行过的库需要手工跑一次本脚本。
--
-- 用 bootstrap superuser 执行（把 app 换成你的 POSTGRES_USER）：
--   docker cp docker/upgrade-rls.sql starter-postgres:/tmp/upgrade-rls.sql
--   docker exec -e PGPASSWORD=<bootstrap 密码> starter-postgres psql -U app -d app -f /tmp/upgrade-rls.sql
--
-- 注意顺序：ALTER TABLE ... OWNER TO 会重建表 ACL，必须先改 owner 再 GRANT。

-- 1. 运行时账号：非 superuser / 无 BYPASSRLS / 无法建库建角色
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_rw') THEN
    CREATE ROLE app_rw LOGIN PASSWORD 'app_rw_pwd_2026';
  END IF;
END $$;
ALTER ROLE app_rw NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
DO $$
BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO app_rw', current_database());
END $$;
GRANT USAGE ON SCHEMA public TO app_rw;

-- 2. 表 owner 交回 bootstrap superuser，app_rw 保持非 owner（RLS FORCE 对其生效）
--    迁移由 bootstrap 执行；这样 app_rw 即使被注入也无法 DISABLE RLS。
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I OWNER TO %I', t.tablename, current_user);
  END LOOP;
END $$;

-- 3. 收回历史多余授权（含 TRUNCATE 等），再按最小权限重新授予 DML
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM app_rw;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM app_rw;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_rw;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_rw;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_rw;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_rw;

-- 4. 收回 app_rw 的建表权限（只保留 DML）
REVOKE CREATE ON SCHEMA public FROM app_rw;
