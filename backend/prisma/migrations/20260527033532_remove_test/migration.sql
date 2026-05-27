/*
  Warnings:

  - A unique constraint covering the columns `[document_id,chunk_index]` on the table `chunks_meta` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "chunks_meta" DROP CONSTRAINT "chunks_meta_document_id_fkey";

-- DropForeignKey
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_collection_id_fkey";

-- DropForeignKey
ALTER TABLE "documents" DROP CONSTRAINT "documents_collection_id_fkey";

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_conversation_id_fkey";

-- AlterTable
ALTER TABLE "api_keys" ADD COLUMN     "collection_id" TEXT;

-- AlterTable
ALTER TABLE "documents" ALTER COLUMN "status" SET DEFAULT 'uploaded';

-- CreateTable
CREATE TABLE "api_query_logs" (
    "id" TEXT NOT NULL,
    "api_key_id" TEXT NOT NULL,
    "collection_id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "citations" JSONB,
    "token_in" INTEGER,
    "token_out" INTEGER,
    "latency_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_query_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "api_query_logs_api_key_id_created_at_idx" ON "api_query_logs"("api_key_id", "created_at");

-- CreateIndex
CREATE INDEX "api_keys_prefix_idx" ON "api_keys"("prefix");

-- CreateIndex
CREATE UNIQUE INDEX "chunks_meta_document_id_chunk_index_key" ON "chunks_meta"("document_id", "chunk_index");

-- CreateIndex
CREATE INDEX "conversations_collection_id_updated_at_idx" ON "conversations"("collection_id", "updated_at");

-- CreateIndex
CREATE INDEX "documents_collection_id_idx" ON "documents"("collection_id");

-- CreateIndex
CREATE INDEX "documents_user_id_status_idx" ON "documents"("user_id", "status");

-- CreateIndex
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chunks_meta" ADD CONSTRAINT "chunks_meta_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_query_logs" ADD CONSTRAINT "api_query_logs_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "api_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
