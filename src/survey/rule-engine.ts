import { Injectable } from '@nestjs/common';
import { DisplayCondition, Question } from './survey.types';

@Injectable()
export class RuleEngine {
  shouldDisplayQuestion(question: Question, answersByQuestionId: Map<string, unknown>): boolean {
    if (!question.display_condition) {
      return true;
    }

    return this.evaluateCondition(question.display_condition, answersByQuestionId);
  }

  evaluateCondition(condition: DisplayCondition, answersByQuestionId: Map<string, unknown>): boolean {
    const left = answersByQuestionId.get(condition.question_id);
    const right = condition.value;

    if (left === undefined) {
      return false;
    }

    switch (condition.operator) {
      case 'equals':
        return String(left) === String(right);
      case 'not_equals':
        return String(left) !== String(right);
      case 'in':
        return Array.isArray(right) && right.some((item) => String(item) === String(left));
      case 'not_in':
        return Array.isArray(right) && right.every((item) => String(item) !== String(left));
      case 'gte':
        return Number(left) >= Number(right);
      case 'lte':
        return Number(left) <= Number(right);
      case 'gt':
        return Number(left) > Number(right);
      case 'lt':
        return Number(left) < Number(right);
      default:
        return false;
    }
  }
}

