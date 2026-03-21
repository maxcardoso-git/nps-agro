import { HttpStatus, Injectable } from '@nestjs/common';
import { DomainException } from '../../common/errors';
import { AuthUserClaims } from '../../common/types';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantRepository } from './tenant.repository';

@Injectable()
export class TenantService {
  constructor(private readonly tenantRepository: TenantRepository) {}

  async createTenant(dto: CreateTenantDto) {
    try {
      const tenant = await this.tenantRepository.create({
        name: dto.name,
        code: dto.code,
        status: dto.status ?? 'active',
        timezone: dto.timezone ?? 'America/Sao_Paulo',
        settings_json: dto.settings_json ?? {},
      });

      if (!tenant) {
        throw new DomainException('TENANT_NOT_CREATED', 'Tenant não foi criado', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      return tenant;
    } catch (error: unknown) {
      if (this.isUniqueViolation(error)) {
        throw new DomainException('TENANT_CODE_ALREADY_EXISTS', 'Já existe um tenant com este código', HttpStatus.CONFLICT);
      }
      throw error;
    }
  }

  async listTenants(user: AuthUserClaims, query: { status?: string; search?: string; page?: number; page_size?: number }) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = query.page_size && query.page_size > 0 ? Math.min(query.page_size, 100) : 20;

    return this.tenantRepository.list({
      status: query.status,
      search: query.search,
      page,
      pageSize,
      tenantId: user.role === 'platform_admin' ? undefined : user.tenant_id,
    });
  }

  async getTenantById(user: AuthUserClaims, id: string) {
    if (user.role !== 'platform_admin' && id !== user.tenant_id) {
      throw new DomainException('FORBIDDEN_TENANT_SCOPE', 'Acesso negado ao tenant solicitado', HttpStatus.FORBIDDEN);
    }

    const tenant = await this.tenantRepository.getById(id);
    if (!tenant) {
      throw new DomainException('TENANT_NOT_FOUND', 'Tenant não encontrado', HttpStatus.NOT_FOUND);
    }

    return tenant;
  }

  async updateTenant(user: AuthUserClaims, id: string, dto: UpdateTenantDto) {
    if (user.role !== 'platform_admin' && id !== user.tenant_id) {
      throw new DomainException('FORBIDDEN_TENANT_SCOPE', 'Acesso negado ao tenant solicitado', HttpStatus.FORBIDDEN);
    }

    const updated = await this.tenantRepository.update(id, dto);
    if (!updated) {
      throw new DomainException('TENANT_NOT_FOUND', 'Tenant não encontrado', HttpStatus.NOT_FOUND);
    }

    return updated;
  }

  private isUniqueViolation(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const maybePgError = error as { code?: string };
    return maybePgError.code === '23505';
  }
}
