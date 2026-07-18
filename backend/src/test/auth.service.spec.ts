import { Test } from '@nestjs/testing';
import { AuthService } from '../api/auth/auth.service';
import { PostgresService } from '../databases/postgres/postgres.service';

describe('AuthService', () => {
  let service: AuthService;
  let upsert: jest.Mock;

  beforeEach(async () => {
    upsert = jest.fn().mockResolvedValue({
      id: 'u1',
      firebaseUid: 'uid-1',
      email: 'a@b.com',
      name: 'Alice',
    });
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PostgresService,
          useValue: { getClient: () => ({ user: { upsert } }) },
        },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  it('upserts by firebaseUid with claims from the decoded token', async () => {
    const decoded = {
      uid: 'uid-1',
      email: 'a@b.com',
      name: 'Alice',
      picture: 'http://img/a.png',
    } as any;

    const user = await service.upsertUser(decoded);

    expect(user.id).toBe('u1');
    expect(upsert).toHaveBeenCalledTimes(1);
    const arg = upsert.mock.calls[0][0];
    expect(arg.where).toEqual({ firebaseUid: 'uid-1' });
    expect(arg.create.firebaseUid).toBe('uid-1');
    expect(arg.create.email).toBe('a@b.com');
    expect(arg.create.avatarUrl).toBe('http://img/a.png');
    expect(arg.create.lastLoginAt).toBeInstanceOf(Date);
    expect(arg.update.email).toBe('a@b.com');
    expect(arg.update.lastLoginAt).toBeInstanceOf(Date);
  });

  it('tolerates missing optional claims', async () => {
    const decoded = { uid: 'uid-2', email: undefined } as any;
    await service.upsertUser(decoded);
    const arg = upsert.mock.calls[0][0];
    expect(arg.create.email).toBe('');
    expect(arg.create.name).toBeNull();
    expect(arg.create.avatarUrl).toBeNull();
  });
});
