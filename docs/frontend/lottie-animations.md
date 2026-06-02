# Lottie animations — catalog & kế hoạch nhét

> Trạng thái: **hạ tầng dựng xong, animation để đấy chưa render.** Mỗi chỗ trong
> app có thể cần animation đã được đặt 1 *slot* trong `web/src/lib/lottie-registry.ts`.
> Khi tới phase tương ứng thì "lôi ra" theo quy trình bên dưới.

## Hạ tầng

| Thành phần | File |
|---|---|
| Player | `@lottiefiles/dotlottie-react` (dotLottie + wasm, lazy-load) |
| Wrapper | `web/src/components/AppLottie.tsx` — `<AppLottie name="..." />` |
| Registry | `web/src/lib/lottie-registry.ts` — định nghĩa slot |
| Assets | `web/public/lottie/<slot>.lottie` |

`AppLottie` lazy-load player → **không nằm trong initial bundle**. Slot chưa
`enabled` thì render rỗng (placeholder ở dev), nên commit thoải mái khi chưa có file.

## Quy trình bật 1 slot (~1 phút)

1. Mở link **Source** của slot ở bảng dưới → Download → định dạng **dotLottie** (`.lottie`).
2. Lưu vào `web/public/lottie/<slot>.lottie` (đúng tên slot).
3. `lottie-registry.ts`: đổi `enabled: false` → `true`.
4. Render tại chỗ cần: `<AppLottie name="<slot>" className="size-40" />`.

## Slot map — chỗ nào nhét gì, phase nào

| Slot | Phase | Nhét ở đâu | Loop | Source (LottieFiles) |
|---|---|---|---|---|
| `route-loading` | P1 | Suspense fallback `AppRoutes` + lúc `useAuth` bootstrap | ✓ | [scanner-loading](https://lottiefiles.com/854-scanner-loading) |
| `login-hero` | P1 | Cạnh nút Sign in trang Login | ✓ | [search: knowledge/book](https://lottiefiles.com/search?q=knowledge%20book%20reading) |
| `empty-collections` | P2 | Trang Collections khi chưa có collection (kèm CTA) | ✓ | [empty-state](https://lottiefiles.com/5540-empty-state-animation) |
| `empty-documents` | P2 | Collection rỗng (kèm CTA upload) | ✓ | [empty-box](https://lottiefiles.com/629-empty-box) |
| `upload` | P2 | Vùng drag-drop upload (idle/hover) | ✓ | [upload](https://lottiefiles.com/free-animations/upload) |
| `processing` | P3 | Document đang parse/chunk/embed, cạnh progress SSE | ✓ | [scanning-documents](https://lottiefiles.com/free-animation/scanning-documents-n7QCmSeVH4) |
| `success` | P3 | Toast/badge khi ingest xong (status ready) | ✗ | [check-mark-success](https://lottiefiles.com/free-animation/check-mark-success-h9SJbwh6ky) |
| `failed` | P3 | Document failed (kèm Retry + error) | ✗ | [failed-state](https://lottiefiles.com/128171-failed-state) |
| `search-idle` | P4 | Trang Search trước khi gõ query | ✓ | [search](https://lottiefiles.com/38061-search) |
| `search-empty` | P4 | Search 0 kết quả | ✓ | [no-search-results](https://lottiefiles.com/68931-no-search-results) |
| `chat-empty` | P6 | Conversation rỗng, màn gợi ý câu hỏi | ✓ | [chatbot](https://lottiefiles.com/free-animations/chatbot) |
| `chat-thinking` | P6 | AI đang nghĩ, trước token đầu tiên | ✓ | [chatbot-typing](https://lottiefiles.com/free-animation/chatbot-typing-ojXoUEC17y) |
| `not-found` | P8 | Route 404 | ✓ | [search: 404](https://lottiefiles.com/search?q=404) |

## Gu chọn cho hợp project

App là NotebookLM-lite, tone **neutral/minimal** (shadcn neutral, light/dark).
Khi chọn bản cụ thể trên LottieFiles, ưu tiên:

- **Line-art / mono / flat**, ít màu — đừng lấy bản 3D sặc sỡ lệch tông.
- Nền **trong suốt**, hợp cả light lẫn dark (tránh bản nền trắng cứng).
- Loop mượt, không giật ở điểm nối (trừ `success`/`failed` chạy 1 lần).
- File nhẹ (ưu tiên `.lottie`); chỉnh màu accent về `--primary` nếu LottieFiles cho edit.

## Phương án thay thế (nếu lười tải tay)

LottieFiles có gói React + hosted URL; cũng có thể tự host. Nếu sau này muốn,
đổi `AppLottie` để nhận `src` là URL remote thay vì file local — wrapper đã tách
`src` ra một chỗ nên sửa 1 dòng.

## Nguồn

- [LottieFiles — AI loading](https://lottiefiles.com/free-animations/ai-loading)
- [LottieFiles — Empty state](https://lottiefiles.com/free-animations/empty-state)
- [LottieFiles — Chatbot](https://lottiefiles.com/free-animations/chatbot)
- [LottieFiles — Search magnifier](https://lottiefiles.com/free-animations/search-magnifier)
- [LottieFiles — Confetti checkmark](https://lottiefiles.com/free-animations/confetti-checkmark)
