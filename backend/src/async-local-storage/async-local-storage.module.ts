import { Module } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { AsyncLocalStorageService } from './async-local-storage.service';

@Module({
  providers: [
    {
      provide: AsyncLocalStorage,
      useValue: new AsyncLocalStorage(),
    },
    AsyncLocalStorageService,
  ],
  exports: [AsyncLocalStorage, AsyncLocalStorageService],
})
export class AsyncLocalStorageModule {}
