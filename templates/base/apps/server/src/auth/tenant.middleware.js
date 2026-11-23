"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantMiddleware = void 0;
var common_1 = require("@nestjs/common");
var tenant_context_1 = require("./tenant-context");
/**
 * 从 Authorization Bearer token 解析租户上下文（不做签名校验，由 JwtStrategy 负责）。
 * 让 PrismaService 的租户过滤在 Controller/Guard 之前就能拿到 tenantId。
 */
var TenantMiddleware = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var TenantMiddleware = _classThis = /** @class */ (function () {
        function TenantMiddleware_1() {
        }
        TenantMiddleware_1.prototype.use = function (req, _res, next) {
            var _a, _b;
            var header = req.headers.authorization;
            var token = (header === null || header === void 0 ? void 0 : header.startsWith("Bearer ")) ? header.slice(7) : null;
            if (token) {
                try {
                    var payload = JSON.parse(Buffer.from((_a = token.split(".")[1]) !== null && _a !== void 0 ? _a : "", "base64url").toString("utf8"));
                    if (payload.tenantId && payload.userId) {
                        tenant_context_1.TenantContext.run({
                            tenantId: payload.tenantId,
                            userId: payload.userId,
                            authSubject: (_b = payload.sub) !== null && _b !== void 0 ? _b : "",
                        }, next);
                        return;
                    }
                }
                catch (_c) {
                    // 解析失败按未带上下文处理，JwtStrategy 会在守卫阶段拒绝
                }
            }
            next();
        };
        return TenantMiddleware_1;
    }());
    __setFunctionName(_classThis, "TenantMiddleware");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        TenantMiddleware = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return TenantMiddleware = _classThis;
}();
exports.TenantMiddleware = TenantMiddleware;
