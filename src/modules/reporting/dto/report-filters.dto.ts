import { IsIn, IsOptional, IsString } from 'class-validator';

export class ReportFiltersDto {
  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsIn(['positive', 'neutral', 'negative', 'mixed', 'unknown'])
  sentiment?: string;

  @IsOptional()
  @IsIn(['promoter', 'neutral', 'detractor'])
  nps_class?: string;
}

