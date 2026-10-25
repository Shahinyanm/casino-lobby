import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import type { ApiError } from '@lobby/contracts';
import { DepositDeclinedError, InsufficientFundsError } from '../wallet/wallet.service';
import { IdempotencyConflictError } from './idempotency';

/** Every HTTP error leaves the API as `ApiError`, so the client can map `code` to a translated message. */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType() !== 'http') throw exception;

    const [status, body] = this.toApiError(exception);
    host.switchToHttp().getResponse<Response>().status(status).json(body);
  }

  private toApiError(exception: unknown): [number, ApiError] {
    if (exception instanceof DepositDeclinedError) {
      return [422, { code: 'DEPOSIT_DECLINED', message: 'The payment provider declined this deposit.' }];
    }
    if (exception instanceof InsufficientFundsError) {
      return [422, { code: 'INSUFFICIENT_FUNDS', message: 'The balance does not cover this bet.' }];
    }
    if (exception instanceof IdempotencyConflictError) {
      return [409, { code: 'IDEMPOTENCY_CONFLICT', message: 'Idempotency key was already used for another request.' }];
    }
    if (exception instanceof BadRequestException) {
      const response = exception.getResponse();
      const details = typeof response === 'object' && 'message' in response ? response.message : exception.message;
      return [400, { code: 'VALIDATION_FAILED', message: [details].flat().join('; ') }];
    }
    if (exception instanceof NotFoundException) {
      return [404, { code: 'NOT_FOUND', message: exception.message }];
    }
    if (exception instanceof HttpException) {
      return [exception.getStatus(), { code: 'INTERNAL', message: exception.message }];
    }

    this.logger.error(exception);
    return [500, { code: 'INTERNAL', message: 'Unexpected server error.' }];
  }
}
