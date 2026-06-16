import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '../../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { DATABASE_URL } from '../../shared/config/env.config';

@Injectable()
export class PostgresService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PostgresService.name);
  constructor() {
    const adapter = new PrismaPg({
      connectionString: DATABASE_URL,
    });
    super({ adapter });
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('postgresService disconnected');
    } catch (error) {
      this.logger.error('error disconnection', error);
    }
  }

  async onModuleInit() {
    try {
      await this.$queryRaw`select 1`;
      this.logger.log('connected to Postgres service');
    } catch (error) {
      this.logger.error('error connection', error);
    }
  }
}
