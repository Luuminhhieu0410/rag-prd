
CREATE TYPE "IngestionStatus" AS ENUM ('uploaded', 'processing', 'ready', 'failed');


ALTER TABLE "ingestion_processes" ADD COLUMN "collection_id" TEXT;

UPDATE "ingestion_processes" AS ip
SET "collection_id" = d."collection_id"
FROM "documents" AS d
WHERE d."id" = ip."document_id";

ALTER TABLE "ingestion_processes"
ALTER COLUMN "collection_id" SET NOT NULL;


ALTER TABLE "documents" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "documents"
ALTER COLUMN "status" TYPE "IngestionStatus"
USING (
  CASE
    WHEN "status"::text IN ('parsing', 'chunking', 'embedding') THEN 'processing'
    ELSE "status"::text
  END
)::"IngestionStatus";
ALTER TABLE "documents" ALTER COLUMN "status" SET DEFAULT 'uploaded';


ALTER TABLE "ingestion_processes" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "ingestion_processes"
ALTER COLUMN "status" TYPE "IngestionStatus"
USING ("status"::text::"IngestionStatus");
ALTER TABLE "ingestion_processes" ALTER COLUMN "status" SET DEFAULT 'uploaded';

DROP TYPE "DocumentStatus";
DROP TYPE "IngestionProcessStatus";

ALTER TABLE "ingestion_processes"
ADD CONSTRAINT "ingestion_processes_collection_id_fkey"
FOREIGN KEY ("collection_id") REFERENCES "collections"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "ingestion_processes_collection_id_status_idx"
ON "ingestion_processes"("collection_id", "status");
