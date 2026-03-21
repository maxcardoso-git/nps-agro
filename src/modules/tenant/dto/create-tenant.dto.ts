import { IsIn, IsObject, IsOptional, IsString, Length, Matches } from 'class-validator';
import { TENANT_STATUSES } from '../../../common/constants';

export class CreateTenantDto {
  @IsString()
  @Length(3, 120)
  name!: string;

  @IsString()
  @Length(2, 50)
  @Matches(/^[A-Z0-9_]+$/)
  code!: string;

  @IsOptional()
  @IsIn(TENANT_STATUSES)
  status?: (typeof TENANT_STATUSES)[number];

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsObject()
  settings_json?: Record<string, unknown>;
}
