import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
} from "@nestjs/common";
import {
  ApiBearerAuth,
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
import { ErrorResponseDto } from "../dto/error-response.dto";
import { SessionResponseDto } from "./dto/session-response.dto";
import { MeSessionsService } from "./me-sessions.service";

type CurrentUserLike = { id: string; sessionId?: string };

/** 当前用户的登录设备 / 服务端会话 */
@ApiTags("me")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@Controller(asRoute(`${API_ROUTES.me}${API_ROUTES.meSessions}`))
export class MeSessionsController {
  constructor(private readonly sessions: MeSessionsService) {}

  @ApiOperation({ summary: "我的登录设备（服务端会话）" })
  @ApiOkResponse({ type: [SessionResponseDto] })
  @Get()
  @Can.Anyone()
  list(@CurrentUser() user: CurrentUserLike): Promise<SessionResponseDto[]> {
    return this.sessions.list(user.id, user.sessionId);
  }

  @ApiOperation({ summary: "退出其他设备（保留当前会话）" })
  @ApiNoContentResponse()
  @HttpCode(204)
  @Post("revoke-others")
  @Can.Anyone()
  @Audit({
    action: "session.revoke_others",
    resource: "session",
    recordResult: false,
    resourceId: (_data, req) =>
      (req.user as CurrentUserLike | undefined)?.sessionId ?? null,
  })
  revokeOthers(@CurrentUser() user: CurrentUserLike): Promise<void> {
    return this.sessions.revokeOthers(user.id, user.sessionId);
  }

  @ApiOperation({ summary: "撤销指定会话（不能撤销自己时前端隐藏入口）" })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @HttpCode(204)
  @Delete(":id")
  @Can.Anyone()
  @Audit({
    action: "session.revoke",
    resource: "session",
    recordResult: false,
    resourceId: (_data, req) => req.params.id ?? null,
  })
  revoke(
    @CurrentUser() user: CurrentUserLike,
    @Param("id") sessionId: string,
  ): Promise<void> {
    return this.sessions.revoke(user.id, sessionId);
  }
}
