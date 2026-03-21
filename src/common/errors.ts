import { HttpException, HttpStatus } from '@nestjs/common';

export class DomainException extends HttpException {
  constructor(code: string, message: string, status: HttpStatus, details?: unknown) {
    super(
      {
        error_code: code,
        message,
        details,
      },
      status,
    );
  }
}
