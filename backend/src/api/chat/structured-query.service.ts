import { Injectable } from '@nestjs/common';
import {
  STRUCTURED_QUERY_DEADLINE_EXCEEDED_CODE,
  StructuredDataRepository,
} from '../../repository/structured-data.repository';
import { STRUCTURED_QUERY_TIMEOUT_MS } from '../../shared/structured-data/structured-data.constants';
import type { StructuredQueryResult, StructuredQuerySpec } from './chat.types';
import {
  StructuredQueryValidator,
  type ValidatedStructuredQuery,
} from './structured-query.validator';

export const STRUCTURED_QUERY_TIMEOUT_CODE = 'STRUCTURED_QUERY_TIMEOUT';

export class StructuredQueryExecutionError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'StructuredQueryExecutionError';
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isDatabaseStatementTimeout(error: unknown): boolean {
  if (!isRecord(error)) return false;
  if (error.code === '57014') return true;
  if (
    typeof error.message === 'string' &&
    error.message.toLowerCase().includes('statement timeout')
  ) {
    return true;
  }
  return isDatabaseStatementTimeout(error.meta);
}

function isRepositoryDeadline(error: unknown): boolean {
  return (
    isRecord(error) && error.code === STRUCTURED_QUERY_DEADLINE_EXCEEDED_CODE
  );
}

function isPrismaTransactionTimeout(error: unknown): boolean {
  if (!isRecord(error)) return false;
  if (error.code === 'P2028') {
    const details = [
      error.message,
      isRecord(error.meta) ? error.meta.message : undefined,
      isRecord(error.meta) ? error.meta.cause : undefined,
    ]
      .filter((value): value is string => typeof value === 'string')
      .join(' ')
      .toLowerCase();
    return (
      details.includes('transaction') &&
      (details.includes('timeout') ||
        details.includes('timed out') ||
        details.includes('expired'))
    );
  }
  return isPrismaTransactionTimeout(error.meta);
}

function timeoutError(): StructuredQueryExecutionError {
  return new StructuredQueryExecutionError(
    STRUCTURED_QUERY_TIMEOUT_CODE,
    'Structured query execution timed out',
  );
}

@Injectable()
export class StructuredQueryService {
  constructor(
    private readonly repository: StructuredDataRepository,
    private readonly validator: StructuredQueryValidator,
  ) {}

  async execute(
    spec: StructuredQuerySpec,
    collectionId: string,
  ): Promise<StructuredQueryResult> {
    const deadlineAt = Date.now() + STRUCTURED_QUERY_TIMEOUT_MS;
    return this.withTimeout(deadlineAt, () =>
      this.executeWithinDeadline(spec, collectionId, deadlineAt),
    );
  }

  private async executeWithinDeadline(
    spec: StructuredQuerySpec,
    collectionId: string,
    deadlineAt: number,
  ): Promise<StructuredQueryResult> {
    try {
      const catalog = await this.repository.getCatalog(
        collectionId,
        deadlineAt,
      );
      this.assertBeforeDeadline(deadlineAt);
      const query = this.validator.validate(spec, catalog);
      return await this.executeValidated(query, collectionId, deadlineAt);
    } catch (error) {
      if (
        isRepositoryDeadline(error) ||
        isDatabaseStatementTimeout(error) ||
        isPrismaTransactionTimeout(error)
      ) {
        throw timeoutError();
      }
      throw error;
    }
  }

  private executeValidated(
    query: ValidatedStructuredQuery,
    collectionId: string,
    deadlineAt: number,
  ): Promise<StructuredQueryResult> {
    switch (query.operation) {
      case 'count_rows':
      case 'count_distinct':
        return this.repository.countRows(query, collectionId, deadlineAt);
      case 'sum':
      case 'average':
        return this.repository.aggregateDecimal(
          query,
          collectionId,
          deadlineAt,
        );
      case 'minimum':
      case 'maximum':
      case 'top_n':
      case 'bottom_n':
        return this.repository.rankRows(query, collectionId, deadlineAt);
      case 'group':
        return this.repository.groupRows(query, collectionId, deadlineAt);
      case 'list':
        return this.repository.listRows(query, collectionId, deadlineAt);
      case 'compare':
        return this.repository.compareRows(query, collectionId, deadlineAt);
    }
  }

  private assertBeforeDeadline(deadlineAt: number): void {
    if (Date.now() >= deadlineAt) throw timeoutError();
  }

  private async withTimeout<T>(
    deadlineAt: number,
    execution: () => Promise<T>,
  ): Promise<T> {
    const remainingMs = deadlineAt - Date.now();
    if (remainingMs <= 0) throw timeoutError();
    let timeout: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timeout = setTimeout(() => reject(timeoutError()), remainingMs);
    });

    try {
      return await Promise.race([execution(), timeoutPromise]);
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }
}
