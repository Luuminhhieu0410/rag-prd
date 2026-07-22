import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { ConversationRepository } from '../../repository/conversation.repository';
import { DocumentRepository } from '../../repository/documents.repository';
import { MessageRepository } from '../../repository/message.repository';
import { QueryPlanner } from './query-planner';
import { ChatRetrievalService } from './chat-retrieval.service';
import { StructuredQueryService } from './structured-query.service';
import { OpenaiEmbeddingProvider } from '../../embedding/providers/openai-embedding.povider';
import type { ChatEvent } from './chat-events';
import { buildAnswerMessages } from './chat.prompts';
import { parseChatCitations, parseStructuredResultMeta } from './chat.types';
import type {
  ChatCitation,
  ChatMessageDto,
  RetrievedChunk,
  StructuredQueryResult,
  StructuredResultMeta,
} from './chat.types';

export type SendChatInput =
  | { content: string; userMessageId?: never }
  | { content?: never; userMessageId: string };

@Injectable()
export class ChatService {
  private readonly activeCollections = new Set<string>();

  constructor(
    private readonly conversations: ConversationRepository,
    private readonly messages: MessageRepository,
    private readonly documents: DocumentRepository,
    private readonly planner: QueryPlanner,
    private readonly retrieval: ChatRetrievalService,
    private readonly structured: StructuredQueryService,
    private readonly provider: OpenaiEmbeddingProvider,
  ) {}

  async history(
    collectionId: string,
    userId: string,
    cursor?: string,
    limit?: number,
  ) {
    const conversation = await this.conversations.findByCollectionAndUser(
      collectionId,
      userId,
    );
    if (!conversation) {
      return { conversationId: null, messages: [], nextCursor: null };
    }
    const page = await this.messages.findHistory(
      conversation.id,
      cursor,
      limit,
    );
    return { conversationId: conversation.id, ...page };
  }

  async *stream(
    collectionId: string,
    userId: string,
    input: SendChatInput,
    signal?: AbortSignal,
  ): AsyncGenerator<ChatEvent> {
    if (this.activeCollections.has(collectionId)) {
      throw new ConflictException('A response is already being generated');
    }
    this.activeCollections.add(collectionId);
    try {
      if (
        (await this.documents.countReadyByCollectionAndUser(
          collectionId,
          userId,
        )) === 0
      ) {
        throw new BadRequestException('No ready sources in this collection');
      }
      let conversationId: string;
      let question: string;
      let userMessage: ChatMessageDto;
      if ('userMessageId' in input && input.userMessageId) {
        const existing = await this.messages.findRetryable(
          collectionId,
          userId,
          input.userMessageId,
        );
        conversationId = existing.conversationId;
        question = existing.content;
        userMessage = this.toDto(existing);
      } else {
        question = input.content?.trim() ?? '';
        if (!question || question.length > 8_000) {
          throw new BadRequestException('Message content is invalid');
        }
        const conversation = await this.conversations.getOrCreate(
          collectionId,
          userId,
        );
        conversationId = conversation.id;
        const created = await this.messages.createUser(
          conversationId,
          question,
        );
        userMessage = this.toDto(created);
      }
      yield { event: 'accepted', data: { userMessage } };

      const historyPage = await this.messages.findHistory(
        conversationId,
        undefined,
        20,
      );
      const history = historyPage.messages.filter(
        (message) => message.id !== userMessage.id,
      );
      if (this.planner.requiresAnalysis(question)) {
        yield { event: 'status', data: { stage: 'analyzing' } };
      }
      const plan = await this.planner.plan(question, history, collectionId);

      if (plan.mode === 'clarification' || plan.mode === 'unsupported') {
        const content =
          plan.mode === 'clarification' ? plan.message : plan.reason;
        yield { event: 'status', data: { stage: 'generating' } };
        if (signal?.aborted) return;
        yield { event: 'token', data: { delta: content } };
        if (signal?.aborted) return;
        const saved = await this.messages.createAssistant({
          conversationId,
          content,
          citations: [],
          structuredResultMeta: null,
        });
        yield { event: 'completed', data: { message: this.toDto(saved) } };
        return;
      }

      let chunks: RetrievedChunk[] = [];
      let structuredResult: StructuredQueryResult | null = null;
      try {
        if (plan.mode === 'retrieval') {
          yield { event: 'status', data: { stage: 'retrieving' } };
          chunks = await this.retrieval.retrieve(
            plan.retrieval,
            plan.standaloneQuestion,
            collectionId,
          );
        } else if (plan.mode === 'structured') {
          yield { event: 'status', data: { stage: 'querying' } };
          structuredResult = await this.structured.execute(
            plan.query,
            collectionId,
          );
        } else {
          yield { event: 'status', data: { stage: 'retrieving' } };
          yield { event: 'status', data: { stage: 'querying' } };
          [chunks, structuredResult] = await Promise.all([
            this.retrieval.retrieve(
              plan.retrieval,
              plan.standaloneQuestion,
              collectionId,
            ),
            this.structured.execute(plan.query, collectionId),
          ]);
        }
      } catch (error) {
        if (plan.mode === 'retrieval') throw error;
        const content =
          'I could not complete the exact structured analysis. No approximate retrieval answer was substituted.';
        yield { event: 'status', data: { stage: 'generating' } };
        if (signal?.aborted) return;
        yield { event: 'token', data: { delta: content } };
        if (signal?.aborted) return;
        const saved = await this.messages.createAssistant({
          conversationId,
          content,
          citations: [],
          structuredResultMeta: null,
        });
        yield { event: 'completed', data: { message: this.toDto(saved) } };
        return;
      }

      const structuredResultMeta = structuredResult
        ? this.structuredMeta(structuredResult)
        : null;
      yield { event: 'status', data: { stage: 'generating' } };
      const stream = await this.provider.streamChat({
        messages: buildAnswerMessages(
          plan.standaloneQuestion,
          history,
          chunks,
          structuredResult,
        ),
        signal,
      });
      let content = '';
      for await (const part of stream) {
        if (signal?.aborted) return;
        const delta = part.choices[0]?.delta?.content ?? '';
        if (!delta) continue;
        content += delta;
        yield { event: 'token', data: { delta } };
      }
      const citations = this.citationsFor(content, chunks, structuredResult);
      if (signal?.aborted) return;
      const saved = await this.messages.createAssistant({
        conversationId,
        content,
        citations,
        structuredResultMeta,
      });
      yield { event: 'completed', data: { message: this.toDto(saved) } };
    } finally {
      this.activeCollections.delete(collectionId);
    }
  }

  private citationsFor(
    content: string,
    chunks: RetrievedChunk[],
    structuredResult: StructuredQueryResult | null,
  ): ChatCitation[] {
    const used = new Set<number>();
    const evidenceCount = chunks.length + (structuredResult?.rows.length ?? 0);
    for (const match of content.matchAll(/\[(\d+)]/g)) {
      const number = Number(match[1]);
      if (number >= 1 && number <= evidenceCount) used.add(number);
    }
    const citations: ChatCitation[] = chunks.map((chunk, index) => ({
      kind: 'chunk',
      number: index + 1,
      documentId: chunk.documentId,
      chunkId: chunk.chunkId,
      documentName: chunk.documentName,
      page: chunk.page,
      excerpt: chunk.pageContent.slice(0, 600),
      score: chunk.score,
    }));
    for (const [index, row] of (structuredResult?.rows ?? []).entries()) {
      citations.push({
        kind: 'structured',
        number: chunks.length + index + 1,
        documentId: row.documentId,
        documentName: row.documentName,
        datasetId: row.datasetId,
        datasetName: row.datasetName,
        rowId: row.rowId,
        table: row.table,
        row: row.row,
        excerpt: row.renderedText.slice(0, 600),
      });
    }
    return citations.filter((citation) => used.has(citation.number));
  }

  private structuredMeta(result: StructuredQueryResult): StructuredResultMeta {
    const meta = parseStructuredResultMeta({
      operation: result.operation,
      exact: result.coverage.exact,
      truncated: result.truncated,
      totalRows: result.coverage.totalRows,
      consideredRows: result.coverage.consideredRows,
      nullCells: result.coverage.nullCells,
      invalidCells: result.coverage.invalidCells,
      notes: result.coverage.notes,
    });
    if (!meta) throw new Error('Structured result metadata is invalid');
    return meta;
  }

  private toDto(row: {
    id: string;
    role: string;
    content: string;
    citations?: unknown;
    structuredResultMeta?: unknown;
    createdAt: Date | string;
  }): ChatMessageDto {
    return {
      id: row.id,
      role: row.role as ChatMessageDto['role'],
      content: row.content,
      citations: parseChatCitations(row.citations),
      structuredResultMeta: parseStructuredResultMeta(row.structuredResultMeta),
      createdAt: row.createdAt,
    };
  }
}
