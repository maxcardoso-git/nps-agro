import { IsObject } from 'class-validator';

export class CreateQuestionnaireVersionDto {
  @IsObject()
  schema_json!: Record<string, unknown>;
}

