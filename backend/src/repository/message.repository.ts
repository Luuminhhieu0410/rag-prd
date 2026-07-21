import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import type { ChatCitation, ChatMessageDto } from '../api/chat/chat.types';
import { parseChatCitations } from '../api/chat/chat.types';
import { PostgresService } from '../databases/postgres/postgres.service';

@Injectable()
export class MessageRepository {
  constructor(private readonly postgres: PostgresService) {}

  async findHistory(
    conversationId: string,
    cursor?: string,
    requestedLimit = 30,
  ) {
    const limit = Math.min(Math.max(requestedLimit, 1), 50);
    const rows = await this.postgres.getClient().message.findMany({
      where: { conversationId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    const nextCursor = hasMore ? (page[page.length - 1]?.id ?? null) : null;
    return {
      messages: page.reverse().map((row) => this.toDto(row)),
      nextCursor,
    };
  }

  createUser(conversationId: string, content: string) {
    return this.postgres.getClient().message.create({
      data: { conversationId, role: 'user', content },
    });
  }

  createAssistant(input: {
    conversationId: string;
    content: string;
    citations: ChatCitation[];
    tokenIn?: number;
    tokenOut?: number;
  }) {
    return this.postgres.getClient().message.create({
      data: {
        conversationId: input.conversationId,
        role: 'assistant',
        content: input.content,
        citations: input.citations as unknown as Prisma.InputJsonValue,
        tokenIn: input.tokenIn,
        tokenOut: input.tokenOut,
      },
    });
  }

  async findRetryable(collectionId: string, userId: string, messageId: string) {
    const message = await this.postgres.getClient().message.findFirst({
      where: {
        id: messageId,
        role: 'user',
        conversation: { collectionId, userId },
      },
    });
    if (!message) throw new NotFoundException('Chat message not found');
    return message;
  }

  private toDto(row: {
    id: string;
    role: string;
    content: string;
    citations: unknown;
    createdAt: Date;
  }): ChatMessageDto {
    return {
      id: row.id,
      role: row.role as ChatMessageDto['role'],
      content: row.content,
      citations: parseChatCitations(row.citations),
      createdAt: row.createdAt,
    };
  }
}
