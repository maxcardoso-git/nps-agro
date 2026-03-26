import { HttpStatus, Injectable } from '@nestjs/common';
import { DomainException } from '../../common/errors';
import { AuthUserClaims } from '../../common/types';
import { CreateLlmResourceDto } from './dto/create-llm-resource.dto';
import { UpdateLlmResourceDto } from './dto/update-llm-resource.dto';
import { LlmResourceRepository } from './llm-resource.repository';

@Injectable()
export class LlmResourceService {
  constructor(private readonly repo: LlmResourceRepository) {}

  async create(user: AuthUserClaims, tenantId: string, dto: CreateLlmResourceDto) {
    const resource = await this.repo.create({
      tenant_id: tenantId,
      name: dto.name,
      provider: dto.provider,
      model_id: dto.model_id,
      api_key: dto.api_key,
      base_url: dto.base_url,
      purpose: dto.purpose,
      config_json: dto.config_json,
      is_active: dto.is_active,
    });

    if (!resource) {
      throw new DomainException('LLM_RESOURCE_NOT_CREATED', 'Recurso LLM não foi criado', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return resource;
  }

  async list(user: AuthUserClaims, tenantId: string) {
    return this.repo.list(tenantId);
  }

  async getById(user: AuthUserClaims, tenantId: string, id: string) {
    const resource = await this.repo.getById(id, tenantId);
    if (!resource) {
      throw new DomainException('LLM_RESOURCE_NOT_FOUND', 'Recurso LLM não encontrado', HttpStatus.NOT_FOUND);
    }
    return resource;
  }

  async update(user: AuthUserClaims, tenantId: string, id: string, dto: UpdateLlmResourceDto) {
    const updated = await this.repo.update(id, tenantId, dto as unknown as Record<string, unknown>);
    if (!updated) {
      throw new DomainException('LLM_RESOURCE_NOT_FOUND', 'Recurso LLM não encontrado', HttpStatus.NOT_FOUND);
    }
    return updated;
  }

  async delete(user: AuthUserClaims, tenantId: string, id: string) {
    const deleted = await this.repo.delete(id, tenantId);
    if (!deleted) {
      throw new DomainException('LLM_RESOURCE_NOT_FOUND', 'Recurso LLM não encontrado', HttpStatus.NOT_FOUND);
    }
    return { deleted: true };
  }
}
