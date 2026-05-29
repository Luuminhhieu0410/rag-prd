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

  REDIS_PASSWORD: process.env.REDIS_PASSWORD || 'redis',

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
};
