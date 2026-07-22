import { Injectable } from '@nestjs/common';
import { STRUCTURED_TOP_N_MAX } from '../../shared/structured-data/structured-data.constants';
import type {
  ProfiledColumn,
  StructuredDatasetCatalog,
  StructuredValueType,
} from '../../shared/structured-data/structured-data.types';
import type {
  StructuredFilter,
  StructuredOperation,
  StructuredQuerySpec,
} from './chat.types';

export interface ValidatedStructuredQuery extends StructuredQuerySpec {
  datasets: StructuredDatasetCatalog[];
  metricColumn: ProfiledColumn | null;
  dimensionColumn: ProfiledColumn | null;
  groupByColumn: ProfiledColumn | null;
}

const RANGE_OPERATORS = new Set<StructuredFilter['operator']>([
  'gt',
  'gte',
  'lt',
  'lte',
]);

const DECIMAL_PATTERN = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isSemanticIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().startsWith(`${value}T`)
  );
}

@Injectable()
export class StructuredQueryValidator {
  validate(
    spec: StructuredQuerySpec,
    catalog: StructuredDatasetCatalog[],
  ): ValidatedStructuredQuery {
    if (spec.datasetIds.length !== 1) {
      throw new Error(
        'Structured queries must select exactly one active eligible catalog dataset',
      );
    }
    const matchingDatasets = catalog.filter(
      (dataset) => dataset.id === spec.datasetIds[0],
    );
    if (matchingDatasets.length !== 1) {
      throw new Error(
        'Structured queries must select exactly one active eligible catalog dataset',
      );
    }
    const dataset = matchingDatasets[0];
    const allCatalogColumnIds = new Set(
      catalog.flatMap((item) => item.columns.map((column) => column.id)),
    );
    const metricColumn = this.resolveColumn(
      'metric',
      spec.metricColumnId,
      dataset,
      allCatalogColumnIds,
    );
    const dimensionColumn = this.resolveColumn(
      'dimension',
      spec.dimensionColumnId,
      dataset,
      allCatalogColumnIds,
    );
    const groupByColumn = this.resolveColumn(
      'group-by',
      spec.groupByColumnId,
      dataset,
      allCatalogColumnIds,
    );

    if (
      spec.limit !== null &&
      (!Number.isInteger(spec.limit) ||
        spec.limit < 1 ||
        spec.limit > STRUCTURED_TOP_N_MAX)
    ) {
      throw new Error('Structured query limit must be between 1 and 100');
    }
    if (spec.filters.length > 10) {
      throw new Error('Structured queries support at most 10 filters');
    }
    for (const filter of spec.filters) {
      const column = this.resolveColumn(
        'filter',
        filter.columnId,
        dataset,
        allCatalogColumnIds,
      );
      if (!column) throw new Error('Structured filter column is required');
      this.validateFilter(filter, column);
    }

    this.validateOperation(
      spec.operation,
      metricColumn,
      dimensionColumn,
      groupByColumn,
      spec.limit,
    );

    return {
      ...spec,
      datasets: [dataset],
      metricColumn,
      dimensionColumn,
      groupByColumn,
    };
  }

  private resolveColumn(
    role: string,
    columnId: string | null,
    dataset: StructuredDatasetCatalog,
    allCatalogColumnIds: Set<string>,
  ): ProfiledColumn | null {
    if (columnId === null) return null;
    const column = dataset.columns.find((item) => item.id === columnId);
    if (column) return column;
    if (allCatalogColumnIds.has(columnId)) {
      throw new Error(
        `Structured ${role} column must belong to the selected dataset`,
      );
    }
    throw new Error(`Structured ${role} column ID is unknown`);
  }

  private validateOperation(
    operation: StructuredOperation,
    metric: ProfiledColumn | null,
    dimension: ProfiledColumn | null,
    groupBy: ProfiledColumn | null,
    limit: number | null,
  ): void {
    switch (operation) {
      case 'count_rows':
        return;
      case 'count_distinct':
        this.requireColumn(dimension, 'dimension column');
        return;
      case 'sum':
      case 'average':
        this.requireMetricType(metric, operation, ['decimal']);
        return;
      case 'minimum':
      case 'maximum':
        this.requireMetricType(metric, operation, ['decimal', 'date']);
        return;
      case 'top_n':
      case 'bottom_n':
        this.requireMetricType(metric, operation, ['decimal', 'date']);
        if (limit === null) {
          throw new Error(`${operation} requires a limit between 1 and 100`);
        }
        return;
      case 'group':
        this.requireColumn(groupBy, 'group-by column');
        if (metric) this.requireMetricType(metric, operation, ['decimal']);
        return;
      case 'list':
        return;
      case 'compare':
        this.requireColumn(dimension, 'dimension column');
        this.requireMetricType(metric, operation, ['decimal', 'date', 'text']);
        return;
    }
  }

  private requireColumn(
    column: ProfiledColumn | null,
    role: string,
  ): asserts column is ProfiledColumn {
    if (!column) throw new Error(`Structured operation requires a ${role}`);
  }

  private requireMetricType(
    metric: ProfiledColumn | null,
    operation: StructuredOperation,
    allowedTypes: StructuredValueType[],
  ): void {
    if (!metric || !allowedTypes.includes(metric.valueType)) {
      const typeDescription = allowedTypes.join(' or ');
      throw new Error(
        `Structured ${operation} requires a ${typeDescription} metric`,
      );
    }
  }

  private validateFilter(
    filter: StructuredFilter,
    column: ProfiledColumn,
  ): void {
    if (filter.operator === 'contains' && column.valueType !== 'text') {
      throw new Error(
        `Structured filter operator contains is not allowed for ${column.valueType}`,
      );
    }
    if (
      RANGE_OPERATORS.has(filter.operator) &&
      column.valueType !== 'decimal' &&
      column.valueType !== 'date'
    ) {
      throw new Error(
        `Structured filter operator ${filter.operator} is not allowed for ${column.valueType}`,
      );
    }
    if (
      filter.operator !== 'eq' &&
      filter.operator !== 'neq' &&
      !RANGE_OPERATORS.has(filter.operator) &&
      filter.operator !== 'contains'
    ) {
      throw new Error('Structured filter operator is unsupported');
    }
    if (
      column.valueType === 'decimal' &&
      !DECIMAL_PATTERN.test(filter.value.trim())
    ) {
      throw new Error('Structured decimal filter value is invalid');
    }
    if (
      column.valueType === 'boolean' &&
      !['true', 'false'].includes(filter.value.trim().toLowerCase())
    ) {
      throw new Error('Structured boolean filter value is invalid');
    }
    if (
      column.valueType === 'date' &&
      !isSemanticIsoDate(filter.value.trim())
    ) {
      throw new Error('Structured date filter value is invalid');
    }
  }
}
