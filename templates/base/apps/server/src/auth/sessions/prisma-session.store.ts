import { Injectable } from "@nestjs/common";
import {
  AuthenticationStorage,
  type MfaState,
  type SessionRecord,
  type SessionStore,
} from "@nestjs/authentication";
import type { Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * 官方认证包的 SessionStore 实现（PostgreSQL）。
 *
 * - `id` 是 SessionService 生成的 SHA-256，不是 uuid
 * - `metadata` 存 IP / User-Agent，用于「登录设备」页面
 * - `touchSession` 必须条件更新，避免把已删除的会话写回来
 */
@Injectable()
export class PrismaSessionStore implements SessionStore {
  constructor(
    private readonly prisma: PrismaService,
    storage: AuthenticationStorage,
  ) {
    storage.registerSource({ sessions: this });
  }

  async getSession(id: string): Promise<SessionRecord | undefined> {
    const row = await this.prisma.scoped.userSession.findUnique({
      where: { id },
    });
    return row ? this.toRecord(row) : undefined;
  }

  async createSession(record: SessionRecord): Promise<void> {
    // 顺手清理已过期会话，避免表无限增长
    await this.prisma.scoped.userSession.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    await this.prisma.scoped.userSession.create({
      data: {
        id: record.id,
        userId: record.userId,
        createdAt: record.createdAt,
        expiresAt: record.expiresAt,
        lastActiveAt: record.lastActiveAt,
        mfa: record.mfa as Prisma.InputJsonValue | undefined,
        metadata: record.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async touchSession(id: string, lastActiveAt: Date): Promise<void> {
    await this.prisma.scoped.userSession.updateMany({
      where: { id, lastActiveAt: { lt: lastActiveAt } },
      data: { lastActiveAt },
    });
  }

  async deleteSession(id: string): Promise<boolean> {
    const result = await this.prisma.scoped.userSession.deleteMany({
      where: { id },
    });
    return result.count > 0;
  }

  async listUserSessions(userId: string): Promise<SessionRecord[]> {
    const rows = await this.prisma.scoped.userSession.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => this.toRecord(row));
  }

  async deleteUserSessions(userId: string): Promise<void> {
    await this.prisma.scoped.userSession.deleteMany({ where: { userId } });
  }

  private toRecord(row: {
    id: string;
    userId: string;
    createdAt: Date;
    expiresAt: Date;
    lastActiveAt: Date;
    mfa: Prisma.JsonValue | null;
    metadata: Prisma.JsonValue | null;
  }): SessionRecord {
    return {
      id: row.id,
      userId: row.userId,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
      lastActiveAt: row.lastActiveAt,
      mfa: (row.mfa ?? undefined) as MfaState | undefined,
      metadata: (row.metadata ?? undefined) as Record<string, unknown> | undefined,
    };
  }
}
