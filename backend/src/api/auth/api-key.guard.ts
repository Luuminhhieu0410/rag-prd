import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PostgresService } from '../../databases/postgres/postgres.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(private readonly prisma: PostgresService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const raw = this.extractKey(req);
    if (!raw) throw new UnauthorizedException('Missing API key');

    const prefix = raw.slice(0, 16);
    const candidates = await this.prisma.getClient().apiKey.findMany({
      where: { prefix, revokedAt: null },
      include: { user: true },
    });

    for (const k of candidates) {
      if (await bcrypt.compare(raw, k.keyHash)) {
        req.user = {
          id: k.user.id,
          firebaseUid: k.user.firebaseUid,
          email: k.user.email,
          name: k.user.name,
        };
        req.apiKey = { id: k.id, collectionId: k.collectionId };
        this.touchLastUsed(k.id);
        return true;
      }
    }

    throw new UnauthorizedException('Invalid API key');
  }

  private extractKey(req: {
    headers?: Record<string, unknown>;
  }): string | null {
    const header = req.headers?.['x-api-key'];
    return typeof header === 'string' && header.length > 0 ? header : null;
  }

  // Fire-and-forget: does not block the request; failures are only logged.
  private touchLastUsed(id: string): void {
    void this.prisma
      .getClient()
      .apiKey.updateMany({ where: { id }, data: { lastUsedAt: new Date() } })
      .catch((e) => this.logger.warn(`Failed to update lastUsedAt: ${e}`));
  }
}
