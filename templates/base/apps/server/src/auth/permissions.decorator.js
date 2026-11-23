"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequirePermissions = exports.PERMISSIONS_KEY = void 0;
var common_1 = require("@nestjs/common");
exports.PERMISSIONS_KEY = "required_permissions";
/** 接口级权限要求。配合 PermissionsGuard 使用。 */
var RequirePermissions = function () {
    var codes = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        codes[_i] = arguments[_i];
    }
    return (0, common_1.SetMetadata)(exports.PERMISSIONS_KEY, codes);
};
exports.RequirePermissions = RequirePermissions;
