# Core Auth (Firebase Google) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mọi request API được xác thực bằng Firebase ID token; `req.user` trỏ tới user trong Postgres; `GET /auth/me` trả profile.

**Architecture:** Module mới `src/api/auth/`. Một global `FirebaseAuthGuard` (APP_GUARD) verify ID token qua `firebase-admin`, cache kết quả trong Redis 5 phút theo hash của token, lazy-upsert user vào Postgres ở mỗi cache miss. `@Public()` opt-out cho route công khai, `@CurrentUser()` lấy `req.user`.

**Tech Stack:** NestJS 11, firebase-admin, Prisma (PostgresService), ioredis (RedisService), Jest + ts-jest.

---

## File Structure

```
backend/src/api/auth/
  auth.module.ts                       # Create — providers + APP_GUARD global
  firebase.service.ts                  # Create — init firebase-admin singleton
  firebase-auth.guard.ts               # Create — verify + cache + upsert
  firebase-auth.guard.spec.ts          # Create — unit test guard
  auth.service.ts                      # Create — lazy upsert user
  auth.service.spec.ts                 # Create — unit test upsert
  auth.controller.ts                   # Create — GET /auth/me
  decorators/
    public.decorator.ts                # Create — @Public()
    current-user.decorator.ts          # Create — @CurrentUser()
```

Modified:
- `backend/package.json` — add `firebase-admin`
- `backend/src/shared/config/env.config.ts` — add `GOOGLE_APPLICATION_CREDENTIALS`
- `backend/src/app.module.ts` — import `AuthModule`
- `backend/src/app.controller.ts` — `@Public()` health route
- `.gitignore` — block service account JSON

> All shell commands assume CWD = `backend/` unless noted.

---

## Task 1: Install firebase-admin + env config + gitignore

**Files:**
- Modify: `backend/package.json`
- Modify: `backend/src/shared/config/env.config.ts`
- Modify: `.gitignore` (repo root)

- [ ] **Step 1: Install firebase-admin**

Run (in `backend/`):
```bash
npm install firebase-admin
```
Expected: `firebase-admin` added to `dependencies` in `package.json`.

- [ ] **Step 2: Add env var**

In `backend/src/shared/config/env.config.ts`, add inside the `envConfig` object (after the `OPENAI_EMBEDDING_MODEL` line, before the closing `};`):

```ts
  GOOGLE_APPLICATION_CREDENTIALS:
    process.env.GOOGLE_APPLICATION_CREDENTIALS || './service-account.json',
```

- [ ] **Step 3: Gitignore service account**

In the repo-root `.gitignore`, append:
```
**/service-account*.json
**/*firebase*.json
```

- [ ] **Step 4: Verify secret is ignored**

Run (repo root):
```bash
git check-ignore backend/service-account.json
```
Expected: prints `backend/service-account.json` (meaning it IS ignored).

- [ ] **Step 5: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/src/shared/config/env.config.ts .gitignore
git commit -m "chore: add firebase-admin dep, GOOGLE_APPLICATION_CREDENTIALS env, gitignore service account"
```

---

## Task 2: Decorators (@Public, @CurrentUser)

**Files:**
- Create: `backend/src/api/auth/decorators/public.decorator.ts`
- Create: `backend/src/api/auth/decorators/current-user.decorator.ts`

No test (trivial metadata wrappers; covered indirectly by guard test).

- [ ] **Step 1: Create public.decorator.ts**

```ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

- [ ] **Step 2: Create current-user.decorator.ts**

```ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthUser {
  id: string;
  firebaseUid: string;
  email: string;
  name: string | null;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest().user,
);
```

- [ ] **Step 3: Verify it compiles**

Run:
```bash
npx tsc --noEmit -p tsconfig.json
```
Expected: no errors from these two files.

- [ ] **Step 4: Commit**

```bash
git add backend/src/api/auth/decorators
git commit -m "feat(auth): add @Public and @CurrentUser decorators"
```

---

## Task 3: FirebaseService (init firebase-admin singleton)

**Files:**
- Create: `backend/src/api/auth/firebase.service.ts`

No unit test (thin wrapper over SDK init; relies on real credentials, verified manually in Task 7).

- [ ] **Step 1: Create firebase.service.ts**

```ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);

  onModuleInit() {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
      this.logger.log('firebase-admin initialized');
    }
  }

  getAuth() {
    return admin.auth();
  }
}
```

> `applicationDefault()` reads the service account JSON path from the
> `GOOGLE_APPLICATION_CREDENTIALS` env var set in Task 1.

- [ ] **Step 2: Verify it compiles**

Run:
```bash
npx tsc --noEmit -p tsconfig.json
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/api/auth/firebase.service.ts
git commit -m "feat(auth): add FirebaseService initializing firebase-admin"
```

---

## Task 4: AuthService (lazy upsert user) — TDD

**Files:**
- Create: `backend/src/api/auth/auth.service.ts`
- Test: `backend/src/api/auth/auth.service.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `backend/src/api/auth/auth.service.spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PostgresService } from '../../databases/postgres/postgres.service';

describe('AuthService', () => {
  let service: AuthService;
  let upsert: jest.Mock;

  beforeEach(async () => {
    upsert = jest.fn().mockResolvedValue({
      id: 'u1',
      firebaseUid: 'uid-1',
      email: 'a@b.com',
      name: 'Alice',
    });
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PostgresService, useValue: { user: { upsert } } },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  it('upserts by firebaseUid with claims from the decoded token', async () => {
    const decoded = {
      uid: 'uid-1',
      email: 'a@b.com',
      name: 'Alice',
      picture: 'http://img/a.png',
    } as any;

    const user = await service.upsertUser(decoded);

    expect(user.id).toBe('u1');
    expect(upsert).toHaveBeenCalledTimes(1);
    const arg = upsert.mock.calls[0][0];
    expect(arg.where).toEqual({ firebaseUid: 'uid-1' });
    expect(arg.create.firebaseUid).toBe('uid-1');
    expect(arg.create.email).toBe('a@b.com');
    expect(arg.create.avatarUrl).toBe('http://img/a.png');
    expect(arg.create.lastLoginAt).toBeInstanceOf(Date);
    expect(arg.update.email).toBe('a@b.com');
    expect(arg.update.lastLoginAt).toBeInstanceOf(Date);
  });

  it('tolerates missing optional claims', async () => {
    const decoded = { uid: 'uid-2', email: undefined } as any;
    await service.upsertUser(decoded);
    const arg = upsert.mock.calls[0][0];
    expect(arg.create.email).toBe('');
    expect(arg.create.name).toBeNull();
    expect(arg.create.avatarUrl).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
npx jest src/api/auth/auth.service.spec.ts
```
Expected: FAIL — cannot find module `./auth.service`.

- [ ] **Step 3: Write minimal implementation**

Create `backend/src/api/auth/auth.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { DecodedIdToken } from 'firebase-admin/auth';
import { PostgresService } from '../../databases/postgres/postgres.service';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PostgresService) {}

  async upsertUser(decoded: DecodedIdToken) {
    const data = {
      email: decoded.email ?? '',
      name: (decoded.name as string | undefined) ?? null,
      avatarUrl: (decoded.picture as string | undefined) ?? null,
      lastLoginAt: new Date(),
    };
    return this.prisma.user.upsert({
      where: { firebaseUid: decoded.uid },
      create: { firebaseUid: decoded.uid, ...data },
      update: data,
    });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
npx jest src/api/auth/auth.service.spec.ts
```
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/api/auth/auth.service.ts backend/src/api/auth/auth.service.spec.ts
git commit -m "feat(auth): add AuthService.upsertUser with lazy upsert (TDD)"
```

---

## Task 5: FirebaseAuthGuard (verify + cache + upsert) — TDD

**Files:**
- Create: `backend/src/api/auth/firebase-auth.guard.ts`
- Test: `backend/src/api/auth/firebase-auth.guard.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `backend/src/api/auth/firebase-auth.guard.spec.ts`:

```ts
import { UnauthorizedException } from '@nestjs/common';
import { FirebaseAuthGuard } from './firebase-auth.guard';

function ctxWith(headers: Record<string, string>, handler = () => {}) {
  const req: any = { headers };
  return {
    _req: req,
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => handler,
    getClass: () => class {},
  } as any;
}

describe('FirebaseAuthGuard', () => {
  let guard: FirebaseAuthGuard;
  let reflector: any;
  let firebase: any;
  let authService: any;
  let redisClient: any;
  let redis: any;

  const decoded = { uid: 'uid-1', exp: Math.floor(Date.now() / 1000) + 3600 };
  const user = { id: 'u1', firebaseUid: 'uid-1', email: 'a@b.com', name: 'Alice' };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
    firebase = { getAuth: () => ({ verifyIdToken: jest.fn().mockResolvedValue(decoded) }) };
    authService = { upsertUser: jest.fn().mockResolvedValue(user) };
    redisClient = { get: jest.fn().mockResolvedValue(null), set: jest.fn().mockResolvedValue('OK') };
    redis = { getClient: () => redisClient };
    guard = new FirebaseAuthGuard(reflector, firebase, authService, redis);
  });

  it('allows @Public() routes without a token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const ctx = ctxWith({});
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('throws 401 when Authorization header missing', async () => {
    const ctx = ctxWith({});
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws 401 when header is not a Bearer token', async () => {
    const ctx = ctxWith({ authorization: 'Basic xyz' });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('on cache hit: sets req.user from cache, no verify, no DB write', async () => {
    redisClient.get.mockResolvedValue(JSON.stringify(user));
    const verify = jest.fn();
    firebase.getAuth = () => ({ verifyIdToken: verify });
    const ctx = ctxWith({ authorization: 'Bearer tok' });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(ctx._req.user).toEqual(user);
    expect(verify).not.toHaveBeenCalled();
    expect(authService.upsertUser).not.toHaveBeenCalled();
  });

  it('on cache miss: verifies, upserts, caches payload with bounded TTL', async () => {
    const ctx = ctxWith({ authorization: 'Bearer tok' });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);

    expect(authService.upsertUser).toHaveBeenCalledWith(decoded);
    expect(ctx._req.user).toEqual(user);
    const [key, value, mode, ttl] = redisClient.set.mock.calls[0];
    expect(key).toContain('idtoken:');
    expect(JSON.parse(value)).toEqual(user);
    expect(mode).toBe('EX');
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(300);
  });

  it('throws 401 when verifyIdToken rejects', async () => {
    firebase.getAuth = () => ({ verifyIdToken: jest.fn().mockRejectedValue(new Error('bad')) });
    const ctx = ctxWith({ authorization: 'Bearer tok' });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('still authenticates when Redis get throws (cache is best-effort)', async () => {
    redisClient.get.mockRejectedValue(new Error('redis down'));
    const ctx = ctxWith({ authorization: 'Bearer tok' });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(authService.upsertUser).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
npx jest src/api/auth/firebase-auth.guard.spec.ts
```
Expected: FAIL — cannot find module `./firebase-auth.guard`.

- [ ] **Step 3: Write minimal implementation**

Create `backend/src/api/auth/firebase-auth.guard.ts`:

```ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHash } from 'crypto';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import { FirebaseService } from './firebase.service';
import { AuthService } from './auth.service';
import { RedisService } from '../../shared/redis/redis.service';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(FirebaseAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly firebase: FirebaseService,
    private readonly authService: AuthService,
    private readonly redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();
    const token = this.extractToken(req);
    if (!token) throw new UnauthorizedException('Missing bearer token');

    const cacheKey = `idtoken:${createHash('sha256').update(token).digest('hex')}`;
    const client = this.redis.getClient();

    try {
      const cached = await client.get(cacheKey);
      if (cached) {
        req.user = JSON.parse(cached);
        return true;
      }
    } catch (e) {
      this.logger.warn(`Redis get failed, falling back to verify: ${e}`);
    }

    let decoded;
    try {
      decoded = await this.firebase.getAuth().verifyIdToken(token);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    const user = await this.authService.upsertUser(decoded);
    const payload = {
      id: user.id,
      firebaseUid: user.firebaseUid,
      email: user.email,
      name: user.name,
    };
    req.user = payload;

    try {
      const now = Math.floor(Date.now() / 1000);
      const ttl = Math.min(300, (decoded.exp ?? now) - now);
      if (ttl > 0) {
        await client.set(cacheKey, JSON.stringify(payload), 'EX', ttl);
      }
    } catch (e) {
      this.logger.warn(`Redis set failed: ${e}`);
    }

    return true;
  }

  private extractToken(req: { headers?: Record<string, unknown> }): string | null {
    const header = req.headers?.authorization;
    if (typeof header !== 'string') return null;
    const [type, token] = header.split(' ');
    return type === 'Bearer' && token ? token : null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
npx jest src/api/auth/firebase-auth.guard.spec.ts
```
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/api/auth/firebase-auth.guard.ts backend/src/api/auth/firebase-auth.guard.spec.ts
git commit -m "feat(auth): add FirebaseAuthGuard with Redis-cached token verify (TDD)"
```

---

## Task 6: AuthController (GET /auth/me)

**Files:**
- Create: `backend/src/api/auth/auth.controller.ts`

- [ ] **Step 1: Create auth.controller.ts**

```ts
import { Controller, Get } from '@nestjs/common';
import { CurrentUser, AuthUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  @Get('me')
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run:
```bash
npx tsc --noEmit -p tsconfig.json
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/api/auth/auth.controller.ts
git commit -m "feat(auth): add GET /auth/me endpoint"
```

---

## Task 7: Wire AuthModule + global guard + public health route

**Files:**
- Create: `backend/src/api/auth/auth.module.ts`
- Modify: `backend/src/app.module.ts`
- Modify: `backend/src/app.controller.ts`

- [ ] **Step 1: Create auth.module.ts**

```ts
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { FirebaseService } from './firebase.service';
import { AuthService } from './auth.service';
import { FirebaseAuthGuard } from './firebase-auth.guard';
import { AuthController } from './auth.controller';
import { PostgresModule } from '../../databases/postgres/postgres.module';
import { RedisModule } from '../../shared/redis/redis.module';

@Module({
  imports: [PostgresModule, RedisModule],
  controllers: [AuthController],
  providers: [
    FirebaseService,
    AuthService,
    { provide: APP_GUARD, useClass: FirebaseAuthGuard },
  ],
})
export class AuthModule {}
```

> Registering `APP_GUARD` inside this module makes `FirebaseAuthGuard` global
> while keeping its dependencies (`FirebaseService`, `AuthService`, `RedisModule`)
> resolvable from this module's context.

- [ ] **Step 2: Import AuthModule in app.module.ts**

In `backend/src/app.module.ts`, add the import line near the other imports:
```ts
import { AuthModule } from './api/auth/auth.module';
```
and add `AuthModule` to the `imports` array (first entry is fine):
```ts
  imports: [
    AuthModule,
    PostgresModule,
    ElasticsearchModule,
    ApiModule,
    EmbeddingModule,
    SharedModule,
  ],
```

- [ ] **Step 3: Make health route public**

Replace the contents of `backend/src/app.controller.ts` with:
```ts
import { Controller, Get } from '@nestjs/common';
import { Public } from './api/auth/decorators/public.decorator';

@Controller()
export class AppController {
  constructor() {}

  @Public()
  @Get()
  getHello() {
    return { status: 'ok' };
  }
}
```

> The previous handler threw `BadRequestException`; replaced with a real health
> response so the public route is usable. `@Public()` exempts it from the guard.

- [ ] **Step 4: Build the app to verify DI wiring**

Run:
```bash
npm run build
```
Expected: build succeeds, no Nest DI errors.

- [ ] **Step 5: Run the full unit suite**

Run:
```bash
npx jest
```
Expected: all auth specs PASS, no regressions.

- [ ] **Step 6: Commit**

```bash
git add backend/src/api/auth/auth.module.ts backend/src/app.module.ts backend/src/app.controller.ts
git commit -m "feat(auth): wire AuthModule, register global guard, public health route"
```

---

## Task 8: Manual smoke test (real Firebase token)

**Prerequisite:** service account JSON placed at `backend/service-account.json`
(path matches `GOOGLE_APPLICATION_CREDENTIALS`); infra (Postgres, Redis) up;
a valid Firebase ID token obtained from the FE / Firebase REST.

- [ ] **Step 1: Start the API**

Run:
```bash
npm run start:dev
```
Expected log: `firebase-admin initialized` and `connected to Postgres service`.

- [ ] **Step 2: Health route is public**

Run:
```bash
curl -s http://localhost:5555/
```
Expected: `{"status":"ok"}` (no token needed).

- [ ] **Step 3: Protected route rejects missing token**

Run:
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5555/auth/me
```
Expected: `401`.

- [ ] **Step 4: Protected route accepts valid token + creates user**

Run (replace `$TOKEN`):
```bash
curl -s http://localhost:5555/auth/me -H "Authorization: Bearer $TOKEN"
```
Expected: JSON user `{ id, firebaseUid, email, name }`. First call creates the
row in Postgres `users`; verify with a quick query that the row exists and
`last_login_at` is set.

- [ ] **Step 5: Cache hit on repeat (no new DB write)**

Repeat Step 4 immediately. Expected: same response within ~5 min served from
Redis (no second `users` upsert; confirmable by watching SQL logs or unchanged
`last_login_at` until cache expires).

> No commit — verification only.

---

## Self-Review notes

- **Spec coverage** (design doc §"In scope"): firebase-admin setup → Task 3;
  global guard + verify + Redis 5' cache → Task 5; lazy upsert + last_login →
  Task 4; `@Public()` → Task 2/7; `@CurrentUser()` → Task 2; `GET /auth/me` →
  Task 6; secrets gitignore → Task 1. All covered.
- **Type consistency:** `AuthUser` shape `{ id, firebaseUid, email, name }` is
  identical in `current-user.decorator.ts`, the guard payload, and the
  controller return. `upsertUser(decoded)` signature matches its call site in
  the guard.
- **Out of scope (not in this plan, per design):** OwnershipGuard, api_keys,
  MCPApiKeyGuard, frontend.
