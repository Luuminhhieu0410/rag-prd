import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ApiKeyGuard } from './api-key.guard';
import { PostgresService } from '../../databases/postgres/postgres.service';

function ctxFor(headers: Record<string, string>): { ctx: ExecutionContext; req: any } {
  const req: any = { headers };
  const ctx = {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
  return { ctx, req };
}

const userRow = { id: 'u1', firebaseUid: 'uid-1', email: 'a@b.com', name: 'Alice' };

describe('ApiKeyGuard', () => {
  let findMany: jest.Mock;
  let updateMany: jest.Mock;
  let guard: ApiKeyGuard;

  beforeEach(() => {
    findMany = jest.fn();
    updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const prisma = { apiKey: { findMany, updateMany } } as unknown as PostgresService;
    guard = new ApiKeyGuard(prisma);
  });

  it('throws 401 when X-API-Key header is missing', async () => {
    const { ctx } = ctxFor({});
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws 401 when no active key matches the prefix', async () => {
    findMany.mockResolvedValue([]);
    const { ctx } = ctxFor({ 'x-api-key': 'sk_live_deadbeefxxxxxxxx' });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(findMany.mock.calls[0][0].where.revokedAt).toBeNull();
  });

  it('throws 401 when the bcrypt hash does not match', async () => {
    const otherHash = await bcrypt.hash('sk_live_someothersecretkey', 12);
    findMany.mockResolvedValue([{ id: 'k1', keyHash: otherHash, collectionId: null, user: userRow }]);
    const { ctx } = ctxFor({ 'x-api-key': 'sk_live_wrongsecretvaluexx' });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('attaches req.user + req.apiKey and touches lastUsedAt on a valid key', async () => {
    const raw = 'sk_live_validsecretvalue123';
    const keyHash = await bcrypt.hash(raw, 12);
    findMany.mockResolvedValue([{ id: 'k1', keyHash, collectionId: 'col-1', user: userRow }]);
    const { ctx, req } = ctxFor({ 'x-api-key': raw });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.user).toEqual(userRow);
    expect(req.apiKey).toEqual({ id: 'k1', collectionId: 'col-1' });
    await Promise.resolve();
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'k1' },
      data: { lastUsedAt: expect.any(Date) },
    });
  });
});
