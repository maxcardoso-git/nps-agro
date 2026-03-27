"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuleEngine = void 0;
const common_1 = require("@nestjs/common");
let RuleEngine = class RuleEngine {
    shouldDisplayQuestion(question, answersByQuestionId) {
        if (!question.display_condition) {
            return true;
        }
        return this.evaluateCondition(question.display_condition, answersByQuestionId);
    }
    evaluateCondition(condition, answersByQuestionId) {
        const left = answersByQuestionId.get(condition.question_id);
        const right = condition.value;
        if (left === undefined) {
            return false;
        }
        switch (condition.operator) {
            case 'equals':
                return this.normalize(left) === this.normalize(right);
            case 'not_equals':
                return this.normalize(left) !== this.normalize(right);
            case 'in':
                return Array.isArray(right) && right.some((item) => this.normalize(item) === this.normalize(left));
            case 'not_in':
                return Array.isArray(right) && right.every((item) => this.normalize(item) !== this.normalize(left));
            case 'gte':
                return this.toNumber(left) >= this.toNumber(right);
            case 'lte':
                return this.toNumber(left) <= this.toNumber(right);
            case 'gt':
                return this.toNumber(left) > this.toNumber(right);
            case 'lt':
                return this.toNumber(left) < this.toNumber(right);
            default:
                return false;
        }
    }
    normalize(value) {
        return String(value);
    }
    toNumber(value) {
        const parsed = Number(value);
        if (Number.isNaN(parsed)) {
            return Number.NaN;
        }
        return parsed;
    }
};
exports.RuleEngine = RuleEngine;
exports.RuleEngine = RuleEngine = __decorate([
    (0, common_1.Injectable)()
], RuleEngine);
//# sourceMappingURL=rule-engine.js.map