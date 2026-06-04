# Migrate Firebase Storage → Cloudflare R2

Date: 2026-06-04
Status: approved

## Mục tiêu

Thay backend storage từ Firebase Storage sang Cloudflare R2 (S3-compatible).
**Firebase giữ nguyên cho Auth** — chỉ phần lưu trữ object đổi sang R2.

## Bối cảnh hiện tại

Storage được gói qua `FirebaseService.getBucket()`, dùng ở 3 chỗ:

- `documents.service.ts` → `upload()` (save buffer + `makePublic()` + `publicUrl()`), `remove()` (`deleteFiles({prefix})`).
- `ingestion.service.ts` → `download(rawObjectPath)`, `saveAndGetUrl()` cho text (save + makePublic + publicUrl).
- `document.sourceUrl` và `document.textPath` được **ghi public URL vào DB nhưng không có nơi nào đọc** — frontend không fetch, backend không đọc lại.

`makePublic()` đang phơi file của mọi user ra public mà không phục vụ mục đích gì, đi ngược nguyên tắc authorization defense-in-depth (CLAUDE.md #4).

## Quyết định đã chốt

1. **Bucket R2 private hoàn toàn**, không public object. Preview/download dùng **presigned URL** sinh on-demand qua endpoint có check `user_id`.
2. **Lưu object key (path) trong DB**, không lưu URL. URL presigned có hạn → không persist.
3. **StorageService interface** — decouple provider, R2 là một implementation.
4. **Giữ tên cột Prisma** (`sourceUrl`, `textPath`) để khỏi migrate; chỉ đổi ý nghĩa giá trị thành key.
5. **Bỏ testing** trong lần migration này (theo yêu cầu).

## Thiết kế

### 1. Abstraction — `shared/storage`

`StorageService` (abstract class làm DI token):

- `put(key: string, body: Buffer | string, contentType: string): Promise<void>`
- `getBytes(key: string): Promise<Buffer>`
- `delete(prefix: string): Promise<void>` — list theo prefix rồi xoá batch
- `getSignedUrl(key: string, ttlSeconds?: number): Promise<string>`

`R2StorageService implements StorageService`:

- `S3Client` với `region: 'auto'`, `endpoint: https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`, credentials access key/secret.
- `delete(prefix)`: `ListObjectsV2Command({ Prefix })` → `DeleteObjectsCommand` (S3 không có `deleteFiles`).
- `getSignedUrl`: `@aws-sdk/s3-request-presigner` `getSignedUrl(client, GetObjectCommand, { expiresIn })`.

Provider DI: bind token `StorageService` → `R2StorageService` trong một `StorageModule`, export để các module khác inject.

### 2. Data model

Không đổi Prisma schema.

- `document.sourceUrl` ← lưu **rawObjectPath** (key): `documents/{userId}/{collectionId}/{docId}/raw/{originalName}`.
- `document.textPath` ← lưu **textObjectPath** (key): `documents/{userId}/{collectionId}/{docId}/text/content.txt`.

### 3. Thay đổi consumer

- `documents.service.upload()`: `storage.put(rawObjectPath, file.buffer, file.mimetype)` → `sourceUrl = rawObjectPath`. Bỏ `makePublic()/publicUrl()`. Job data vẫn truyền `rawObjectPath`.
- `documents.service.remove()`: `storage.delete(prefix)` với `prefix = documents/{userId}/{collectionId}/{documentId}/`.
- `ingestion.service.handle()`: `const buf = await storage.getBytes(rawObjectPath)` thay `bucket.file().download()`. `saveAndGetUrl()` → đổi tên thành `saveText()` trả về **key** (bỏ makePublic); `textPath = textObjectPath`.
- `FirebaseService`: bỏ `getBucket()` và `storageBucket` khỏi `initializeApp`. Giữ `getAuth()`. Bỏ inject `FirebaseService` khỏi `DocumentsService`/`IngestionService`, thay bằng `StorageService`.

### 4. Endpoint presigned (mới)

Trong `documents.controller` (hoặc tương đương):

- `GET /collections/:collectionId/documents/:id/raw-url`
- `GET /collections/:collectionId/documents/:id/text-url`

Flow: guard auth → `assertCollection(userId, collectionId)` → load document `where { id, userId, collectionId }` (filter `user_id` — defense in depth) → `storage.getSignedUrl(doc.sourceUrl|textPath, 3600)` → trả `{ url }`. Không thấy doc của user → 404.

### 5. Env / config (`shared/config/env.config.ts`)

Thêm:

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `R2_PRESIGN_TTL` (default 3600)

Bỏ `FIREBASE_STORAGE_BUCKET`. Cập nhật `.env.example`. Secrets đã nằm trong `.env` (gitignored).

### 6. Dependencies

Thêm: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`.

## Out of scope

- Testing (theo yêu cầu).
- Đổi tên cột Prisma.
- Migrate dữ liệu file cũ trên Firebase sang R2 (project học, chưa có data thật cần giữ).
- Frontend wiring cho presigned URL (để phase document viewer).
