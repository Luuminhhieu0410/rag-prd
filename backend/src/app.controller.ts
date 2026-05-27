import {
  BadRequestException,
  Controller,
  Get,
  HttpException,
} from '@nestjs/common';
import { AppService } from './app.service';
import { PostgresService } from './databases/postgres/postgres.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly postgresService: PostgresService,
  ) {}

  @Get()
  getHello() {
    throw new BadRequestException();
  }
}
