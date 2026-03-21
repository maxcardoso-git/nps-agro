import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateQuestionnaireDto {
  @IsOptional()
  @IsUUID('all')
  tenant_id?: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
