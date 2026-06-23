import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '../../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PostgresService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PostgresService.name);
  private client: PrismaClient;
  constructor(private readonly configService: ConfigService) {}

  async onModuleDestroy() {
    try {
      await this.client.$disconnect();
      this.logger.log('postgresService disconnected');
    } catch (error) {
      this.logger.error('error disconnection', error);
    }
  }

  async onModuleInit() {
    try {
      const adapter = new PrismaPg({
        connectionString: this.configService.get('DATABASE_URL'),
      });
      this.client = new PrismaClient({ adapter });
      await this.client.$queryRaw`select 1`;
      this.logger.log('connected to Postgres service');
    } catch (error) {
      this.logger.error('error connection', error);
    }
  }
  getClient() {
    return this.client;
  }
}
