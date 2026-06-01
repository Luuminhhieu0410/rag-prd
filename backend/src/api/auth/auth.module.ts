import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { FirebaseService } from './firebase.service';
import { AuthService } from './auth.service';
import { FirebaseAuthGuard } from './firebase-auth.guard';
import { AuthController } from './auth.controller';
import { PostgresModule } from '../../databases/postgres/postgres.module';
import { RedisModule } from '../../shared/redis/redis.module';

@Module({
  imports: [PostgresModule, RedisModule],
  controllers: [AuthController],
  providers: [
    FirebaseService,
    AuthService,
    { provide: APP_GUARD, useClass: FirebaseAuthGuard },
  ],
})
export class AuthModule {}
