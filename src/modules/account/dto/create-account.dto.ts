import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAccountDto {
  @IsOptional()
  @IsUUID('all')
  tenant_id?: string;

  @IsString()
  name!: string;
}
