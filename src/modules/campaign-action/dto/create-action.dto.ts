import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateActionDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID('all')
  questionnaire_version_id!: string;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsString()
  tipo_persona?: string;

  @IsOptional()
  @IsString()
  cluster?: string;

  @IsOptional()
  @IsString()
  bu?: string;

  @IsOptional()
  @IsString()
  gt?: string;
}
