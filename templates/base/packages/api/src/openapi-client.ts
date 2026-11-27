/**
 * OpenAPI 生成客户端的统一入口。
 * 生成物（./generated）禁止手改；这里只做 re-export，并提供客户端实例配置。
 */
export * from "./generated";
export { client } from "./generated/client.gen";
export { createClient, createConfig } from "./generated/client";
