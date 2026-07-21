import { Injectable } from '@nestjs/common';
import type { ChatMessageDto, QueryAnalysis, QueryPlan } from './chat.types';
import { OpenaiEmbeddingProvider } from '../../embedding/providers/openai-embedding.povider';
import {
  QUERY_ANALYSIS_SCHEMA,
  buildQueryAnalysisMessages,
} from './chat.prompts';

const COMPLEX_SIGNALS = [
  /\b(compare|comparison|contrast|analy[sz]e|synthesi[sz]e|evaluate|why|relationship)\b/i,
  /\b(so sánh|phân tích|tổng hợp|đánh giá|tại sao|nguyên nhân|mối liên hệ)\b/i,
  /\b(và|and|versus|vs\.?|so với)\b/i,
  /\b(nó|điều đó|phần trên|vừa nói|that|it|previous)\b/i,
];

@Injectable()
export class QueryPlanner {
  constructor(private readonly analyzer: OpenaiEmbeddingProvider) {}

  async plan(question: string, history: ChatMessageDto[]): Promise<QueryPlan> {
    const normalized = question.trim();
    const complex = this.requiresAnalysis(normalized);
    if (!complex) return this.fallback(normalized, 'simple');

    try {
      const analysis = await this.analyzer.structuredChat<QueryAnalysis>({
        messages: buildQueryAnalysisMessages(normalized, history),
        schemaName: 'query_analysis',
        schema: QUERY_ANALYSIS_SCHEMA,
      });
      return this.normalizeAnalysis(analysis, normalized);
    } catch {
      return this.fallback(normalized, 'complex');
    }
  }

  requiresAnalysis(question: string) {
    const clauses = question.split(/[,;]|\band\b|\bvà\b/i).length;
    return (
      question.length > 180 ||
      clauses > 2 ||
      COMPLEX_SIGNALS.some((signal) => signal.test(question))
    );
  }

  private normalizeAnalysis(
    analysis: QueryAnalysis,
    fallbackQuestion: string,
  ): QueryPlan {
    const searchQueries = Array.from(
      new Set(
        (analysis.searchQueries ?? [])
          .map((query) => query.trim())
          .filter(Boolean),
      ),
    ).slice(0, 4);
    return {
      complexity: 'complex',
      intent: analysis.intent?.trim() || 'question',
      standaloneQuestion:
        analysis.standaloneQuestion?.trim() || fallbackQuestion,
      searchQueries: searchQueries.length ? searchQueries : [fallbackQuestion],
      keywords: Array.from(
        new Set(
          (analysis.keywords ?? []).map((word) => word.trim()).filter(Boolean),
        ),
      ).slice(0, 12),
      requiresMultipleSources: Boolean(analysis.requiresMultipleSources),
    };
  }

  private fallback(
    question: string,
    complexity: QueryPlan['complexity'],
  ): QueryPlan {
    return {
      complexity,
      intent: 'question',
      standaloneQuestion: question,
      searchQueries: [question],
      keywords: [],
      requiresMultipleSources: false,
    };
  }
}
