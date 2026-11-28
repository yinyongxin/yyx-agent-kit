import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import type { FileStorage } from "./file-storage";

/**
 * 本地磁盘驱动：默认写到 `FILES_DIR`（相对进程 cwd）。
 *
 * key 只由服务端生成（tenantId/年/月/uuid），不接受用户文件名；
 * 仍然校验 resolve 后路径必须在 root 内，防止数据库被篡改时路径穿越。
 */
@Injectable()
export class LocalFileStorage implements FileStorage, OnModuleInit {
  private readonly logger = new Logger(LocalFileStorage.name);
  private readonly root: string;

  constructor(config: ConfigService) {
    this.root = resolve(config.getOrThrow<string>("files.dir"));
  }

  async onModuleInit(): Promise<void> {
    await mkdir(this.root, { recursive: true });
    this.logger.log(`文件存储目录：${this.root}`);
  }

  async put(key: string, content: Buffer): Promise<void> {
    const path = this.resolveKey(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content);
  }

  async get(key: string): Promise<Buffer> {
    return readFile(this.resolveKey(key));
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(this.resolveKey(key));
    } catch (error) {
      // 已不存在视为删除成功；其余错误（权限等）交给调用方记录
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  private resolveKey(key: string): string {
    const path = resolve(this.root, key);
    if (path !== this.root && !path.startsWith(`${this.root}${sep}`)) {
      throw new Error(`非法文件 key：${key}`);
    }
    return path;
  }
}
