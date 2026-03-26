import { IsArray, IsBoolean, IsIn, IsObject, IsOptional, IsString, Length } from 'class-validator';

const TYPES = ['api_http', 'database', 'mcp_server', 'llm', 'queue', 'storage', 'custom'] as const;
const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
const AUTH_MODES = ['none', 'bearer', 'api_key', 'basic', 'oauth2', 'custom'] as const;
const ENVIRONMENTS = ['production', 'staging', 'development'] as const;

export class CreateResourceDto {
  @IsString() @Length(2, 200)
  name!: string;

  @IsString() @IsIn(TYPES)
  type!: string;

  @IsOptional() @IsString()
  subtype?: string;

  @IsOptional() @IsString()
  endpoint_url?: string;

  @IsOptional() @IsString() @IsIn(METHODS)
  http_method?: string;

  @IsOptional() @IsString() @IsIn(AUTH_MODES)
  auth_mode?: string;

  @IsOptional() @IsObject()
  auth_config?: Record<string, unknown>;

  @IsOptional() @IsObject()
  connection_json?: Record<string, unknown>;

  @IsOptional() @IsObject()
  config_json?: Record<string, unknown>;

  @IsOptional() @IsObject()
  metadata_json?: Record<string, unknown>;

  @IsOptional() @IsArray()
  tags?: string[];

  @IsOptional() @IsString() @IsIn(ENVIRONMENTS)
  environment?: string;

  @IsOptional() @IsBoolean()
  is_active?: boolean;
}
