# Design — Core Auth (Firebase Google), Phase 1

**Date**: 2026-06-01
**Scope**: Backend core authentication. Subset of SPEC.md Phase 1.
**Status**: Approved design, ready for implementation plan.

## Mục tiêu

Mọi request vào API được xác thực bằng Firebase ID token, có `req.user` trỏ tới
user trong Postgres. Đây là nền để mọi route Phase 2+ có ownership context.

In scope (lần này):
- `firebase-admin` setup (singleton).
- `FirebaseAuthGuard` global, verify ID token, cache Redis 5 phút.
- Lazy upsert user vào Postgres + update `last_login_at`.
- `@Public()` decorator để loại trừ route công khai.
- `@CurrentUser()` param decorator.
- `GET /auth/me`.

Out of scope (Phase 1 còn lại, làm sau): `OwnershipGuard`, `api_keys` module,
`MCPApiKeyGuard`, frontend login.

## Deviation note

Không có deviation. User đã cân nhắc thêm email+OTP nhưng quyết định
**làm đúng SPEC.md** (Firebase Google only). Spec section 7 là source of truth.

## Kiến trúc

Module mới `src/api/auth/`, tách khỏi `user` module (user skeleton dành cho
profile sau).

```
src/api/auth/
  auth.module.ts            # khai báo provider + global guard
  firebase.service.ts       # init firebase-admin, expose auth()
  firebase-auth.guard.ts    # CanActivate: verify token + cache + upsert
  auth.service.ts           # lazy upsert user theo firebase_uid
  auth.controller.ts        # GET /auth/me
  decorators/
    public.decorator.ts     # @Public() -> SetMetadata('isPublic', true)
    current-user.decorator.ts  # @CurrentUser() -> req.user
```

### firebase.service.ts
- `onModuleInit`: `admin.initializeApp({ credential: admin.credential.applicationDefault() })`
  — đọc service account JSON qua env `GOOGLE_APPLICATION_CREDENTIALS`.
- Guard chống init trùng (`admin.apps.length`).
- Expose `getAuth()` trả `admin.auth()`.

### firebase-auth.guard.ts (flow)
```
1. Reflector đọc metadata isPublic; nếu @Public() -> return true
2. Lấy Authorization: Bearer <token>; thiếu/sai format -> 401
3. key = `idtoken:${sha256(token)}`
4. GET Redis key
   - HIT  -> req.user = JSON.parse(cache); return true
            (KHÔNG verify lại, KHÔNG ghi DB)
   - MISS -> decoded = firebase.getAuth().verifyIdToken(token)   # throw -> 401
            -> user = authService.upsertUser(decoded)            # ghi DB ở đây
            -> ttl = min(300, decoded.exp - now)                 # không cache quá hạn token
            -> SET Redis key = JSON(userPayload) EX ttl
5. req.user = { id, firebaseUid, email, name }
```

Lý do cache theo token: cache miss đóng vai trò "login event" → đó là lần duy
nhất chạm Postgres, tránh ghi DB mỗi request. TTL không vượt hạn token để token
hết hạn/bị revoke không sống lâu trong cache (tối đa lệch 5 phút — chấp nhận
được cho learning project).

### auth.service.ts
```ts
upsertUser(decoded): Promise<User> {
  return prisma.user.upsert({
    where: { firebaseUid: decoded.uid },
    create: { firebaseUid, email, name, avatarUrl, lastLoginAt: now },
    update: { email, name, avatarUrl, lastLoginAt: now },
  });
}
```
Idempotent (nguyên tắc 5). Lấy `email/name/picture` từ decoded token claims.

### auth.controller.ts
- `@Controller('auth')`, `GET /me` → trả `req.user` (đã là user DB).
- Mount ở root (đúng spec section 11: `GET /auth/me`, không dưới `/api`).
  AuthModule import vào `app.module.ts` trực tiếp, không qua RouterModule `/api`.

## Thay đổi file sẵn có

| File | Thay đổi |
|---|---|
| `package.json` | + `firebase-admin` |
| `src/shared/config/env.config.ts` | + `GOOGLE_APPLICATION_CREDENTIALS` |
| `src/app.module.ts` | import `AuthModule`; đăng ký `APP_GUARD = FirebaseAuthGuard` |
| `src/app.controller.ts` | `@Public()` cho health route |
| `.gitignore` | + `**/service-account*.json`, `**/*firebase*.json` |

**Không đụng**: `prisma/schema.prisma` (model `User` đã đủ field),
`PostgresService`, `RedisService`.

## Secrets

- Service account JSON: user đã có, đặt trong `backend/` (vd
  `backend/service-account.json`), trỏ env `GOOGLE_APPLICATION_CREDENTIALS`.
- File JSON **không commit** — `.gitignore` chặn trước khi tạo file (nguyên tắc 8).

## Error handling

- Thiếu token / sai format → `UnauthorizedException` (401).
- `verifyIdToken` throw (hết hạn, sai chữ ký, revoke) → 401, không leak chi tiết.
- Redis down → guard vẫn verify trực tiếp với Firebase (cache là tối ưu, không
  phải hard dependency); log warning, không 500.

## Testing

- Unit `firebase-auth.guard.spec.ts`: mock firebase + redis + authService.
  - @Public() bypass.
  - thiếu header → 401.
  - cache hit → không gọi verify/upsert.
  - cache miss → gọi verify + upsert + set cache với TTL đúng.
  - verify throw → 401.
- Unit `auth.service.spec.ts`: upsert gọi prisma đúng shape, idempotent.

## Definition of done

- `GET /auth/me` với Bearer token hợp lệ → trả user DB; lần đầu tự tạo user.
- Token sai/thiếu → 401.
- Request lặp lại trong 5 phút không tạo thêm DB write (cache hit).
- Service account JSON không nằm trong git.
