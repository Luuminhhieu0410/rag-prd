CREATE TYPE "StructuredDatasetStatus" AS ENUM ('eligible', 'ineligible');
CREATE TYPE "StructuredDatasetSource" AS ENUM ('csv', 'docx_table');
CREATE TYPE "StructuredValueType" AS ENUM ('text', 'decimal', 'boolean', 'date');

ALTER TABLE "messages" ADD COLUMN "structured_result_meta" JSONB;

CREATE TABLE "structured_datasets" (
  "id" TEXT NOT NULL,
  "document_id" TEXT NOT NULL,
  "collection_id" TEXT NOT NULL,
  "dataset_index" INTEGER NOT NULL,
  "ingestion_key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "source" "StructuredDatasetSource" NOT NULL,
  "status" "StructuredDatasetStatus" NOT NULL,
  "eligibility_reason" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT false,
  "row_count" INTEGER NOT NULL,
  "profile" JSONB NOT NULL,
  "primary_key_column_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "structured_datasets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "structured_columns" (
  "id" TEXT NOT NULL,
  "dataset_id" TEXT NOT NULL,
  "ordinal" INTEGER NOT NULL,
  "raw_name" TEXT NOT NULL,
  "normalized_name" TEXT NOT NULL,
  "value_type" "StructuredValueType" NOT NULL,
  "parse_format" TEXT,
  "null_count" INTEGER NOT NULL,
  "invalid_count" INTEGER NOT NULL,
  "non_null_count" INTEGER NOT NULL,
  "distinct_count" INTEGER NOT NULL,
  "identity_candidate" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "structured_columns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "structured_rows" (
  "id" TEXT NOT NULL,
  "dataset_id" TEXT NOT NULL,
  "row_index" INTEGER NOT NULL,
  "identity_value" TEXT,
  "source_location" JSONB NOT NULL,
  "rendered_text" TEXT NOT NULL,
  CONSTRAINT "structured_rows_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "structured_cells" (
  "row_id" TEXT NOT NULL,
  "column_id" TEXT NOT NULL,
  "raw_value" TEXT NOT NULL,
  "text_value" TEXT,
  "decimal_value" DECIMAL(65,18),
  "boolean_value" BOOLEAN,
  "date_value" TIMESTAMP(3),
  CONSTRAINT "structured_cells_pkey" PRIMARY KEY ("row_id", "column_id")
);

ALTER TABLE "structured_datasets"
  ADD CONSTRAINT "structured_datasets_document_id_fkey"
  FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "structured_datasets"
  ADD CONSTRAINT "structured_datasets_collection_id_fkey"
  FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "structured_columns"
  ADD CONSTRAINT "structured_columns_dataset_id_fkey"
  FOREIGN KEY ("dataset_id") REFERENCES "structured_datasets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "structured_rows"
  ADD CONSTRAINT "structured_rows_dataset_id_fkey"
  FOREIGN KEY ("dataset_id") REFERENCES "structured_datasets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "structured_cells"
  ADD CONSTRAINT "structured_cells_row_id_fkey"
  FOREIGN KEY ("row_id") REFERENCES "structured_rows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "structured_cells"
  ADD CONSTRAINT "structured_cells_column_id_fkey"
  FOREIGN KEY ("column_id") REFERENCES "structured_columns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "structured_datasets_document_id_dataset_index_ingestion_key_key"
  ON "structured_datasets"("document_id", "dataset_index", "ingestion_key");
CREATE INDEX "structured_datasets_collection_id_active_status_idx"
  ON "structured_datasets"("collection_id", "active", "status");
CREATE UNIQUE INDEX "structured_columns_dataset_id_ordinal_key"
  ON "structured_columns"("dataset_id", "ordinal");
CREATE INDEX "structured_columns_dataset_id_normalized_name_idx"
  ON "structured_columns"("dataset_id", "normalized_name");
CREATE UNIQUE INDEX "structured_rows_dataset_id_row_index_key"
  ON "structured_rows"("dataset_id", "row_index");
CREATE INDEX "structured_rows_dataset_id_identity_value_idx"
  ON "structured_rows"("dataset_id", "identity_value");
CREATE INDEX "structured_cells_column_id_idx"
  ON "structured_cells"("column_id");
CREATE INDEX "structured_cells_column_id_decimal_value_idx"
  ON "structured_cells"("column_id", "decimal_value");
CREATE INDEX "structured_cells_column_id_date_value_idx"
  ON "structured_cells"("column_id", "date_value");
CREATE INDEX "structured_cells_column_id_boolean_value_idx"
  ON "structured_cells"("column_id", "boolean_value");
