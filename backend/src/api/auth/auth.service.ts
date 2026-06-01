import { Injectable } from '@nestjs/common';
import { DecodedIdToken } from 'firebase-admin/auth';
import { PostgresService } from '../../databases/postgres/postgres.service';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PostgresService) {}

  async upsertUser(decoded: DecodedIdToken) {
    const data = {
      // email is guaranteed present by FirebaseAuthGuard (Google tokens carry it);
      // the ?? '' is a type-level fallback that should never trigger in practice.
      email: decoded.email ?? '',
      // 'name' is a standard OIDC claim present in Google tokens but not a named
      // property on DecodedIdToken, so it comes through the index signature.
      name: (decoded.name as string | undefined) ?? null,
      avatarUrl: decoded.picture ?? null,
      lastLoginAt: new Date(),
    };
    return this.prisma.user.upsert({
      where: { firebaseUid: decoded.uid },
      create: { firebaseUid: decoded.uid, ...data },
      update: data,
    });
  }
}
