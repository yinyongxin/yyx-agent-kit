import { Injectable } from "@nestjs/common";
import type { Prisma } from "../../generated/prisma/client";
import { MembersService } from "../../tenancy/members/members.service";
import type { AddMemberDto } from "../../tenancy/members/dto/add-member.dto";
import type { MemberListResponseDto } from "../../tenancy/members/dto/member-response.dto";
import type { QueryMembersDto } from "../../tenancy/members/dto/query-members.dto";
import type { UpdateMemberDto } from "../../tenancy/members/dto/update-member.dto";

/**
 * 平台级租户成员管理：复用租户成员 Service 的查询/写入逻辑，
 * 但开启「最后一个管理员」保护（平台操作没有租户内的自己，不能靠 self-check 兜底）。
 */
@Injectable()
export class PlatformMembersService {
  constructor(private readonly members: MembersService) {}

  list(
    tx: Prisma.TransactionClient,
    tenantId: string,
    query: QueryMembersDto,
  ): Promise<MemberListResponseDto> {
    return this.members.list(tx, tenantId, query);
  }

  add(tx: Prisma.TransactionClient, tenantId: string, input: AddMemberDto) {
    return this.members.add(tx, tenantId, input);
  }

  update(
    tx: Prisma.TransactionClient,
    tenantId: string,
    userId: string,
    input: UpdateMemberDto,
  ) {
    return this.members.update(tx, tenantId, userId, input, {
      protectLastAdmin: true,
    });
  }

  remove(tx: Prisma.TransactionClient, tenantId: string, userId: string) {
    return this.members.remove(tx, tenantId, userId, {
      protectLastAdmin: true,
    });
  }
}
