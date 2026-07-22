import { Injectable } from '@nestjs/common';
import { OpenaiEmbeddingProvider } from '../../embedding/providers/openai-embedding.povider';
import { StructuredDataRepository } from '../../repository/structured-data.repository';
import { STRUCTURED_TOP_N_MAX } from '../../shared/structured-data/structured-data.constants';
import type { StructuredDatasetCatalog } from '../../shared/structured-data/structured-data.types';
import {
  buildQueryAnalysisMessages,
  buildQueryAnalysisSchema,
} from './chat.prompts';
import type {
  ChatComplexity,
  ChatMessageDto,
  QueryPlan,
  RetrievalPlan,
  RetrievalSpec,
  StructuredFilter,
  StructuredOperation,
  StructuredQuerySpec,
} from './chat.types';

const COMPLEX_SIGNALS = [
  /\b(compare|comparison|contrast|analy[sz]e|synthesi[sz]e|evaluate|why|relationship)\b/i,
  /\b(so sánh|phân tích|tổng hợp|đánh giá|tại sao|nguyên nhân|mối liên hệ)\b/i,
  /\b(và|and|versus|vs\.?|so với)\b/i,
  /\b(nó|điều đó|phần trên|vừa nói|that|it|previous)\b/i,
];

const ANALYTICAL_SIGNALS = [
  /\b(how many|count|total|average|mean|sum|largest|smallest|highest|lowest|maximum|minimum|top\s+\d+|bottom\s+\d+|list\s+all|all|most|least)\b/i,
  /(bao nhiêu|đếm|tổng(?: cộng| số)?|trung bình|lớn nhất|nhỏ nhất|cao nhất|thấp nhất|nhiều nhất|ít nhất|top\s*\d+|liệt kê tất cả|tất cả)/i,
];

const STRUCTURED_OPERATIONS = new Set<StructuredOperation>([
  'count_rows',
  'count_distinct',
  'sum',
  'average',
  'minimum',
  'maximum',
  'top_n',
  'bottom_n',
  'group',
  'list',
  'compare',
]);

const FILTER_OPERATORS = new Set<StructuredFilter['operator']>([
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'contains',
]);

const NO_ELIGIBLE_DATASET_REASON =
  'No active eligible structured dataset is available for exact analytics.';
const INVALID_STRUCTURED_PLAN_REASON =
  'A valid structured query plan could not be produced for this analytical question.';

@Injectable()
export class QueryPlanner {
  constructor(
    private readonly analyzer: OpenaiEmbeddingProvider,
    private readonly structuredData: StructuredDataRepository,
  ) {}

  async plan(
    question: string,
    history: ChatMessageDto[],
    collectionId: string,
  ): Promise<QueryPlan> {
    const normalized = question.trim();
    const analytical = this.hasAnalyticalIntent(normalized);
    const complex = this.requiresAnalysis(normalized);
    if (!complex) return this.retrievalFallback(normalized, 'simple');

    let catalog: StructuredDatasetCatalog[];
    try {
      catalog = await this.structuredData.getCatalog(collectionId);
    } catch {
      return analytical
        ? this.unsupported(normalized, INVALID_STRUCTURED_PLAN_REASON)
        : this.retrievalFallback(normalized, 'complex');
    }
    if (analytical && catalog.length === 0) {
      return this.unsupported(normalized, NO_ELIGIBLE_DATASET_REASON);
    }

    try {
      const analysis = await this.analyzer.structuredChat<unknown>({
        messages: buildQueryAnalysisMessages(normalized, history, catalog),
        schemaName: 'query_plan',
        schema: buildQueryAnalysisSchema(catalog),
      });
      return this.normalizeAnalysis(analysis, normalized, catalog, analytical);
    } catch {
      return analytical
        ? this.unsupported(normalized, INVALID_STRUCTURED_PLAN_REASON)
        : this.retrievalFallback(normalized, 'complex');
    }
  }

  requiresAnalysis(question: string): boolean {
    const clauses = question.split(/[,;]|\band\b|\bvà\b/i).length;
    return (
      this.hasAnalyticalIntent(question) ||
      question.length > 180 ||
      clauses > 2 ||
      COMPLEX_SIGNALS.some((signal) => signal.test(question))
    );
  }

  hasAnalyticalIntent(question: string): boolean {
    return ANALYTICAL_SIGNALS.some((signal) => signal.test(question));
  }

  private normalizeAnalysis(
    analysis: unknown,
    fallbackQuestion: string,
    catalog: StructuredDatasetCatalog[],
    analytical: boolean,
  ): QueryPlan {
    if (!isRecord(analysis) || typeof analysis.mode !== 'string') {
      throw new Error('query plan shape is invalid');
    }
    const standaloneQuestion =
      typeof analysis.standaloneQuestion === 'string' &&
      analysis.standaloneQuestion.trim()
        ? analysis.standaloneQuestion.trim()
        : fallbackQuestion;

    switch (analysis.mode) {
      case 'retrieval':
        if (analytical) {
          return this.unsupported(
            standaloneQuestion,
            INVALID_STRUCTURED_PLAN_REASON,
          );
        }
        return {
          mode: 'retrieval',
          standaloneQuestion,
          retrieval: this.normalizeRetrieval(
            analysis.retrieval,
            fallbackQuestion,
            'complex',
          ),
        };
      case 'structured': {
        const query = this.normalizeStructuredQuery(analysis.query, catalog);
        if (this.needsDatasetClarification(fallbackQuestion, catalog, query)) {
          return this.clarification(standaloneQuestion);
        }
        return { mode: 'structured', standaloneQuestion, query };
      }
      case 'mixed': {
        const query = this.normalizeStructuredQuery(analysis.query, catalog);
        if (this.needsDatasetClarification(fallbackQuestion, catalog, query)) {
          return this.clarification(standaloneQuestion);
        }
        return {
          mode: 'mixed',
          standaloneQuestion,
          query,
          retrieval: this.normalizeRetrieval(
            analysis.retrieval,
            fallbackQuestion,
            'complex',
          ),
        };
      }
      case 'clarification':
        if (typeof analysis.message !== 'string' || !analysis.message.trim()) {
          throw new Error('clarification message is invalid');
        }
        return {
          mode: 'clarification',
          standaloneQuestion,
          message: analysis.message.trim(),
        };
      case 'unsupported':
        if (typeof analysis.reason !== 'string' || !analysis.reason.trim()) {
          throw new Error('unsupported reason is invalid');
        }
        return {
          mode: 'unsupported',
          standaloneQuestion,
          reason: analysis.reason.trim(),
        };
      default:
        throw new Error('query plan mode is invalid');
    }
  }

  private normalizeRetrieval(
    value: unknown,
    fallbackQuestion: string,
    complexity: ChatComplexity,
  ): RetrievalSpec {
    if (!isRecord(value)) throw new Error('retrieval plan is invalid');
    const queries = Array.isArray(value.searchQueries)
      ? value.searchQueries
          .filter((query): query is string => typeof query === 'string')
          .map((query) => query.trim())
          .filter(Boolean)
      : [];
    const keywords = Array.isArray(value.keywords)
      ? value.keywords
          .filter((keyword): keyword is string => typeof keyword === 'string')
          .map((keyword) => keyword.trim())
          .filter(Boolean)
      : [];
    const searchQueries = Array.from(new Set(queries)).slice(0, 4);

    return {
      complexity,
      searchQueries: searchQueries.length ? searchQueries : [fallbackQuestion],
      keywords: Array.from(new Set(keywords)).slice(0, 12),
      requiresMultipleSources: Boolean(value.requiresMultipleSources),
    };
  }

  private normalizeStructuredQuery(
    value: unknown,
    catalog: StructuredDatasetCatalog[],
  ): StructuredQuerySpec {
    if (!isRecord(value) || !isStructuredOperation(value.operation)) {
      throw new Error('structured operation is invalid');
    }
    const datasetIds = stringArray(value.datasetIds);
    if (datasetIds.length === 0 || datasetIds.length > 1) {
      throw new Error('structured dataset selection is invalid');
    }
    const knownDatasetIds = new Set(catalog.map((dataset) => dataset.id));
    if (datasetIds.some((id) => !knownDatasetIds.has(id))) {
      throw new Error('structured dataset ID is unknown');
    }
    const knownColumnIds = new Set(
      catalog.flatMap((dataset) => dataset.columns.map((column) => column.id)),
    );
    const metricColumnId = nullableId(value.metricColumnId, knownColumnIds);
    const dimensionColumnId = nullableId(
      value.dimensionColumnId,
      knownColumnIds,
    );
    const groupByColumnId = nullableId(value.groupByColumnId, knownColumnIds);
    if (!Array.isArray(value.filters)) {
      throw new Error('structured filters are invalid');
    }
    const filters = value.filters.map((filter) => {
      if (
        !isRecord(filter) ||
        typeof filter.columnId !== 'string' ||
        !knownColumnIds.has(filter.columnId) ||
        !isFilterOperator(filter.operator) ||
        typeof filter.value !== 'string'
      ) {
        throw new Error('structured filter is invalid');
      }
      return {
        columnId: filter.columnId,
        operator: filter.operator,
        value: filter.value,
      };
    });
    if (filters.length > 10) throw new Error('too many structured filters');
    const limit = value.limit;
    if (
      limit !== null &&
      (!Number.isInteger(limit) ||
        Number(limit) < 1 ||
        Number(limit) > STRUCTURED_TOP_N_MAX)
    ) {
      throw new Error('structured limit is invalid');
    }

    return {
      operation: value.operation,
      datasetIds,
      metricColumnId,
      dimensionColumnId,
      groupByColumnId,
      filters,
      limit: limit as number | null,
    };
  }

  private needsDatasetClarification(
    question: string,
    catalog: StructuredDatasetCatalog[],
    query: StructuredQuerySpec,
  ): boolean {
    if (catalog.length <= 1) return false;
    const referenced = this.referencedDatasetIds(question, catalog);
    return referenced.size !== 1 || !referenced.has(query.datasetIds[0]);
  }

  private referencedDatasetIds(
    question: string,
    catalog: StructuredDatasetCatalog[],
  ): Set<string> {
    const normalizedQuestion = normalizeReference(question);
    const tableReferences = new Set<string>();
    for (const dataset of catalog) {
      if (dataset.source !== 'docx_table') continue;
      const aliases = [dataset.name, dataset.name.replace(/^table/i, 'bảng')]
        .map(normalizeReference)
        .filter((alias) => alias.length >= 3);
      if (aliases.some((alias) => normalizedQuestion.includes(alias))) {
        tableReferences.add(dataset.id);
      }
    }
    if (tableReferences.size > 0) return tableReferences;

    const documentReferences = new Set<string>();
    for (const dataset of catalog) {
      const aliases = [
        dataset.documentName,
        dataset.documentName.replace(/\.[^.]+$/, ''),
      ]
        .map(normalizeReference)
        .filter((alias) => alias.length >= 3);
      if (aliases.some((alias) => normalizedQuestion.includes(alias))) {
        documentReferences.add(dataset.id);
      }
    }
    return documentReferences;
  }

  private retrievalFallback(
    question: string,
    complexity: ChatComplexity,
  ): RetrievalPlan {
    return {
      mode: 'retrieval',
      standaloneQuestion: question,
      retrieval: {
        complexity,
        searchQueries: [question],
        keywords: [],
        requiresMultipleSources: false,
      },
    };
  }

  private unsupported(question: string, reason: string): QueryPlan {
    return { mode: 'unsupported', standaloneQuestion: question, reason };
  }

  private clarification(question: string): QueryPlan {
    return {
      mode: 'clarification',
      standaloneQuestion: question,
      message:
        'Please specify which file, table, or dataset should be used for this calculation.',
    };
  }
}

function nullableId(value: unknown, knownIds: Set<string>): string | null {
  if (value === null) return null;
  if (typeof value !== 'string' || !knownIds.has(value)) {
    throw new Error('structured column ID is unknown');
  }
  return value;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error('expected a string array');
  }
  return Array.from(new Set(value as string[]));
}

function normalizeReference(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi');
}

function isStructuredOperation(value: unknown): value is StructuredOperation {
  return (
    typeof value === 'string' &&
    STRUCTURED_OPERATIONS.has(value as StructuredOperation)
  );
}

function isFilterOperator(
  value: unknown,
): value is StructuredFilter['operator'] {
  return (
    typeof value === 'string' &&
    FILTER_OPERATORS.has(value as StructuredFilter['operator'])
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
