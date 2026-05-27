import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { DATABASE_URL_STRING } from '../../config/postgresql';
console.log('???', DATABASE_URL_STRING);
@Injectable()
export class PostgresService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const adapter = new PrismaPg({
      connectionString: DATABASE_URL_STRING,
    });
    super({ adapter });
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      console.log('postgresService disconnected');
    } catch (error) {
      console.error('error disconnection', error);
    }
  }

  async onModuleInit() {
    try {
      await this.$queryRaw`select 1`;
      console.log('connected to Postgres service');
    } catch (error) {
      console.error('error connection', error);
    }
  }
}
