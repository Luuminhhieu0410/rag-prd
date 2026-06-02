

export type LottieSlot =
  | 'route-loading'
  | 'login-hero'
  | 'empty-collections'
  | 'empty-documents'
  | 'upload'
  | 'processing'
  | 'success'
  | 'failed'
  | 'search-idle'
  | 'search-empty'
  | 'chat-empty'
  | 'chat-thinking'
  | 'not-found';

export interface LottieEntry {
  /** Đường dẫn file trong web/public/lottie/ (đã chốt theo tên slot). */
  file: string;
  /** true sau khi đã tải file về — chỉ khi đó AppLottie mới render thật. */
  enabled: boolean;
  /** Đa số animation nền nên loop; success/checkmark thì chạy 1 lần. */
  loop: boolean;
  /** Sẽ dùng ở màn nào trong app. */
  usedIn: string;
  /** Phase trong SPEC sẽ "lôi ra". */
  phase: string;
  /** Link LottieFiles gợi ý để tải bản đẹp, hợp tone (neutral/minimal). */
  source: string;
}

const file = (slot: LottieSlot): string => `/lottie/${slot}.lottie`;

export const LOTTIE: Record<LottieSlot, LottieEntry> = {
  'route-loading': {
    file: file('route-loading'),
    enabled: false,
    loop: true,
    usedIn: 'Suspense fallback trong AppRoutes + lúc useAuth đang bootstrap',
    phase: 'P1',
    source: 'https://lottiefiles.com/854-scanner-loading',
  },
  'login-hero': {
    file: file('login-hero'),
    enabled: false,
    loop: true,
    usedIn: 'Illustration cạnh nút Sign in với Google ở trang Login',
    phase: 'P1',
    source: 'https://lottiefiles.com/search?q=knowledge%20book%20reading',
  },
  'empty-collections': {
    file: file('empty-collections'),
    enabled: false,
    loop: true,
    usedIn: 'Empty state trang Collections (chưa tạo collection nào) — kèm CTA',
    phase: 'P2',
    source: 'https://lottiefiles.com/5540-empty-state-animation',
  },
  'empty-documents': {
    file: file('empty-documents'),
    enabled: false,
    loop: true,
    usedIn: 'Collection rỗng (chưa upload document) — kèm CTA upload',
    phase: 'P2',
    source: 'https://lottiefiles.com/629-empty-box',
  },
  upload: {
    file: file('upload'),
    enabled: false,
    loop: true,
    usedIn: 'Vùng drag-drop upload PDF/DOCX (trạng thái idle/hover)',
    phase: 'P2',
    source: 'https://lottiefiles.com/free-animations/upload',
  },
  processing: {
    file: file('processing'),
    enabled: false,
    loop: true,
    usedIn: 'Document đang parse/chunk/embed — cạnh status badge + progress SSE',
    phase: 'P3',
    source: 'https://lottiefiles.com/free-animation/scanning-documents-n7QCmSeVH4',
  },
  success: {
    file: file('success'),
    enabled: false,
    loop: false,
    usedIn: 'Toast/badge khi ingest xong (status -> ready)',
    phase: 'P3',
    source: 'https://lottiefiles.com/free-animation/check-mark-success-h9SJbwh6ky',
  },
  failed: {
    file: file('failed'),
    enabled: false,
    loop: false,
    usedIn: 'Document status = failed (kèm nút Retry + error message)',
    phase: 'P3',
    source: 'https://lottiefiles.com/128171-failed-state',
  },
  'search-idle': {
    file: file('search-idle'),
    enabled: false,
    loop: true,
    usedIn: 'Trang Search trước khi gõ query (kính lúp)',
    phase: 'P4',
    source: 'https://lottiefiles.com/38061-search',
  },
  'search-empty': {
    file: file('search-empty'),
    enabled: false,
    loop: true,
    usedIn: 'Search trả 0 kết quả',
    phase: 'P4',
    source: 'https://lottiefiles.com/68931-no-search-results',
  },
  'chat-empty': {
    file: file('chat-empty'),
    enabled: false,
    loop: true,
    usedIn: 'Conversation rỗng — màn gợi ý câu hỏi mẫu',
    phase: 'P6',
    source: 'https://lottiefiles.com/free-animations/chatbot',
  },
  'chat-thinking': {
    file: file('chat-thinking'),
    enabled: false,
    loop: true,
    usedIn: 'Indicator AI đang suy nghĩ trước khi token đầu tiên stream về',
    phase: 'P6',
    source: 'https://lottiefiles.com/free-animation/chatbot-typing-ojXoUEC17y',
  },
  'not-found': {
    file: file('not-found'),
    enabled: false,
    loop: true,
    usedIn: 'Route 404',
    phase: 'P8',
    source: 'https://lottiefiles.com/search?q=404',
  },
};
