import { Suspense, lazy } from 'react';
import { LOTTIE, type LottieSlot } from '@/lib/lottie-registry';
import { cn } from '@/lib/utils';

// Lazy: player (~vài chục kB + wasm) chỉ tải khi thật sự render 1 animation,
// không nằm trong initial bundle. Đúng tinh thần "để đấy, cần mới lôi ra".
const DotLottie = lazy(async () => ({
  default: (await import('@lottiefiles/dotlottie-react')).DotLottieReact,
}));

export interface AppLottieProps {
  /** Tên slot trong lottie-registry. */
  name: LottieSlot;
  className?: string;
  /** Override loop của slot nếu cần. */
  loop?: boolean;
  autoplay?: boolean;
  speed?: number;
}

/**
 * Render animation Lottie theo slot. Nếu slot chưa `enabled` (chưa tải file về),
 * sẽ render rỗng ở production và hiện placeholder nhắc việc ở dev — KHÔNG vỡ UI.
 *
 * Dùng: <AppLottie name="empty-documents" className="size-40" />
 */
export function AppLottie({
  name,
  className,
  loop,
  autoplay = true,
  speed,
}: AppLottieProps) {
  const entry = LOTTIE[name];

  if (!entry?.enabled) {
    if (import.meta.env.DEV) {
      return (
        <div
          className={cn(
            'grid place-items-center rounded-md border border-dashed border-border p-2 text-center text-[11px] leading-tight text-muted-foreground',
            className,
          )}
          title={`Lottie slot "${name}" chưa bật — xem docs/frontend/lottie-animations.md`}
        >
          ⧗ lottie:{name}
        </div>
      );
    }
    return null;
  }

  return (
    <Suspense fallback={<div className={className} aria-hidden />}>
      <DotLottie
        src={entry.file}
        loop={loop ?? entry.loop}
        autoplay={autoplay}
        speed={speed}
        className={cn('h-full w-full', className)}
      />
    </Suspense>
  );
}
