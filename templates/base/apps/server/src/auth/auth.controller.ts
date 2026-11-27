import { Body, Controller, Post } from "@nestjs/common";
import { Public } from "@nestjs/authentication";
import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";
import { CredentialsService } from "./credentials.service";

class SignInDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}

/** 公开登录端点：只签发 access token，不建 session cookie（Bearer 客户端）。 */
@Controller("auth")
export class AuthController {
  constructor(private readonly credentials: CredentialsService) {}

  @Public()
  @Post("sign-in")
  signIn(@Body() dto: SignInDto) {
    return this.credentials.signIn(dto.email, dto.password);
  }
}
