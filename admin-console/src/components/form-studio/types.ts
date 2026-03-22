import type { Question, QuestionnaireSchema, DisplayCondition, QuestionScale } from '@/lib/types';

export type QuestionType = Question['type'];
export type EditorFieldType = QuestionType | 'section';

export interface EditorField {
  id: string;
  type: EditorFieldType;
  label: string;
  required: boolean;
  description?: string;
  options?: string[];
  scale?: QuestionScale;
  display_condition?: DisplayCondition;
  // Editor-only (not serialized to schema_json)
  _sectionTitle?: string;
  _placeholder?: string;
  _maxLength?: number;
  _min?: number;
  _max?: number;
}

export function generateFieldId(): string {
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function schemaToFields(schema: QuestionnaireSchema | undefined | null): EditorField[] {
  if (!schema?.questions?.length) return [];
  return schema.questions.map((q) => ({
    id: q.id,
    type: q.type,
    label: q.label,
    required: q.required,
    options: q.options,
    scale: q.scale,
    display_condition: q.display_condition,
  }));
}

export function fieldsToSchema(fields: EditorField[]): QuestionnaireSchema {
  const questions: Question[] = fields
    .filter((f) => f.type !== 'section')
    .map((f) => {
      const q: Question = {
        id: f.id,
        label: f.label,
        type: f.type as QuestionType,
        required: f.required,
      };
      if (f.options?.length) q.options = f.options;
      if (f.scale) q.scale = f.scale;
      if (f.display_condition) q.display_condition = f.display_condition;
      return q;
    });
  return { questions };
}
