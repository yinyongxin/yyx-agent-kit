import { Injectable, NotFoundException } from "@nestjs/common";
import { SessionService } from "@nestjs/authentication";
import type { SessionRecord } from "@nestjs/authentication";
import type { SessionResponseDto } from "./dto/session-response.dto";

const deviceLabel = (userAgent: string): string | null => {
  if (!userAgent) return null;

  const browser = /Edg\//.test(userAgent)
    ? "Edge"
    : /Chrome\//.test(userAgent)
      ? "Chrome"
      : /Firefox\//.test(userAgent)
        ? "Firefox"
        : /Safari\//.test(userAgent)
          ? "Safari"
          : null;
  const os = /Windows/.test(userAgent)
    ? "Windows"
    : /Mac OS X|Macintosh/.test(userAgent)
      ? "macOS"
      : /Android/.test(userAgent)
        ? "Android"
        : /iPhone|iPad/.test(userAgent)
          ? "iOS"
          : /Linux/.test(userAgent)
            ? "Linux"
            : null;

  if (browser && os) return `${browser} / ${os}`;
  return browser ?? os;
};

@Injectable()
export class MeSessionsService {
  constructor(private readonly sessions: SessionService) {}

  async list(
    userId: string,
    currentSessionId: string | undefined,
  ): Promise<SessionResponseDto[]> {
    const rows = await this.sessions.list(userId);
    return rows
      .map((row) => this.toDto(row, currentSessionId))
      .sort((a, b) => {
        if (a.current !== b.current) return a.current ? -1 : 1;
        return b.lastActiveAt.localeCompare(a.lastActiveAt);
      });
  }

  async revoke(userId: string, sessionId: string): Promise<void> {
    const revoked = await this.sessions.revoke(sessionId, { userId });
    if (!revoked) throw new NotFoundException("会话不存在");
  }

  async revokeOthers(
    userId: string,
    currentSessionId: string | undefined,
  ): Promise<void> {
    await this.sessions.revokeAll(userId, { except: currentSessionId });
  }

  private toDto(
    row: SessionRecord,
    currentSessionId: string | undefined,
  ): SessionResponseDto {
    const metadata = row.metadata ?? {};
    const userAgent =
      typeof metadata.userAgent === "string" ? metadata.userAgent : null;
    const ip = typeof metadata.ip === "string" ? metadata.ip : null;

    return {
      id: row.id,
      current: row.id === currentSessionId,
      device: userAgent ? deviceLabel(userAgent) : null,
      ip,
      userAgent,
      createdAt: row.createdAt.toISOString(),
      lastActiveAt: row.lastActiveAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
    };
  }
}
