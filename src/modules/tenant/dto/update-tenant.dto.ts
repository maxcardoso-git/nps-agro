import { IsIn, IsObject, IsOptional, IsString, Length } from 'class-validator';
import { TENANT_STATUSES } from '../../../common/constants';

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  @Length(3, 120)
  name?: string;

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
