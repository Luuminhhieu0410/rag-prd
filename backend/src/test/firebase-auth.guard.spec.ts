import { UnauthorizedException } from '@nestjs/common';
import { FirebaseAuthGuard } from '../api/auth/firebase-auth.guard';

function ctxWith(headers: Record<string, string>, handler = () => {}) {
  const req: any = { headers };
  return {
    _req: req,
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => handler,
    getClass: () => class {},
  } as any;
}

describe('FirebaseAuthGuard', () => {
  let guard: FirebaseAuthGuard;
  let reflector: any;
  let firebase: any;
  let authService: any;
  let redisClient: any;
  let redis: any;

  const decoded = {
    uid: 'uid-1',
    email: 'a@b.com',
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
  const user = {
    id: 'u1',
    firebaseUid: 'uid-1',
    email: 'a@b.com',
    name: 'Alice',
  };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
    firebase = {
      getAuth: () => ({ verifyIdToken: jest.fn().mockResolvedValue(decoded) }),
    };
    authService = { upsertUser: jest.fn().mockResolvedValue(user) };
    redisClient = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
    };
    // RedisService extends IORedis: the injected service IS the client.
    redis = redisClient;
    guard = new FirebaseAuthGuard(reflector, firebase, authService, redis);
  });

  it('allows @Public() routes without a token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const ctx = ctxWith({});
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('throws 401 when Authorization header missing', async () => {
    const ctx = ctxWith({});
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('throws 401 when header is not a Bearer token', async () => {
    const ctx = ctxWith({ authorization: 'Basic xyz' });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('on cache hit: sets req.user from cache, no verify, no DB write', async () => {
    redisClient.get.mockResolvedValue(JSON.stringify(user));
    const verify = jest.fn();
    firebase.getAuth = () => ({ verifyIdToken: verify });
    const ctx = ctxWith({ authorization: 'Bearer tok' });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(ctx._req.user).toEqual(user);
    expect(verify).not.toHaveBeenCalled();
    expect(authService.upsertUser).not.toHaveBeenCalled();
  });

  it('on cache miss: verifies, upserts, caches payload with bounded TTL', async () => {
    const ctx = ctxWith({ authorization: 'Bearer tok' });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);

    expect(authService.upsertUser).toHaveBeenCalledWith(decoded);
    expect(ctx._req.user).toEqual(user);
    const [key, value, mode, ttl] = redisClient.set.mock.calls[0];
    expect(key).toContain('idtoken:');
    expect(JSON.parse(value)).toEqual(user);
    expect(mode).toBe('EX');
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(300);
  });

  it('throws 401 when verifyIdToken rejects', async () => {
    firebase.getAuth = () => ({
      verifyIdToken: jest.fn().mockRejectedValue(new Error('bad')),
    });
    const ctx = ctxWith({ authorization: 'Bearer tok' });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('throws 401 when verified token has no email claim, without upserting', async () => {
    firebase.getAuth = () => ({
      verifyIdToken: jest.fn().mockResolvedValue({
        uid: 'uid-9',
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    });
    const ctx = ctxWith({ authorization: 'Bearer tok' });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(authService.upsertUser).not.toHaveBeenCalled();
  });

  it('still authenticates when Redis get throws (cache is best-effort)', async () => {
    redisClient.get.mockRejectedValue(new Error('redis down'));
    const ctx = ctxWith({ authorization: 'Bearer tok' });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(authService.upsertUser).toHaveBeenCalled();
  });

  it('still authenticates when Redis set throws (cache write is best-effort)', async () => {
    redisClient.set.mockRejectedValue(new Error('redis down'));
    const ctx = ctxWith({ authorization: 'Bearer tok' });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(ctx._req.user).toEqual(user);
  });
});
