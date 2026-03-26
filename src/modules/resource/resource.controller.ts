import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser, EffectiveTenantId } from '../access/current-user.decorator';
import { Permissions } from '../access/permissions.decorator';
import { AuthUserClaims } from '../../common/types';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { ResourceService } from './resource.service';

@Controller('resources')
export class ResourceController {
  constructor(private readonly service: ResourceService) {}

  @Post()
  @Permissions('llm_resource.create')
  create(
    @CurrentUser() user: AuthUserClaims,
    @EffectiveTenantId() tenantId: string,
    @Body() body: CreateResourceDto,
  ) {
    return this.service.create(user, tenantId, body);
  }

  @Get()
  @Permissions('llm_resource.read')
  list(
    @CurrentUser() user: AuthUserClaims,
    @EffectiveTenantId() tenantId: string,
    @Query('type') type?: string,
  ) {
    return this.service.list(user, tenantId, type);
  }

  @Get(':id')
  @Permissions('llm_resource.read')
  getById(
    @CurrentUser() user: AuthUserClaims,
    @EffectiveTenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.service.getById(user, tenantId, id);
  }

  @Patch(':id')
  @Permissions('llm_resource.update')
  update(
    @CurrentUser() user: AuthUserClaims,
    @EffectiveTenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: UpdateResourceDto,
  ) {
    return this.service.update(user, tenantId, id, body);
  }

  @Delete(':id')
  @Permissions('llm_resource.delete')
  delete(
    @CurrentUser() user: AuthUserClaims,
    @EffectiveTenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.service.delete(user, tenantId, id);
  }
}
