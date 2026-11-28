import { loadEnv } from "./config/load-env";

// tracing 模块会被 main.ts 第一行 import，必须自己加载 .env（早于 AppModule）
loadEnv();

const enabled =
  process.env.OTEL_ENABLED === "true" ||
  (process.env.OTEL_ENABLED !== "false" &&
    Boolean(process.env.OTEL_EXPORTER_OTLP_ENDPOINT));

if (enabled) {
  // 模板只采集 traces：日志走 pino → Loki，指标暂不采集，避免重复导出与 404
  process.env.OTEL_LOGS_EXPORTER ??= "none";
  process.env.OTEL_METRICS_EXPORTER ??= "none";

  // 动态 require：未启用 OTel 时不加载 SDK，避免拖慢启动 / 占内存
  const { NodeSDK } =
    require("@opentelemetry/sdk-node") as typeof import("@opentelemetry/sdk-node");
  const { OTLPTraceExporter } =
    require("@opentelemetry/exporter-trace-otlp-http") as typeof import("@opentelemetry/exporter-trace-otlp-http");
  const { getNodeAutoInstrumentations } =
    require("@opentelemetry/auto-instrumentations-node") as typeof import("@opentelemetry/auto-instrumentations-node");
  const { resourceFromAttributes } =
    require("@opentelemetry/resources") as typeof import("@opentelemetry/resources");
  const { ATTR_SERVICE_NAME, ATTR_DEPLOYMENT_ENVIRONMENT_NAME } =
    require("@opentelemetry/semantic-conventions") as typeof import("@opentelemetry/semantic-conventions");

  // 显式拼 /v1/traces：避免部分版本对 endpoint 的路径处理差异
  const endpoint = (process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "").replace(
    /\/+$/,
    "",
  );

  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]:
        process.env.OTEL_SERVICE_NAME ??
        process.env.LOG_SERVICE_NAME ??
        "starter-api",
      [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]:
        process.env.NODE_ENV ?? "development",
    }),
    traceExporter: new OTLPTraceExporter({
      ...(endpoint ? { url: `${endpoint}/v1/traces` } : {}),
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        // 该插桩不支持 Nest 12（peer 要求 <12），必须关闭，否则启动报错
        "@opentelemetry/instrumentation-nestjs-core": { enabled: false },
        // 入站 server span 由 TraceMiddleware 自己创建（NodeAdapter 会脱离插桩的 context），
        // 这里只保留出站 client span，避免同一请求两条 trace
        "@opentelemetry/instrumentation-http": {
          ignoreIncomingRequestHook: () => true,
        },
        // 文件系统插桩噪音大、开销高，模板不采集
        "@opentelemetry/instrumentation-fs": { enabled: false },
      }),
    ],
  });

  sdk.start();

  // 优雅退出：把缓冲区里的 span 发完再退出
  const shutdown = () => {
    sdk
      .shutdown()
      .catch(() => undefined)
      .finally(() => process.exit(0));
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}

export {};
