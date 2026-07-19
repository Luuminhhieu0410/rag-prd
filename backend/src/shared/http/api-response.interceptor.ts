import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { ApiResponse } from './api-response';
import { SSE_METADATA } from '@nestjs/common/constants';

@Injectable()
export class ApiResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    if (Reflect.getMetadata(SSE_METADATA, context.getHandler())) {
      return next.handle() as Observable<ApiResponse<T>>;
    }
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data: data ?? null,
      })),
    );
  }
}
