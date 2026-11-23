"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDateTime = exports.PERMISSIONS = exports.ROLES = exports.TODO_STATUS = exports.API_ROUTES = exports.API_PREFIX = exports.APP_NAME = void 0;
exports.APP_NAME = "starter";
/** API 路径前缀。server 的 setGlobalPrefix、前端的 baseUrl、路由常量都以此为准 */
exports.API_PREFIX = "/api";
/**
 * 业务路由表。新增接口先在这里加常量，再由 controller 和 api 层引用，
 * 避免前后端各写一份字符串。
 *
 * 注意：`health` 是运维探活，不属于业务接口。
 */
exports.API_ROUTES = {
    health: "/health",
    todos: "/todos",
};
/** 业务状态枚举，前后端共用 */
exports.TODO_STATUS = {
    pending: "pending",
    done: "done",
};
/** 内置角色 code（与后端 seed 一致） */
exports.ROLES = {
    admin: "admin",
    member: "member",
};
/** 权限点 code（与后端 seed 一致） */
exports.PERMISSIONS = {
    tenantRead: "tenant:read",
    tenantWrite: "tenant:write",
    userRead: "user:read",
    userWrite: "user:write",
    roleRead: "role:read",
    roleWrite: "role:write",
    knowledgeRead: "knowledge:read",
    knowledgeWrite: "knowledge:write",
    replayRead: "replay:read",
    replayWrite: "replay:write",
    billingManage: "billing:manage",
};
/** 统一日期展示格式，避免各端各自拼字符串 */
var formatDateTime = function (input) {
    var date = input instanceof Date ? input : new Date(input);
    var pad = function (value) { return String(value).padStart(2, "0"); };
    return "".concat(date.getFullYear(), "-").concat(pad(date.getMonth() + 1), "-").concat(pad(date.getDate()), " ").concat(pad(date.getHours()), ":").concat(pad(date.getMinutes()));
};
exports.formatDateTime = formatDateTime;
