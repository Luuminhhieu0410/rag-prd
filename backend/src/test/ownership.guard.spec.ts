import {
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OwnershipGuard } from '../api/auth/ownership.guard';
import { PostgresService } from '../databases/postgres/postgres.service';
import { OwnershipMeta } from '../api/auth/decorators/check-ownership.decorator';

function ctxFor(
  params: Record<string, string>,
  user: { id: string },
): ExecutionContext {
  const req = { params, user };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => () => undefined,
    getClass: () => class {},
  } as unknown as ExecutionContext;
}

describe('OwnershipGuard', () => {
  let findUnique: jest.Mock;
  let reflectorValue: OwnershipMeta | undefined;
  let guard: OwnershipGuard;

  beforeEach(() => {
    findUnique = jest.fn();
    const reflector = { get: () => reflectorValue } as unknown as Reflector;
    const prisma = { collection: { findUnique } } as unknown as PostgresService;
    guard = new OwnershipGuard(reflector, prisma);
  });

  it('passes when no @CheckOwnership metadata is present', async () => {
    reflectorValue = undefined;
    await expect(
      guard.canActivate(ctxFor({ id: 'c1' }, { id: 'u1' })),
    ).resolves.toBe(true);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('throws NotFound when the resource does not exist', async () => {
    reflectorValue = { model: 'collection', idParam: 'id' };
    findUnique.mockResolvedValue(null);
    await expect(
      guard.canActivate(ctxFor({ id: 'missing' }, { id: 'u1' })),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws Forbidden when the resource belongs to another user', async () => {
    reflectorValue = { model: 'collection', idParam: 'id' };
    findUnique.mockResolvedValue({ userId: 'someone-else' });
    await expect(
      guard.canActivate(ctxFor({ id: 'c1' }, { id: 'u1' })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('passes when the resource belongs to the current user', async () => {
    reflectorValue = { model: 'collection', idParam: 'id' };
    findUnique.mockResolvedValue({ userId: 'u1' });
    await expect(
      guard.canActivate(ctxFor({ id: 'c1' }, { id: 'u1' })),
    ).resolves.toBe(true);
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'c1' },
      select: { userId: true },
    });
  });
});
