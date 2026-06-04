# Phase 1 Authorization + API Keys — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hoàn thiện phần backend còn lại của Phase 1: `OwnershipGuard` (generic + metadata), `ApiKeysService` + controller (CRUD key, bcrypt), và `ApiKeyGuard` (verify `X-API-Key`).

**Architecture:** Hai cổng auth dùng chung shape `req.user` (`AuthUser`): `FirebaseAuthGuard` (đã có, global) cho web; `ApiKeyGuard` (mới) cho programmatic. `OwnershipGuard` là infra authorization per-route dùng metadata. Tất cả truy cập Postgres qua `PostgresService` (Prisma). Unit test mock `PostgresService`, không cần DB thật.

**Tech Stack:** NestJS, Prisma (`PostgresService`), bcrypt, Jest + ts-jest.

**Conventions:**
- Test command: `cd backend && npx jest <path>` (jest `rootDir` = `src`, `testRegex` = `.*\.spec\.ts$`).
- Commit dưới user, KHÔNG thêm trailer Co-Authored-By.
- Mọi path dưới đây tương đối từ `backend/`.
- Guards đặt cùng cấp `firebase-auth.guard.ts` (tức `src/api/auth/`). Decorator ownership đặt cùng `src/api/auth/decorators/`.

---

### Task 1: Cài bcrypt

**Files:**
- Modify: `package.json` (root `/Users/hieuluuminh/RAG/package.json` — dependencies dùng chung)

- [ ] **Step 1: Cài bcrypt + types**

Run (từ repo root `/Users/hieuluuminh/RAG`):
```bash
yarn add bcrypt && yarn add -D @types/bcrypt
```
Expected: `package.json` có `bcrypt` trong dependencies, `@types/bcrypt` trong devDependencies; `node_modules/bcrypt` tồn tại.

- [ ] **Step 2: Xác nhận import được**

Run (từ `backend/`):
```bash
node -e "require('bcrypt'); console.log('bcrypt ok')"
```
Expected: in `bcrypt ok`, không lỗi.

- [ ] **Step 3: Commit**

```bash
cd /Users/hieuluuminh/RAG && git add package.json yarn.lock && git commit -m "chore(auth): add bcrypt for API key hashing"
```

---

### Task 2: OwnershipGuard — decorator metadata

**Files:**
- Create: `src/api/auth/decorators/check-ownership.decorator.ts`

- [ ] **Step 1: Viết decorator + types**

Create `src/api/auth/decorators/check-ownership.decorator.ts`:
```ts
import { SetMetadata } from '@nestjs/common';

export const CHECK_OWNERSHIP = 'check_ownership';

// Chỉ các model Prisma có cột userId mới ownable.
export type OwnableModel = 'collection' | 'document' | 'conversation';

export interface OwnershipMeta {
  model: OwnableModel;
  idParam: string;
}

export const CheckOwnership = (model: OwnableModel, idParam = 'id') =>
  SetMetadata(CHECK_OWNERSHIP, { model, idParam } satisfies OwnershipMeta);
```

- [ ] **Step 2: Build kiểm tra type**

Run (từ `backend/`):
```bash
npx tsc --noEmit -p tsconfig.json
```
Expected: không lỗi liên quan file mới (lỗi sẵn có ở file khác có thể bỏ qua — chỉ cần file mới không thêm lỗi).

- [ ] **Step 3: Commit**

```bash
cd /Users/hieuluuminh/RAG && git add backend/src/api/auth/decorators/check-ownership.decorator.ts && git commit -m "feat(auth): add @CheckOwnership decorator + OwnableModel type"
```

---

### Task 3: OwnershipGuard — guard (TDD)

**Files:**
- Test: `src/api/auth/ownership.guard.spec.ts`
- Create: `src/api/auth/ownership.guard.ts`

- [ ] **Step 1: Viết test thất bại**

Create `src/api/auth/ownership.guard.spec.ts`:
```ts
import { ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OwnershipGuard } from './ownership.guard';
import { PostgresService } from '../../databases/postgres/postgres.service';
import { OwnershipMeta } from './decorators/check-ownership.decorator';

function ctxFor(params: Record<string, string>, user: { id: string }): ExecutionContext {
  const req = { params, user };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => () => undefined,
    getClass: () => class {},
  } as unknown as ExecutionContext;
}

describe('OwnershipGuard', () => {
  let findUnique: jest.Mock;
  let reflectorValue: OwnershipMeta | undefined;
  let guard: OwnershipGuard;

  beforeEach(() => {
    findUnique = jest.fn();
    const reflector = { get: () => reflectorValue } as unknown as Reflector;
    const prisma = { collection: { findUnique } } as unknown as PostgresService;
    guard = new OwnershipGuard(reflector, prisma);
  });

  it('passes when no @CheckOwnership metadata is present', async () => {
    reflectorValue = undefined;
    await expect(guard.canActivate(ctxFor({ id: 'c1' }, { id: 'u1' }))).resolves.toBe(true);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('throws NotFound when the resource does not exist', async () => {
    reflectorValue = { model: 'collection', idParam: 'id' };
    findUnique.mockResolvedValue(null);
    await expect(guard.canActivate(ctxFor({ id: 'missing' }, { id: 'u1' }))).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws Forbidden when the resource belongs to another user', async () => {
    reflectorValue = { model: 'collection', idParam: 'id' };
    findUnique.mockResolvedValue({ userId: 'someone-else' });
    await expect(guard.canActivate(ctxFor({ id: 'c1' }, { id: 'u1' }))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('passes when the resource belongs to the current user', async () => {
    reflectorValue = { model: 'collection', idParam: 'id' };
    findUnique.mockResolvedValue({ userId: 'u1' });
    await expect(guard.canActivate(ctxFor({ id: 'c1' }, { id: 'u1' }))).resolves.toBe(true);
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'c1' }, select: { userId: true } });
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run (từ `backend/`):
```bash
npx jest src/api/auth/ownership.guard.spec.ts
```
Expected: FAIL — `Cannot find module './ownership.guard'`.

- [ ] **Step 3: Viết guard tối thiểu**

Create `src/api/auth/ownership.guard.ts`:
```ts
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PostgresService } from '../../databases/postgres/postgres.service';
import {
  CHECK_OWNERSHIP,
  OwnershipMeta,
} from './decorators/check-ownership.decorator';

@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PostgresService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const meta = this.reflector.get<OwnershipMeta | undefined>(
      CHECK_OWNERSHIP,
      context.getHandler(),
    );
    if (!meta) return true; // route không khai báo ownership → bỏ qua

    const req = context.switchToHttp().getRequest();
    const id = req.params[meta.idParam];

    // Prisma không expose delegate động qua type; ép kiểu có kiểm soát.
    const delegate = (this.prisma as unknown as Record<
      string,
      { findUnique: (args: unknown) => Promise<{ userId: string } | null> }
    >)[meta.model];

    const row = await delegate.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!row) throw new NotFoundException();
    if (row.userId !== req.user.id) throw new ForbiddenException();
    return true;
  }
}
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run (từ `backend/`):
```bash
npx jest src/api/auth/ownership.guard.spec.ts
```
Expected: PASS — 4 passed.

- [ ] **Step 5: Commit**

```bash
cd /Users/hieuluuminh/RAG && git add backend/src/api/auth/ownership.guard.ts backend/src/api/auth/ownership.guard.spec.ts && git commit -m "feat(auth): add generic OwnershipGuard (TDD)"
```

---

### Task 4: ApiKeysService (TDD)

**Files:**
- Test: `src/api/api-keys/api-keys.service.spec.ts`
- Create: `src/api/api-keys/api-keys.service.ts`

- [ ] **Step 1: Viết test thất bại**

Create `src/api/api-keys/api-keys.service.spec.ts`:
```ts
import { NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ApiKeysService } from './api-keys.service';
import { PostgresService } from '../../databases/postgres/postgres.service';

describe('ApiKeysService', () => {
  let create: jest.Mock;
  let findMany: jest.Mock;
  let updateMany: jest.Mock;
  let service: ApiKeysService;

  beforeEach(() => {
    create = jest.fn().mockImplementation(({ data }) =>
      Promise.resolve({ id: 'k1', ...data }),
    );
    findMany = jest.fn();
    updateMany = jest.fn();
    const prisma = {
      apiKey: { create, findMany, updateMany },
    } as unknown as PostgresService;
    service = new ApiKeysService(prisma);
  });

  it('create returns the full raw key once, stores a bcrypt hash, and a recognizable prefix', async () => {
    const res = await service.create('u1', 'My key');

    expect(res.key.startsWith('sk_live_')).toBe(true);
    expect(res.prefix).toBe(res.key.slice(0, 16));
    expect(res.id).toBe('k1');

    const data = create.mock.calls[0][0].data;
    expect(data.userId).toBe('u1');
    expect(data.name).toBe('My key');
    expect(data.prefix).toBe(res.prefix);
    expect(data.collectionId).toBeNull();
    // keyHash phải là bcrypt hash của raw key, không phải plaintext
    expect(data.keyHash).not.toBe(res.key);
    await expect(bcrypt.compare(res.key, data.keyHash)).resolves.toBe(true);
  });

  it('create passes through an optional collectionId', async () => {
    const res = await service.create('u1', 'Scoped', 'col-1');
    expect(create.mock.calls[0][0].data.collectionId).toBe('col-1');
    expect(res.key.startsWith('sk_live_')).toBe(true);
  });

  it('list returns only safe fields scoped to the user (never keyHash)', async () => {
    findMany.mockResolvedValue([
      { id: 'k1', name: 'A', prefix: 'sk_live_aaaa1111', lastUsedAt: null, revokedAt: null, createdAt: new Date() },
    ]);
    const rows = await service.list('u1');

    const where = findMany.mock.calls[0][0].where;
    expect(where).toEqual({ userId: 'u1' });
    const select = findMany.mock.calls[0][0].select;
    expect(select.keyHash).toBeUndefined();
    expect(rows[0]).not.toHaveProperty('keyHash');
  });

  it('revoke sets revokedAt scoped to id + user', async () => {
    updateMany.mockResolvedValue({ count: 1 });
    await service.revoke('u1', 'k1');

    const arg = updateMany.mock.calls[0][0];
    expect(arg.where).toEqual({ id: 'k1', userId: 'u1', revokedAt: null });
    expect(arg.data.revokedAt).toBeInstanceOf(Date);
  });

  it('revoke throws NotFound when nothing matched (other user or unknown id)', async () => {
    updateMany.mockResolvedValue({ count: 0 });
    await expect(service.revoke('u1', 'nope')).rejects.toBeInstanceOf(NotFoundException);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run (từ `backend/`):
```bash
npx jest src/api/api-keys/api-keys.service.spec.ts
```
Expected: FAIL — `Cannot find module './api-keys.service'`.

- [ ] **Step 3: Viết service**

Create `src/api/api-keys/api-keys.service.ts`:
```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PostgresService } from '../../databases/postgres/postgres.service';

const BCRYPT_COST = 12;

@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PostgresService) {}

  async create(userId: string, name: string, collectionId?: string) {
    const raw = 'sk_live_' + randomBytes(32).toString('base64url');
    const keyHash = await bcrypt.hash(raw, BCRYPT_COST);
    const prefix = raw.slice(0, 16); // 'sk_live_' + 8 ký tự random

    const row = await this.prisma.apiKey.create({
      data: { userId, name, keyHash, prefix, collectionId: collectionId ?? null },
    });

    // `key` chỉ trả về duy nhất lần này, không bao giờ lưu/trả lại plaintext.
    return { id: row.id, name, prefix, key: raw };
  }

  list(userId: string) {
    return this.prisma.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        prefix: true,
        lastUsedAt: true,
        revokedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revoke(userId: string, id: string) {
    const res = await this.prisma.apiKey.updateMany({
      where: { id, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (res.count === 0) throw new NotFoundException();
  }
}
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run (từ `backend/`):
```bash
npx jest src/api/api-keys/api-keys.service.spec.ts
```
Expected: PASS — 5 passed.

- [ ] **Step 5: Commit**

```bash
cd /Users/hieuluuminh/RAG && git add backend/src/api/api-keys/api-keys.service.ts backend/src/api/api-keys/api-keys.service.spec.ts && git commit -m "feat(api-keys): add ApiKeysService create/list/revoke with bcrypt (TDD)"
```

---

### Task 5: ApiKeyGuard (TDD)

**Files:**
- Test: `src/api/auth/api-key.guard.spec.ts`
- Create: `src/api/auth/api-key.guard.ts`

- [ ] **Step 1: Viết test thất bại**

Create `src/api/auth/api-key.guard.spec.ts`:
```ts
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ApiKeyGuard } from './api-key.guard';
import { PostgresService } from '../../databases/postgres/postgres.service';

function ctxFor(headers: Record<string, string>): { ctx: ExecutionContext; req: any } {
  const req: any = { headers };
  const ctx = {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
  return { ctx, req };
}

const userRow = { id: 'u1', firebaseUid: 'uid-1', email: 'a@b.com', name: 'Alice' };

describe('ApiKeyGuard', () => {
  let findMany: jest.Mock;
  let updateMany: jest.Mock;
  let guard: ApiKeyGuard;

  beforeEach(() => {
    findMany = jest.fn();
    updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const prisma = { apiKey: { findMany, updateMany } } as unknown as PostgresService;
    guard = new ApiKeyGuard(prisma);
  });

  it('throws 401 when X-API-Key header is missing', async () => {
    const { ctx } = ctxFor({});
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws 401 when no active key matches the prefix', async () => {
    findMany.mockResolvedValue([]);
    const { ctx } = ctxFor({ 'x-api-key': 'sk_live_deadbeefxxxxxxxx' });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
    // chỉ tìm key chưa bị revoke
    expect(findMany.mock.calls[0][0].where.revokedAt).toBeNull();
  });

  it('throws 401 when the bcrypt hash does not match', async () => {
    const otherHash = await bcrypt.hash('sk_live_someothersecretkey', 12);
    findMany.mockResolvedValue([{ id: 'k1', keyHash: otherHash, collectionId: null, user: userRow }]);
    const { ctx } = ctxFor({ 'x-api-key': 'sk_live_wrongsecretvaluexx' });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('attaches req.user + req.apiKey and touches lastUsedAt on a valid key', async () => {
    const raw = 'sk_live_validsecretvalue123';
    const keyHash = await bcrypt.hash(raw, 12);
    findMany.mockResolvedValue([{ id: 'k1', keyHash, collectionId: 'col-1', user: userRow }]);
    const { ctx, req } = ctxFor({ 'x-api-key': raw });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.user).toEqual(userRow);
    expect(req.apiKey).toEqual({ id: 'k1', collectionId: 'col-1' });
    // fire-and-forget update; chờ microtask để xác nhận đã gọi
    await Promise.resolve();
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'k1' },
      data: { lastUsedAt: expect.any(Date) },
    });
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run (từ `backend/`):
```bash
npx jest src/api/auth/api-key.guard.spec.ts
```
Expected: FAIL — `Cannot find module './api-key.guard'`.

- [ ] **Step 3: Viết guard**

Create `src/api/auth/api-key.guard.ts`:
```ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PostgresService } from '../../databases/postgres/postgres.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(private readonly prisma: PostgresService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const raw = this.extractKey(req);
    if (!raw) throw new UnauthorizedException('Missing API key');

    const prefix = raw.slice(0, 16);
    const candidates = await this.prisma.apiKey.findMany({
      where: { prefix, revokedAt: null },
      include: { user: true },
    });

    for (const k of candidates) {
      if (await bcrypt.compare(raw, k.keyHash)) {
        req.user = {
          id: k.user.id,
          firebaseUid: k.user.firebaseUid,
          email: k.user.email,
          name: k.user.name,
        };
        req.apiKey = { id: k.id, collectionId: k.collectionId };
        this.touchLastUsed(k.id);
        return true;
      }
    }

    throw new UnauthorizedException('Invalid API key');
  }

  private extractKey(req: { headers?: Record<string, unknown> }): string | null {
    const header = req.headers?.['x-api-key'];
    return typeof header === 'string' && header.length > 0 ? header : null;
  }

  // Fire-and-forget: không chặn request, lỗi chỉ log.
  private touchLastUsed(id: string): void {
    void this.prisma.apiKey
      .updateMany({ where: { id }, data: { lastUsedAt: new Date() } })
      .catch((e) => this.logger.warn(`Failed to update lastUsedAt: ${e}`));
  }
}
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run (từ `backend/`):
```bash
npx jest src/api/auth/api-key.guard.spec.ts
```
Expected: PASS — 4 passed.

- [ ] **Step 5: Commit**

```bash
cd /Users/hieuluuminh/RAG && git add backend/src/api/auth/api-key.guard.ts backend/src/api/auth/api-key.guard.spec.ts && git commit -m "feat(auth): add generic ApiKeyGuard verifying X-API-Key (TDD)"
```

---

### Task 6: ApiKeysController + module + wiring

**Files:**
- Create: `src/api/api-keys/api-keys.controller.ts`
- Create: `src/api/api-keys/api-keys.module.ts`
- Modify: `src/api/auth/auth.module.ts` (provide + export `OwnershipGuard`, `ApiKeyGuard`)
- Modify: `src/app.module.ts` (import `ApiKeysModule`)

- [ ] **Step 1: Viết controller**

Create `src/api/api-keys/api-keys.controller.ts`:
```ts
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';

interface CreateApiKeyBody {
  name?: string;
  collectionId?: string;
}

@Controller('api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeys: ApiKeysService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: CreateApiKeyBody) {
    const name = body?.name?.trim();
    if (!name) throw new BadRequestException('name is required');
    return this.apiKeys.create(user.id, name, body.collectionId);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.apiKeys.list(user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  async revoke(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.apiKeys.revoke(user.id, id);
  }
}
```

- [ ] **Step 2: Viết module**

Create `src/api/api-keys/api-keys.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { ApiKeysController } from './api-keys.controller';
import { ApiKeysService } from './api-keys.service';
import { PostgresModule } from '../../databases/postgres/postgres.module';

@Module({
  imports: [PostgresModule],
  controllers: [ApiKeysController],
  providers: [ApiKeysService],
})
export class ApiKeysModule {}
```

- [ ] **Step 3: Provide + export guards từ AuthModule**

Modify `src/api/auth/auth.module.ts` — thêm import 2 guard, đưa vào `providers` và `exports` để module khác `@UseGuards` dùng được:
```ts
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { FirebaseService } from './firebase.service';
import { AuthService } from './auth.service';
import { FirebaseAuthGuard } from './firebase-auth.guard';
import { OwnershipGuard } from './ownership.guard';
import { ApiKeyGuard } from './api-key.guard';
import { AuthController } from './auth.controller';
import { PostgresModule } from '../../databases/postgres/postgres.module';
import { RedisModule } from '../../shared/redis/redis.module';

@Module({
  imports: [PostgresModule, RedisModule],
  controllers: [AuthController],
  providers: [
    FirebaseService,
    AuthService,
    OwnershipGuard,
    ApiKeyGuard,
    { provide: APP_GUARD, useClass: FirebaseAuthGuard },
  ],
  exports: [OwnershipGuard, ApiKeyGuard],
})
export class AuthModule {}
```

- [ ] **Step 4: Import ApiKeysModule vào AppModule**

Modify `src/app.module.ts` — thêm `ApiKeysModule` vào imports:
```ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PostgresModule } from './databases/postgres/postgres.module';
import { ElasticsearchModule } from './databases/elasticsearch/elasticsearch.module';
import { ApiModule } from './api/api.module';
import { EmbeddingModule } from './embedding/embedding.module';
import { SharedModule } from './shared/shared.module';
import { AuthModule } from './api/auth/auth.module';
import { ApiKeysModule } from './api/api-keys/api-keys.module';

@Module({
  imports: [
    AuthModule,
    ApiKeysModule,
    PostgresModule,
    ElasticsearchModule,
    ApiModule,
    EmbeddingModule,
    SharedModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

- [ ] **Step 5: Build kiểm tra wiring**

Run (từ `backend/`):
```bash
npx tsc --noEmit -p tsconfig.json && npx jest
```
Expected: tsc không thêm lỗi mới; toàn bộ jest PASS (gồm các spec auth cũ + 3 spec mới).

- [ ] **Step 6: Commit**

```bash
cd /Users/hieuluuminh/RAG && git add backend/src/api/api-keys backend/src/api/auth/auth.module.ts backend/src/app.module.ts && git commit -m "feat(api-keys): wire ApiKeysModule + controller; export Ownership/ApiKey guards"
```

---

### Task 7: Smoke test app khởi động

**Files:** none (chỉ chạy)

- [ ] **Step 1: Build app**

Run (từ `backend/`):
```bash
npx nest build
```
Expected: build thành công, không lỗi.

- [ ] **Step 2: (tùy chọn) chạy thử nếu có Postgres**

Nếu Postgres đang chạy (docker compose), test nhanh route bằng cách khởi động `npm run start` rồi:
```bash
curl -i -X POST localhost:3000/api-keys -H 'Content-Type: application/json' -d '{"name":"test"}'
```
Expected: 401 (chưa có Firebase token) — chứng tỏ global `FirebaseAuthGuard` đang bảo vệ route. (Không có DB/Firebase thì bỏ qua step này.)

- [ ] **Step 3: Đánh dấu Phase 1 backend hoàn tất**

Không cần commit. Kết thúc plan.

---

## Lưu ý khi thực thi

- **Không đụng** `src/api/collection/*` (Phase 2, chưa commit) — ngoài scope.
- `ApiKeyGuard` được build + export nhưng **chưa gắn vào route nào** ở Phase 1 (route `/v1/*` để Phase 2+). Đây là chủ đích: hạ tầng sẵn sàng, chưa có resource để expose.
- Global `FirebaseAuthGuard` bảo vệ luôn `/api-keys` → user phải đăng nhập web để quản lý key của mình. Đúng SPEC §7.
- Nếu `npx tsc --noEmit` báo lỗi sẵn có ở file ngoài scope (vd `elasticsearch.service.ts`), bỏ qua — chỉ quan tâm file mình tạo/sửa.
```
```
