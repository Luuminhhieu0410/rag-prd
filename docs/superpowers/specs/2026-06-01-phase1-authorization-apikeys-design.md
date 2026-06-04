# Phase 1 (backend, phần còn lại) — Authorization + API Keys

> Design doc. Locked: 2026-06-01. Owner: seomduc@gmail.com.
> Branch: `feat/core-auth-firebase`. Scope: **backend only**.

## 1. Bối cảnh

Phase 1 backend đã xong: `FirebaseService`, `FirebaseAuthGuard` (Redis-cached verify), lazy
`upsertUser`, `@Public`/`@CurrentUser`, global guard, `GET /auth/me`, Prisma schema đầy đủ.

Còn thiếu (SPEC L624–630):
- `OwnershipGuard`
- `api_keys` module (tạo/list/revoke) + guard verify key

FE (login page, useAuth, axios interceptor, middleware) **ngoài scope** lần này.

## 2. Quyết định thiết kế đã chốt

| Quyết định | Chọn | Lý do |
|---|---|---|
| OwnershipGuard | Generic + metadata (`@CheckOwnership('model')`) | 1 guard dùng cho mọi resource; đáng học |
| Hash API key | **bcrypt** (cost 12) | User chọn; schema đã có `@@index([prefix])` hỗ trợ lookup |
| Tên guard verify key | **`ApiKeyGuard`** (generic, KHÔNG gắn MCP) | Phục vụ cả REST thủ công (ý ship production) lẫn MCP sau |
| Header API key | **`X-API-Key`** only | Tách bạch với `Authorization: Bearer` của Firebase token |
| Public REST `/v1/*` mẫu | **Không** làm ở Phase 1 | Giữ scope; làm khi có resource thật (Phase 2+) |

## 3. Thành phần

### 3.1 OwnershipGuard (generic + metadata)

Hạ tầng authorization dùng chung. Phase 1 chưa có resource thật (collection/document là
Phase 2+) → đây là infra chờ sẵn, test bằng model mock.

```ts
// decorator
export const CHECK_OWNERSHIP = 'check_ownership';
export type OwnableModel = 'collection' | 'document' | 'conversation';
export const CheckOwnership = (model: OwnableModel, idParam = 'id') =>
  SetMetadata(CHECK_OWNERSHIP, { model, idParam });
```

```ts
@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(private reflector: Reflector, private prisma: PostgresService) {}
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const meta = this.reflector.get<{ model: OwnableModel; idParam: string }>(
      CHECK_OWNERSHIP, ctx.getHandler());
    if (!meta) return true;                       // route không khai báo → bỏ qua
    const req = ctx.switchToHttp().getRequest();
    const id = req.params[meta.idParam];
    const row = await (this.prisma as any)[meta.model].findUnique({
      where: { id }, select: { userId: true },
    });
    if (!row) throw new NotFoundException();
    if (row.userId !== req.user.id) throw new ForbiddenException();
    return true;
  }
}
```

- Chạy **sau** `FirebaseAuthGuard` (cần `req.user`). Đăng ký per-route bằng `@UseGuards(OwnershipGuard)`,
  KHÔNG global (thứ tự + nhiều route không cần).
- `OwnableModel` union giới hạn cứng các bảng có cột `userId`.

### 3.2 ApiKeys module

Routes (áp `FirebaseAuthGuard` — user web quản lý key của chính mình):

```
POST   /api-keys     body {name, collectionId?}  → trả FULL key 1 lần duy nhất
GET    /api-keys                                  → list (prefix + name + lastUsed, KHÔNG keyHash)
DELETE /api-keys/:id                              → revoke (set revoked_at)
```

Tạo key:

```ts
async create(userId: string, name: string, collectionId?: string) {
  const raw = 'sk_live_' + randomBytes(32).toString('base64url');
  const keyHash = await bcrypt.hash(raw, 12);
  const prefix = raw.slice(0, 16);              // 'sk_live_' + 8 ký tự random
  const row = await this.prisma.apiKey.create({
    data: { userId, name, keyHash, prefix, collectionId: collectionId ?? null },
  });
  return { id: row.id, name, prefix, key: raw };  // `key` chỉ trả lần này
}
```

- Không lưu plaintext; mất key → tạo lại.
- `list()` select tường minh, loại `keyHash`.
- `revoke()` set `revokedAt`, không xóa (giữ audit + FK `ApiQueryLog`). Idempotent.
- Ownership: revoke/list filter `where: { id, userId }` (rule #5) — repository-level đủ, không cần OwnershipGuard.
- Key người khác → `NotFoundException` (không tiết lộ tồn tại).

### 3.3 ApiKeyGuard (generic)

```ts
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private prisma: PostgresService) {}
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const raw = this.extractKey(req);             // CHỈ header X-API-Key
    if (!raw) throw new UnauthorizedException('Missing API key');
    const prefix = raw.slice(0, 16);
    const candidates = await this.prisma.apiKey.findMany({
      where: { prefix, revokedAt: null }, include: { user: true },
    });
    for (const k of candidates) {                 // thường 1; loop phòng trùng prefix
      if (await bcrypt.compare(raw, k.keyHash)) {
        req.user = { id: k.user.id, firebaseUid: k.user.firebaseUid,
                     email: k.user.email, name: k.user.name };  // cùng shape AuthUser
        req.apiKey = { id: k.id, collectionId: k.collectionId };
        void this.touchLastUsed(k.id);            // fire-and-forget
        return true;
      }
    }
    throw new UnauthorizedException('Invalid API key');
  }
}
```

- Generic — bất kỳ route programmatic nào `@UseGuards(ApiKeyGuard)`.
- `req.user` cùng shape `AuthUser` như Firebase → `@CurrentUser` dùng chung.
- `req.apiKey.collectionId` cho scope check tương lai.
- Tôn trọng `revokedAt` trong `where`.
- `extractKey`: chỉ đọc header `x-api-key`.
- KHÔNG cache (key bền). Lưu ý: bcrypt.compare mỗi request có chi phí; nếu nóng sau này → cache
  `prefix→userId` Redis TTL ngắn. Không làm ở Phase 1.

## 4. Testing (TDD)

Mock `PostgresService` (Prisma), không cần DB thật — theo `auth.service.spec.ts` hiện có.

| Unit | Cases |
|---|---|
| `ApiKeysService` | create trả raw key + prefix đúng, keyHash là bcrypt; list không lộ keyHash; revoke set revokedAt; revoke/list key người khác → not found |
| `ApiKeyGuard` | thiếu key → 401; key sai → 401; key revoked → 401 (lọc bởi where); key đúng → req.user shape đúng + req.apiKey set |
| `OwnershipGuard` | no metadata → pass; not found → 404; khác user → 403; đúng user → pass |

## 5. Module wiring

- `ApiKeysModule`: `ApiKeysController` + `ApiKeysService`, import `PostgresModule`.
- `ApiKeyGuard` + `OwnershipGuard`: đặt `auth/guards/`, export từ `AuthModule` để module khác dùng.
- Dep mới: `bcrypt` + `@types/bcrypt`.

## 6. Ngoài scope (không làm Phase 1)

- FE auth.
- MCP server + 3 tool (Phase 7) — chỉ làm hạ tầng key/guard.
- Rate limit, ExceptionFilter thống nhất, versioning `/v1`, Swagger, Dockerfile (Phase 8 hoặc khi mở public API).
- Cache API key verify.
- File `src/api/collection/*` chưa commit (Phase 2) — gác lại, không đụng.
