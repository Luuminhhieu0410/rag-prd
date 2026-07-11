import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiResponse } from './api-response';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    console.log(exception);
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const message =
      exception instanceof HttpException
        ? this.getMessage(exception.getResponse())
        : 'Internal server error';

    if (!(exception instanceof HttpException)) this.logger.error(exception);

    const body: ApiResponse<null> = { success: false, data: null };
    if (message) body.message = message;
    response.status(status).json(body);
  }

  private getMessage(response: string | object): string | undefined {
    if (typeof response === 'string') return response;
    if (!('message' in response)) return undefined;
    const message = response.message;
    return Array.isArray(message)
      ? message.join(', ')
      : typeof message === 'string'
        ? message
        : undefined;
  }
}
