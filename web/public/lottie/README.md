# public/lottie/

Nơi đặt file animation Lottie (`.lottie` — dotLottie nén, nhẹ hơn JSON thường).

Tên file phải khớp `slot` trong `src/lib/lottie-registry.ts`, ví dụ:

```
public/lottie/empty-documents.lottie
public/lottie/chat-thinking.lottie
```

Quy trình bật 1 slot:

1. Mở link `source` của slot (xem `docs/frontend/lottie-animations.md`).
2. Download → chọn **dotLottie** (`.lottie`).
3. Lưu vào đây với đúng tên `<slot>.lottie`.
4. Trong `lottie-registry.ts`, đổi `enabled: false` → `true` cho slot đó.
5. Render: `<AppLottie name="<slot>" className="size-40" />`

> License: animation free trên LottieFiles theo **Lottie Simple License** —
> miễn phí dùng, ghi attribution khi có thể. Kiểm tra license từng file.
