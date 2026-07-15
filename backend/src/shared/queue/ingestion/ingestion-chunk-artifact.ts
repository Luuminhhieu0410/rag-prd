import { Document } from '@langchain/core/documents';

const ARTIFACT_VERSION = 1;

interface SerializedChunk {
  pageContent: string;
  metadata: Record<string, unknown>;
}

interface ChunkArtifact {
  version: typeof ARTIFACT_VERSION;
  sourceType: string;
  pageCount: number | null;
  chunks: SerializedChunk[];
}

export interface DeserializedChunkArtifact {
  pageCount: number | null;
  chunks: Document[];
}

export function serializeChunkArtifact(
  sourceType: string,
  pageCount: number | null,
  chunks: Document[],
): string {
  const artifact: ChunkArtifact = {
    version: ARTIFACT_VERSION,
    sourceType,
    pageCount,
    chunks: chunks.map((chunk) => ({
      pageContent: chunk.pageContent,
      metadata: chunk.metadata,
    })),
  };

  return JSON.stringify(artifact);
}

export function deserializeChunkArtifact(
  raw: string,
  expectedSourceType: string,
): DeserializedChunkArtifact {
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value)) throw new Error('root must be an object');
    if (value.version !== ARTIFACT_VERSION) {
      throw new Error('version is unsupported');
    }
    if (
      typeof value.sourceType !== 'string' ||
      value.sourceType !== expectedSourceType
    ) {
      throw new Error('source type does not match');
    }
    if (
      value.pageCount !== null &&
      (!Number.isInteger(value.pageCount) || Number(value.pageCount) < 0)
    ) {
      throw new Error('page count is invalid');
    }
    if (!Array.isArray(value.chunks))
      throw new Error('chunks must be an array');

    const chunks = value.chunks.map((chunk) => {
      if (
        !isRecord(chunk) ||
        typeof chunk.pageContent !== 'string' ||
        !isRecord(chunk.metadata)
      ) {
        throw new Error('chunk shape is invalid');
      }
      return new Document({
        pageContent: chunk.pageContent,
        metadata: chunk.metadata,
      });
    });

    return { pageCount: value.pageCount as number | null, chunks };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`invalid ingestion chunk artifact: ${message}`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
