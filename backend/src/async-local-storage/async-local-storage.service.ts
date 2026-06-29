import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

type User = {
  id: string;
  firebaseUid: string;
  email: string;
  name: string;
};
@Injectable()
export class AsyncLocalStorageService {
  constructor(private readonly als: AsyncLocalStorage<any>) {}
  getUser(): User | null {
    return (this.als.getStore()?.['user'] as User | undefined) ?? null;
  }
}
