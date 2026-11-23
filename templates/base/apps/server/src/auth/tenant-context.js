"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantContext = void 0;
var node_async_hooks_1 = require("node:async_hooks");
var storage = new node_async_hooks_1.AsyncLocalStorage();
/** 当前请求的租户上下文。由 TenantMiddleware 在入口写入，全链路可读。 */
exports.TenantContext = {
    run: function (value, fn) {
        return storage.run(value, fn);
    },
    get: function () {
        return storage.getStore();
    },
    getTenantId: function () {
        var ctx = storage.getStore();
        if (!ctx) {
            throw new Error("租户上下文缺失：请求未经过 TenantMiddleware");
        }
        return ctx.tenantId;
    },
};
