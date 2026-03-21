import { Module } from '@nestjs/common';
import { TenantUserController } from './tenant-user.controller';
import { TenantUserRepository } from './tenant-user.repository';
import { TenantUserService } from './tenant-user.service';

@Module({
  controllers: [TenantUserController],
  providers: [TenantUserService, TenantUserRepository],
  exports: [TenantUserService],
})
export class TenantUserModule {}
