import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { FirebaseService } from './firebase.service';
import { AuthService } from './auth.service';
import { FirebaseAuthGuard } from './firebase-auth.guard';
import { OwnershipGuard } from './ownership.guard';
import { ApiKeyGuard } from './api-key.guard';
import { AuthController } from './auth.controller';
import { PostgresModule } from '../../databases/postgres/postgres.module';
import { RedisModule } from '../../shared/redis/redis.module';

@Module({
  imports: [PostgresModule, RedisModule],
  controllers: [AuthController],
  providers: [
    FirebaseService,
    AuthService,
    OwnershipGuard,
    ApiKeyGuard,
    { provide: APP_GUARD, useClass: FirebaseAuthGuard },
  ],
  exports: [OwnershipGuard, ApiKeyGuard, PostgresModule],
})
export class AuthModule {}
