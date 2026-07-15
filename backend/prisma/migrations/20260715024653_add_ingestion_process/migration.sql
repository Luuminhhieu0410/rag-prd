-- CreateEnum
CREATE TYPE "IngestionProcessStatus" AS ENUM ('uploaded', 'processing', 'ready', 'failed');

-- CreateTable
CREATE TABLE "ingestion_processes" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "status" "IngestionProcessStatus" NOT NULL DEFAULT 'uploaded',
    "processed_chunks" INTEGER NOT NULL DEFAULT 0,
    "total_chunks" INTEGER,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "file_metadata" JSONB NOT NULL,
    "last_error" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ingestion_processes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ingestion_processes_job_id_key" ON "ingestion_processes"("job_id");

-- CreateIndex
CREATE INDEX "ingestion_processes_document_id_idx" ON "ingestion_processes"("document_id");

-- CreateIndex
CREATE INDEX "ingestion_processes_status_updated_at_idx" ON "ingestion_processes"("status", "updated_at");

-- AddForeignKey
ALTER TABLE "ingestion_processes" ADD CONSTRAINT "ingestion_processes_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
