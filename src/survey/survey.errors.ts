import { HttpException, HttpStatus } from '@nestjs/common';

export class SurveyException extends HttpException {
  constructor(
    errorCode: string,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: unknown,
  ) {
    super(
      {
        error_code: errorCode,
        message,
        details,
      },
      status,
    );
  }
}

