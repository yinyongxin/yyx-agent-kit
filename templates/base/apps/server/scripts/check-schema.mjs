#!/usr/bin/env node
/**
 * 校验 Prisma 模型的通用字段约定（见 docs/guides/database-conventions.md）。
 *
 * 规则：
 * 1. 业务模型必须有 UUID 主键 id + createdAt + updatedAt
 * 2. 关联表（联合主键）不要求 id/时间戳，但必须有 @@id(...)
 * 3. 所有 DateTime 必须是 @db.Timestamptz(3)
 * 4. createdAt 必须有 @default(now())，updatedAt 必须有 @updatedAt
 * 5. 禁止 createAt / updateAt / deleteAt 这类错误命名
 *
 * 用法：pnpm --filter @starter/server schema:check
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const prismaDir = join(here, "..", "prisma");

/** 联合主键的关联表：不要求 id / createdAt / updatedAt */
const JOIN_MODELS = new Set(["UserTenant", "UserRole", "RolePermission"]);

/** 使用自然主键、没有 id 列的模型 */
const NATURAL_ID_MODELS = new Set(["PlatformAdmin"]);

const files = [
  join(prismaDir, "schema.prisma"),
  ...readdirSync(join(prismaDir, "models"))
    .filter((name) => name.endsWith(".prisma"))
    .map((name) => join(prismaDir, "models", name)),
];

const errors = [];
const models = [];

for (const file of files) {
  const source = readFileSync(file, "utf8");
  const re = /^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm;
  let match;
  while ((match = re.exec(source)) !== null) {
    const name = match[1];
    const body = match[2];
    const fields = new Map();
    const lines = body.split(/\r?\n/);

    for (const raw of lines) {
      const line = raw.trim();
      if (!line || line.startsWith("//") || line.startsWith("///") || line.startsWith("@@")) continue;
      const parts = line.split(/\s+/);
      if (parts.length < 2) continue;
      fields.set(parts[0], line);
    }

    models.push({ name, file, body, fields });
  }
}

for (const model of models) {
  const { name, fields, body } = model;
  const isJoin = JOIN_MODELS.has(name);
  const hasNaturalId = NATURAL_ID_MODELS.has(name);

  for (const [field, line] of fields) {
    if (/^(createAt|updateAt|deleteAt)$/.test(field)) {
      errors.push(`${name}.${field}: 命名错误，应为 createdAt / updatedAt / deletedAt`);
    }
    if (field === "deletedAt") {
      if (!/DateTime\?/.test(line)) errors.push(`${name}.deletedAt: 必须是 DateTime?`);
      if (!line.includes("@db.Timestamptz(3)")) errors.push(`${name}.deletedAt: 缺少 @db.Timestamptz(3)`);
    }
    if (line.includes("DateTime") && !line.includes("@db.Timestamptz(3)")) {
      errors.push(`${name}.${field}: DateTime 必须声明 @db.Timestamptz(3)`);
    }
  }

  for (const required of ["createdAt", "updatedAt"]) {
    const line = fields.get(required);
    if (!line) {
      if (!isJoin) errors.push(`${name}: 缺少 ${required}`);
      continue;
    }
    if (!line.includes("DateTime")) errors.push(`${name}.${required}: 必须是 DateTime`);
    if (required === "createdAt" && !line.includes("@default(now())")) {
      errors.push(`${name}.createdAt: 缺少 @default(now())`);
    }
    if (required === "updatedAt" && !line.includes("@updatedAt")) {
      errors.push(`${name}.updatedAt: 缺少 @updatedAt`);
    }
  }

  if (isJoin) {
    if (!body.includes("@@id(")) errors.push(`${name}: 关联表必须有 @@id(...) 联合主键`);
    continue;
  }

  if (hasNaturalId) {
    const pk = fields.get("userId");
    if (!pk || !pk.includes("@id")) errors.push(`${name}: 自然主键模型缺少 @id 字段`);
    continue;
  }

  const idLine = fields.get("id");
  if (!idLine) {
    errors.push(`${name}: 缺少 id`);
    continue;
  }
  if (!idLine.includes("@id")) errors.push(`${name}.id: 缺少 @id`);
  if (!idLine.includes("@default(uuid())")) errors.push(`${name}.id: 缺少 @default(uuid())`);
  if (!idLine.includes("@db.Uuid")) errors.push(`${name}.id: 缺少 @db.Uuid`);
}

if (errors.length > 0) {
  console.error("✗ Prisma 模型字段约定校验失败：");
  for (const error of errors) console.error(`  - ${error}`);
  console.error("\n规范见 docs/guides/database-conventions.md");
  process.exit(1);
}

console.log(`✓ Prisma 模型字段约定校验通过（${models.length} 个模型）`);
