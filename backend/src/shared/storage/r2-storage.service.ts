import { Injectable, Logger } from '@nestjs/common';
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageService } from './storage.service';
import { envConfig } from '../config/env.config';

@Injectable()
export class R2StorageService extends StorageService {
  private readonly logger = new Logger(R2StorageService.name);
  private readonly bucket = envConfig.R2_BUCKET;
  private readonly client = new S3Client({
    region: 'auto',
    endpoint: envConfig.R2_HOST,
    credentials: {
      accessKeyId: envConfig.R2_ACCESS_KEY_ID,
      secretAccessKey: envConfig.R2_SECRET_ACCESS_KEY,
    },
  });

  async put(
    key: string,
    body: Buffer | string,
    contentType: string,
  ): Promise<void> {
    console.log('put', this.bucket);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async getBytes(key: string): Promise<Buffer> {
    const res = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    if (!res.Body) throw new Error(`R2 object empty: ${key}`);
    const bytes = await res.Body.transformToByteArray();
    return Buffer.from(bytes);
  }

  async delete(prefix: string): Promise<void> {
    // Mỗi document prefix chỉ có tối đa vài object (raw + text), thừa sức dưới
    // giới hạn 1000 key/trang của ListObjectsV2 -> không cần phân trang.
    const listed = await this.client.send(
      new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix }),
    );
    const toDelete = (listed.Contents ?? [])
      .filter((o): o is typeof o & { Key: string } => !!o.Key)
      .map((o) => ({ Key: o.Key }));
    if (toDelete.length === 0) return;
    await this.client.send(
      new DeleteObjectsCommand({
        Bucket: this.bucket,
        Delete: { Objects: toDelete },
      }),
    );
  }

  async getSignedUrl(
    key: string,
    ttlSeconds: number = envConfig.R2_PRESIGN_TTL,
  ): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: ttlSeconds },
    );
  }
}
