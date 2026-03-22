import { HttpStatus, Injectable } from '@nestjs/common';
import { DomainException } from '../../common/errors';
import { AuthUserClaims } from '../../common/types';
import { AccountRepository } from './account.repository';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@Injectable()
export class AccountService {
  constructor(private readonly accountRepository: AccountRepository) {}

  async createAccount(actor: AuthUserClaims, dto: CreateAccountDto) {
    const tenantId = this.resolveTenantId(actor, dto.tenant_id);
    const account = await this.accountRepository.create({ tenant_id: tenantId, name: dto.name });
    if (!account) {
      throw new DomainException('ACCOUNT_NOT_CREATED', 'Could not create account', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    return account;
  }

  async listAccounts(actor: AuthUserClaims, search?: string) {
    const tenantId = actor.tenant_id;
    return this.accountRepository.list(tenantId, search);
  }

  async getAccountById(actor: AuthUserClaims, id: string) {
    const account = await this.accountRepository.findById(id, actor.tenant_id);
    if (!account) {
      throw new DomainException('ACCOUNT_NOT_FOUND', 'Account not found', HttpStatus.NOT_FOUND);
    }
    return account;
  }

  async updateAccount(actor: AuthUserClaims, id: string, dto: UpdateAccountDto) {
    const account = await this.accountRepository.update(id, actor.tenant_id, dto);
    if (!account) {
      throw new DomainException('ACCOUNT_NOT_FOUND', 'Account not found', HttpStatus.NOT_FOUND);
    }
    return account;
  }

  private resolveTenantId(actor: AuthUserClaims, requestedTenantId?: string): string {
    if (actor.role !== 'platform_admin') {
      return actor.tenant_id;
    }
    return requestedTenantId ?? actor.tenant_id;
  }
}
