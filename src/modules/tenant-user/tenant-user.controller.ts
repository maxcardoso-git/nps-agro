import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { AuthUserClaims } from '../../common/types';
import { CurrentUser } from '../access/current-user.decorator';
import { Permissions } from '../access/permissions.decorator';
import { CreateTenantUserDto } from './dto/create-tenant-user.dto';
import { UpdateTenantUserDto } from './dto/update-tenant-user.dto';
import { TenantUserService } from './tenant-user.service';

@Controller('tenants/:tenantId/users')
export class TenantUserController {
  constructor(private readonly tenantUserService: TenantUserService) {}

  @Post()
  @Permissions('user.create')
  create(
    @CurrentUser() user: AuthUserClaims,
    @Param('tenantId') tenantId: string,
    @Body() body: CreateTenantUserDto,
  ) {
    return this.tenantUserService.createUser(user, tenantId, body);
  }

  @Get()
  @Permissions('user.read')
  list(@CurrentUser() user: AuthUserClaims, @Param('tenantId') tenantId: string) {
    return this.tenantUserService.listUsersByTenant(user, tenantId);
  }

  @Patch(':userId')
  @Permissions('user.update')
  update(
    @CurrentUser() user: AuthUserClaims,
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
    @Body() body: UpdateTenantUserDto,
  ) {
    return this.tenantUserService.updateUser(user, tenantId, userId, body);
  }
}
