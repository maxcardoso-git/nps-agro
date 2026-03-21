import { Injectable } from '@nestjs/common';

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

type QuestionType =
  | 'nps'
  | 'scale'
  | 'single_choice'
  | 'multi_choice'
  | 'text'
  | 'number'
  | 'boolean';

const ALLOWED_TYPES: QuestionType[] = [
  'nps',
  'scale',
  'single_choice',
  'multi_choice',
  'text',
  'number',
  'boolean',
];

const ALLOWED_OPERATORS = ['equals', 'not_equals', 'in', 'not_in', 'gte', 'lte', 'gt', 'lt'];

@Injectable()
export class SchemaValidatorService {
  validate(schemaJson: Record<string, unknown>): ValidationResult {
    const errors: string[] = [];
    const questionsUnknown = schemaJson.questions;

    if (!Array.isArray(questionsUnknown) || questionsUnknown.length === 0) {
      errors.push('questions deve existir e ser array não vazio');
      return { valid: false, errors };
    }

    const questions = questionsUnknown as Array<Record<string, unknown>>;
    const ids = new Set<string>();

    for (const [index, question] of questions.entries()) {
      const prefix = `questions[${index}]`;

      if (typeof question.id !== 'string' || question.id.trim().length === 0) {
        errors.push(`${prefix}.id inválido`);
      } else if (ids.has(question.id)) {
        errors.push(`question.id duplicado: ${question.id}`);
      } else {
        ids.add(question.id);
      }

      if (!ALLOWED_TYPES.includes(question.type as QuestionType)) {
        errors.push(`${prefix}.type inválido`);
      }

      if (typeof question.required !== 'boolean') {
        errors.push(`${prefix}.required deve ser boolean`);
      }

      if (question.type === 'single_choice' || question.type === 'multi_choice') {
        if (!Array.isArray(question.options) || question.options.length === 0) {
          errors.push(`${prefix}.options deve ser array não vazio`);
        }
      }

      if (question.type === 'nps') {
        const scale = question.scale as Record<string, unknown> | undefined;
        if (!scale || scale.min !== 0 || scale.max !== 10) {
          errors.push(`${prefix}.nps deve ter escala 0-10`);
        }
      }

      if (question.type === 'scale') {
        const scale = question.scale as Record<string, unknown> | undefined;
        if (
          !scale ||
          typeof scale.min !== 'number' ||
          typeof scale.max !== 'number' ||
          scale.min >= scale.max
        ) {
          errors.push(`${prefix}.scale inválida`);
        }
      }

      if (question.display_condition !== undefined) {
        const condition = question.display_condition as Record<string, unknown>;
        if (typeof condition.question_id !== 'string') {
          errors.push(`${prefix}.display_condition.question_id inválido`);
        }
        if (
          typeof condition.operator !== 'string' ||
          !ALLOWED_OPERATORS.includes(condition.operator)
        ) {
          errors.push(`${prefix}.display_condition.operator inválido`);
        }
      }
    }

    for (const [index, question] of questions.entries()) {
      if (question.display_condition) {
        const condition = question.display_condition as Record<string, unknown>;
        if (typeof condition.question_id === 'string' && !ids.has(condition.question_id)) {
          errors.push(
            `questions[${index}].display_condition.question_id referencia pergunta inexistente`,
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

