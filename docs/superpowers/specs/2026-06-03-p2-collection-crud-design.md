# Design — P2 Collection CRUD

**Date**: 2026-06-03
**Owner**: seomduc@gmail.com
**Scope**: Hoàn thiện CRUD cho `collections` (notebook). Là phase P2 (phần Collections) theo roadmap của `2026-05-25-rag-basic-notebooklm-apikey-query-design.md` §6. KHÔNG bao gồm document upload (sub-phase sau).

---

## 1. Mục tiêu

`CollectionService` hiện rỗng và controller trả `'hehe'`. Cung cấp CRUD đầy đủ cho collection của user đang đăng nhập, kèm counter số document / số conversation (design doc gốc §3 row 2–3).

---

## 2. Routing

CollectionModule đã được mount tại tiền tố `api/collection` qua `RouterModule` trong `api.module.ts`. Controller giữ `@Controller('')`.

| Method | Path | Mô tả |
|---|---|---|
| `POST` | `/api/collection` | Tạo collection |
| `GET` | `/api/collection` | List collection của user + counter |
| `GET` | `/api/collection/:id` | Lấy 1 collection + counter |
| `PATCH` | `/api/collection/:id` | Sửa name/description/icon/color |
| `DELETE` | `/api/collection/:id` | Xoá (cascade documents/conversations theo schema) |

Handler `POST /api/collection/uploads` hiện có **giữ nguyên** (thuộc sub-phase Document upload).

---

## 3. Service — `CollectionService`

Inject `PostgresService`. Mọi method nhận `userId` làm tham số đầu và **scope bằng `where` chứa `userId`** (quyết định đã chốt: service-level scoping, giống `ApiKeysService.revoke`). Không dùng OwnershipGuard cho các route này.

| Method | Hành vi |
|---|---|
| `create(userId, dto)` | `prisma.collection.create` với `userId` + name/description/icon/color. Trả row mới. |
| `list(userId)` | `findMany where { userId }`, `include: { _count: { select: { documents: true, conversations: true } } }`, `orderBy: { updatedAt: 'desc' }`. |
| `findOne(userId, id)` | `findFirst where { id, userId }` + `_count`. Null → `NotFoundException`. |
| `update(userId, id, dto)` | `updateMany where { id, userId }`. `count === 0` → `NotFoundException`. Trả row sau update (`findFirst`). |
| `remove(userId, id)` | `deleteMany where { id, userId }`. `count === 0` → `NotFoundException`. |

---

## 4. Controller — `CollectionController`

Theo pattern `ApiKeysController`:
- `@CurrentUser() user: AuthUser` lấy user; truyền `user.id` xuống service.
- Body dùng **plain interface** (repo không dùng class-validator), validate thủ công.
- `create`: `name` trim, non-empty → nếu rỗng `BadRequestException('name is required')`.
- `update`: partial — các field optional; chỉ set field được gửi.
- `DELETE` trả `204` (`@HttpCode(204)`), giống `ApiKeysController.revoke`.
- Thay handler `get()` trả `'hehe'` bằng `list` thật.

Body shapes:
```ts
interface CreateCollectionBody {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
}
interface UpdateCollectionBody {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
}
```

---

## 5. Validation

- `name` (create): trim, bắt buộc non-empty.
- `description` / `icon` / `color`: optional string.
- `update`: cho phép partial; nếu có `name` thì trim + non-empty.

---

## 6. Ngoài scope (YAGNI)

- Document upload + pipeline (sub-phase P2 tiếp theo).
- Pagination / search collection.
- Share / collaborator.
- Unit test (owner yêu cầu bỏ).

---

*End of design.*
