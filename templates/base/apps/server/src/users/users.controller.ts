import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { CurrentUser } from "@nestjs/authentication";
import { Can } from "@nestjs/authorization";
import { API_ROUTES, asRoute } from "../shared";
import { Audit } from "../audit/audit.decorator";
import { PlatformAdminGuard } from "../auth/guards/platform-admin.guard";
import { RequirePlatformAdminLevel } from "../auth/decorators/platform-admin.decorator";
import { ErrorResponseDto } from "../dto/error-response.dto";
import { CreateUserDto } from "./dto/create-user.dto";
import { QueryUsersDto } from "./dto/query-users.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UserListResponseDto, UserResponseDto } from "./dto/user-response.dto";
import { UsersService } from "./users.service";

/**
 * 平台级用户管理（/users），只给平台管理员。
 *
 * 用户是全局身份表；租户成员关系在 UserTenant，由租户模块维护。
 * 删除用户会级联移除其成员关系与角色，因此禁止删除当前登录用户。
 */
@ApiTags("users")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto })
@UseGuards(PlatformAdminGuard)
@Controller(asRoute(API_ROUTES.users))
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @ApiOperation({ summary: "用户列表（分页 / 状态 / email、displayName 搜索）" })
  @ApiOkResponse({ type: UserListResponseDto })
  @Get()
  @Can.Anyone()
  list(@Query() query: QueryUsersDto): Promise<UserListResponseDto> {
    return this.users.list(query);
  }

  @ApiOperation({ summary: "用户详情" })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @Get(":id")
  @Can.Anyone()
  get(@Param("id", ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    return this.users.get(id);
  }

  @ApiOperation({ summary: "创建用户（邮箱 + 初始密码）" })
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  @Post()
  @RequirePlatformAdminLevel("super")
  @Can.Anyone()
  @Audit({ action: "user.create", resource: "user" })
  create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.users.create(dto);
  }

  @ApiOperation({ summary: "更新用户（displayName / status / email / password）" })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  @Patch(":id")
  @RequirePlatformAdminLevel("super")
  @Can.Anyone()
  @Audit({ action: "user.update", resource: "user" })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.users.update(id, dto);
  }

  @ApiOperation({ summary: "删除用户（级联移除成员关系；不能删除自己）" })
  @ApiNoContentResponse()
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @HttpCode(204)
  @Delete(":id")
  @RequirePlatformAdminLevel("super")
  @Can.Anyone()
  @Audit({ action: "user.delete", resource: "user" })
  remove(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("id") currentUserId: string,
  ): Promise<void> {
    return this.users.remove(id, currentUserId);
  }
}
