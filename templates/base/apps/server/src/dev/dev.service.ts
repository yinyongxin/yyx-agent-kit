import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createConnection } from "node:net";
import { API_PREFIX } from "../shared";
import { PrismaService } from "../prisma/prisma.service";

export type DevServiceStatus = "online" | "offline";
export type DevServiceGroup = "应用" | "工具" | "依赖服务";

export interface DevServiceLink {
  label: string;
  href: string;
}

export interface DevServiceInfo {
  id: string;
  name: string;
  group: DevServiceGroup;
  port: number;
  status: DevServiceStatus;
  /** 主入口（服务没有 Web 入口时为空） */
  url?: string;
  /** 常用子入口：健康检查、Swagger、OpenAPI JSON 等 */
  links: DevServiceLink[];
  /** 本地开发凭据（只由 DevModule 返回，生产不注册） */
  credentials?: { label: string; value: string }[];
  /** 未启动时提示的启动命令 */
  command: string;
  /** 探测方式，展示在卡片上（HTTP / TCP / SELECT 1 / 当前进程） */
  probe: string;
}

const PROBE_TIMEOUT_MS = 1200;

const probeHttp = async (url: string, timeoutMs = PROBE_TIMEOUT_MS): Promise<boolean> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // 只要能建立连接并返回响应就算在线（Vite 根路径 200、Next 404 都算启动成功）
    await fetch(url, { signal: controller.signal, redirect: "manual" });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
};

const probeTcp = (host: string, port: number, timeoutMs = PROBE_TIMEOUT_MS): Promise<boolean> =>
  new Promise((resolve) => {
    const socket = createConnection({ host, port });
    const finish = (ok: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });

/**
 * 本地开发导航页的数据源：并发探测各应用与依赖服务，返回统一结构。
 *
 * 只被 DevModule（非生产环境）使用，不读写数据库业务表；
 * PostgreSQL 探活只跑 `SELECT 1`，不需要租户上下文。
 */
@Injectable()
export class DevService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async getServices(): Promise<DevServiceInfo[]> {
    const port = this.config.getOrThrow<number>("app.port");
    const clientPort = this.config.getOrThrow<number>("dev.clientPort");
    const adminPort = this.config.getOrThrow<number>("dev.adminPort");
    const portalPort = this.config.getOrThrow<number>("dev.portalPort");
    const postgresPort = this.config.getOrThrow<number>("dev.postgresPort");
    const redisPort = this.config.getOrThrow<number>("dev.redisPort");
    const redisHost = this.config.getOrThrow<string>("dev.redisHost");
    const penpotPort = this.config.getOrThrow<number>("dev.penpotPort");
    const penpotMailpitPort = this.config.getOrThrow<number>("dev.penpotMailpitPort");
    const penpotMcpPort = this.config.getOrThrow<number>("dev.penpotMcpPort");
    const penpotPluginPort = this.config.getOrThrow<number>("dev.penpotPluginPort");
    const lokiPort = this.config.getOrThrow<number>("dev.lokiPort");
    const grafanaPort = this.config.getOrThrow<number>("dev.grafanaPort");
    const tempoPort = this.config.getOrThrow<number>("dev.tempoPort");
    const grafanaUser = this.config.getOrThrow<string>("dev.grafanaUser");
    const grafanaPassword = this.config.getOrThrow<string>("dev.grafanaPassword");
    const postgresAppUser = this.config.getOrThrow<string>("dev.postgresAppUser");
    const postgresAppPassword = this.config.getOrThrow<string>("dev.postgresAppPassword");
    const postgresAdminUser = this.config.getOrThrow<string>("dev.postgresAdminUser");
    const postgresAdminPassword = this.config.getOrThrow<string>("dev.postgresAdminPassword");
    const redisPassword = this.config.getOrThrow<string>("dev.redisPassword");
    const penpotUser = this.config.getOrThrow<string>("dev.penpotUser");
    const penpotPassword = this.config.getOrThrow<string>("dev.penpotPassword");
    const seedUserEmail = this.config.getOrThrow<string>("dev.seedUserEmail");
    const seedUserPassword = this.config.getOrThrow<string>("dev.seedUserPassword");
    const swaggerEnabled = this.config.getOrThrow<boolean>("app.swaggerEnabled");

    const [
      clientUp,
      adminUp,
      portalUp,
      penpotUp,
      mailpitUp,
      penpotMcpUp,
      postgresUp,
      redisUp,
      lokiUp,
      grafanaUp,
      tempoUp,
    ] = await Promise.all([
      probeHttp(`http://localhost:${clientPort}`),
      probeHttp(`http://localhost:${adminPort}`),
      probeHttp(`http://localhost:${portalPort}`),
      probeHttp(`http://localhost:${penpotPort}`),
      probeHttp(`http://localhost:${penpotMailpitPort}`),
      probeHttp(`http://localhost:${penpotPluginPort}/manifest.json`),
      this.probePostgres(),
      probeTcp(redisHost, redisPort),
      probeHttp(`http://localhost:${lokiPort}/ready`),
      probeHttp(`http://localhost:${grafanaPort}/api/health`),
      probeHttp(`http://localhost:${tempoPort}/ready`),
    ]);

    const base = (p: number) => `http://localhost:${p}`;
    const apiBase = `${base(port)}${API_PREFIX}`;
    const serverLinks: DevServiceLink[] = [
      { label: "health", href: `${apiBase}/health` },
    ];
    if (swaggerEnabled) {
      serverLinks.push(
        { label: "Swagger", href: `${apiBase}/docs` },
        { label: "OpenAPI JSON", href: `${apiBase}/docs-json` },
      );
    }

    return [
      {
        id: "server",
        name: "server",
        group: "应用",
        port,
        // 能渲染这个页面就说明 server 自己在跑
        status: "online",
        url: base(port),
        links: serverLinks,
        credentials: [
          { label: "测试账号", value: seedUserEmail },
          { label: "密码", value: seedUserPassword },
        ],
        command: "pnpm dev:server",
        probe: "当前进程",
      },
      {
        id: "client",
        name: "client",
        group: "应用",
        port: clientPort,
        status: clientUp ? "online" : "offline",
        url: base(clientPort),
        links: [],
        command: "pnpm dev:client",
        probe: "HTTP",
      },
      {
        id: "admin",
        name: "admin",
        group: "应用",
        port: adminPort,
        status: adminUp ? "online" : "offline",
        url: base(adminPort),
        links: [],
        command: "pnpm dev:admin",
        probe: "HTTP",
      },
      {
        id: "portal",
        name: "portal",
        group: "应用",
        port: portalPort,
        status: portalUp ? "online" : "offline",
        url: base(portalPort),
        links: [],
        command: "pnpm dev:portal",
        probe: "HTTP",
      },
      {
        id: "penpot-mcp",
        name: "Penpot MCP",
        group: "工具",
        port: penpotMcpPort,
        status: penpotMcpUp ? "online" : "offline",
        links: [
          {
            label: "插件 manifest",
            href: base(penpotPluginPort) + "/manifest.json",
          },
        ],
        command: "npx -y @penpot/mcp@2.17.0（全机一个实例）",
        probe: "HTTP",
      },
      {
        id: "postgres",
        name: "PostgreSQL",
        group: "依赖服务",
        port: postgresPort,
        status: postgresUp ? "online" : "offline",
        links: [],
        credentials: [
          { label: "应用账号", value: postgresAppUser },
          { label: "应用密码", value: postgresAppPassword },
          { label: "管理账号", value: postgresAdminUser },
          { label: "管理密码", value: postgresAdminPassword },
        ],
        command: "docker compose up -d postgres",
        probe: "SELECT 1",
      },
      {
        id: "redis",
        name: "Redis",
        group: "依赖服务",
        port: redisPort,
        status: redisUp ? "online" : "offline",
        links: [],
        credentials: [{ label: "密码", value: redisPassword }],
        command: "docker compose up -d redis",
        probe: "TCP",
      },
      {
        id: "penpot",
        name: "Penpot",
        group: "依赖服务",
        port: penpotPort,
        status: penpotUp ? "online" : "offline",
        url: base(penpotPort),
        links: [],
        credentials: [
          { label: "账号", value: penpotUser },
          { label: "密码", value: penpotPassword },
        ],
        command: "（外部）yyx-agent-kit/tools/penpot/start.ps1",
        probe: "HTTP",
      },
      {
        id: "mailpit",
        name: "Mailpit",
        group: "依赖服务",
        port: penpotMailpitPort,
        status: mailpitUp ? "online" : "offline",
        url: base(penpotMailpitPort),
        links: [],
        command: "（外部）随 Penpot 启动",
        probe: "HTTP",
      },
      {
        id: "loki",
        name: "Loki",
        group: "依赖服务",
        port: lokiPort,
        status: lokiUp ? "online" : "offline",
        url: base(lokiPort),
        links: [
          { label: "ready", href: `${base(lokiPort)}/ready` },
          { label: "metrics", href: `${base(lokiPort)}/metrics` },
        ],
        command: "docker compose --profile observability up -d loki",
        probe: "HTTP",
      },
      {
        id: "grafana",
        name: "Grafana",
        group: "依赖服务",
        port: grafanaPort,
        status: grafanaUp ? "online" : "offline",
        url: base(grafanaPort),
        links: [
          { label: "概览", href: `${base(grafanaPort)}/d/starter-overview` },
          { label: "Explore", href: `${base(grafanaPort)}/explore` },
          { label: "登录", href: base(grafanaPort) },
        ],
        credentials: [
          { label: "账号", value: grafanaUser },
          { label: "密码", value: grafanaPassword },
        ],
        command: "docker compose --profile observability up -d grafana",
        probe: "HTTP",
      },
      {
        id: "tempo",
        name: "Tempo",
        group: "依赖服务",
        port: tempoPort,
        status: tempoUp ? "online" : "offline",
        url: base(tempoPort),
        links: [{ label: "ready", href: `${base(tempoPort)}/ready` }],
        command: "docker compose --profile observability up -d tempo",
        probe: "HTTP",
      },
    ];
  }

  private async probePostgres(): Promise<boolean> {
    const task = this.prisma.$queryRaw`SELECT 1`.then(
      () => true,
      () => false,
    );
    // 数据库不可达时驱动可能长时间挂起，用超时兜底
    const timeout = new Promise<boolean>((resolve) => {
      setTimeout(() => resolve(false), PROBE_TIMEOUT_MS);
    });
    return Promise.race([task, timeout]);
  }
}
