/**
 * 跨包共享常量的统一入口。
 *
 * 业务代码只从这里导入（`from "../shared"`），避免 `../../../../packages/shared/src/index`
 * 这类深层相对路径。server 是 `node dist` 直接运行，tsc 不会重写 path alias，
 * 所以这里用 re-export 做「软别名」，不引入 tsc-alias / 运行时 register。
 *
 * 注意：这是跨包门面，不是 server 内部模块的 barrel（见 AGENTS「模块导入约定」）。
 */
export * from "../../../packages/shared/src/index";
