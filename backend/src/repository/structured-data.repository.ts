import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import type { ValidatedStructuredQuery } from '../api/chat/structured-query.validator';
import type {
  StructuredCoverage,
  StructuredEvidenceRow,
  StructuredFilter,
  StructuredQueryResult,
} from '../api/chat/chat.types';
import { PostgresService } from '../databases/postgres/postgres.service';
import {
  STRUCTURED_EVIDENCE_MAX,
  STRUCTURED_QUERY_TIMEOUT_MS,
  STRUCTURED_TIE_SCAN_MAX,
} from '../shared/structured-data/structured-data.constants';
import {
  ProfiledColumn,
  ProfiledDataset,
  StructuredDatasetCatalog,
  StructuredValueType,
} from '../shared/structured-data/structured-data.types';

export interface ReplaceStructuredDatasetsInput {
  documentId: string;
  collectionId: string;
  ingestionKey: string;
  datasets: ProfiledDataset[];
}

export const STRUCTURED_QUERY_DEADLINE_EXCEEDED_CODE =
  'STRUCTURED_QUERY_DEADLINE_EXCEEDED';

export class StructuredQueryDeadlineError extends Error {
  readonly code = STRUCTURED_QUERY_DEADLINE_EXCEEDED_CODE;

  constructor() {
    super('Structured query deadline exceeded');
    this.name = 'StructuredQueryDeadlineError';
  }
}

function batches<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

type RawScalar = Prisma.Decimal | bigint | number | string | Date | null;

interface RawAggregateRow {
  scalar: RawScalar;
  totalMatched: bigint | number | string;
  consideredRows: bigint | number | string;
}

interface RawEvidenceRow {
  rowId: string;
  datasetId: string;
  datasetName: string;
  documentId: string;
  documentName: string;
  source: string;
  table: bigint | number | string | null;
  row: bigint | number | string;
  renderedText: string;
  values: unknown;
  metricValue?: RawScalar;
  groupValue?: RawScalar;
  groupCount?: bigint | number | string;
  groupSum?: RawScalar;
  groupAverage?: RawScalar;
  groupValidCount?: bigint | number | string;
  totalMatched?: bigint | number | string;
  consideredRows?: bigint | number | string;
}

type AnalyticalSqlDispatch = <T>(statement: Prisma.Sql) => Promise<T>;
type AnalyticalStatementDispatch = <T>(
  statement: (tx: Prisma.TransactionClient) => Promise<T>,
) => Promise<T>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

@Injectable()
export class StructuredDataRepository {
  constructor(private readonly prisma: PostgresService) {}

  async replaceDocumentDatasets(
    input: ReplaceStructuredDatasetsInput,
  ): Promise<void> {
    const client = this.prisma.getClient();

    await client.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT pg_advisory_xact_lock(
          hashtextextended(${input.documentId}, 0)
        )::text AS "lock"
      `;
      await tx.structuredDataset.deleteMany({
        where: {
          documentId: input.documentId,
          ingestionKey: input.ingestionKey,
        },
      });

      for (const dataset of input.datasets) {
        await tx.structuredDataset.create({
          data: {
            id: dataset.id,
            documentId: input.documentId,
            collectionId: input.collectionId,
            datasetIndex: dataset.index,
            ingestionKey: input.ingestionKey,
            name: dataset.name,
            source: dataset.source,
            status: dataset.eligibility.eligible ? 'eligible' : 'ineligible',
            eligibilityReason: dataset.eligibility.reason,
            active: false,
            rowCount: dataset.rowCount,
            profile: dataset.profile as Prisma.InputJsonValue,
            primaryKeyColumnId: dataset.primaryKeyColumnId,
          },
        });
        await tx.structuredColumn.createMany({
          data: dataset.columns.map((column) => ({
            ...column,
            datasetId: dataset.id,
          })),
        });
        const rows = dataset.rows.map((row) => ({
          id: row.id,
          rowIndex: row.rowIndex,
          identityValue: row.identityValue,
          sourceLocation: row.sourceLocation,
          renderedText: row.renderedText,
          datasetId: dataset.id,
        }));
        for (const batch of batches(rows, 1_000)) {
          await tx.structuredRow.createMany({ data: batch });
        }
        const cells = dataset.rows.flatMap((row) =>
          row.cells.map((cell) => ({ ...cell, rowId: row.id })),
        );
        for (const batch of batches(cells, 1_000)) {
          await tx.structuredCell.createMany({ data: batch });
        }
      }

      await tx.structuredDataset.updateMany({
        where: { documentId: input.documentId, active: true },
        data: { active: false },
      });
      await tx.structuredDataset.updateMany({
        where: {
          documentId: input.documentId,
          ingestionKey: input.ingestionKey,
        },
        data: { active: true },
      });
      await tx.structuredDataset.deleteMany({
        where: {
          documentId: input.documentId,
          active: false,
          ingestionKey: { not: input.ingestionKey },
        },
      });
    });
  }

  async countRows(
    query: ValidatedStructuredQuery,
    collectionId: string,
    deadlineAt = Date.now() + STRUCTURED_QUERY_TIMEOUT_MS,
  ): Promise<StructuredQueryResult> {
    const rows = await this.analyticalRead(async (runSql) => {
      const eligibleRows = this.eligibleRowsSql(query, collectionId);
      if (query.operation === 'count_rows') {
        return runSql<RawAggregateRow[]>(Prisma.sql`
          WITH eligible_rows AS (${eligibleRows})
          SELECT
            COUNT(*)::text AS "scalar",
            COUNT(*) AS "totalMatched",
            COUNT(*) AS "consideredRows"
          FROM eligible_rows
        `);
      }

      const dimension = this.requiredColumn(query.dimensionColumn, 'dimension');
      const dimensionValue = this.dimensionValueSql(dimension.valueType);
      return runSql<RawAggregateRow[]>(Prisma.sql`
        WITH eligible_rows AS (${eligibleRows})
        SELECT
          COUNT(DISTINCT ${dimensionValue})::text AS "scalar",
          COUNT(DISTINCT ${dimensionValue}) AS "totalMatched",
          COUNT(*) AS "consideredRows"
        FROM eligible_rows
        LEFT JOIN structured_cells dimension_cell
          ON dimension_cell.row_id = eligible_rows."rowId"
         AND dimension_cell.column_id = ${dimension.id}
      `);
    }, deadlineAt);
    const raw = rows[0] ?? {
      scalar: '0',
      totalMatched: 0,
      consideredRows: 0,
    };
    return {
      operation: query.operation,
      rows: [],
      scalar: this.scalarString(raw.scalar) ?? '0',
      totalMatched: this.countNumber(raw.totalMatched),
      truncated: false,
      coverage: this.coverage(query, this.countNumber(raw.consideredRows)),
    };
  }

  async aggregateDecimal(
    query: ValidatedStructuredQuery,
    collectionId: string,
    deadlineAt = Date.now() + STRUCTURED_QUERY_TIMEOUT_MS,
  ): Promise<StructuredQueryResult> {
    const metric = this.requiredColumn(query.metricColumn, 'metric');
    const aggregate =
      query.operation === 'sum'
        ? Prisma.sql`SUM(metric_cell.decimal_value)`
        : Prisma.sql`AVG(metric_cell.decimal_value)`;
    const rows = await this.analyticalRead((runSql) => {
      const eligibleRows = this.eligibleRowsSql(query, collectionId);
      return runSql<RawAggregateRow[]>(Prisma.sql`
        WITH eligible_rows AS (${eligibleRows})
        SELECT
          ${aggregate} AS "scalar",
          COUNT(metric_cell.decimal_value) AS "totalMatched",
          COUNT(*) AS "consideredRows"
        FROM eligible_rows
        LEFT JOIN structured_cells metric_cell
          ON metric_cell.row_id = eligible_rows."rowId"
         AND metric_cell.column_id = ${metric.id}
      `);
    }, deadlineAt);
    const raw = rows[0] ?? {
      scalar: null,
      totalMatched: 0,
      consideredRows: 0,
    };
    const scalar = this.scalarString(raw.scalar);

    return {
      operation: query.operation,
      rows: [],
      ...(scalar === undefined ? {} : { scalar }),
      totalMatched: this.countNumber(raw.totalMatched),
      truncated: false,
      coverage: this.coverage(query, this.countNumber(raw.consideredRows)),
    };
  }

  async rankRows(
    query: ValidatedStructuredQuery,
    collectionId: string,
    deadlineAt = Date.now() + STRUCTURED_QUERY_TIMEOUT_MS,
  ): Promise<StructuredQueryResult> {
    const metric = this.requiredColumn(query.metricColumn, 'metric');
    const descending =
      query.operation === 'maximum' || query.operation === 'top_n';
    const order = descending ? Prisma.sql`DESC` : Prisma.sql`ASC`;
    const metricValue = this.metricValueSql(metric.valueType);
    const rankLimit =
      query.operation === 'minimum' || query.operation === 'maximum'
        ? 1
        : (query.limit ?? STRUCTURED_EVIDENCE_MAX);
    const [consideredRows, selectedRows] = await this.analyticalRead(
      async (runSql) => {
        const eligibleRows = this.eligibleRowsSql(query, collectionId);
        const considered = await runSql<
          Array<{ consideredRows: bigint | number | string }>
        >(Prisma.sql`
          WITH eligible_rows AS (${eligibleRows})
          SELECT COUNT(*) AS "consideredRows" FROM eligible_rows
        `);
        const selected = await runSql<RawEvidenceRow[]>(Prisma.sql`
          WITH eligible_rows AS (${eligibleRows}),
          ranked_rows AS (
            SELECT
              eligible_rows.*,
              ${metricValue} AS "metricValue",
              RANK() OVER (ORDER BY ${metricValue} ${order}) AS "metricRank"
            FROM eligible_rows
            INNER JOIN structured_cells metric_cell
              ON metric_cell.row_id = eligible_rows."rowId"
             AND metric_cell.column_id = ${metric.id}
            WHERE ${metricValue} IS NOT NULL
          ),
          selected_rows AS (
            SELECT *
            FROM ranked_rows
            WHERE "metricRank" <= ${rankLimit}
            ORDER BY "metricValue" ${order}, "rowIndex" ASC, "rowId" ASC
            LIMIT ${STRUCTURED_TIE_SCAN_MAX + 1}
          )
          SELECT
            selected_rows."rowId" AS "rowId",
            sd.id AS "datasetId",
            sd.name AS "datasetName",
            sd.document_id AS "documentId",
            COALESCE(document.original_name, sd.name) AS "documentName",
            sd.source::text AS "source",
            (sr.source_location ->> 'table')::integer AS "table",
            COALESCE(
              (sr.source_location ->> 'row')::integer,
              sr.row_index
            ) AS "row",
            sr.rendered_text AS "renderedText",
            ${this.evidenceValuesSql()} AS "values",
            selected_rows."metricValue" AS "metricValue"
          FROM selected_rows
          INNER JOIN structured_rows sr ON sr.id = selected_rows."rowId"
          INNER JOIN structured_datasets sd ON sd.id = sr.dataset_id
          INNER JOIN documents document ON document.id = sd.document_id
          LEFT JOIN structured_cells evidence_cell
            ON evidence_cell.row_id = sr.id
          WHERE sd.id = ${query.datasets[0].id}
            AND sd.collection_id = ${collectionId}
            AND sd.active = true
            AND sd.status = 'eligible'
          GROUP BY
            selected_rows."rowId",
            selected_rows."rowIndex",
            selected_rows."metricValue",
            sd.id,
            document.original_name,
            sr.source_location,
            sr.row_index,
            sr.rendered_text
          ORDER BY
            selected_rows."metricValue" ${order},
            selected_rows."rowIndex" ASC,
            selected_rows."rowId" ASC
        `);
        return [considered, selected] as const;
      },
      deadlineAt,
    );
    const observedMatches = selectedRows.length;
    const tieScanExceeded = observedMatches > STRUCTURED_TIE_SCAN_MAX;
    const truncated = observedMatches > STRUCTURED_EVIDENCE_MAX;
    const visible = selectedRows.slice(0, STRUCTURED_EVIDENCE_MAX);
    return {
      operation: query.operation,
      rows: visible.map((row) => this.toEvidenceRow(row)),
      ...(selectedRows[0]?.metricValue === undefined
        ? {}
        : { scalar: this.scalarString(selectedRows[0].metricValue) }),
      totalMatched: observedMatches,
      truncated,
      coverage: this.coverage(
        query,
        this.countNumber(consideredRows[0]?.consideredRows ?? 0),
        truncated,
        true,
        tieScanExceeded,
      ),
    };
  }

  async groupRows(
    query: ValidatedStructuredQuery,
    collectionId: string,
    deadlineAt = Date.now() + STRUCTURED_QUERY_TIMEOUT_MS,
  ): Promise<StructuredQueryResult> {
    const groupBy = this.requiredColumn(query.groupByColumn, 'group-by');
    const cap = Math.min(
      query.limit ?? STRUCTURED_EVIDENCE_MAX,
      STRUCTURED_EVIDENCE_MAX,
    );
    const groupValue = this.groupValueSql(groupBy.valueType);
    const metricJoin = query.metricColumn
      ? Prisma.sql`
          LEFT JOIN structured_cells metric_cell
            ON metric_cell.row_id = eligible_rows."rowId"
           AND metric_cell.column_id = ${query.metricColumn.id}
        `
      : Prisma.sql``;
    const metricValue = query.metricColumn
      ? Prisma.sql`metric_cell.decimal_value`
      : Prisma.sql`NULL::numeric`;
    const rawRows = await this.analyticalRead((runSql) => {
      const eligibleRows = this.eligibleRowsSql(query, collectionId);
      return runSql<RawEvidenceRow[]>(Prisma.sql`
        WITH eligible_rows AS (${eligibleRows}),
        group_source AS (
          SELECT
            eligible_rows.*,
            ${groupValue} AS "groupValue",
            ${metricValue} AS "metricValue"
          FROM eligible_rows
          LEFT JOIN structured_cells group_cell
            ON group_cell.row_id = eligible_rows."rowId"
           AND group_cell.column_id = ${groupBy.id}
          ${metricJoin}
        ),
        grouped_rows AS (
          SELECT
            "groupValue",
            COUNT(*) AS "groupCount",
            SUM("metricValue") AS "groupSum",
            AVG("metricValue") AS "groupAverage",
            COUNT("metricValue") AS "groupValidCount",
            (ARRAY_AGG("rowId" ORDER BY "rowIndex", "rowId"))[1]
              AS "representativeRowId",
            MIN("rowIndex") AS "firstRowIndex"
          FROM group_source
          GROUP BY "groupValue"
        ),
        selected_groups AS (
          SELECT
            grouped_rows.*,
            COUNT(*) OVER () AS "totalMatched",
            SUM("groupCount") OVER () AS "consideredRows"
          FROM grouped_rows
          ORDER BY "firstRowIndex" ASC, "groupValue" ASC NULLS LAST
          LIMIT ${cap}
        )
        SELECT
          sr.id AS "rowId",
          sd.id AS "datasetId",
          sd.name AS "datasetName",
          sd.document_id AS "documentId",
          COALESCE(document.original_name, sd.name) AS "documentName",
          sd.source::text AS "source",
          (sr.source_location ->> 'table')::integer AS "table",
          COALESCE(
            (sr.source_location ->> 'row')::integer,
            sr.row_index
          ) AS "row",
          sr.rendered_text AS "renderedText",
          ${this.evidenceValuesSql()} AS "values",
          selected_groups."groupValue" AS "groupValue",
          selected_groups."groupCount" AS "groupCount",
          selected_groups."groupSum" AS "groupSum",
          selected_groups."groupAverage" AS "groupAverage",
          selected_groups."groupValidCount" AS "groupValidCount",
          selected_groups."totalMatched" AS "totalMatched",
          selected_groups."consideredRows" AS "consideredRows"
        FROM selected_groups
        INNER JOIN structured_rows sr
          ON sr.id = selected_groups."representativeRowId"
        INNER JOIN structured_datasets sd ON sd.id = sr.dataset_id
        INNER JOIN documents document ON document.id = sd.document_id
        LEFT JOIN structured_cells evidence_cell
          ON evidence_cell.row_id = sr.id
        WHERE sd.id = ${query.datasets[0].id}
          AND sd.collection_id = ${collectionId}
          AND sd.active = true
          AND sd.status = 'eligible'
        GROUP BY
          sr.id,
          sd.id,
          document.original_name,
          selected_groups."groupValue",
          selected_groups."groupCount",
          selected_groups."groupSum",
          selected_groups."groupAverage",
          selected_groups."groupValidCount",
          selected_groups."totalMatched",
          selected_groups."consideredRows",
          selected_groups."firstRowIndex"
        ORDER BY
          selected_groups."firstRowIndex" ASC,
          selected_groups."groupValue" ASC NULLS LAST
      `);
    }, deadlineAt);
    const totalMatched = this.countNumber(rawRows[0]?.totalMatched ?? 0);
    const consideredRows = this.countNumber(rawRows[0]?.consideredRows ?? 0);
    const truncated = totalMatched > cap;
    const rows = rawRows.map((raw) => {
      const evidence = this.toEvidenceRow(raw);
      // Grouped output stays inside StructuredEvidenceRow: PostgreSQL computes
      // aggregates, and reserved keys encode them on a representative row.
      evidence.values[groupBy.id] = this.scalarString(raw.groupValue) ?? null;
      evidence.values.__group_count = String(
        this.countNumber(raw.groupCount ?? 0),
      );
      if (query.metricColumn) {
        evidence.values.__group_sum = this.scalarString(raw.groupSum) ?? null;
        evidence.values.__group_average =
          this.scalarString(raw.groupAverage) ?? null;
        evidence.values.__group_valid_count = String(
          this.countNumber(raw.groupValidCount ?? 0),
        );
      }
      return evidence;
    });

    return {
      operation: query.operation,
      rows,
      totalMatched,
      truncated,
      coverage: this.coverage(query, consideredRows, truncated, true),
    };
  }

  async listRows(
    query: ValidatedStructuredQuery,
    collectionId: string,
    deadlineAt = Date.now() + STRUCTURED_QUERY_TIMEOUT_MS,
  ): Promise<StructuredQueryResult> {
    return this.boundedRows(query, collectionId, deadlineAt);
  }

  async compareRows(
    query: ValidatedStructuredQuery,
    collectionId: string,
    deadlineAt = Date.now() + STRUCTURED_QUERY_TIMEOUT_MS,
  ): Promise<StructuredQueryResult> {
    return this.boundedRows(query, collectionId, deadlineAt);
  }

  private async boundedRows(
    query: ValidatedStructuredQuery,
    collectionId: string,
    deadlineAt: number,
  ): Promise<StructuredQueryResult> {
    const cap = Math.min(
      query.limit ?? STRUCTURED_EVIDENCE_MAX,
      STRUCTURED_EVIDENCE_MAX,
    );
    const rawRows = await this.analyticalRead((runSql) => {
      const eligibleRows = this.eligibleRowsSql(query, collectionId);
      return runSql<RawEvidenceRow[]>(Prisma.sql`
        WITH eligible_rows AS (${eligibleRows}),
        selected_rows AS (
          SELECT
            eligible_rows.*,
            COUNT(*) OVER () AS "totalMatched"
          FROM eligible_rows
          ORDER BY "rowIndex" ASC, "rowId" ASC
          LIMIT ${cap}
        )
        SELECT
          selected_rows."rowId" AS "rowId",
          sd.id AS "datasetId",
          sd.name AS "datasetName",
          sd.document_id AS "documentId",
          COALESCE(document.original_name, sd.name) AS "documentName",
          sd.source::text AS "source",
          (sr.source_location ->> 'table')::integer AS "table",
          COALESCE(
            (sr.source_location ->> 'row')::integer,
            sr.row_index
          ) AS "row",
          sr.rendered_text AS "renderedText",
          ${this.evidenceValuesSql()} AS "values",
          selected_rows."totalMatched" AS "totalMatched"
        FROM selected_rows
        INNER JOIN structured_rows sr ON sr.id = selected_rows."rowId"
        INNER JOIN structured_datasets sd ON sd.id = sr.dataset_id
        INNER JOIN documents document ON document.id = sd.document_id
        LEFT JOIN structured_cells evidence_cell
          ON evidence_cell.row_id = sr.id
        WHERE sd.id = ${query.datasets[0].id}
          AND sd.collection_id = ${collectionId}
          AND sd.active = true
          AND sd.status = 'eligible'
        GROUP BY
          selected_rows."rowId",
          selected_rows."rowIndex",
          selected_rows."totalMatched",
          sd.id,
          document.original_name,
          sr.source_location,
          sr.row_index,
          sr.rendered_text
        ORDER BY selected_rows."rowIndex" ASC, selected_rows."rowId" ASC
      `);
    }, deadlineAt);
    const totalMatched = this.countNumber(rawRows[0]?.totalMatched ?? 0);
    const truncated = totalMatched > cap;
    return {
      operation: query.operation,
      rows: rawRows.map((row) => this.toEvidenceRow(row)),
      totalMatched,
      truncated,
      coverage: this.coverage(query, totalMatched, truncated, true),
    };
  }

  private async analyticalRead<T>(
    read: (
      runSql: AnalyticalSqlDispatch,
      dispatch: AnalyticalStatementDispatch,
    ) => Promise<T>,
    deadlineAt: number,
  ): Promise<T> {
    const transactionBudgetMs = this.remainingDeadlineMs(deadlineAt);
    return this.prisma.getClient().$transaction(
      async (tx) => {
        const dispatch: AnalyticalStatementDispatch = async (statement) => {
          const statementTimeoutMs = this.remainingDeadlineMs(deadlineAt);
          await tx.$queryRaw(Prisma.sql`
            SELECT set_config(
              'statement_timeout',
              ${String(statementTimeoutMs)},
              true
            ) AS "statementTimeout"
          `);
          this.remainingDeadlineMs(deadlineAt);
          return statement(tx);
        };
        const runSql: AnalyticalSqlDispatch = <Result>(statement: Prisma.Sql) =>
          dispatch((client) => client.$queryRaw<Result>(statement));
        return read(runSql, dispatch);
      },
      { maxWait: transactionBudgetMs, timeout: transactionBudgetMs },
    );
  }

  private remainingDeadlineMs(deadlineAt: number): number {
    const remainingMs = Math.floor(deadlineAt - Date.now());
    if (remainingMs <= 0) throw new StructuredQueryDeadlineError();
    return Math.min(remainingMs, STRUCTURED_QUERY_TIMEOUT_MS);
  }

  private eligibleRowsSql(
    query: ValidatedStructuredQuery,
    collectionId: string,
  ): Prisma.Sql {
    return Prisma.sql`
      SELECT
        sr.id AS "rowId",
        sr.row_index AS "rowIndex"
      FROM structured_datasets sd
      INNER JOIN structured_rows sr ON sr.dataset_id = sd.id
      WHERE sd.id = ${query.datasets[0].id}
        AND sd.collection_id = ${collectionId}
        AND sd.active = true
        AND sd.status = 'eligible'
        ${this.filtersSql(query)}
    `;
  }

  private filtersSql(query: ValidatedStructuredQuery): Prisma.Sql {
    if (query.filters.length === 0) return Prisma.sql``;
    const predicates = query.filters.map((filter) => {
      const column = this.requiredColumn(
        query.datasets[0].columns.find(
          (candidate) => candidate.id === filter.columnId,
        ) ?? null,
        'filter',
      );
      return Prisma.sql`
        EXISTS (
          SELECT 1
          FROM structured_cells filter_cell
          WHERE filter_cell.row_id = sr.id
            AND filter_cell.column_id = ${filter.columnId}
            AND ${this.filterPredicateSql(filter, column)}
        )
      `;
    });
    return Prisma.sql`AND ${Prisma.join(predicates, ' AND ')}`;
  }

  private filterPredicateSql(
    filter: StructuredFilter,
    column: ProfiledColumn,
  ): Prisma.Sql {
    if (filter.operator === 'contains') {
      return Prisma.sql`
        POSITION(
          LOWER(${filter.value}) IN LOWER(filter_cell.text_value)
        ) > 0
      `;
    }
    const actual = this.filterCellValueSql(column.valueType);
    const expected = this.filterExpectedSql(filter.value, column.valueType);
    switch (filter.operator) {
      case 'eq':
        return Prisma.sql`${actual} = ${expected}`;
      case 'neq':
        return Prisma.sql`${actual} <> ${expected}`;
      case 'gt':
        return Prisma.sql`${actual} > ${expected}`;
      case 'gte':
        return Prisma.sql`${actual} >= ${expected}`;
      case 'lt':
        return Prisma.sql`${actual} < ${expected}`;
      case 'lte':
        return Prisma.sql`${actual} <= ${expected}`;
    }
  }

  private filterCellValueSql(type: StructuredValueType): Prisma.Sql {
    switch (type) {
      case 'text':
        return Prisma.sql`filter_cell.text_value`;
      case 'decimal':
        return Prisma.sql`filter_cell.decimal_value`;
      case 'boolean':
        return Prisma.sql`filter_cell.boolean_value`;
      case 'date':
        return Prisma.sql`filter_cell.date_value`;
    }
  }

  private filterExpectedSql(
    value: string,
    type: StructuredValueType,
  ): Prisma.Sql {
    switch (type) {
      case 'text':
        return Prisma.sql`${value}`;
      case 'decimal':
        return Prisma.sql`CAST(${value} AS numeric)`;
      case 'boolean':
        return Prisma.sql`${value.trim().toLowerCase() === 'true'}`;
      case 'date':
        return Prisma.sql`CAST(${`${value}T00:00:00.000Z`} AS timestamptz)`;
    }
  }

  private dimensionValueSql(type: StructuredValueType): Prisma.Sql {
    switch (type) {
      case 'text':
        return Prisma.sql`dimension_cell.text_value`;
      case 'decimal':
        return Prisma.sql`dimension_cell.decimal_value`;
      case 'boolean':
        return Prisma.sql`dimension_cell.boolean_value`;
      case 'date':
        return Prisma.sql`dimension_cell.date_value`;
    }
  }

  private groupValueSql(type: StructuredValueType): Prisma.Sql {
    switch (type) {
      case 'text':
        return Prisma.sql`group_cell.text_value`;
      case 'decimal':
        return Prisma.sql`group_cell.decimal_value`;
      case 'boolean':
        return Prisma.sql`group_cell.boolean_value`;
      case 'date':
        return Prisma.sql`group_cell.date_value`;
    }
  }

  private metricValueSql(type: StructuredValueType): Prisma.Sql {
    return type === 'date'
      ? Prisma.sql`metric_cell.date_value`
      : Prisma.sql`metric_cell.decimal_value`;
  }

  private evidenceValuesSql(): Prisma.Sql {
    return Prisma.sql`
      COALESCE(
        jsonb_object_agg(
          evidence_cell.column_id,
          COALESCE(
            to_jsonb(
              COALESCE(
                evidence_cell.text_value,
                evidence_cell.decimal_value::text,
                evidence_cell.boolean_value::text,
                to_char(
                  evidence_cell.date_value AT TIME ZONE 'UTC',
                  'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
                ),
                NULLIF(BTRIM(evidence_cell.raw_value), '')
              )
            ),
            'null'::jsonb
          )
        ) FILTER (WHERE evidence_cell.column_id IS NOT NULL),
        '{}'::jsonb
      )
    `;
  }

  private requiredColumn(
    column: ProfiledColumn | null,
    role: string,
  ): ProfiledColumn {
    if (!column) throw new Error(`Structured ${role} column is required`);
    return column;
  }

  private coverage(
    query: ValidatedStructuredQuery,
    consideredRows: number,
    truncated = false,
    includeAllColumns = false,
    tieScanExceeded = false,
  ): StructuredCoverage {
    const relevantColumns = new Map<string, ProfiledColumn>();
    if (includeAllColumns) {
      for (const column of query.datasets[0].columns) {
        relevantColumns.set(column.id, column);
      }
    }
    for (const column of [
      query.metricColumn,
      query.dimensionColumn,
      query.groupByColumn,
    ]) {
      if (column) relevantColumns.set(column.id, column);
    }
    for (const filter of query.filters) {
      const column = query.datasets[0].columns.find(
        (item) => item.id === filter.columnId,
      );
      if (column) relevantColumns.set(column.id, column);
    }
    const columns = [...relevantColumns.values()];
    const nullCells = columns.reduce(
      (total, column) => total + column.nullCount,
      0,
    );
    const invalidCells = columns.reduce(
      (total, column) => total + column.invalidCount,
      0,
    );
    const notes: string[] = [];
    if (nullCells > 0) notes.push(`${nullCells} relevant cells are null`);
    if (invalidCells > 0) {
      notes.push(`${invalidCells} relevant non-null cells could not be parsed`);
    }
    if (truncated) notes.push('The evidence row cap hides additional matches');
    if (tieScanExceeded) {
      notes.push(
        `Tie inspection stopped after ${STRUCTURED_TIE_SCAN_MAX} row IDs`,
      );
    }
    return {
      selectedDatasets: query.datasets.length,
      eligibleDatasets: query.datasets.length,
      totalRows: query.datasets.reduce(
        (total, dataset) => total + dataset.rowCount,
        0,
      ),
      consideredRows,
      nullCells,
      invalidCells,
      exact: invalidCells === 0 && !truncated,
      notes,
    };
  }

  private toEvidenceRow(row: RawEvidenceRow): StructuredEvidenceRow {
    return {
      rowId: row.rowId,
      datasetId: row.datasetId,
      datasetName: row.datasetName,
      documentId: row.documentId,
      documentName: row.documentName,
      source: row.source === 'docx_table' ? 'docx_table' : 'csv',
      table: row.table === null ? null : this.countNumber(row.table),
      row: this.countNumber(row.row),
      renderedText: row.renderedText,
      values: this.evidenceValues(row.values),
    };
  }

  private evidenceValues(value: unknown): Record<string, string | null> {
    if (!isRecord(value)) return {};
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        item === null ? null : (this.scalarString(item as RawScalar) ?? null),
      ]),
    );
  }

  private scalarString(value: RawScalar | undefined): string | undefined {
    if (value === null || value === undefined) return undefined;
    if (value instanceof Date) return value.toISOString();
    return value.toString();
  }

  private countNumber(value: bigint | number | string): number {
    return Number(value);
  }

  async getCatalog(
    collectionId: string,
    deadlineAt?: number,
  ): Promise<StructuredDatasetCatalog[]> {
    const readCatalog = (client: Prisma.TransactionClient) =>
      client.structuredDataset.findMany({
        where: { collectionId, active: true, status: 'eligible' },
        select: {
          id: true,
          documentId: true,
          name: true,
          source: true,
          rowCount: true,
          primaryKeyColumnId: true,
          document: { select: { originalName: true } },
          columns: {
            select: {
              id: true,
              ordinal: true,
              rawName: true,
              normalizedName: true,
              valueType: true,
              parseFormat: true,
              nullCount: true,
              invalidCount: true,
              nonNullCount: true,
              distinctCount: true,
              identityCandidate: true,
            },
            orderBy: { ordinal: 'asc' },
          },
        },
        orderBy: [{ documentId: 'asc' }, { datasetIndex: 'asc' }],
      });
    const datasets =
      deadlineAt === undefined
        ? await readCatalog(this.prisma.getClient())
        : await this.analyticalRead(
            (_runSql, dispatch) => dispatch(readCatalog),
            deadlineAt,
          );

    return datasets.map((dataset) => ({
      id: dataset.id,
      documentId: dataset.documentId,
      documentName: dataset.document.originalName ?? dataset.name,
      name: dataset.name,
      source: dataset.source,
      rowCount: dataset.rowCount,
      primaryKeyColumnId: dataset.primaryKeyColumnId,
      columns: dataset.columns,
    }));
  }
}
