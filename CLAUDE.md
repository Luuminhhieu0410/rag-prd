# Project: RAG NotebookLM-lite

Personal learning project — NotebookLM-lite cho PDF/DOCX/URL blog → RAG knowledge base. Mục tiêu chính là **luyện code sâu các backend pattern** (queue, RAG, ES, MCP, auth), không phải ship production.

## Đọc trước khi tư vấn / code

**`SPEC.md`** trong project root là source of truth. Nó có:
- Tech stack locked (NestJS + Next.js + Postgres + Redis/BullMQ + Elasticsearch + MinIO + Firebase Auth + MCP)
- Kiến trúc + data model Postgres + ES schema + MinIO layout
- Auth flow Firebase Google
- Pipeline ingest (parse → chunk → embed → index) + RAG hybrid search flow
- API surface, MCP tool definitions
- Roadmap 8 phase với deliverables + "học được gì" mỗi phase
- v1/v2 feature scope đã chốt
- Open decisions còn lại

**Luôn mở SPEC.md trước khi đề xuất kiến trúc/code.** Đừng đề xuất gì trái với spec mà không nói rõ "đây là deviation".

## Nguyên tắc tư vấn cho project này

1. **Không over-engineer**: user đã từ chối microservice/Python worker/OCR. Đừng đề xuất lại trừ khi user yêu cầu.
2. **Depth over breadth**: mỗi phase user muốn học sâu, không lướt — gợi ý implementation chi tiết, không chỉ skeleton.
3. **Không nhảy phase**: tôn trọng thứ tự P0 → P8. Nếu user hỏi feature thuộc phase sau, nhắc nhở phase hiện tại còn gì chưa xong.
4. **Authorization defense in depth**: mọi gợi ý DB query / ES query phải có filter `user_id` — kể cả khi đã có guard ở controller.
5. **Idempotent worker**: mọi BullMQ job phải an toàn khi chạy lại.
6. **Cost awareness**: nhắc log token usage cho mọi LLM/embedding call (kể cả v1).
7. **Đừng commit secret**: Firebase service account JSON, API key — luôn `.gitignore`.

## Khi user nói "tiếp tục project"

1. Đọc `SPEC.md` (toàn bộ section relevant).
2. Hỏi: đang ở phase nào? Đã làm xong gì? Cần làm gì tiếp?
3. Nếu phase chưa xong → tiếp tục theo deliverables trong SPEC.md.
4. Nếu vừa xong phase → review nhanh + lên kế hoạch phase kế.

## Decisions cần chốt khi tới phase tương ứng

- **P1**: Prisma vs TypeORM (gợi ý Prisma)
- **P5**: OpenAI `text-embedding-3-small` vs Voyage `voyage-3-lite`
- **P6**: OpenAI vs Anthropic LLM, có dùng reranker không
- **P1 hoặc P8**: client-side guard vs Firebase session cookie cho SSR-protected route

## Stack lock — KHÔNG đổi nếu user không chủ động yêu cầu

Backend NestJS · Frontend Next.js App Router · DB Postgres · Queue BullMQ+Redis · Search Elasticsearch 8.11+ (BM25+dense_vector+RRF) · Storage MinIO · Auth Firebase Google only · LLM API · MCP TS SDK · Realtime SSE.
