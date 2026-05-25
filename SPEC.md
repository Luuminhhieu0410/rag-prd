# RAG 

> Personal learning project. Mục tiêu: luyện code sâu các pattern backend (queue, RAG, ES, MCP, auth) qua việc xây một công cụ chuyển PDF/DOCX/URL blog thành kho kiến thức có thể search + chat (kiểu NotebookLM thu nhỏ).

**Locked**: 2026-05-10
**Owner**: seomduc@gmail.com
**Estimated**: ~4–5 tuần part-time (8 phase)

---

## Mục lục

1. [Mục tiêu & nguyên tắc](#1-mục-tiêu--nguyên-tắc)
2. [Tech stack (locked)](#2-tech-stack-locked)
3. [Kiến trúc tổng thể](#3-kiến-trúc-tổng-thể)
4. [Feature spec — v1 (MVP)](#4-feature-spec--v1-mvp)
5. [Feature spec — v2 (backlog)](#5-feature-spec--v2-backlog)
6. [Data model](#6-data-model)
7. [Auth — Firebase Google](#7-auth--firebase-google)
8. [Pipeline ingest](#8-pipeline-ingest)
9. [RAG / Hybrid search flow](#9-rag--hybrid-search-flow)
10. [Elasticsearch schema](#10-elasticsearch-schema)
11. [API surface (overview)](#11-api-surface-overview)
12. [MCP server](#12-mcp-server)
13. [Roadmap 8 phase](#13-roadmap-8-phase)
14. [Open decisions](#14-open-decisions)
15. [Nguyên tắc khi code](#15-nguyên-tắc-khi-code)

---

## 1. Mục tiêu & nguyên tắc

- **Mục tiêu chính**: học sâu backend pattern. Không phải ship production.
- **Mục tiêu phụ**: portfolio-ready, có demo chạy được + README có architecture diagram.
- **Nguyên tắc**:
  - Mỗi phase ship được end-to-end (không "build hết infra mới có UI").
  - Single monolith NestJS (API + workers cùng codebase, khác process khi deploy).
  - Không over-engineer: từ chối microservice, polyglot worker, OCR cho đến khi thật sự cần.

---

## 2. Tech stack (locked)

| Layer | Choice | Lý do |
|---|---|---|
| Backend | **NestJS** | Module structure phù hợp pipeline; có sẵn integration cho mọi component |
| Frontend | **Next.js (App Router)** | Server Actions cho upload, streaming response cho chat |
| DB | **Postgres** | Metadata: users, collections, documents, chunks_meta, conversations |
| Queue | **BullMQ + Redis** | Async pipeline parse/chunk/embed/index |
| Search | **Elasticsearch 8.11+** | Cả BM25 lẫn `dense_vector` + RRF hybrid trong một engine |
| Object storage | **MinIO** (S3-compat) | Raw files + extracted text |
| Auth | **Firebase Auth (Google only)** | Verify ID token mỗi request, không tự issue JWT |
| LLM | OpenAI hoặc Anthropic API | Chưa chốt cuối — quyết định ở Phase 6 |
| Embedding | OpenAI `text-embedding-3-small` (1536d) hoặc Voyage `voyage-3-lite` | Chốt ở Phase 5 |
| MCP | `@modelcontextprotocol/sdk` (TS) | Expose 3 tools, auth bằng API key |
| Realtime | **SSE** (không WebSocket v1) | Đủ cho one-way progress notification |

**Đã loại trừ**:
- ❌ PubSub microservice (defer)
- ❌ Python worker hybrid (chọn pure Node)
- ❌ OCR (defer đến khi gặp scanned PDF thật)
- ❌ Vector DB riêng (Qdrant/pgvector) — ES đủ
- ❌ Own JWT + refresh token (Firebase lo)

---

## 3. Kiến trúc tổng thể

```
┌─────────────────┐
│   Next.js FE    │  Firebase SDK · upload · chat (streaming) · search
└────────┬────────┘
         │ HTTP (Bearer: firebase_id_token)
┌────────▼────────────────────────────────────┐
│           NestJS API (single process)        │
│  ┌────────┐ ┌──────────┐ ┌──────────┐ ...   │
│  │  Auth  │ │Document  │ │  Search  │       │
│  │ Module │ │ Module   │ │  Module  │       │
│  └────────┘ └────┬─────┘ └────┬─────┘       │
│       ▲ FirebaseAuthGuard      │              │
│       │ OwnershipGuard         │              │
└───────┼────────────────────────┼──────────────┘
        │ enqueue                │ query
        ▼                        ▼
┌──────────────┐         ┌────────────┐
│ Redis +      │         │ Elastic    │
│ BullMQ       │         │ search     │
│ (queue)      │         │ (BM25+vec) │
└──────┬───────┘         └─────▲──────┘
       │ consume                │ index
       ▼                        │
┌────────────────────────────────┐
│   NestJS Workers (cùng repo)    │
│   parse → chunk → embed → index │
└──────┬──────────────────────────┘
       │ read raw                 ┌──────────────┐
       └─────────────────────────▶│  MinIO / S3  │
                                  │  raw + text  │
                                  └──────────────┘
       ┌──────────────┐         ┌──────────────────┐
       │  Postgres    │         │ Firebase (Google │
       │  metadata    │         │ Identity)        │
       └──────────────┘         └──────────────────┘

       ┌──────────────────┐
       │  MCP Server      │  3 tools, auth = API key
       │  stdio / HTTP    │  → query ES + Postgres
       └──────────────────┘
```

---

## 4. Feature spec — v1 (MVP)

### 4.1 Auth
- Login Google qua Firebase popup ở FE
- `GET /auth/me` trả profile từ Postgres
- Tự upsert user vào DB lần đầu login (lazy upsert trong guard)
- API keys cho MCP: tạo (show 1 lần), list, revoke

### 4.2 Collections
- CRUD: name + description + emoji icon + color
- List sort theo `updated_at`/`name`
- Counter: số document, số conversation
- Empty state có CTA upload
- Confirm modal khi xóa (cascade)

### 4.3 Documents — Ingest
- Upload **multi-file** PDF/DOCX cùng lúc (drag-drop)
- Paste URL blog → fetch + extract bằng `@extractus/article-extractor`
- Validate: max 50MB/file, mime whitelist
- Hiển thị quota dung lượng

### 4.4 Documents — Management
- List trong collection: icon theo type, title, status badge, ngày upload, số chunk
- Detail: tab Text / Chunks / Metadata
- Status real-time: `uploaded → parsing → chunking → embedding → ready` / `failed`
- Error message khi fail
- Retry button khi failed
- Delete (cascade MinIO + ES chunks)
- Download original

### 4.5 Processing UX
- Progress real-time qua SSE: "Đang embed chunk 32/120"
- Toast notification khi xong
- Badge số doc đang xử lý ở header

### 4.6 Search (trong 1 collection)
- Toggle 3 mode: Keyword / Semantic / Hybrid
- Result: snippet highlight + tên doc + page + score
- Click result → mở document tại đúng chunk (anchor scroll)

### 4.7 Chat (RAG)
- Tạo conversation trong collection (auto-name từ câu hỏi đầu)
- Sidebar list conversation: rename, delete
- Streaming response token-by-token
- **Citations**: chip `[1]` `[2]` click → drawer hiển thị chunk gốc + "Go to source"
- Conversation history (LLM dùng context cũ)
- Loading + error handling
- Empty state với gợi ý câu hỏi mẫu (tĩnh)
- Copy answer (markdown)

### 4.8 Document Viewer
- Plain text đã extract, phân trang theo page gốc
- Anchor scroll đến chunk khi mở từ search/citation
- Highlight chunk hiện tại

### 4.9 MCP
- 3 tools: `search_knowledge`, `get_document`, `list_collections`
- Auth: API key trong header
- Trang Settings: tạo key + copy snippet `claude_desktop_config.json`

---

## 5. Feature spec — v2 (backlog)

- Forgot password / OAuth khác (không cần vì Firebase)
- Xóa account đầy đủ (revoke Firebase + cascade DB)
- Search collection theo tên / pin collection / share read-only
- Paste raw text/markdown ingest
- Bulk folder upload, multi-page crawler, Notion/Drive import
- Move document giữa collection
- Re-process (đổi embedding model)
- Edit title, tag document
- Estimate ETA processing, email notification
- Saved searches, search history, cross-collection search
- Re-generate / edit câu hỏi cuối / suggested follow-up / suggested initial
- Export conversation (md/PDF), token cost counter, chọn model per conversation
- Adjust retrieval params (top-K, hybrid weight)
- PDF.js viewer với bbox highlight
- Outline/TOC, personal note/highlight
- Theme dark/light, default model
- MCP `create_note` tool, MCP activity log
- Notification center, activity log per collection

---

## 6. Data model

### Postgres

```sql
users (
  id              uuid pk,
  firebase_uid    text unique not null,
  email           text not null,
  name            text,
  avatar_url      text,
  created_at      timestamptz default now(),
  last_login_at   timestamptz
)

api_keys (
  id              uuid pk,
  user_id         uuid fk users,
  name            text not null,
  key_hash        text not null,        -- bcrypt or sha256 of full key
  prefix          text not null,        -- "sk_xxxx" để user nhận diện
  last_used_at    timestamptz,
  created_at      timestamptz default now(),
  revoked_at      timestamptz
)

collections (
  id              uuid pk,
  user_id         uuid fk users,
  name            text not null,
  description     text,
  icon            text,                 -- emoji
  color           text,                 -- hex
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
)

documents (
  id              uuid pk,
  collection_id   uuid fk collections,
  user_id         uuid fk users,        -- denorm để query nhanh + ES filter
  source_type     text check in ('pdf','docx','url'),
  source_url      text,                 -- với url type
  original_name   text,                 -- với upload
  raw_path        text,                 -- MinIO key
  text_path       text,                 -- MinIO key của plain text đã extract
  status          text check in ('uploaded','parsing','chunking','embedding','ready','failed'),
  error_message   text,
  page_count      int,
  chunk_count     int,
  byte_size       bigint,
  metadata        jsonb,                -- author, title, etc từ PDF
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
)

chunks_meta (
  id              uuid pk,
  document_id     uuid fk documents,
  chunk_index     int not null,
  page            int,
  char_start      int,
  char_end        int,
  token_count     int,
  created_at      timestamptz default now()
  -- text + vector ở Elasticsearch, KHÔNG lặp ở Postgres
)

conversations (
  id              uuid pk,
  collection_id   uuid fk collections,
  user_id         uuid fk users,
  title           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
)

messages (
  id              uuid pk,
  conversation_id uuid fk conversations,
  role            text check in ('user','assistant','system'),
  content         text not null,
  citations       jsonb,                -- [{chunk_id, document_id, page, score}]
  token_in        int,
  token_out       int,
  created_at      timestamptz default now()
)
```

**Indexes quan trọng**: `documents(collection_id)`, `documents(user_id, status)`, `chunks_meta(document_id, chunk_index)`, `conversations(collection_id, updated_at desc)`, `messages(conversation_id, created_at)`.

### Elasticsearch — index `chunks`

Xem section [10. Elasticsearch schema](#10-elasticsearch-schema).

### MinIO bucket layout

```
raw/{user_id}/{document_id}/{original_filename}      ← file gốc upload
text/{user_id}/{document_id}/full.txt                ← plain text sau parse
text/{user_id}/{document_id}/page-{n}.txt            ← (optional) split per page để viewer load nhanh
```

---

## 7. Auth — Firebase Google

### Flow

```
[Next.js] user click "Sign in with Google"
   → firebase/auth signInWithPopup(GoogleAuthProvider)
   → SDK lưu session, expose currentUser + getIdToken()
   → mọi fetch tự gắn: Authorization: Bearer <id_token>

[NestJS] FirebaseAuthGuard
   1. extract token từ header
   2. firebase-admin.auth().verifyIdToken(token)  (cache 5min trong Redis)
   3. upsert user vào Postgres lần đầu (firebase_uid → users)
   4. attach req.user = { id, firebase_uid, email, name }
   5. update last_login_at
```

### Endpoints

```
GET    /auth/me           → trả user trong DB (yêu cầu guard)
DELETE /auth/account      → xóa user + cascade + revoke Firebase user [v2]

POST   /api-keys          → tạo key, trả full string 1 lần duy nhất
GET    /api-keys          → list (chỉ prefix + name + last_used)
DELETE /api-keys/:id      → revoke
```

### Authorization

- `FirebaseAuthGuard` áp toàn cục (decorator `@Public()` để loại trừ health endpoint)
- `OwnershipGuard` áp lên mọi resource riêng tư:
  ```ts
  // pseudocode
  if (resource.user_id !== req.user.id) throw ForbiddenException
  ```
- ES query luôn có filter `term: { user_id: <req.user.id> }` — defense in depth
- Pattern khuyến nghị: thêm `WHERE user_id = ?` ở repository layer thay vì controller (an toàn hơn vì không quên)

### MCP API key auth

- Header: `X-API-Key: sk_<full_key>`
- Verify: hash incoming → match `api_keys.key_hash`
- `MCPApiKeyGuard` thay cho `FirebaseAuthGuard` cho route MCP
- Resolve `user_id` từ api_key, attach vào `req.user`

---

## 8. Pipeline ingest

### Queue topology

```
Queue: parse
  ParseJob {documentId}
    → đọc raw từ MinIO
    → extract text:
        pdf  → unpdf hoặc pdf-parse
        docx → mammoth
        url  → @extractus/article-extractor
    → ghi text/{user_id}/{document_id}/full.txt vào MinIO
    → update documents.status = 'chunking'
    → enqueue ChunkJob

Queue: chunk
  ChunkJob {documentId}
    → đọc full.txt
    → recursive splitter ~500 token, overlap 50
    → INSERT chunks_meta cho từng chunk
    → emit text + metadata cho IndexJob (text-only, BM25)
    → update documents.status = 'embedding'
    → enqueue EmbedJob

Queue: embed
  EmbedJob {documentId}
    → load chunks_meta + text từ MinIO
    → batch 100 chunks/lần gọi embedding API
    → bulk index vào ES (text + vector + metadata)
    → update documents.status = 'ready', chunk_count
    → emit SSE event "ready"
```

### Retry & error

- BullMQ retry: 3 lần, exponential backoff (5s, 25s, 125s)
- Sau 3 fail → DLQ + status `failed` + error_message
- **Idempotency**: mỗi job có `documentId`, worker phải an toàn khi chạy lại (vd: delete old chunks before re-chunking)
- Bull Board UI ở dev (`@bull-board/express`) — debug queue trực quan

### SSE progress

```
GET /documents/:id/events   (SSE)
  emit khi:
    - status change
    - embed progress: { processed: 32, total: 120 }
    - error
```

---

## 9. RAG / Hybrid search flow

### Search standalone

```
POST /collections/:id/search
  body: { query, mode: 'keyword'|'semantic'|'hybrid', topK }

  flow:
    if mode=keyword:
      ES BM25 query với filter user_id + collection_id
    if mode=semantic:
      embed(query) → ES kNN với filter
    if mode=hybrid:
      ES rank.rrf combine BM25 + kNN

  return: [{chunk_id, document_id, page, snippet, score}]
```

### Chat (RAG)

```
POST /conversations/:id/messages
  body: { query }
  → SSE stream

  flow:
    1. embed(query)
    2. hybrid search trong collection của conversation, top-K=8
    3. (optional) rerank bằng cross-encoder API
    4. build prompt:
        SYSTEM: "You are helpful assistant. Answer ONLY from CONTEXT.
                 Cite sources as [1], [2] referring to chunks.
                 If context insufficient, say so."
        CONTEXT:
          [1] (doc: "X.pdf", page 5) chunk text...
          [2] (doc: "Y.pdf", page 12) chunk text...
        HISTORY: previous messages
        USER: query
    5. stream LLM response
    6. parse [n] → resolve thành citations array
    7. lưu message + citations vào DB
    8. emit final event với citations
```

### Prompt engineering notes

- Bắt LLM trả citation dạng `[1]` rồi mình map về `chunk_id` từ thứ tự context
- Nếu không có chunk relevant đủ → instruct LLM nói "Không tìm thấy thông tin"
- Limit context size: top-K * avg_chunk_size phải < model context window - response budget

---

## 10. Elasticsearch schema

### Index `chunks` mapping

```json
{
  "mappings": {
    "properties": {
      "chunk_id":      { "type": "keyword" },
      "document_id":   { "type": "keyword" },
      "collection_id": { "type": "keyword" },
      "user_id":       { "type": "keyword" },
      "chunk_index":   { "type": "integer" },
      "page":          { "type": "integer" },
      "text":          { "type": "text", "analyzer": "standard" },
      "vector":        {
        "type": "dense_vector",
        "dims": 1536,
        "index": true,
        "similarity": "cosine"
      },
      "created_at":    { "type": "date" }
    }
  }
}
```

### Hybrid query (ES 8.11+ RRF)

```json
{
  "retriever": {
    "rrf": {
      "retrievers": [
        { "standard": {
            "query": { "bool": {
              "must":   [{ "match": { "text": "<query>" }}],
              "filter": [
                { "term": { "user_id": "<uid>" }},
                { "term": { "collection_id": "<cid>" }}
              ]
            }}
        }},
        { "knn": {
            "field": "vector",
            "query_vector": [/* 1536d */],
            "k": 50, "num_candidates": 200,
            "filter": [
              { "term": { "user_id": "<uid>" }},
              { "term": { "collection_id": "<cid>" }}
            ]
        }}
      ],
      "rank_window_size": 50,
      "rank_constant": 60
    }
  },
  "size": 8
}
```

---

## 11. API surface (overview)

```
# Auth
GET    /auth/me
POST   /api-keys
GET    /api-keys
DELETE /api-keys/:id

# Collections
GET    /collections
POST   /collections
GET    /collections/:id
PATCH  /collections/:id
DELETE /collections/:id

# Documents
POST   /collections/:id/documents              (multipart, multi-file)
POST   /collections/:id/documents/url          (body: {url})
GET    /collections/:id/documents
GET    /documents/:id
GET    /documents/:id/text
GET    /documents/:id/download
GET    /documents/:id/events                   (SSE progress)
POST   /documents/:id/retry
DELETE /documents/:id

# Search
POST   /collections/:id/search                 (body: {query, mode, topK})

# Chat
GET    /collections/:id/conversations
POST   /collections/:id/conversations
GET    /conversations/:id
PATCH  /conversations/:id                      (rename)
DELETE /conversations/:id
GET    /conversations/:id/messages
POST   /conversations/:id/messages             (SSE stream)

# MCP (separate auth: X-API-Key)
POST   /mcp/                                    (MCP transport endpoint)
```

---

## 12. MCP server

### Tools

```ts
// search_knowledge
{
  name: "search_knowledge",
  description: "Search the user's knowledge base using hybrid BM25+vector",
  input_schema: {
    type: "object",
    properties: {
      query:         { type: "string" },
      collection_id: { type: "string", description: "optional, scope to one collection" },
      top_k:         { type: "integer", default: 8 }
    },
    required: ["query"]
  }
}
// → returns: [{chunk_id, document_id, page, snippet, score}]

// get_document
{
  name: "get_document",
  description: "Get full text + metadata of a document",
  input_schema: {
    type: "object",
    properties: { document_id: { type: "string" } },
    required: ["document_id"]
  }
}

// list_collections
{
  name: "list_collections",
  description: "List user's collections",
  input_schema: { type: "object", properties: {} }
}
```

### Transport

- v1: HTTP transport (đơn giản, dễ deploy chung NestJS)
- Setup guide cho user: snippet `claude_desktop_config.json` với URL + API key

---

## 13. Roadmap 8 phase

### Phase 0 — Skeleton & Infra (1–2 ngày)
- pnpm monorepo: `apps/api` (NestJS), `apps/web` (Next.js), `packages/shared` (DTO/types)
- `docker-compose.yml`: Postgres, Redis, Elasticsearch, MinIO, Kibana
- ENV validation (`@nestjs/config` + Zod)
- Health endpoint + Next.js home page
- ESLint + Prettier + Husky
- Tạo Firebase project, enable Google provider, tải service account JSON
- **Học**: monorepo, docker compose, env management

### Phase 1 — Auth Firebase (1–2 ngày)
- `firebase-admin` setup, `FirebaseAuthGuard`, lazy upsert user
- `users` migration (Prisma chọn)
- `OwnershipGuard`
- `api_keys` table + module + `MCPApiKeyGuard`
- FE: cài `firebase`, login page, hook `useAuth`, axios interceptor gắn token, middleware client-side guard
- **Học**: Firebase Admin SDK, identity provider tách rời domain user, API key pattern

### Phase 2 — Upload & Collections (2–3 ngày)
- Migrations: `collections`, `documents`
- Upload PDF/DOCX multi-file → MinIO (multer-s3 streaming)
- URL ingest endpoint (chỉ lưu URL + fetch HTML thô)
- CRUD collection, list/detail/retry/delete document
- FE: trang Collections, drag-drop upload, document list với status badge
- **Học**: object storage, multipart streaming, ownership pattern

### Phase 3 — BullMQ Pipeline (4–5 ngày)
- BullMQ setup, queue: `parse`, `chunk`, `embed` (embed activate ở P5)
- ParseJob, ChunkJob workers
- `chunks_meta` migration
- SSE endpoint `/documents/:id/events`
- Retry + DLQ + Bull Board
- FE: progress bar real-time qua EventSource
- **Học**: queue patterns, idempotent jobs, retry/DLQ, SSE, observability

### Phase 4 — Elasticsearch BM25 (3 ngày)
- ES index `chunks` với mapping (chưa vector)
- IndexJob bulk index text
- Search endpoint mode `keyword` + filter user_id/collection_id
- FE: trang Search, highlight, snippet
- **Học**: ES mapping, analyzer, BM25, bulk API, filter context

### Phase 5 — Embedding + Hybrid (4–5 ngày)
- Chốt embedding model (OpenAI vs Voyage)
- Update ES mapping với `dense_vector`
- EmbedJob activate, batch + retry
- Reindex command
- Search mode `semantic` + `hybrid` với RRF
- FE: toggle 3 mode
- **Học**: embedding API, dense_vector, kNN, RRF, cost awareness

### Phase 6 — RAG Chat (4–5 ngày)
- `conversations`, `messages` migrations
- POST messages SSE streaming
- Prompt template + citation parsing
- FE: chat UI streaming + citation chip drawer + conversation sidebar
- **Học**: streaming LLM, prompt design, citation handling, context window

### Phase 7 — MCP Server (2 ngày)
- MCP TS SDK setup, 3 tools
- API key auth integration
- Settings page generate key + setup guide
- Test với Claude Desktop
- **Học**: MCP protocol, tool schema, API key auth

### Phase 8 — Polish (3–4 ngày)
- Rate limit `@nestjs/throttler`
- Pino logging + correlation ID
- Test: unit cho service, e2e auth + ingest
- Production Dockerfile multi-stage
- README + architecture diagram + GIF demo
- **Học**: observability, testing, production hygiene

---

## 14. Open decisions

| Quyết định | Cần chốt ở phase | Options |
|---|---|---|
| Embedding model | P5 | OpenAI `text-embedding-3-small` (1536d) / Voyage `voyage-3-lite` |
| LLM provider | P6 | OpenAI / Anthropic |
| ORM | P1 | **Prisma** (gợi ý) / TypeORM |
| Reranker dùng không | P6 | Skip v1 / Cohere rerank API |
| Session cookie cho SSR-protected | P1 hoặc P8 | Client-side guard v1 / exchange Firebase ID → session cookie |

---

## 15. Nguyên tắc khi code

1. **Đừng nhảy phase** — Phase 3 không xong (queue rớt job, không retry được) thì Phase 4 sẽ rất đau.
2. **Mỗi phase = 1 PR/branch** — commit message rõ, sau này nhìn lại biết học gì ở đâu.
3. **Mỗi phase có "demo moment"** — quay GIF/screenshot, vừa portfolio vừa milestone tâm lý.
4. **Idempotency mọi worker** — chạy lại không lỗi, không duplicate data.
5. **Authorization không bao giờ chỉ ở controller** — lặp lại ở repository (`WHERE user_id`) và ES filter (`term: user_id`). Defense in depth.
6. **SSE và streaming**: test với network throttling, đảm bảo không bị buffer chặn.
7. **Cost awareness**: log token usage mỗi LLM/embedding call vào DB (kể cả v1 không hiển thị) — sau này muốn analyze dễ.
8. **Đừng commit Firebase service account JSON** — `.gitignore` ngay.
9. **Không tự mở rộng scope** — mọi feature `[v2]` phải đóng băng đến khi v1 đã ship.

---

*End of spec — sẵn sàng bắt đầu Phase 0.*
