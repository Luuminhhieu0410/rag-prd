import { Injectable } from '@nestjs/common';
import { DecodedIdToken } from 'firebase-admin/auth';
import { PostgresService } from '../../databases/postgres/postgres.service';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PostgresService) {}

  upsertUser(decoded: DecodedIdToken) {
    const data = {
      email: decoded.email ?? '',
      name: (decoded.name as string | undefined) ?? null,
      avatarUrl: decoded.picture ?? null,
      lastLoginAt: new Date(),
    };
    return this.prisma.getClient().user.upsert({
      where: { firebaseUid: decoded.uid },
      create: { firebaseUid: decoded.uid, ...data },
      update: data,
    });
  }
}
