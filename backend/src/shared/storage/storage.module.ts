import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { R2StorageService } from './r2-storage.service';

@Module({
  providers: [{ provide: StorageService, useClass: R2StorageService }],
  exports: [StorageService],
})
export class StorageModule {}
