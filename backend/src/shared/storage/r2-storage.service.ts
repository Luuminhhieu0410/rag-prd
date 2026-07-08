import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageService } from './storage.service';

@Injectable()
export class R2StorageService implements OnModuleInit, StorageService {
  private readonly logger = new Logger(R2StorageService.name);

  private bucket: string;
  private client: S3Client;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.bucket = this.configService.get<string>('R2_BUCKET') ?? '';
    this.client = new S3Client({
      region: 'auto',
      endpoint: this.configService.get<string>('R2_HOST') ?? '',
      credentials: {
        accessKeyId: this.configService.get<string>('R2_ACCESS_KEY_ID') ?? '',
        secretAccessKey:
          this.configService.get<string>('R2_SECRET_ACCESS_KEY') ?? '',
      },
    });
  }

  async put(
    key: string,
    body: Buffer | string,
    contentType: string,
  ): Promise<void> {
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
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );

    if (!res.Body) {
      throw new Error(`R2 object empty: ${key}`);
    }

    return Buffer.from(await res.Body.transformToByteArray());
  }

  async delete(prefix: string): Promise<void> {
    const listed = await this.client.send(
      new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
      }),
    );

    const objects = (listed.Contents ?? [])
      .filter((item): item is typeof item & { Key: string } => !!item.Key)
      .map((item) => ({ Key: item.Key }));

    if (objects.length === 0) return;

    await this.client.send(
      new DeleteObjectsCommand({
        Bucket: this.bucket,
        Delete: { Objects: objects },
      }),
    );
  }

  async getSignedUrl(key: string, ttlSeconds?: number): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
      {
        expiresIn:
          ttlSeconds ??
          this.configService.get<number>('R2_PRESIGN_TTL') ??
          3600,
      },
    );
  }
}
