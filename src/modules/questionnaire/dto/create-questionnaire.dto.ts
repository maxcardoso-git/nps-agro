import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateQuestionnaireDto {
  @IsOptional()
  @IsUUID()
  tenant_id?: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

