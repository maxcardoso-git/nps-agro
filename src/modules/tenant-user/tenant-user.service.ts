import { HttpStatus, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { DomainException } from '../../common/errors';
import { AuthUserClaims } from '../../common/types';
import { CreateTenantUserDto } from './dto/create-tenant-user.dto';
import { UpdateTenantUserDto } from './dto/update-tenant-user.dto';
import { TenantUserRepository } from './tenant-user.repository';

@Injectable()
export class TenantUserService {
  constructor(private readonly tenantUserRepository: TenantUserRepository) {}

  async createUser(actor: AuthUserClaims, tenantId: string, dto: CreateTenantUserDto) {
    this.assertTenantScope(actor, tenantId);

    if (actor.role !== 'platform_admin' && dto.role === 'platform_admin') {
      throw new DomainException('USER_ROLE_NOT_ALLOWED', 'Role não permitida para o operador atual', HttpStatus.FORBIDDEN);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    try {
      const created = await this.tenantUserRepository.create({
        tenantId,
        name: dto.name,
        email: dto.email,
        role: dto.role,
        isActive: dto.is_active ?? true,
        passwordHash,
      });

      if (!created) {
        throw new DomainException('USER_NOT_CREATED', 'Usuário não foi criado', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      return this.sanitize(created);
    } catch (error: unknown) {
      if (this.isUniqueViolation(error)) {
        throw new DomainException('USER_EMAIL_ALREADY_EXISTS', 'Já existe usuário com este email no tenant', HttpStatus.CONFLICT);
      }
      throw error;
    }
  }

  async listUsersByTenant(actor: AuthUserClaims, tenantId: string) {
    this.assertTenantScope(actor, tenantId);
    const users = await this.tenantUserRepository.listByTenant(tenantId);
    return users.map((user) => this.sanitize(user));
  }

  async updateUser(actor: AuthUserClaims, tenantId: string, userId: string, dto: UpdateTenantUserDto) {
    this.assertTenantScope(actor, tenantId);

    const existing = await this.tenantUserRepository.getById(tenantId, userId);
    if (!existing) {
      throw new DomainException('USER_NOT_FOUND', 'Usuário não encontrado', HttpStatus.NOT_FOUND);
    }

    if (actor.role !== 'platform_admin' && dto.role === 'platform_admin') {
      throw new DomainException('USER_ROLE_NOT_ALLOWED', 'Role não permitida para o operador atual', HttpStatus.FORBIDDEN);
    }

    const willDisableTenantAdmin =
      existing.role === 'tenant_admin' &&
      ((dto.is_active === false) || (dto.role !== undefined && dto.role !== 'tenant_admin'));

    if (willDisableTenantAdmin) {
      const activeTenantAdmins = await this.tenantUserRepository.countActiveTenantAdmins(tenantId, userId);
      if (activeTenantAdmins === 0) {
        throw new DomainException(
          'LAST_TENANT_ADMIN_BLOCKED',
          'Não é permitido desativar o último tenant_admin ativo sem override explícito',
          HttpStatus.CONFLICT,
        );
      }
    }

    const payload: Record<string, unknown> = {};
    if (dto.name !== undefined) payload.name = dto.name;
    if (dto.email !== undefined) payload.email = dto.email;
    if (dto.role !== undefined) payload.role = dto.role;
    if (dto.is_active !== undefined) payload.is_active = dto.is_active;
    if (dto.password !== undefined) payload.password_hash = await bcrypt.hash(dto.password, 10);

    try {
      const updated = await this.tenantUserRepository.update(tenantId, userId, payload);
      if (!updated) {
        throw new DomainException('USER_NOT_FOUND', 'Usuário não encontrado', HttpStatus.NOT_FOUND);
      }

      return this.sanitize(updated);
    } catch (error: unknown) {
      if (this.isUniqueViolation(error)) {
        throw new DomainException('USER_EMAIL_ALREADY_EXISTS', 'Já existe usuário com este email no tenant', HttpStatus.CONFLICT);
      }
      throw error;
    }
  }

  private assertTenantScope(actor: AuthUserClaims, tenantId: string): void {
    if (actor.role !== 'platform_admin' && actor.tenant_id !== tenantId) {
      throw new DomainException('FORBIDDEN_TENANT_SCOPE', 'Acesso negado ao tenant solicitado', HttpStatus.FORBIDDEN);
    }
  }

  private sanitize<T extends { password_hash?: unknown }>(user: T): Omit<T, 'password_hash'> {
    const copy = { ...user } as T & { password_hash?: unknown };
    delete copy.password_hash;
    return copy;
  }

  private isUniqueViolation(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const maybePgError = error as { code?: string };
    return maybePgError.code === '23505';
  }
}
