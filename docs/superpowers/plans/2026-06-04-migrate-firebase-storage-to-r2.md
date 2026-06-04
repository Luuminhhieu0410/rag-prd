# Migrate Firebase Storage → Cloudflare R2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay backend object storage từ Firebase Storage sang Cloudflare R2 (S3-compatible), bucket private + presigned URL, giữ Firebase cho Auth.

**Architecture:** Tạo `StorageService` abstraction trong `shared/storage`, implement bằng R2 qua AWS S3 SDK v3. Consumer (`documents.service`, `ingestion.service`) inject `StorageService` thay `FirebaseService`. DB lưu object **key** (không lưu public URL); preview/download qua endpoint presigned có check `user_id`.

**Tech Stack:** NestJS, `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, Prisma, BullMQ.

**Spec:** `docs/superpowers/specs/2026-06-04-migrate-firebase-storage-to-r2-design.md`

**Note:** Theo yêu cầu, **bỏ testing** — mỗi task verify bằng `nest build` (typecheck) thay vì unit test.

---

## File Structure

- Create: `backend/src/shared/storage/storage.service.ts` — abstract `StorageService` (DI token + interface)
- Create: `backend/src/shared/storage/r2-storage.service.ts` — R2 implementation qua S3 SDK
- Create: `backend/src/shared/storage/storage.module.ts` — bind token, export
- Modify: `backend/src/shared/config/env.config.ts` — thêm R2 envs, bỏ `FIREBASE_STORAGE_BUCKET`
- Modify: `backend/src/api/auth/firebase.service.ts` — bỏ `getBucket()` + `storageBucket` init
- Modify: `backend/src/api/documents/documents.service.ts` — dùng `StorageService`, lưu key, thêm presigned getters
- Modify: `backend/src/api/documents/ingestion.service.ts` — dùng `StorageService`, lưu text key
- Modify: `backend/src/api/documents/documents.controller.ts` — 2 endpoint presigned
- Modify: `backend/src/api/documents/documents.module.ts` — import `StorageModule`
- Modify: `backend/.env.example` — env R2

Lệnh build (chạy từ repo root, npm workspaces): `npm run build -w backend`

---

### Task 1: Cài dependencies

**Files:** `backend/package.json` (qua npm)

- [ ] **Step 1: Cài AWS SDK**

Chạy từ repo root `/Users/hieuluuminh/RAG`:

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner -w backend
```

- [ ] **Step 2: Verify cài đặt**

Run: `node -e "require('@aws-sdk/client-s3'); require('@aws-sdk/s3-request-presigner'); console.log('ok')"` (từ `backend/`)
Expected: in ra `ok`

- [ ] **Step 3: Commit**

```bash
git add backend/package.json package-lock.json
git commit -m "chore: add aws-sdk s3 deps for R2 storage"
```

---

### Task 2: Env config

**Files:**
- Modify: `backend/src/shared/config/env.config.ts`
- Modify: `backend/.env.example`

- [ ] **Step 1: Thêm R2 env, bỏ FIREBASE_STORAGE_BUCKET trong env.config.ts**

Trong object `envConfig`, **xoá** dòng:

```ts
  FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET || '',
```

và **thêm** (đặt cạnh nhóm config khác, vd trước `REDIS_HOST`):

```ts
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID || '',
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID || '',
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY || '',
  R2_BUCKET: process.env.R2_BUCKET || '',
  R2_PRESIGN_TTL: Number(process.env.R2_PRESIGN_TTL || 3600),
```

- [ ] **Step 2: Cập nhật `.env.example`**

Xoá block:

```
# Firebase Storage bucket, e.g. your-project-id.appspot.com or your-project-id.firebasestorage.app
FIREBASE_STORAGE_BUCKET=
```

Thêm:

```
# Cloudflare R2 (S3-compatible) object storage
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PRESIGN_TTL=3600
```

- [ ] **Step 3: Verify build**

Run: `npm run build -w backend`
Expected: build pass (chưa có nơi nào còn dùng `FIREBASE_STORAGE_BUCKET` ngoài `firebase.service.ts` — sẽ sửa Task 4; nếu build báo lỗi ở `firebase.service.ts` thì để Task 4 fix, có thể bỏ qua bước verify này và verify ở Task 4). Nếu muốn build sạch ngay, làm Task 2 và Task 4 liền nhau rồi mới build.

- [ ] **Step 4: Commit**

```bash
git add backend/src/shared/config/env.config.ts backend/.env.example
git commit -m "config: add R2 env vars, drop FIREBASE_STORAGE_BUCKET"
```

---

### Task 3: StorageService abstraction + R2 implementation

**Files:**
- Create: `backend/src/shared/storage/storage.service.ts`
- Create: `backend/src/shared/storage/r2-storage.service.ts`
- Create: `backend/src/shared/storage/storage.module.ts`

- [ ] **Step 1: Tạo abstract `StorageService`**

Create `backend/src/shared/storage/storage.service.ts`:

```ts
/**
 * Provider-agnostic object storage. Dùng làm DI token (abstract class).
 * Mọi key là object path tương đối trong bucket, vd:
 *   documents/{userId}/{collectionId}/{docId}/raw/{name}
 */
export abstract class StorageService {
  /** Lưu object. */
  abstract put(
    key: string,
    body: Buffer | string,
    contentType: string,
  ): Promise<void>;

  /** Tải object về Buffer. */
  abstract getBytes(key: string): Promise<Buffer>;

  /** Xoá mọi object có key bắt đầu bằng prefix. No-op nếu prefix rỗng kết quả. */
  abstract delete(prefix: string): Promise<void>;

  /** Tạo presigned GET URL có hạn (giây). */
  abstract getSignedUrl(key: string, ttlSeconds?: number): Promise<string>;
}
```

- [ ] **Step 2: Tạo `R2StorageService`**

Create `backend/src/shared/storage/r2-storage.service.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageService } from './storage.service';
import { envConfig } from '../config/env.config';

@Injectable()
export class R2StorageService extends StorageService {
  private readonly logger = new Logger(R2StorageService.name);
  private readonly bucket = envConfig.R2_BUCKET;
  private readonly client = new S3Client({
    region: 'auto',
    endpoint: `https://${envConfig.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: envConfig.R2_ACCESS_KEY_ID,
      secretAccessKey: envConfig.R2_SECRET_ACCESS_KEY,
    },
  });

  async put(
    key: string,
    body: Buffer | string,
    contentType: string,
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async getBytes(key: string): Promise<Buffer> {
    const res = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    if (!res.Body) throw new Error(`R2 object empty: ${key}`);
    const bytes = await res.Body.transformToByteArray();
    return Buffer.from(bytes);
  }

  async delete(prefix: string): Promise<void> {
    const listed = await this.client.send(
      new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix }),
    );
    const objects = listed.Contents ?? [];
    if (objects.length === 0) return;
    await this.client.send(
      new DeleteObjectsCommand({
        Bucket: this.bucket,
        Delete: {
          Objects: objects
            .filter((o) => o.Key)
            .map((o) => ({ Key: o.Key as string })),
        },
      }),
    );
  }

  async getSignedUrl(
    key: string,
    ttlSeconds: number = envConfig.R2_PRESIGN_TTL,
  ): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: ttlSeconds },
    );
  }
}
```

> Lưu ý: `transformToByteArray()` là method của stream SDK v3 trên Node — không cần thư viện thêm. R2 `ListObjectsV2` mặc định trả tối đa 1000 object/lần; mỗi document chỉ có vài object (raw + text) nên không cần phân trang.

- [ ] **Step 3: Tạo `StorageModule`**

Create `backend/src/shared/storage/storage.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { R2StorageService } from './r2-storage.service';

@Module({
  providers: [{ provide: StorageService, useClass: R2StorageService }],
  exports: [StorageService],
})
export class StorageModule {}
```

- [ ] **Step 4: Verify build**

Run: `npm run build -w backend`
Expected: build pass (module mới chưa được import ở đâu, nhưng phải compile sạch).

- [ ] **Step 5: Commit**

```bash
git add backend/src/shared/storage/
git commit -m "feat: add StorageService abstraction with R2 implementation"
```

---

### Task 4: Bỏ Storage khỏi FirebaseService

**Files:**
- Modify: `backend/src/api/auth/firebase.service.ts`

- [ ] **Step 1: Bỏ storageBucket + getBucket**

Trong `firebase.service.ts`:

- Trong `admin.initializeApp({...})`, **xoá** dòng:

```ts
        storageBucket: envConfig.FIREBASE_STORAGE_BUCKET || undefined,
```

- **Xoá** toàn bộ method `getBucket()`:

```ts
  /** Default Storage bucket (name from FIREBASE_STORAGE_BUCKET env). */
  getBucket() {
    return envConfig.FIREBASE_STORAGE_BUCKET
      ? admin.storage().bucket(envConfig.FIREBASE_STORAGE_BUCKET)
      : admin.storage().bucket();
  }
```

- Nếu sau khi xoá không còn dùng `envConfig` trong file, **xoá** dòng import `import { envConfig } from '../../shared/config/env.config';`.

File còn lại: `onModuleInit()` (init credential, không còn storageBucket) + `getAuth()`.

- [ ] **Step 2: Verify build**

Run: `npm run build -w backend`
Expected: build sẽ **fail** ở `documents.service.ts` và `ingestion.service.ts` (vẫn gọi `this.firebase.getBucket()`). Đó là dự kiến — Task 5 & 6 sẽ sửa. Có thể commit Task 4–6 chung sau khi cả 3 xong. Nếu muốn build sạch trước khi commit, làm tiếp Task 5, 6 rồi mới build + commit gộp.

- [ ] **Step 3: (hoãn commit)**

Commit gộp ở cuối Task 6.

---

### Task 5: documents.service dùng StorageService + presigned getters

**Files:**
- Modify: `backend/src/api/documents/documents.service.ts`

- [ ] **Step 1: Đổi import + constructor**

Trong `documents.service.ts`:

- **Xoá** import: `import { FirebaseService } from '../auth/firebase.service';`
- **Thêm** import: `import { StorageService } from '../../shared/storage/storage.service';`
- Trong constructor, **thay** `private readonly firebase: FirebaseService,` bằng `private readonly storage: StorageService,`

- [ ] **Step 2: Sửa `upload()` — lưu key, bỏ makePublic**

Thay block (dòng ~60-70) từ:

```ts
    // Upload lên Firebase Storage, set public, lưu URL (không lưu path) vào DB
    const rawObjectPath = `documents/${userId}/${collectionId}/${doc.id}/raw/${file.originalname}`;
    const storageFile = this.firebase.getBucket().file(rawObjectPath);
    await storageFile.save(file.buffer, { contentType: file.mimetype });
    await storageFile.makePublic().catch(() => undefined);
    const rawUrl = storageFile.publicUrl();

    const updated = await this.prisma.document.update({
      where: { id: doc.id },
      data: { sourceUrl: rawUrl },
    });
```

thành:

```ts
    // Upload lên R2 (bucket private), lưu object key vào DB (không lưu URL)
    const rawObjectPath = `documents/${userId}/${collectionId}/${doc.id}/raw/${file.originalname}`;
    await this.storage.put(rawObjectPath, file.buffer, file.mimetype);

    const updated = await this.prisma.document.update({
      where: { id: doc.id },
      data: { sourceUrl: rawObjectPath },
    });
```

- [ ] **Step 3: Sửa `remove()` — xoá theo prefix qua storage**

Thay block (dòng ~108-114) từ:

```ts
    // 2. Xoá file trên Storage (cả raw + text)
    await this.firebase
      .getBucket()
      .deleteFiles({
        prefix: `documents/${userId}/${collectionId}/${documentId}/`,
      })
      .catch(() => undefined);
```

thành:

```ts
    // 2. Xoá file trên Storage (cả raw + text)
    await this.storage
      .delete(`documents/${userId}/${collectionId}/${documentId}/`)
      .catch(() => undefined);
```

- [ ] **Step 4: Thêm presigned getters**

Thêm 2 method vào class `DocumentsService` (đặt trước `serialize`):

```ts
  /** Presigned URL tải file gốc — chỉ trả nếu document thuộc user + collection. */
  async getRawUrl(userId: string, collectionId: string, documentId: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, userId, collectionId },
      select: { sourceUrl: true },
    });
    if (!doc?.sourceUrl) throw new NotFoundException('document not found');
    return { url: await this.storage.getSignedUrl(doc.sourceUrl) };
  }

  /** Presigned URL tải text đã trích xuất — chỉ trả nếu document thuộc user + collection. */
  async getTextUrl(userId: string, collectionId: string, documentId: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, userId, collectionId },
      select: { textPath: true },
    });
    if (!doc?.textPath) throw new NotFoundException('text not ready');
    return { url: await this.storage.getSignedUrl(doc.textPath) };
  }
```

> `findFirst` có `userId` trong `where` = defense-in-depth: user khác không thấy doc → 404.

- [ ] **Step 5:** (build + commit gộp ở Task 6)

---

### Task 6: ingestion.service dùng StorageService + module wiring

**Files:**
- Modify: `backend/src/api/documents/ingestion.service.ts`
- Modify: `backend/src/api/documents/documents.controller.ts`
- Modify: `backend/src/api/documents/documents.module.ts`

- [ ] **Step 1: ingestion.service — đổi import + constructor**

Trong `ingestion.service.ts`:

- **Xoá** import: `import { FirebaseService } from '../auth/firebase.service';`
- **Thêm** import: `import { StorageService } from '../../shared/storage/storage.service';`
- Trong constructor, **thay** `private readonly firebase: FirebaseService,` bằng `private readonly storage: StorageService,`

- [ ] **Step 2: Sửa tải file gốc trong `handle()`**

Thay (dòng ~54-56):

```ts
      const bucket = this.firebase.getBucket();
      const [buf] = await bucket.file(rawObjectPath).download();
      const blob = new Blob([Uint8Array.from(buf)]);
```

thành:

```ts
      const buf = await this.storage.getBytes(rawObjectPath);
      const blob = new Blob([Uint8Array.from(buf)]);
```

- [ ] **Step 3: Sửa lưu text — lưu key thay URL**

Thay block (dòng ~63-70):

```ts
      // Lưu text trích xuất ra Storage + lấy URL cho document viewer
      const fullText = loaded.map((d) => d.pageContent).join('\n\n');
      const textObjectPath = `documents/${doc.userId}/${doc.collectionId}/${doc.id}/text/content.txt`;
      const textUrl = await this.saveAndGetUrl(
        textObjectPath,
        fullText,
        'text/plain; charset=utf-8',
      );
```

thành:

```ts
      // Lưu text trích xuất ra Storage, lưu object key (presigned khi viewer cần)
      const fullText = loaded.map((d) => d.pageContent).join('\n\n');
      const textObjectPath = `documents/${doc.userId}/${doc.collectionId}/${doc.id}/text/content.txt`;
      await this.storage.put(
        textObjectPath,
        fullText,
        'text/plain; charset=utf-8',
      );
```

- [ ] **Step 4: Đổi các tham chiếu `textUrl` → `textObjectPath`**

Có 2 chỗ gán `textPath: textUrl,` (dòng ~88 và ~137). Đổi cả hai thành:

```ts
            textPath: textObjectPath,
```

(chỗ trong block `chunks.length === 0` thụt 12 space, chỗ cuối thụt 10 space — giữ nguyên indent hiện có, chỉ đổi `textUrl` thành `textObjectPath`).

- [ ] **Step 5: Xoá helper `saveAndGetUrl`**

**Xoá** toàn bộ method (dòng ~156-166):

```ts
  /** Lưu nội dung lên Storage, set public, trả về download URL. */
  private async saveAndGetUrl(
    objectPath: string,
    content: string | Buffer,
    contentType: string,
  ): Promise<string> {
    const file = this.firebase.getBucket().file(objectPath);
    await file.save(content, { contentType });
    await file.makePublic().catch(() => undefined);
    return file.publicUrl();
  }
```

- [ ] **Step 6: Thêm endpoint presigned vào controller**

Trong `documents.controller.ts`, thêm 2 route vào class (sau `list`, trước `remove`):

```ts
  @Get(':docId/raw-url')
  rawUrl(
    @CurrentUser() user: AuthUser,
    @Param('collectionId') collectionId: string,
    @Param('docId') docId: string,
  ) {
    return this.documents.getRawUrl(user.id, collectionId, docId);
  }

  @Get(':docId/text-url')
  textUrl(
    @CurrentUser() user: AuthUser,
    @Param('collectionId') collectionId: string,
    @Param('docId') docId: string,
  ) {
    return this.documents.getTextUrl(user.id, collectionId, docId);
  }
```

(`Get`, `Param`, `CurrentUser`, `AuthUser` đã được import sẵn trong file.)

- [ ] **Step 7: Import StorageModule vào DocumentsModule**

Trong `documents.module.ts`:

- **Thêm** import: `import { StorageModule } from '../../shared/storage/storage.module';`
- Thêm `StorageModule,` vào mảng `imports` của `@Module`.

- [ ] **Step 8: Verify build (toàn bộ Task 4-6)**

Run: `npm run build -w backend`
Expected: build **pass** — không còn tham chiếu `getBucket`/`firebase` trong documents/ingestion.

Kiểm tra không còn sót:

Run: `grep -rn "getBucket\|saveAndGetUrl\|makePublic\|publicUrl\|FIREBASE_STORAGE_BUCKET" backend/src`
Expected: không có kết quả.

- [ ] **Step 9: Commit gộp**

```bash
git add backend/src/api/auth/firebase.service.ts backend/src/api/documents/
git commit -m "feat: migrate document storage from Firebase to R2 (private + presigned)"
```

---

## Self-Review

Đối chiếu plan với spec:
- StorageService interface (spec §1) → Task 3 ✓
- Data model lưu key (spec §2) → Task 5 step 2 (`sourceUrl=rawObjectPath`), Task 6 step 3-4 (`textPath=textObjectPath`) ✓
- upload/remove/ingestion swap (spec §3) → Task 5, 6 ✓
- FirebaseService bỏ getBucket, giữ getAuth (spec §3) → Task 4 ✓
- Endpoint presigned + filter user_id (spec §4) → Task 5 step 4 + Task 6 step 6 ✓
- Env (spec §5) → Task 2 ✓
- Deps (spec §6) → Task 1 ✓
- Testing out-of-scope → không có test task ✓

Type consistency: `StorageService.put/getBytes/delete/getSignedUrl` dùng nhất quán giữa Task 3 (định nghĩa) và Task 5/6 (gọi). `getRawUrl/getTextUrl` định nghĩa Task 5, gọi Task 6 controller — khớp tên + chữ ký.
