import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PostgresService } from '../../databases/postgres/postgres.service';

const BCRYPT_COST = 12;

@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PostgresService) {}

  async create(userId: string, name: string, collectionId?: string) {
    const raw = 'sk_live_' + randomBytes(32).toString('base64url');
    const keyHash = await bcrypt.hash(raw, BCRYPT_COST);
    const prefix = raw.slice(0, 16); // 'sk_live_' + 8 random chars

    const row = await this.prisma.getClient().apiKey.create({
      data: {
        userId,
        name,
        keyHash,
        prefix,
        collectionId: collectionId ?? null,
      },
    });

    // `key` is returned only this once — plaintext is never stored or returned again.
    return { id: row.id, name, prefix, key: raw };
  }

  list(userId: string) {
    return this.prisma.getClient().apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        prefix: true,
        lastUsedAt: true,
        revokedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revoke(userId: string, id: string) {
    const res = await this.prisma.getClient().apiKey.updateMany({
      where: { id, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (res.count === 0) throw new NotFoundException();
  }
}
