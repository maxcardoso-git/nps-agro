"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAndNormalizeAnswer = validateAndNormalizeAnswer;
const common_1 = require("@nestjs/common");
const survey_errors_1 = require("./survey.errors");
function validateAndNormalizeAnswer(question, value) {
    switch (question.type) {
        case 'nps': {
            const numeric = toFiniteNumber(value);
            if (numeric < 0 || numeric > 10) {
                throw new survey_errors_1.SurveyException('INVALID_RANGE', 'NPS value must be between 0 and 10');
            }
            return numeric;
        }
        case 'scale': {
            const numeric = toFiniteNumber(value);
            const min = question.scale?.min;
            const max = question.scale?.max;
            if (min === undefined || max === undefined) {
                throw new survey_errors_1.SurveyException('INVALID_QUESTION_SCHEMA', 'Scale question requires min and max', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
            }
            if (numeric < min || numeric > max) {
                throw new survey_errors_1.SurveyException('INVALID_RANGE', `Scale value must be between ${min} and ${max}`);
            }
            return numeric;
        }
        case 'number': {
            return toFiniteNumber(value);
        }
        case 'single_choice': {
            if (typeof value !== 'string') {
                throw new survey_errors_1.SurveyException('INVALID_ANSWER_TYPE', 'Single choice answer must be a string');
            }
            if (!question.options?.includes(value)) {
                throw new survey_errors_1.SurveyException('INVALID_ANSWER_TYPE', 'Single choice answer is not in allowed options');
            }
            return value;
        }
        case 'multi_choice': {
            if (!Array.isArray(value)) {
                throw new survey_errors_1.SurveyException('INVALID_ANSWER_TYPE', 'Multi choice answer must be an array');
            }
            const options = question.options ?? [];
            const invalid = value.some((item) => typeof item !== 'string' || !options.includes(item));
            if (invalid) {
                throw new survey_errors_1.SurveyException('INVALID_ANSWER_TYPE', 'Multi choice answer has invalid option');
            }
            return value;
        }
        case 'text': {
            if (typeof value !== 'string') {
                throw new survey_errors_1.SurveyException('INVALID_ANSWER_TYPE', 'Text answer must be a string');
            }
            if (question.required && value.trim().length === 0) {
                throw new survey_errors_1.SurveyException('REQUIRED_QUESTION_MISSING', 'Required text answer cannot be empty');
            }
            return value;
        }
        case 'boolean': {
            if (typeof value !== 'boolean') {
                throw new survey_errors_1.SurveyException('INVALID_ANSWER_TYPE', 'Boolean answer must be true or false');
            }
            return value;
        }
        default:
            throw new survey_errors_1.SurveyException('INVALID_ANSWER_TYPE', 'Unsupported question type');
    }
}
function toFiniteNumber(value) {
    if (typeof value !== 'number') {
        throw new survey_errors_1.SurveyException('INVALID_ANSWER_TYPE', 'Answer must be numeric');
    }
    if (!Number.isFinite(value)) {
        throw new survey_errors_1.SurveyException('INVALID_ANSWER_TYPE', 'Answer must be a finite number');
    }
    return value;
}
//# sourceMappingURL=answer-validation.js.map