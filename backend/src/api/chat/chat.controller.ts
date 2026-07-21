import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  MessageEvent,
  Param,
  ParseIntPipe,
  Query,
  Req,
  RequestMethod,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { METHOD_METADATA } from '@nestjs/common/constants';
import type { Request } from 'express';
import { catchError, finalize, from, map, Observable, of } from 'rxjs';
import { CheckOwnership } from '../auth/decorators/check-ownership.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OwnershipGuard } from '../auth/ownership.guard';
import { ChatService, type SendChatInput } from './chat.service';

@Controller('api/collection/:collectionId/chat')
@CheckOwnership('collection', 'collectionId')
@UseGuards(OwnershipGuard)
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get()
  history(
    @CurrentUser() user: AuthUser,
    @Param('collectionId') collectionId: string,
    @Query('cursor') cursor?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.chat.history(collectionId, user.id, cursor, limit);
  }

  @Sse('stream', { [METHOD_METADATA]: RequestMethod.POST })
  @HttpCode(HttpStatus.OK)
  stream(
    @CurrentUser() user: AuthUser,
    @Param('collectionId') collectionId: string,
    @Body() body: SendChatInput,
    @Req() request: Request,
  ): Observable<MessageEvent> {
    const controller = new AbortController();
    const abort = () => controller.abort();
    request.once('close', abort);

    return from(
      this.chat.stream(collectionId, user.id, body, controller.signal),
    ).pipe(
      map(
        (event): MessageEvent => ({
          type: event.event,
          data: event.data,
        }),
      ),
      catchError((error) =>
        of({
          type: 'error',
          data: {
            code: this.errorCode(error),
            message: this.clientMessage(error),
            retryable: this.isRetryable(error),
          },
        } satisfies MessageEvent),
      ),
      finalize(() => {
        request.off('close', abort);
        controller.abort();
      }),
    );
  }

  private errorCode(error: unknown) {
    console.error(error);
    const status = (error as { status?: number })?.status;
    if (status === 400) return 'INVALID_REQUEST';
    if (status === 409) return 'GENERATION_IN_PROGRESS';
    if (status === 429) return 'RATE_LIMITED';
    return 'GENERATION_FAILED';
  }

  private isRetryable(error: unknown) {
    const status = (error as { status?: number })?.status;
    return status !== 400 && status !== 403 && status !== 404 && status !== 409;
  }

  private clientMessage(error: unknown) {
    const status = (error as { status?: number })?.status;
    if (status === 400)
      return 'The chat request is invalid or has no ready sources.';
    if (status === 409) return 'Another answer is already being generated.';
    if (status === 429)
      return 'The AI service is busy. Please try again shortly.';
    return 'The answer could not be completed. Please try again.';
  }
}
