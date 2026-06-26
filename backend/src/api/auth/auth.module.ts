import { Module } from '@nestjs/common';
import { FirebaseService } from './firebase.service';
import { AuthService } from './auth.service';
import { FirebaseAuthGuard } from './firebase-auth.guard';
import { OwnershipGuard } from './ownership.guard';
import { ApiKeyGuard } from './api-key.guard';
import { AuthController } from './auth.controller';
import { PostgresModule } from '../../databases/postgres/postgres.module';
import { RedisModule } from '../../shared/redis/redis.module';
import { AsyncLocalStorageModule } from '../../async-local-storage/async-local-storage.module';

@Module({
  imports: [PostgresModule, RedisModule, AsyncLocalStorageModule],
  controllers: [AuthController],
  providers: [
    FirebaseService,
    AuthService,
    OwnershipGuard,
    ApiKeyGuard,
    FirebaseAuthGuard,
  ],
  exports: [
    OwnershipGuard,
    ApiKeyGuard,
    AuthService,
    FirebaseService,
    FirebaseAuthGuard,
    PostgresModule,
  ],
})
export class AuthModule {}
