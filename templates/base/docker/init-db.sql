-- 容器首次初始化时执行（仅空数据卷生效）
-- 向量扩展（业务库 app 用）：向量检索单库搞定，不另起向量库
CREATE EXTENSION IF NOT EXISTS vector;

-- 认证状态（sessions / refreshTokens / mfa / magicLinks / oidcStates / emailTokens）
-- 由 NestJS 官方 @nestjs/authentication 的 store 在本库建表（通过 Prisma migrations），
-- 不再需要外部 IdP 的独立数据库。
