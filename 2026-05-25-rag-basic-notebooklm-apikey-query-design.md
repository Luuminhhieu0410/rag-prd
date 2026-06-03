# Design — RAG cơ bản (NotebookLM-lite) + API-key query cho 1 collection

**Date**: 2026-05-25
**Owner**: seomduc@gmail.com
**Nguồn chân lý**: `SPEC.md` (project root). Doc này là feature inventory + DB delta, **không thay thế** SPEC; chỗ nào lệch SPEC được ghi rõ "DEVIATION".

---

## 1. Mục tiêu của doc

Bạn muốn **liệt kê tính năng "NotebookLM cơ bản"** và soi vào **database đã có** (Prisma schema đã migrate) để biết: DB đỡ được tới đâu, còn thiếu gì; đồng thời thêm tính năng headline **API-key query 1 collection trả RAG answer + citations**.

Doc này KHÔNG cam kết build hết ngay. Nó là bản đồ scope + delta DB để làm input cho implementation plan sau.

---

## 2. Trạng thái repo hiện tại (2026-05-25)

- ✅ **Data model xong**: `backend/prisma/schema.prisma` + 1 migration (`20260511064901_1_0_0`) đã có đủ 7 bảng: `users`, `api_keys`, `collections`, `documents`, `chunks_meta`, `conversations`, `messages`.
- ⚠️ **Backend mới skeleton**: chỉ `app.module/controller/service`. Deps cài: `@nestjs/*`, `prisma`, `reflect-metadata`, `rxjs`. **Chưa có** `firebase-admin`, `bullmq`/`@nestjs/bullmq`, ES client, `minio`, `multer`, `@nestjs/config`, embedding/LLM SDK.
- ⚠️ **Chưa có infra**: không có `docker-compose.yml` (Postgres/Redis/ES/MinIO), không có `.env`.
- 🔸 **DEVIATION**: `web/` đang là **Vite + React 19**, không phải Next.js App Router như SPEC §2 lock. Doc này tập trung **backend**; FE để xử lý riêng sau.

Hệ quả: "RAG cơ bản + API-key query" ở trạng thái này ≈ toàn bộ **Phase 2→6** của SPEC (upload → pipeline → ES → embedding/hybrid → chat) **cộng** một phần Phase 7 (auth API key) + endpoint query mới.

---

## 3. Feature inventory — soi vào DB hiện có

### A. Tính năng lõi NotebookLM cơ bản

| # | Tính năng | Bảng/cột DB hỗ trợ | DB sẵn sàng? |
|---|---|---|---|
| 1 | Đăng nhập Firebase Google + hồ sơ user | `users` (firebase_uid, email, name, avatar_url, last_login_at) | ✅ Đủ |
| 2 | Collection (notebook) CRUD: name/desc/icon/color | `collections` | ✅ Đủ |
| 3 | Counter "số doc / số conversation" mỗi collection | `COUNT()` trên `documents`/`conversations` | ✅ Không cần cột |
| 4 | Upload nguồn PDF/DOCX + paste URL | `documents` (source_type enum, source_url, original_name, raw_path, text_path, byte_size, metadata) | ✅ Đủ |
| 5 | Quản lý doc: status, retry, xoá, download | `documents` (status enum 6 trạng thái, error_message, page_count, chunk_count) | ✅ Đủ |
| 6 | Pipeline parse→chunk→embed→index | `chunks_meta` (chunk_index, page, char_start/end, token_count). *Text+vector ở ES, không lặp DB* | ✅ Đủ (đúng SPEC §6) |
| 7 | Search keyword/semantic/hybrid trong 1 collection | Sống ở **Elasticsearch**; DB chỉ map `chunk_id`↔doc/page qua `chunks_meta` | ✅ Đủ (phần DB) |
| 8 | Chat RAG: conversation + message + citations streaming | `conversations` (title) + `messages` (role, content, **citations jsonb**, token_in/out) | ✅ Đủ |
| 9 | Document viewer anchor scroll tới chunk | `chunks_meta` (char_start/end, page) + text từ MinIO | ✅ Đủ |

### B. Tính năng API-key query (headline) — trả RAG answer + citations

| # | Tính năng | DB hỗ trợ | DB sẵn sàng? |
|---|---|---|---|
| 10 | Tạo / list / revoke API key | `api_keys` (key_hash, prefix, last_used_at, revoked_at) | ✅ Đủ |
| 11 | Auth bằng API key (hash incoming → match) + update last_used | `api_keys.key_hash`, `last_used_at` | ✅ Đủ |
| 12 | POST query + API key → RAG answer + citations, scoped 1 collection | retrieval ES + LLM; ownership api_key→collection | ⚠️ Cần delta (xem §4) |

---

## 4. DB delta — 3 thay đổi (đã chốt với owner)

### 4.1 `api_keys`: thêm `collection_id` (nullable) — quyết định G1

```prisma
model ApiKey {
  // ...giữ nguyên các cột cũ...
  collectionId  String?     @map("collection_id")
  collection    Collection? @relation(fields: [collectionId], references: [id])

  @@index([prefix])          // lookup key nhanh theo prefix rồi mới compare hash
  @@map("api_keys")
}
```

- `collection_id = null` → key **user-wide** (để dành cho MCP tools như `list_collections`, vốn cần phạm vi user theo SPEC §12).
- `collection_id` có giá trị → key **scoped đúng 1 collection** → dùng cho endpoint `/v1/query`.
- **Lý do nullable thay vì NOT NULL**: nếu bind cứng *mọi* key thì MCP user-wide vỡ. Nullable cho 2 loại key cùng tồn tại.
- `Collection` model thêm quan hệ ngược: `apiKeys ApiKey[]`.

### 4.2 Bảng mới `api_query_logs` — quyết định G2 (cost-awareness, CLAUDE.md #6)

API-key query là **stateless** (không tạo conversation), nhưng `messages.token_in/out` lại bắt buộc `conversation_id` → không có chỗ ghi token. Tách bảng riêng cho sạch:

```prisma
model ApiQueryLog {
  id           String   @id @default(uuid())
  apiKeyId     String   @map("api_key_id")
  collectionId String   @map("collection_id")
  query        String
  citations    Json?            // [{n, chunk_id, document_id, page, score}]
  tokenIn      Int?     @map("token_in")
  tokenOut     Int?     @map("token_out")
  latencyMs    Int?     @map("latency_ms")
  createdAt    DateTime @default(now()) @map("created_at")

  apiKey       ApiKey   @relation(fields: [apiKeyId], references: [id])

  @@index([apiKeyId, createdAt])
  @@map("api_query_logs")
}
```

- `ApiKey` thêm quan hệ ngược: `queryLogs ApiQueryLog[]`.
- Không lưu full answer text mặc định (tránh phình DB + lộ nội dung); chỉ lưu query + citations + token. Có thể thêm `answer` sau nếu cần audit.

### 4.3 Thêm `@@index` còn thiếu — quyết định G3 (theo SPEC §6)

Schema hiện **không có `@@index` nào** (chỉ unique `firebase_uid`). Bổ sung:

| Bảng | Index |
|---|---|
| `documents` | `@@index([collectionId])`, `@@index([userId, status])` |
| `chunks_meta` | `@@index([documentId, chunkIndex])` |
| `conversations` | `@@index([collectionId, updatedAt])` |
| `messages` | `@@index([conversationId, createdAt])` |
| `api_keys` | `@@index([prefix])` (đã nêu ở 4.1) |

---

## 5. Endpoint API-key query

```
POST /v1/query
Header: X-API-Key: rag_sk_<full_key>
Body:   { "query": string, "topK"?: number }   // mặc định topK=8
```

- **Collection lấy từ key**, KHÔNG truyền `collection_id` trong URL/body → client không đổi bừa sang collection khác (defense in depth).
- Nếu key là user-wide (`collection_id = null`) → endpoint này **từ chối** (400/403): `/v1/query` yêu cầu key scoped collection.

### Flow

```
1. MCPApiKeyGuard: extract X-API-Key
   → tách prefix → SELECT api_keys WHERE prefix = ? AND revoked_at IS NULL
   → so hash(full_key) với key_hash; sai → 401
   → key.collection_id null → 403 (cần key scoped collection)
   → attach req.apiKey = { id, userId, collectionId }; update last_used_at
2. embed(query)                       [phụ thuộc P5: chốt embedding model]
3. hybrid search ES (RRF) filter { user_id, collection_id }, size = topK
4. build prompt (SYSTEM answer-only-from-context + cite [n]) — SPEC §9
5. LLM call (non-streaming cho API; đơn giản hoá)  [phụ thuộc P6: chốt LLM provider]
6. parse [n] → citations array (map về chunk_id theo thứ tự context)
7. INSERT api_query_logs (token_in/out, latency, citations)
8. return { answer, citations: [{n, chunk_id, document_id, page, snippet, score}], usage: {token_in, token_out} }
```

- **Authorization defense in depth** (CLAUDE.md #4): ES query luôn có `term: user_id` + `term: collection_id`, kể cả khi guard đã resolve.
- **Streaming**: v1 API-key query trả **non-streaming JSON** cho đơn giản (chat UI mới cần SSE). Có thể thêm SSE sau.

---

## 6. Phụ thuộc & thứ tự (không nhảy phase — CLAUDE.md #3)

Endpoint `/v1/query` chỉ chạy thật khi đã có dữ liệu ingest + index. Thứ tự bắt buộc:

1. **P1 Auth** (`firebase-admin`, guard, `MCPApiKeyGuard`, api_keys module) — nền tảng.
2. **P2 Upload/Collections** (MinIO, multer, documents/collections module).
3. **P3 BullMQ pipeline** (parse, chunk; chunks_meta).
4. **P4 ES BM25** (index `chunks`, IndexJob, keyword search).
5. **P5 Embedding + Hybrid** (chốt model, dense_vector, EmbedJob, RRF) — **bắt buộc cho RAG answer**.
6. **P6 LLM** (chốt provider, prompt + citation parsing) — **bắt buộc cho RAG answer**.
7. **API-key query** (`/v1/query`) — build sau khi P5+P6 xong; phần DB delta (§4) có thể migrate sớm cùng P1.

> DB delta §4 nên đưa vào **một migration sớm** (cùng lúc làm P1 api_keys) để tránh nhiều lần đổi schema; nhưng endpoint chỉ hoạt động sau P5+P6.

---

## 7. Open decisions còn lại (kế thừa SPEC §14)

| Quyết định | Phase | Ảnh hưởng tới feature này |
|---|---|---|
| Embedding model (OpenAI 1536d / Voyage) | P5 | Quyết định `dense_vector.dims` của ES + bước embed(query) |
| LLM provider (OpenAI / Anthropic) | P6 | Bước sinh RAG answer |
| Reranker (skip / Cohere) | P6 | Optional, chưa cần cho v1 |
| FE stack: Vite hiện tại vs Next.js (SPEC lock) | — | DEVIATION cần owner quyết; không chặn backend |

---

## 8. Ngoài scope (YAGNI / v2)

- Streaming SSE cho `/v1/query` (v1 trả JSON).
- Rate limit per API key (Phase 8 `@nestjs/throttler`).
- Lưu full answer text vào `api_query_logs` (chỉ thêm khi cần audit).
- Mọi feature `[v2]` trong SPEC §5.
- FE cho NotebookLM (doc này backend-only).

---

*End of design.*
