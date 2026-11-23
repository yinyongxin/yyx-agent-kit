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
exports.AuthModule = void 0;
var common_1 = require("@nestjs/common");
var jwt_1 = require("@nestjs/jwt");
var passport_1 = require("@nestjs/passport");
var jwt_strategy_1 = require("./jwt.strategy");
var permissions_guard_1 = require("./permissions.guard");
/**
 * 认证模块（骨架，默认未激活）。
 *
 * 现状：租户模型、JWT 策略、权限守卫都就绪，但不挂全局守卫 —— 模板现有接口
 * （health / todos）无需登录即可跑，方便先验证基础设施。
 *
 * 接入 Authentik/Google 时：
 *   1. 在本模块加 OIDC 策略 + /auth/callback，用 code 换 token 后签本地 JWT
 *      （含 sub / tenantId / userId，见 jwt.strategy.ts 的 JwtPayload）
 *   2. 在 app.module.ts 的 providers 里启用全局守卫：
 *      { provide: APP_GUARD, useClass: AuthGuard("jwt") }
 *      { provide: APP_GUARD, useClass: PermissionsGuard }
 *   3. health 接口用 @Public() 豁免（需加 @nestjs/throttler 类似的 public 装饰器机制）
 */
var AuthModule = function () {
    var _a;
    var _classDecorators = [(0, common_1.Module)({
            imports: [
                passport_1.PassportModule,
                jwt_1.JwtModule.register({
                    secret: (_a = process.env.JWT_SECRET) !== null && _a !== void 0 ? _a : "dev_jwt_secret_change_me",
                    signOptions: { expiresIn: "30m" },
                }),
            ],
            providers: [jwt_strategy_1.JwtStrategy, permissions_guard_1.PermissionsGuard],
            exports: [jwt_1.JwtModule, permissions_guard_1.PermissionsGuard],
        })];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var AuthModule = _classThis = /** @class */ (function () {
        function AuthModule_1() {
        }
        return AuthModule_1;
    }());
    __setFunctionName(_classThis, "AuthModule");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AuthModule = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AuthModule = _classThis;
}();
exports.AuthModule = AuthModule;
