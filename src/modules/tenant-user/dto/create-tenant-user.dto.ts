import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { PlatformRole } from '../../../common/constants';

const ROLES: PlatformRole[] = ['platform_admin', 'tenant_admin', 'campaign_manager', 'analyst', 'interviewer'];

export class CreateTenantUserDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsIn(ROLES)
  role!: PlatformRole;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
