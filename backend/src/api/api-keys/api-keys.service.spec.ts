import { NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ApiKeysService } from './api-keys.service';
import { PostgresService } from '../../databases/postgres/postgres.service';

describe('ApiKeysService', () => {
  let create: jest.Mock;
  let findMany: jest.Mock;
  let updateMany: jest.Mock;
  let service: ApiKeysService;

  beforeEach(() => {
    create = jest.fn().mockImplementation(({ data }) =>
      Promise.resolve({ id: 'k1', ...data }),
    );
    findMany = jest.fn();
    updateMany = jest.fn();
    const prisma = {
      apiKey: { create, findMany, updateMany },
    } as unknown as PostgresService;
    service = new ApiKeysService(prisma);
  });

  it('create returns the full raw key once, stores a bcrypt hash, and a recognizable prefix', async () => {
    const res = await service.create('u1', 'My key');

    expect(res.key.startsWith('sk_live_')).toBe(true);
    expect(res.prefix).toBe(res.key.slice(0, 16));
    expect(res.id).toBe('k1');

    const data = create.mock.calls[0][0].data;
    expect(data.userId).toBe('u1');
    expect(data.name).toBe('My key');
    expect(data.prefix).toBe(res.prefix);
    expect(data.collectionId).toBeNull();
    expect(data.keyHash).not.toBe(res.key);
    await expect(bcrypt.compare(res.key, data.keyHash)).resolves.toBe(true);
  });

  it('create passes through an optional collectionId', async () => {
    const res = await service.create('u1', 'Scoped', 'col-1');
    expect(create.mock.calls[0][0].data.collectionId).toBe('col-1');
    expect(res.key.startsWith('sk_live_')).toBe(true);
  });

  it('list returns only safe fields scoped to the user (never keyHash)', async () => {
    findMany.mockResolvedValue([
      { id: 'k1', name: 'A', prefix: 'sk_live_aaaa1111', lastUsedAt: null, revokedAt: null, createdAt: new Date() },
    ]);
    const rows = await service.list('u1');

    const where = findMany.mock.calls[0][0].where;
    expect(where).toEqual({ userId: 'u1' });
    const select = findMany.mock.calls[0][0].select;
    expect(select.keyHash).toBeUndefined();
    expect(rows[0]).not.toHaveProperty('keyHash');
  });

  it('revoke sets revokedAt scoped to id + user', async () => {
    updateMany.mockResolvedValue({ count: 1 });
    await service.revoke('u1', 'k1');

    const arg = updateMany.mock.calls[0][0];
    expect(arg.where).toEqual({ id: 'k1', userId: 'u1', revokedAt: null });
    expect(arg.data.revokedAt).toBeInstanceOf(Date);
  });

  it('revoke throws NotFound when nothing matched (other user or unknown id)', async () => {
    updateMany.mockResolvedValue({ count: 0 });
    await expect(service.revoke('u1', 'nope')).rejects.toBeInstanceOf(NotFoundException);
  });
});
