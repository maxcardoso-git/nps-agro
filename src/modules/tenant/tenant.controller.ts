import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../access/current-user.decorator';
import { Permissions } from '../access/permissions.decorator';
import { AuthUserClaims } from '../../common/types';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantService } from './tenant.service';

@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
  @Permissions('tenant.create')
  createTenant(@Body() body: CreateTenantDto) {
    return this.tenantService.createTenant(body);
  }

  @Get()
  @Permissions('tenant.read')
  listTenants(
    @CurrentUser() user: AuthUserClaims,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('page_size') pageSize?: string,
  ) {
    return this.tenantService.listTenants(user, {
      status,
      search,
      page: page ? Number(page) : undefined,
      page_size: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get(':id')
  @Permissions('tenant.read')
  getById(@CurrentUser() user: AuthUserClaims, @Param('id') id: string) {
    return this.tenantService.getTenantById(user, id);
  }

  @Patch(':id')
  @Permissions('tenant.update')
  updateById(@CurrentUser() user: AuthUserClaims, @Param('id') id: string, @Body() body: UpdateTenantDto) {
    return this.tenantService.updateTenant(user, id, body);
  }
}
