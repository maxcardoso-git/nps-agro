import { HttpStatus, Injectable } from '@nestjs/common';
import { DomainException } from '../../common/errors';
import { AuthUserClaims } from '../../common/types';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { ResourceRepository } from './resource.repository';

@Injectable()
export class ResourceService {
  constructor(private readonly repo: ResourceRepository) {}

  async create(user: AuthUserClaims, tenantId: string, dto: CreateResourceDto) {
    const resource = await this.repo.create({ tenant_id: tenantId, ...dto });
    if (!resource) {
      throw new DomainException('RESOURCE_NOT_CREATED', 'Recurso não foi criado', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    return resource;
  }

  async list(user: AuthUserClaims, tenantId: string, type?: string) {
    return this.repo.list(tenantId, type);
  }

  async getById(user: AuthUserClaims, tenantId: string, id: string) {
    const resource = await this.repo.getById(id, tenantId);
    if (!resource) {
      throw new DomainException('RESOURCE_NOT_FOUND', 'Recurso não encontrado', HttpStatus.NOT_FOUND);
    }
    return resource;
  }

  async update(user: AuthUserClaims, tenantId: string, id: string, dto: UpdateResourceDto) {
    const updated = await this.repo.update(id, tenantId, dto as unknown as Record<string, unknown>);
    if (!updated) {
      throw new DomainException('RESOURCE_NOT_FOUND', 'Recurso não encontrado', HttpStatus.NOT_FOUND);
    }
    return updated;
  }

  async delete(user: AuthUserClaims, tenantId: string, id: string) {
    const deleted = await this.repo.delete(id, tenantId);
    if (!deleted) {
      throw new DomainException('RESOURCE_NOT_FOUND', 'Recurso não encontrado', HttpStatus.NOT_FOUND);
    }
    return { deleted: true };
  }
}
