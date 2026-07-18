import { FirebaseAuthGuard } from '../api/auth/firebase-auth.guard';

function ctxWith(headers: Record<string, string>) {
  const req: any = { headers };
  return {
    _req: req,
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => () => undefined,
    getClass: () => class {},
  } as any;
}

describe('FirebaseAuthGuard development user', () => {
  it('attaches the configured development user to the request and async store', async () => {
    const store: Record<string, unknown> = {};
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
    const als = { getStore: jest.fn().mockReturnValue(store) };
    const firebase = { getAuth: jest.fn() };
    const authService = { upsertUser: jest.fn() };
    const redis = { get: jest.fn(), set: jest.fn() };
    const guard = new FirebaseAuthGuard(
      reflector as any,
      als as any,
      firebase as any,
      authService as any,
      redis as any,
    );
    const context = ctxWith({});

    await expect(guard.canActivate(context)).resolves.toBe(true);

    const expectedUser = {
      id: '340d06b7-28d7-4ff3-9ad2-f84db9e97891',
      firebaseUid: 'FejAX64Vs8WgNwZgxu5T68QBtYF3',
      email: 'luu7940@gmail.com',
      name: 'hiệu lưu minh',
    };
    expect(context._req.user).toEqual(expectedUser);
    expect(store.user).toEqual(expectedUser);
    expect(firebase.getAuth).not.toHaveBeenCalled();
    expect(authService.upsertUser).not.toHaveBeenCalled();
    expect(redis.get).not.toHaveBeenCalled();
  });
});
