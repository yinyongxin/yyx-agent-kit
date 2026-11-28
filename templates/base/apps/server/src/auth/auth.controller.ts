import { Body, Controller, Ip, Post } from "@nestjs/common";
import {
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { Public } from "@nestjs/authentication";
import { API_ROUTES, asRoute } from "../shared";
import { ErrorResponseDto } from "../dto/error-response.dto";
import { CredentialsService } from "./credentials.service";
import { SignInDto, SignInResponseDto } from "./dto/sign-in.dto";

/** 公开登录端点：只签发 access token，不建 session cookie（Bearer 客户端）。 */
@ApiTags("auth")
@Controller(asRoute(API_ROUTES.auth))
export class AuthController {
  constructor(private readonly credentials: CredentialsService) {}

  @ApiOperation({ summary: "邮箱密码登录，返回 Bearer access token（公开）" })
  @ApiCreatedResponse({ type: SignInResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiTooManyRequestsResponse({ type: ErrorResponseDto })
  @Public()
  @Post(asRoute(API_ROUTES.authSignIn))
  signIn(
    @Body() dto: SignInDto,
    @Ip() ip: string,
  ): Promise<SignInResponseDto> {
    return this.credentials.signIn(dto.email, dto.password, ip);
  }
}
