import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import { FirebaseService } from './firebase.service';
import { AuthService } from './auth.service';
import { RedisService } from '../../shared/redis/redis.service';
import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash } from 'node:crypto';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(FirebaseAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly als: AsyncLocalStorage<any>,
    private readonly firebase: FirebaseService,
    private readonly authService: AuthService,
    private readonly redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    // test user;
    // const req = context.switchToHttp().getRequest();
    // req.user = {
    //   id: '340d06b7-28d7-4ff3-9ad2-f84db9e97891',
    //   firebaseUid: 'FejAX64Vs8WgNwZgxu5T68QBtYF3',
    //   email: 'luu7940@gmail.com',
    //   name: 'hiệu lưu minh',
    // };
    // const storeVariable = this.als.getStore();
    // storeVariable.user = {
    //   id: '340d06b7-28d7-4ff3-9ad2-f84db9e97891',
    //   firebaseUid: 'FejAX64Vs8WgNwZgxu5T68QBtYF3',
    //   email: 'luu7940@gmail.com',
    //   name: 'hiệu lưu minh',
    // };
    //
    // return true;

    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();
    const token = this.extractToken(req);
    if (!token) throw new UnauthorizedException('Missing bearer token');

    const cacheKey = `idtoken:${createHash('sha256').update(token).digest('hex')}`;
    // RedisService extends IORedis, so the service instance is the client.
    const client = this.redis.getClient();

    try {
      const cached = await client.get(cacheKey);
      if (cached) {
        req.user = JSON.parse(cached);
        return true;
      }
    } catch (e) {
      this.logger.warn(`Redis get failed, falling back to verify: ${e}`);
    }

    let decoded: import('firebase-admin/auth').DecodedIdToken;
    try {
      decoded = await this.firebase.getAuth().verifyIdToken(token);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    if (!decoded.email) {
      throw new UnauthorizedException('Token missing email claim');
    }

    const user = await this.authService.upsertUser(decoded);
    const payload = {
      id: user.id,
      firebaseUid: user.firebaseUid,
      email: user.email,
      name: user.name,
    };
    req.user = payload;

    try {
      const now = Math.floor(Date.now() / 1000);
      const ttl = Math.min(300, (decoded.exp ?? now) - now);
      if (ttl > 0) {
        await client.set(cacheKey, JSON.stringify(payload), 'EX', ttl);
      }
    } catch (e) {
      this.logger.warn(`Redis set failed: ${e}`);
    }

    const storeVariable = this.als.getStore();
    storeVariable.user = payload;
    return true;
  }

  private extractToken(req: {
    headers?: Record<string, unknown>;
  }): string | null {
    const header = req.headers?.authorization;
    if (typeof header !== 'string') return null;
    const [type, token] = header.split(' ');
    return type === 'Bearer' && token ? token : null;
  }
}
