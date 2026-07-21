WITH ranked AS (
  SELECT "id", "collection_id",
    FIRST_VALUE("id") OVER (
      PARTITION BY "collection_id" ORDER BY "created_at" ASC, "id" ASC
    ) AS canonical_id,
    ROW_NUMBER() OVER (
      PARTITION BY "collection_id" ORDER BY "created_at" ASC, "id" ASC
    ) AS row_number
  FROM "conversations"
), duplicates AS (
  SELECT "id", canonical_id FROM ranked WHERE row_number > 1
)
UPDATE "messages" AS message
SET "conversation_id" = duplicates.canonical_id
FROM duplicates
WHERE message."conversation_id" = duplicates."id";

WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "collection_id" ORDER BY "created_at" ASC, "id" ASC
  ) AS row_number
  FROM "conversations"
)
DELETE FROM "conversations"
USING ranked
WHERE "conversations"."id" = ranked."id" AND ranked.row_number > 1;

CREATE UNIQUE INDEX "conversations_collection_id_key"
ON "conversations"("collection_id");
