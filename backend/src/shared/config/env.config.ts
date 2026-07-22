import {
  STRUCTURED_EVIDENCE_MAX,
  STRUCTURED_MAX_CELLS,
  STRUCTURED_MAX_COLUMNS,
  STRUCTURED_MAX_ROWS,
  STRUCTURED_QUERY_TIMEOUT_MS,
  STRUCTURED_TIE_SCAN_MAX,
  STRUCTURED_TOP_N_MAX,
} from '../structured-data/structured-data.constants';

export const DATABASE_URL =
  'postgresql://' +
  process.env.POSTGRES_USER +
  ':' +
  process.env.POSTGRES_PASSWORD +
  '@' +
  process.env.POSTGRES_HOST +
  ':' +
  process.env.POSTGRES_PORT +
  '/' +
  process.env.POSTGRES_DB;
export const envConfig = {
  DATABASE_URL:
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/app',

  POSTGRES_USER: process.env.POSTGRES_USER || 'postgres',
  POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD || 'postgres',
  POSTGRES_HOST: process.env.POSTGRES_HOST || 'localhost',
  POSTGRES_PORT: Number(process.env.POSTGRES_PORT || 5432),
  POSTGRES_DB: process.env.POSTGRES_DB || 'app',

  STACK_VERSION: process.env.STACK_VERSION || '8.14.3',

  ES_PORT: Number(process.env.ES_PORT || 9200),
  ELASTIC_HOST: process.env.ELASTIC_HOST || 'https://localhost:9200',
  ELASTIC_USER: process.env.ELASTIC_USER || 'elastic',
  ELASTIC_PASSWORD: process.env.ELASTIC_PASSWORD || 'changeme',

  KIBANA_PORT: Number(process.env.KIBANA_PORT || 5601),
  KIBANA_PASSWORD: process.env.KIBANA_PASSWORD || 'changeme',

  EMBEDDING_MODEL: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',

  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  OPENAI_EMBEDDING_MODEL:
    process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',

  GOOGLE_APPLICATION_CREDENTIALS:
    process.env.GOOGLE_APPLICATION_CREDENTIALS || './service-account.json',

  R2_HOST: process.env.R2_URL || '',
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID || '',
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY || '',
  R2_BUCKET: process.env.R2_BUCKET || '',
  R2_PRESIGN_TTL: Number(process.env.R2_PRESIGN_TTL || 3600),

  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: Number(process.env.REDIS_PORT || 6379),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || 'redis',
  INGESTION_CONCURRENCY: Number(process.env.INGESTION_CONCURRENCY || 2),

  STRUCTURED_MAX_ROWS: Number(
    process.env.STRUCTURED_MAX_ROWS || STRUCTURED_MAX_ROWS,
  ),
  STRUCTURED_MAX_COLUMNS: Number(
    process.env.STRUCTURED_MAX_COLUMNS || STRUCTURED_MAX_COLUMNS,
  ),
  STRUCTURED_MAX_CELLS: Number(
    process.env.STRUCTURED_MAX_CELLS || STRUCTURED_MAX_CELLS,
  ),
  STRUCTURED_TOP_N_MAX: Number(
    process.env.STRUCTURED_TOP_N_MAX || STRUCTURED_TOP_N_MAX,
  ),
  STRUCTURED_EVIDENCE_MAX: Number(
    process.env.STRUCTURED_EVIDENCE_MAX || STRUCTURED_EVIDENCE_MAX,
  ),
  STRUCTURED_TIE_SCAN_MAX: Number(
    process.env.STRUCTURED_TIE_SCAN_MAX || STRUCTURED_TIE_SCAN_MAX,
  ),
  STRUCTURED_QUERY_TIMEOUT_MS: Number(
    process.env.STRUCTURED_QUERY_TIMEOUT_MS || STRUCTURED_QUERY_TIMEOUT_MS,
  ),

  EMBEDDING_DIMS: Number(process.env.EMBEDDING_DIMS || 1536),
  ES_CHUNK_INDEX: process.env.ES_CHUNK_INDEX || 'chunks',

  JINA_APIKEY: process.env.JINA_APIKEY || '',
  JINA_MODEL: process.env.JINA_MODEL || '',
  JINA_RERANK_MODEL:
    process.env.JINA_RERANK_MODEL || 'jina-reranker-v2-base-multilingual',
  OPENAI_CHAT_MODEL: process.env.OPENAI_CHAT_MODEL || 'gpt-4.1-mini',
  OPENAI_ANALYSIS_MODEL: process.env.OPENAI_ANALYSIS_MODEL || 'gpt-4.1-mini',
  CHAT_SIMPLE_TOP_K: Number(process.env.CHAT_SIMPLE_TOP_K || 30),
  CHAT_COMPLEX_TOP_K: Number(process.env.CHAT_COMPLEX_TOP_K || 15),
  CHAT_RERANK_TOP_N: Number(process.env.CHAT_RERANK_TOP_N || 8),
};
