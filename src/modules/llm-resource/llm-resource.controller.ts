import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser, EffectiveTenantId } from '../access/current-user.decorator';
import { Permissions } from '../access/permissions.decorator';
import { AuthUserClaims } from '../../common/types';
import { CreateLlmResourceDto } from './dto/create-llm-resource.dto';
import { UpdateLlmResourceDto } from './dto/update-llm-resource.dto';
import { LlmResourceService } from './llm-resource.service';

@Controller('llm-resources')
export class LlmResourceController {
  constructor(private readonly service: LlmResourceService) {}

  @Post()
  @Permissions('llm_resource.create')
  create(
    @CurrentUser() user: AuthUserClaims,
    @EffectiveTenantId() tenantId: string,
    @Body() body: CreateLlmResourceDto,
  ) {
    return this.service.create(user, tenantId, body);
  }

  @Get()
  @Permissions('llm_resource.read')
  list(
    @CurrentUser() user: AuthUserClaims,
    @EffectiveTenantId() tenantId: string,
  ) {
    return this.service.list(user, tenantId);
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
    @Body() body: UpdateLlmResourceDto,
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
