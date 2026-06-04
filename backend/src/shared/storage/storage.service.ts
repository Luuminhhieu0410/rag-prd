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
