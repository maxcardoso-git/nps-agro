"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SurveyException = void 0;
const common_1 = require("@nestjs/common");
class SurveyException extends common_1.HttpException {
    constructor(errorCode, message, status = common_1.HttpStatus.BAD_REQUEST, details) {
        super({
            error_code: errorCode,
            message,
            details,
        }, status);
    }
}
exports.SurveyException = SurveyException;
//# sourceMappingURL=survey.errors.js.map