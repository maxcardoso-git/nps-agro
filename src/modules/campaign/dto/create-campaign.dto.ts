import { IsDateString, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCampaignDto {
  @IsOptional()
  @IsUUID()
  tenant_id?: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  segment?: string;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsUUID()
  questionnaire_version_id!: string;

  @IsOptional()
  @IsObject()
  channel_config_json?: Record<string, unknown>;
}
