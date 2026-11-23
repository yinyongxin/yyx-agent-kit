"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var dotenv_1 = require("dotenv");
var node_path_1 = require("node:path");
var client_1 = require("@prisma/client");
// 从项目根加载 .env（本文件在 apps/server/prisma/，根在上三级），保证从任意子目录运行都能连库
(0, dotenv_1.config)({ path: (0, node_path_1.resolve)(__dirname, "../../../.env") });
var prisma = new client_1.PrismaClient();
// 默认租户 slug。单租户阶段所有用户归到这个租户。
var DEFAULT_TENANT_SLUG = "default";
// 内置角色 + 权限。admin 拥有全部权限，member 拥有只读权限。
var PERMISSIONS = [
    { code: "tenant:read", name: "查看租户" },
    { code: "tenant:write", name: "管理租户" },
    { code: "user:read", name: "查看用户" },
    { code: "user:write", name: "管理用户" },
    { code: "role:read", name: "查看角色" },
    { code: "role:write", name: "管理角色" },
    { code: "knowledge:read", name: "查看知识库" },
    { code: "knowledge:write", name: "管理知识库" },
    { code: "replay:read", name: "查看动线回放" },
    { code: "replay:write", name: "管理动线回放" },
    { code: "billing:manage", name: "管理套餐订阅" },
];
var ROLES = [
    { code: "admin", name: "管理员", description: "拥有全部权限", all: true },
    {
        code: "member",
        name: "普通成员",
        description: "只读权限",
        all: false,
    },
];
var PLANS = [
    { code: "free", name: "免费版", description: "基础功能" },
    { code: "pro", name: "专业版", description: "全部功能" },
];
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var tenant, permissionIds, _i, PERMISSIONS_1, p, record, _a, ROLES_1, r, role, codes, _b, codes_1, code, permissionId, _c, PLANS_1, p;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, prisma.tenant.upsert({
                        where: { slug: DEFAULT_TENANT_SLUG },
                        update: {},
                        create: { slug: DEFAULT_TENANT_SLUG, name: "默认租户" },
                    })];
                case 1:
                    tenant = _d.sent();
                    permissionIds = new Map();
                    _i = 0, PERMISSIONS_1 = PERMISSIONS;
                    _d.label = 2;
                case 2:
                    if (!(_i < PERMISSIONS_1.length)) return [3 /*break*/, 5];
                    p = PERMISSIONS_1[_i];
                    return [4 /*yield*/, prisma.permission.upsert({
                            where: { code: p.code },
                            update: { name: p.name },
                            create: { code: p.code, name: p.name },
                        })];
                case 3:
                    record = _d.sent();
                    permissionIds.set(p.code, record.id);
                    _d.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5:
                    _a = 0, ROLES_1 = ROLES;
                    _d.label = 6;
                case 6:
                    if (!(_a < ROLES_1.length)) return [3 /*break*/, 12];
                    r = ROLES_1[_a];
                    return [4 /*yield*/, prisma.role.upsert({
                            where: { tenantId_code: { tenantId: tenant.id, code: r.code } },
                            update: { name: r.name, description: r.description, isSystem: true },
                            create: {
                                tenantId: tenant.id,
                                code: r.code,
                                name: r.name,
                                description: r.description,
                                isSystem: true,
                            },
                        })];
                case 7:
                    role = _d.sent();
                    codes = r.all
                        ? PERMISSIONS.map(function (p) { return p.code; })
                        : PERMISSIONS.filter(function (p) { return p.code.endsWith(":read"); }).map(function (p) { return p.code; });
                    _b = 0, codes_1 = codes;
                    _d.label = 8;
                case 8:
                    if (!(_b < codes_1.length)) return [3 /*break*/, 11];
                    code = codes_1[_b];
                    permissionId = permissionIds.get(code);
                    if (!permissionId)
                        return [3 /*break*/, 10];
                    return [4 /*yield*/, prisma.rolePermission.upsert({
                            where: {
                                roleId_permissionId: { roleId: role.id, permissionId: permissionId },
                            },
                            update: {},
                            create: { roleId: role.id, permissionId: permissionId },
                        })];
                case 9:
                    _d.sent();
                    _d.label = 10;
                case 10:
                    _b++;
                    return [3 /*break*/, 8];
                case 11:
                    _a++;
                    return [3 /*break*/, 6];
                case 12:
                    _c = 0, PLANS_1 = PLANS;
                    _d.label = 13;
                case 13:
                    if (!(_c < PLANS_1.length)) return [3 /*break*/, 16];
                    p = PLANS_1[_c];
                    return [4 /*yield*/, prisma.plan.upsert({
                            where: { code: p.code },
                            update: { name: p.name, description: p.description },
                            create: { code: p.code, name: p.name, description: p.description },
                        })];
                case 14:
                    _d.sent();
                    _d.label = 15;
                case 15:
                    _c++;
                    return [3 /*break*/, 13];
                case 16:
                    console.log("seed 完成：默认租户、内置角色、权限点、套餐已就绪");
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (err) {
    console.error(err);
    process.exit(1);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
