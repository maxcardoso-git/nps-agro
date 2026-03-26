import { IsBoolean, IsIn, IsObject, IsOptional, IsString, Length } from 'class-validator';

const PROVIDERS = ['openai', 'anthropic', 'google', 'azure', 'ollama', 'custom'] as const;
const PURPOSES = ['general', 'enrichment', 'chat', 'embeddings', 'transcription'] as const;

export class UpdateLlmResourceDto {
  @IsOptional()
  @IsString()
  @Length(2, 120)
  name?: string;

  @IsOptional()
  @IsString()
  @IsIn(PROVIDERS)
  provider?: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  model_id?: string;

  @IsOptional()
  @IsString()
  api_key?: string;

  @IsOptional()
  @IsString()
  base_url?: string;

  @IsOptional()
  @IsString()
  @IsIn(PURPOSES)
  purpose?: string;

  @IsOptional()
  @IsObject()
  config_json?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
